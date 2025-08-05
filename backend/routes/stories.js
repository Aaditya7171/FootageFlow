const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../auth');
const storyService = require('../services/story');
const videoStoryService = require('../services/videoStoryService');
const storyGenerationService = require('../services/storyGenerationService');
const memoryStorage = require('../services/memoryStorage');

const router = express.Router();
const prisma = new PrismaClient();

// Generate a new story
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { prompt, storyType = 'text', selectedVideoIds = [] } = req.body;
    const userId = req.user.userId;

    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Story prompt is required'
      });
    }

    if (prompt.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is too long (max 500 characters)'
      });
    }

    console.log(`🎭 Generating ${storyType} story for user ${userId}`);
    console.log(`📝 Prompt: ${prompt}`);
    console.log(`🎬 Selected videos: ${selectedVideoIds.length}`);

    // Get user's videos using memory storage
    let videos;
    try {
      videos = await memoryStorage.getVideosByUser(userId);
      console.log(`📹 Found ${videos.length} videos for user ${userId}`);

      // Filter selected videos if specified
      if (selectedVideoIds.length > 0) {
        console.log(`🎯 Filtering for selected videos: ${selectedVideoIds}`);
        videos = videos.filter(video => selectedVideoIds.includes(video.id));

        if (videos.length === 0) {
          console.log(`❌ No selected videos found`);
          return res.status(400).json({
            success: false,
            error: 'Selected videos not found'
          });
        }
      }

      if (videos.length === 0) {
        console.log(`❌ No videos available for story generation`);
        return res.status(400).json({
          success: false,
          error: 'No videos available for story generation'
        });
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch videos for story generation'
      });
    }

    // Get transcripts for the videos
    const transcripts = [];
    for (const video of videos) {
      const transcript = await memoryStorage.getTranscriptByVideoId(video.id);
      if (transcript) {
        transcripts.push(transcript);
      }
    }

    let result;

    if (storyType === 'text') {
      result = await storyGenerationService.generateTextStory(prompt, videos, transcripts);
    } else if (storyType === 'video') {
      result = await storyGenerationService.generateVideoStory(prompt, videos, selectedVideoIds);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid story type. Must be "text" or "video"'
      });
    }

    // Store the generated story
    const story = {
      id: `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      prompt,
      storyType,
      title: result.title,
      content: result.content || null,
      storyPlan: result.storyPlan || null,
      videoIds: selectedVideoIds,
      status: 'completed',
      createdAt: new Date().toISOString(),
      ...result
    };

    // Store in memory (in production, this would go to database)
    if (!global.stories) {
      global.stories = new Map();
    }
    global.stories.set(story.id, story);

    res.json({
      success: true,
      story,
      message: `${storyType === 'text' ? 'Text' : 'Video'} story generated successfully!`
    });

  } catch (error) {
    console.error('Error starting story generation:', error);
    res.status(500).json({ error: 'Failed to start story generation' });
  }
});

// Get all user stories
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log(`📚 Fetching stories for user: ${req.user.userId}`);

    // Get stories from memory storage
    if (!global.stories) {
      global.stories = new Map();
    }

    const userStories = Array.from(global.stories.values())
      .filter(story => story.userId === req.user.userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    console.log(`📚 Found ${userStories.length} stories for user`);

    res.json({
      success: true,
      stories: userStories
    });
  } catch (error) {
    console.error('Error fetching stories:', error);
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

// Get single story
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    console.log(`📖 Fetching story: ${req.params.id} for user: ${req.user.userId}`);

    // Get story from memory storage
    if (!global.stories) {
      global.stories = new Map();
    }

    const story = global.stories.get(req.params.id);

    if (!story || story.userId !== req.user.userId) {
      return res.status(404).json({
        success: false,
        error: 'Story not found'
      });
    }

    console.log(`✅ Found story: ${story.title}`);

    res.json({
      success: true,
      story: story
    });
  } catch (error) {
    console.error('Error fetching story:', error);
    res.status(500).json({ error: 'Failed to fetch story' });
  }
});

// Delete story
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await storyService.deleteStory(req.params.id, req.user.userId);
    res.json({ message: 'Story deleted successfully' });
  } catch (error) {
    console.error('Error deleting story:', error);
    if (error.message === 'Story not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete story' });
  }
});

// Get story generation status
router.get('/:id/status', authenticateToken, async (req, res) => {
  try {
    const story = await prisma.story.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.userId
      },
      select: {
        id: true,
        prompt: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        generatedVideoUrl: true,
        storyVideos: {
          select: {
            order: true,
            startTime: true,
            endTime: true,
            video: {
              select: {
                title: true,
                thumbnailUrl: true
              }
            }
          },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    res.json({
      id: story.id,
      prompt: story.prompt,
      status: story.status,
      createdAt: story.createdAt,
      updatedAt: story.updatedAt,
      hasVideo: !!story.generatedVideoUrl,
      clipCount: story.storyVideos.length,
      clips: story.storyVideos
    });

  } catch (error) {
    console.error('Error fetching story status:', error);
    res.status(500).json({ error: 'Failed to fetch story status' });
  }
});

// Regenerate story with same prompt
router.post('/:id/regenerate', authenticateToken, async (req, res) => {
  try {
    const existingStory = await prisma.story.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.userId
      }
    });

    if (!existingStory) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Start regeneration (async)
    storyService.generateStory(req.user.userId, existingStory.prompt)
      .catch(error => {
        console.error('Story regeneration failed:', error);
      });

    res.status(202).json({
      message: 'Story regeneration started',
      prompt: existingStory.prompt,
      status: 'processing'
    });

  } catch (error) {
    console.error('Error regenerating story:', error);
    res.status(500).json({ error: 'Failed to regenerate story' });
  }
});

// Get story suggestions based on user's videos
router.get('/suggestions/prompts', authenticateToken, async (req, res) => {
  try {
    // Get user's most common tags
    const topTags = await prisma.tag.findMany({
      where: {
        video: {
          userId: req.user.userId
        }
      },
      select: {
        label: true,
        type: true
      },
      orderBy: {
        confidence: 'desc'
      },
      take: 10
    });

    // Generate prompt suggestions based on tags
    const suggestions = [];
    
    if (topTags.some(tag => tag.type === 'activity')) {
      suggestions.push('Create an action-packed adventure story');
    }
    
    if (topTags.some(tag => tag.type === 'emotion')) {
      suggestions.push('Tell an emotional journey story');
    }
    
    if (topTags.some(tag => tag.type === 'scene')) {
      suggestions.push('Create a travel documentary');
    }

    // Default video story suggestions
    suggestions.push(
      'Make a story of my Goa trip',
      'Show my trekking moments',
      'Create a day in the life video story',
      'Make a before and after transformation video',
      'Tell a story of my growth and learning journey',
      'Create a behind-the-scenes documentary',
      'Make a motivational video story',
      'Show my cooking adventures',
      'Create a fitness journey video'
    );

    res.json({
      suggestions: suggestions.slice(0, 5),
      basedOnTags: topTags.slice(0, 5)
    });

  } catch (error) {
    console.error('Error generating suggestions:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

module.exports = router;
