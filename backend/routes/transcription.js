const express = require('express');
const router = express.Router();
const transcriptionService = require('../services/simpleTranscriptionService');
const deepgramTranscriptionService = require('../services/deepgramTranscriptionService');
const memoryStorage = require('../services/memoryStorage');
const { authenticateToken } = require('../auth');

// Transcribe a specific video
router.post('/transcribe/:videoId', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const { language = 'original' } = req.body; // 'original' or 'english'

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

    // Allow re-transcription with different language
    if (video.transcriptionStatus === 'completed' && language !== 'original') {
      // Delete existing transcript for re-transcription
      await prisma.transcript.deleteMany({
        where: { videoId }
      });
    }

    // Start transcription with language option
    const result = await transcriptionService.processVideoTranscription(videoId, video.url, language);

    res.json({
      success: true,
      message: 'Transcription completed',
      language: language,
      transcript: result
    });

  } catch (error) {
    console.error('Transcription route error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Transcription failed'
    });
  }
});

// Get transcript for a video
router.get('/transcript/:videoId', authenticateToken, async (req, res) => {
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

    const transcript = await transcriptionService.getTranscriptionStatus(videoId);

    if (!transcript) {
      return res.status(404).json({
        success: false,
        error: 'Transcript not found'
      });
    }

    res.json({
      success: true,
      transcript
    });

  } catch (error) {
    console.error('Get transcript route error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get transcript'
    });
  }
});

// Search transcripts
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters long'
      });
    }

    const results = await transcriptionService.searchTranscripts(query.trim());

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
    console.error('Search transcripts route error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Search failed'
    });
  }
});

// Get transcription status for multiple videos
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
        transcriptionStatus: true,
        transcript: {
          select: {
            id: true,
            createdAt: true
          }
        }
      }
    });

    const statusMap = {};
    videos.forEach(video => {
      statusMap[video.id] = {
        status: video.transcriptionStatus,
        hasTranscript: !!video.transcript,
        transcriptCreatedAt: video.transcript?.createdAt
      };
    });

    res.json({
      success: true,
      statuses: statusMap
    });

  } catch (error) {
    console.error('Get transcription status route error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get transcription status'
    });
  }
});

// Multilingual transcription with Deepgram
router.post('/transcribe-multilingual/:videoId', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const { languages = ['en-US'] } = req.body; // Array of language codes

    console.log(`🌍 Starting multilingual transcription for video ${videoId}`);
    console.log('📋 Requested languages:', languages);

    // Get video details to check ownership
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const video = await prisma.video.findFirst({
      where: {
        id: videoId,
        userId: req.user.userId
      }
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found or access denied'
      });
    }

    // Validate languages
    const supportedLanguages = deepgramTranscriptionService.getSupportedLanguages();
    const validLanguages = languages.filter(lang =>
      deepgramTranscriptionService.isLanguageSupported(lang)
    );

    if (validLanguages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid languages specified',
        supportedLanguages: Object.keys(supportedLanguages)
      });
    }

    // Update video transcription status
    await prisma.video.update({
      where: { id: videoId },
      data: { transcriptionStatus: 'processing' }
    });

    // Start multilingual transcription
    const result = await deepgramTranscriptionService.transcribeMultiLanguage(
      video.url,
      validLanguages
    );

    // Store transcription results in database
    await prisma.transcript.upsert({
      where: { videoId },
      update: {
        transcriptions: result.transcriptions,
        processedLanguages: validLanguages,
        processingStatus: 'completed',
        updatedAt: new Date()
      },
      create: {
        videoId,
        transcriptions: result.transcriptions,
        processedLanguages: validLanguages,
        processingStatus: 'completed'
      }
    });

    // Update video status
    await prisma.video.update({
      where: { id: videoId },
      data: { transcriptionStatus: 'completed' }
    });

    await prisma.$disconnect();

    res.json({
      success: true,
      message: 'Multilingual transcription completed',
      videoId,
      processedLanguages: validLanguages,
      transcriptions: result.transcriptions,
      metadata: result.metadata
    });

  } catch (error) {
    console.error('Multilingual transcription route error:', error);

    // Update video status to failed
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      await prisma.video.update({
        where: { id: req.params.videoId },
        data: { transcriptionStatus: 'failed' }
      });
      await prisma.$disconnect();
    } catch (updateError) {
      console.error('Failed to update video status:', updateError);
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Multilingual transcription failed'
    });
  }
});

// Get multilingual transcript for a video
router.get('/transcript-multilingual/:videoId', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const { language } = req.query; // Optional: get specific language

    console.log(`📋 Fetching transcript for video ${videoId}, language: ${language || 'all'}`);
    console.log(`👤 User ID: ${req.user.userId}`);

    // Get video details to check ownership using memory storage
    const video = await memoryStorage.getVideoById(videoId, req.user.userId);
    console.log(`🎬 Video found:`, video ? 'YES' : 'NO');

    if (!video) {
      console.log(`❌ Video ${videoId} not found for user ${req.user.userId}`);

      // Let's check what videos exist for this user
      const userVideos = await memoryStorage.getVideosByUser(req.user.userId);
      console.log(`📹 User has ${userVideos.length} videos:`, userVideos.map(v => v.id));

      return res.status(404).json({
        success: false,
        error: 'Video not found or access denied'
      });
    }

    // Get transcript from memory storage
    const transcript = await memoryStorage.getTranscriptByVideoId(videoId);
    console.log(`📋 Transcript found:`, transcript ? 'YES' : 'NO');

    if (!transcript) {
      console.log(`❌ No transcript found for video ${videoId}`);
      return res.status(404).json({
        success: false,
        error: 'No transcript found for this video'
      });
    }

    console.log(`✅ Found transcript with ${Object.keys(transcript.transcriptions || {}).length} languages`);

    // Return specific language or all languages
    if (language && transcript.transcriptions && transcript.transcriptions[language]) {
      res.json({
        success: true,
        videoId,
        language,
        transcript: transcript.transcriptions[language],
        availableLanguages: transcript.processedLanguages || []
      });
    } else {
      res.json({
        success: true,
        videoId,
        transcriptions: transcript.transcriptions || {},
        processedLanguages: transcript.processedLanguages || [],
        processingStatus: transcript.processingStatus || 'completed'
      });
    }

  } catch (error) {
    console.error('Get multilingual transcript route error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get transcript'
    });
  }
});

// Get supported languages
router.get('/supported-languages', (req, res) => {
  try {
    const supportedLanguages = deepgramTranscriptionService.getSupportedLanguages();

    res.json({
      success: true,
      supportedLanguages
    });
  } catch (error) {
    console.error('Get supported languages route error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get supported languages'
    });
  }
});

module.exports = router;
