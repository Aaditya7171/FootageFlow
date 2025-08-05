const express = require('express');
const router = express.Router();
const visionService = require('../services/visionService');
const { authenticateToken } = require('../auth');

// Analyze a specific video
router.post('/analyze/:videoId', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const { frameInterval = 5 } = req.body; // Default to every 5 seconds
    
    // Get video details
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const video = await prisma.video.findUnique({
      where: { id: videoId }
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }

    // Check if user owns the video
    if (video.userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Start vision analysis
    const result = await visionService.processVideoVision(videoId, video.url, frameInterval);

    res.json({
      success: true,
      message: 'Vision analysis completed',
      tags: result
    });

  } catch (error) {
    console.error('Vision analysis route error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Vision analysis failed'
    });
  }
});

// Get tags for a video
router.get('/tags/:videoId', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    
    // Get video details to check ownership
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const video = await prisma.video.findUnique({
      where: { id: videoId }
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }

    // Check if user owns the video
    if (video.userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const tags = await visionService.getVideoTags(videoId);

    res.json({
      success: true,
      tags
    });

  } catch (error) {
    console.error('Get tags route error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get tags'
    });
  }
});

// Search videos by tags
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters long'
      });
    }

    const results = await visionService.searchByTags(query.trim());

    // Filter results to only include videos owned by the user
    const userResults = results.filter(result => 
      result.video && result.video.userId === req.user.userId
    );

    res.json({
      success: true,
      results: userResults,
      query: query.trim()
    });

  } catch (error) {
    console.error('Search by tags route error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Search failed'
    });
  }
});

// Get vision analysis status for multiple videos
router.post('/status', authenticateToken, async (req, res) => {
  try {
    const { videoIds } = req.body;

    if (!Array.isArray(videoIds)) {
      return res.status(400).json({
        success: false,
        error: 'videoIds must be an array'
      });
    }

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const videos = await prisma.video.findMany({
      where: {
        id: { in: videoIds },
        userId: req.user.userId
      },
      select: {
        id: true,
        visionStatus: true,
        tags: {
          select: {
            id: true,
            createdAt: true
          },
          take: 1
        }
      }
    });

    const statusMap = {};
    videos.forEach(video => {
      statusMap[video.id] = {
        status: video.visionStatus,
        hasTags: video.tags.length > 0,
        tagsCreatedAt: video.tags[0]?.createdAt
      };
    });

    res.json({
      success: true,
      statuses: statusMap
    });

  } catch (error) {
    console.error('Get vision status route error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get vision status'
    });
  }
});

// Get all unique tags for user's videos (for filtering/suggestions)
router.get('/all-tags', authenticateToken, async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const tags = await prisma.tag.findMany({
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
      distinct: ['label'],
      orderBy: {
        confidence: 'desc'
      },
      take: 100 // Limit to top 100 tags
    });

    // Group by type
    const tagsByType = {};
    tags.forEach(tag => {
      if (!tagsByType[tag.type]) {
        tagsByType[tag.type] = [];
      }
      tagsByType[tag.type].push({
        label: tag.label,
        confidence: tag.confidence
      });
    });

    res.json({
      success: true,
      tags: tagsByType,
      totalTags: tags.length
    });

  } catch (error) {
    console.error('Get all tags route error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get tags'
    });
  }
});

module.exports = router;
