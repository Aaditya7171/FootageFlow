const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../auth');
const memoryStorage = require('../services/memoryStorage');

const router = express.Router();
const prisma = new PrismaClient();

// Check if database is available
let isDatabaseAvailable = true;

async function checkDatabaseConnection() {
  try {
    await prisma.$connect();
    isDatabaseAvailable = true;
  } catch (error) {
    console.warn('⚠️ Database unavailable, using memory storage');
    isDatabaseAvailable = false;
  }
}

// Get all videos for authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Use memory storage by default for development
    console.log(`📹 Fetching videos for user: ${req.user.userId}`);

    let videos = await memoryStorage.getVideosByUser(req.user.userId);
    console.log(`📹 Found ${videos.length} videos in memory storage`);

    // Add tags and transcripts to each video
    for (let video of videos) {
      video.tags = await memoryStorage.getTagsByVideoId(video.id) || [];
      video.transcript = await memoryStorage.getTranscriptByVideoId(video.id) || null;
      console.log(`🏷️ Video ${video.id} has ${video.tags.length} tags`);
    }

    res.json({
      success: true,
      videos
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch videos',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Search videos (must come before /:id route)
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Search in video titles, descriptions, and tags
    const videos = await prisma.video.findMany({
      where: {
        userId: req.user.userId,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          {
            tags: {
              some: {
                label: { contains: query, mode: 'insensitive' }
              }
            }
          },
          {
            transcript: {
              transcriptions: {
                path: '$',
                string_contains: query
              }
            }
          }
        ]
      },
      include: {
        tags: {
          select: {
            id: true,
            label: true,
            confidence: true,
            type: true,
            timestamp: true
          }
        },
        transcript: {
          select: {
            id: true,
            transcriptions: true,
            processedLanguages: true,
            processingStatus: true,
            createdAt: true
          }
        }
      },
      orderBy: { uploadDate: 'desc' }
    });

    res.json(videos);
  } catch (error) {
    console.error('Error searching videos:', error);
    res.status(500).json({ error: 'Failed to search videos' });
  }
});

// Get single video by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    console.log(`📹 Fetching single video: ${req.params.id} for user: ${req.user.userId}`);

    const video = await memoryStorage.getVideoById(req.params.id, req.user.userId);

    if (!video) {
      console.log(`❌ Video ${req.params.id} not found for user ${req.user.userId}`);
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }

    // Add tags and transcript
    video.tags = await memoryStorage.getTagsByVideoId(video.id) || [];
    video.transcript = await memoryStorage.getTranscriptByVideoId(video.id) || null;

    console.log(`✅ Found video ${video.id} with ${video.tags.length} tags`);

    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }

    res.json({
      success: true,
      video
    });
  } catch (error) {
    console.error('Error fetching video:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch video',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update video metadata
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { title, description } = req.body;

    const video = await prisma.video.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.userId
      }
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const updatedVideo = await prisma.video.update({
      where: { id: req.params.id },
      data: {
        ...(title && { title }),
        ...(description && { description })
      },
      include: {
        tags: {
          select: {
            id: true,
            label: true,
            confidence: true,
            type: true,
            timestamp: true
          }
        },
        transcript: {
          select: {
            id: true,
            fullText: true,
            segments: true,
            createdAt: true
          }
        }
      }
    });

    res.json(updatedVideo);
  } catch (error) {
    console.error('Error updating video:', error);
    res.status(500).json({ error: 'Failed to update video' });
  }
});

// Delete video
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const video = await prisma.video.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.userId
      }
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Delete video and related data (cascading delete handles tags)
    await prisma.video.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

module.exports = router;
