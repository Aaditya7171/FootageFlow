const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../auth');
const transcriptionService = require('../services/simpleTranscriptionService');
const visionService = require('../services/simpleVisionService');

const router = express.Router();
const prisma = new PrismaClient();

// Start transcription for a video
router.post('/transcribe/:videoId', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    
    // Verify video belongs to user
    const video = await prisma.video.findFirst({
      where: {
        id: videoId,
        userId: req.user.userId
      }
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    if (video.transcriptionStatus === 'processing') {
      return res.status(400).json({ error: 'Transcription already in progress' });
    }

    if (video.transcriptionStatus === 'completed') {
      return res.status(400).json({ error: 'Video already transcribed' });
    }

    // Start transcription process (async)
    transcriptionService.processVideoTranscription(videoId, video.url)
      .catch(error => {
        console.error('Transcription process failed:', error);
      });

    res.json({ 
      message: 'Transcription started',
      videoId,
      status: 'processing'
    });

  } catch (error) {
    console.error('Error starting transcription:', error);
    res.status(500).json({ error: 'Failed to start transcription' });
  }
});

// Start vision analysis for a video
router.post('/analyze/:videoId', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    
    // Verify video belongs to user
    const video = await prisma.video.findFirst({
      where: {
        id: videoId,
        userId: req.user.userId
      }
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    if (video.visionStatus === 'processing') {
      return res.status(400).json({ error: 'Vision analysis already in progress' });
    }

    if (video.visionStatus === 'completed') {
      return res.status(400).json({ error: 'Video already analyzed' });
    }

    // Start vision analysis process (async)
    visionService.processVideoVision(videoId, video.url)
      .catch(error => {
        console.error('Vision analysis process failed:', error);
      });

    res.json({ 
      message: 'Vision analysis started',
      videoId,
      status: 'processing'
    });

  } catch (error) {
    console.error('Error starting vision analysis:', error);
    res.status(500).json({ error: 'Failed to start vision analysis' });
  }
});

// Process both transcription and vision analysis
router.post('/process/:videoId', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    
    // Verify video belongs to user
    const video = await prisma.video.findFirst({
      where: {
        id: videoId,
        userId: req.user.userId
      }
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const promises = [];
    const results = { transcription: null, vision: null };

    // Start transcription if not completed
    if (video.transcriptionStatus !== 'completed' && video.transcriptionStatus !== 'processing') {
      promises.push(
        transcriptionService.processVideoTranscription(videoId, video.url)
          .then(result => { results.transcription = result; })
          .catch(error => {
            console.error('Transcription failed:', error);
            results.transcription = { error: error.message };
          })
      );
    }

    // Start vision analysis if not completed
    if (video.visionStatus !== 'completed' && video.visionStatus !== 'processing') {
      promises.push(
        visionService.processVideoVision(videoId, video.url)
          .then(result => { results.vision = result; })
          .catch(error => {
            console.error('Vision analysis failed:', error);
            results.vision = { error: error.message };
          })
      );
    }

    if (promises.length === 0) {
      return res.status(400).json({ error: 'Video processing already completed or in progress' });
    }

    // Start processing (don't wait for completion)
    Promise.all(promises).then(() => {
      console.log(`Processing completed for video ${videoId}`);
    });

    res.json({ 
      message: 'Video processing started',
      videoId,
      processing: {
        transcription: video.transcriptionStatus !== 'completed',
        vision: video.visionStatus !== 'completed'
      }
    });

  } catch (error) {
    console.error('Error starting video processing:', error);
    res.status(500).json({ error: 'Failed to start video processing' });
  }
});

// Get processing status
router.get('/status/:videoId', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    
    const video = await prisma.video.findFirst({
      where: {
        id: videoId,
        userId: req.user.userId
      },
      select: {
        id: true,
        title: true,
        transcriptionStatus: true,
        visionStatus: true,
        transcript: true,
        tags: {
          select: {
            id: true,
            label: true,
            confidence: true,
            type: true,
            timestamp: true
          }
        }
      }
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({
      videoId: video.id,
      title: video.title,
      transcription: {
        status: video.transcriptionStatus,
        hasTranscript: !!video.transcript
      },
      vision: {
        status: video.visionStatus,
        tagCount: video.tags.length
      },
      tags: video.tags,
      isProcessing: video.transcriptionStatus === 'processing' || video.visionStatus === 'processing',
      isCompleted: video.transcriptionStatus === 'completed' && video.visionStatus === 'completed'
    });

  } catch (error) {
    console.error('Error fetching processing status:', error);
    res.status(500).json({ error: 'Failed to fetch processing status' });
  }
});

// Enhanced search with AI-powered features
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { query, type } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    let whereClause = {
      userId: req.user.userId,
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { transcript: { contains: query, mode: 'insensitive' } },
        {
          tags: {
            some: {
              label: { contains: query, mode: 'insensitive' }
            }
          }
        }
      ]
    };

    // Filter by tag type if specified
    if (type && type !== 'all') {
      whereClause.tags = {
        some: {
          label: { contains: query, mode: 'insensitive' },
          type: type
        }
      };
      // Remove the general OR clause when filtering by type
      whereClause.OR = whereClause.OR.filter(condition => !condition.tags);
    }

    const videos = await prisma.video.findMany({
      where: whereClause,
      include: {
        tags: {
          select: {
            id: true,
            label: true,
            confidence: true,
            type: true,
            timestamp: true
          },
          orderBy: { confidence: 'desc' }
        }
      },
      orderBy: { uploadDate: 'desc' }
    });

    // Add relevance scoring
    const scoredVideos = videos.map(video => {
      let relevanceScore = 0;
      const queryLower = query.toLowerCase();

      // Title match (highest weight)
      if (video.title.toLowerCase().includes(queryLower)) {
        relevanceScore += 10;
      }

      // Description match
      if (video.description && video.description.toLowerCase().includes(queryLower)) {
        relevanceScore += 5;
      }

      // Transcript match
      if (video.transcript && video.transcript.toLowerCase().includes(queryLower)) {
        relevanceScore += 3;
      }

      // Tag matches (weighted by confidence)
      video.tags.forEach(tag => {
        if (tag.label.toLowerCase().includes(queryLower)) {
          relevanceScore += (tag.confidence || 0.5) * 2;
        }
      });

      return { ...video, relevanceScore };
    });

    // Sort by relevance score
    scoredVideos.sort((a, b) => b.relevanceScore - a.relevanceScore);

    res.json({
      query,
      type: type || 'all',
      results: scoredVideos,
      count: scoredVideos.length
    });

  } catch (error) {
    console.error('Error performing AI search:', error);
    res.status(500).json({ error: 'Failed to perform search' });
  }
});

// Get tag statistics
router.get('/tags/stats', authenticateToken, async (req, res) => {
  try {
    const tagStats = await prisma.tag.groupBy({
      by: ['type'],
      where: {
        video: {
          userId: req.user.userId
        }
      },
      _count: {
        type: true
      }
    });

    const topTags = await prisma.tag.findMany({
      where: {
        video: {
          userId: req.user.userId
        }
      },
      select: {
        label: true,
        type: true,
        confidence: true
      },
      orderBy: {
        confidence: 'desc'
      },
      take: 20
    });

    res.json({
      byType: tagStats,
      topTags: topTags
    });

  } catch (error) {
    console.error('Error fetching tag statistics:', error);
    res.status(500).json({ error: 'Failed to fetch tag statistics' });
  }
});

module.exports = router;
