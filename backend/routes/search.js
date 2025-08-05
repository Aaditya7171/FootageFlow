const express = require('express');
const router = express.Router();
const transcriptionService = require('../services/transcriptionService');
const visionService = require('../services/visionService');
const { authenticateToken } = require('../auth');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Combined search endpoint
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { query, type = 'all' } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters long'
      });
    }

    const searchQuery = query.trim();
    const results = {
      transcripts: [],
      tags: [],
      videos: []
    };

    // Search transcripts if requested
    if (type === 'all' || type === 'transcripts') {
      try {
        const transcriptResults = await transcriptionService.searchTranscripts(searchQuery);
        results.transcripts = transcriptResults.filter(result => 
          result.video && result.video.userId === req.user.userId
        );
      } catch (error) {
        console.error('Transcript search error:', error);
      }
    }

    // Search tags if requested
    if (type === 'all' || type === 'tags') {
      try {
        const tagResults = await visionService.searchByTags(searchQuery);
        results.tags = tagResults.filter(result => 
          result.video && result.video.userId === req.user.userId
        );
      } catch (error) {
        console.error('Tag search error:', error);
      }
    }

    // Search video titles and descriptions
    if (type === 'all' || type === 'videos') {
      try {
        const videoResults = await prisma.video.findMany({
          where: {
            userId: req.user.userId,
            OR: [
              {
                title: {
                  contains: searchQuery,
                  mode: 'insensitive'
                }
              },
              {
                description: {
                  contains: searchQuery,
                  mode: 'insensitive'
                }
              }
            ]
          },
          select: {
            id: true,
            title: true,
            description: true,
            thumbnailUrl: true,
            duration: true,
            uploadDate: true
          },
          orderBy: {
            uploadDate: 'desc'
          }
        });

        results.videos = videoResults.map(video => ({
          video,
          matchType: 'title_description'
        }));
      } catch (error) {
        console.error('Video search error:', error);
      }
    }

    // Combine and deduplicate results by video ID
    const combinedResults = new Map();

    // Add transcript results
    results.transcripts.forEach(result => {
      const videoId = result.videoId;
      if (!combinedResults.has(videoId)) {
        combinedResults.set(videoId, {
          videoId,
          video: result.video,
          matches: {
            transcripts: result.matches,
            tags: [],
            titleDescription: false
          }
        });
      } else {
        combinedResults.get(videoId).matches.transcripts = result.matches;
      }
    });

    // Add tag results
    results.tags.forEach(result => {
      const videoId = result.video.id;
      if (!combinedResults.has(videoId)) {
        combinedResults.set(videoId, {
          videoId,
          video: result.video,
          matches: {
            transcripts: [],
            tags: result.tags,
            titleDescription: false
          }
        });
      } else {
        combinedResults.get(videoId).matches.tags = result.tags;
      }
    });

    // Add video title/description results
    results.videos.forEach(result => {
      const videoId = result.video.id;
      if (!combinedResults.has(videoId)) {
        combinedResults.set(videoId, {
          videoId,
          video: result.video,
          matches: {
            transcripts: [],
            tags: [],
            titleDescription: true
          }
        });
      } else {
        combinedResults.get(videoId).matches.titleDescription = true;
      }
    });

    // Convert to array and sort by relevance
    const finalResults = Array.from(combinedResults.values())
      .sort((a, b) => {
        // Sort by number of match types (more matches = higher relevance)
        const aScore = (a.matches.transcripts.length > 0 ? 1 : 0) +
                      (a.matches.tags.length > 0 ? 1 : 0) +
                      (a.matches.titleDescription ? 1 : 0);
        const bScore = (b.matches.transcripts.length > 0 ? 1 : 0) +
                      (b.matches.tags.length > 0 ? 1 : 0) +
                      (b.matches.titleDescription ? 1 : 0);
        return bScore - aScore;
      });

    res.json({
      success: true,
      query: searchQuery,
      results: finalResults,
      totalResults: finalResults.length,
      breakdown: {
        transcriptMatches: results.transcripts.length,
        tagMatches: results.tags.length,
        titleDescriptionMatches: results.videos.length
      }
    });

  } catch (error) {
    console.error('Combined search route error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Search failed'
    });
  }
});

// Get search suggestions based on existing tags and transcript content
router.get('/suggestions', authenticateToken, async (req, res) => {
  try {
    const { query = '' } = req.query;

    // Get popular tags for the user
    const popularTags = await prisma.tag.findMany({
      where: {
        video: {
          userId: req.user.userId
        },
        label: query ? {
          contains: query,
          mode: 'insensitive'
        } : undefined
      },
      select: {
        label: true,
        type: true
      },
      distinct: ['label'],
      orderBy: {
        confidence: 'desc'
      },
      take: 10
    });

    // Get common words from transcripts (simplified approach)
    const transcripts = await prisma.transcript.findMany({
      where: {
        video: {
          userId: req.user.userId
        },
        fullText: query ? {
          contains: query,
          mode: 'insensitive'
        } : undefined
      },
      select: {
        fullText: true
      },
      take: 5
    });

    // Extract common words from transcripts (basic implementation)
    const words = new Set();
    transcripts.forEach(transcript => {
      const text = transcript.fullText.toLowerCase();
      const textWords = text.match(/\b\w{4,}\b/g) || []; // Words with 4+ characters
      textWords.forEach(word => {
        if (query === '' || word.includes(query.toLowerCase())) {
          words.add(word);
        }
      });
    });

    const suggestions = [
      ...popularTags.map(tag => ({
        text: tag.label,
        type: 'tag',
        category: tag.type
      })),
      ...Array.from(words).slice(0, 10).map(word => ({
        text: word,
        type: 'transcript',
        category: 'word'
      }))
    ].slice(0, 15); // Limit to 15 suggestions

    res.json({
      success: true,
      suggestions,
      query
    });

  } catch (error) {
    console.error('Search suggestions route error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get suggestions'
    });
  }
});

module.exports = router;
