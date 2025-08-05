const express = require('express');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../auth');
const transcriptionService = require('../services/simpleTranscriptionService');
const visionService = require('../services/simpleVisionService');
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
    console.warn('⚠️ Database unavailable, using memory storage for upload');
    isDatabaseAvailable = false;
  }
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  timeout: 300000, // 5 minutes timeout
});

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept video files
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'), false);
    }
  }
});

// Configure multer for image uploads
const imageUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for images
  },
  fileFilter: (req, file, cb) => {
    // Accept image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Upload video endpoint
router.post('/', authenticateToken, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const { title, description } = req.body;

    console.log('Uploading video to Cloudinary...');
    
    // Upload to Cloudinary with improved timeout handling
    const uploadResult = await new Promise((resolve, reject) => {
      // Set a longer timeout for the upload
      const timeout = setTimeout(() => {
        reject(new Error('Upload timeout - please try again with a smaller file or check your connection'));
      }, 600000); // 10 minutes

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video',
          folder: 'footage-flow',
          public_id: `video_${Date.now()}`,
          // Add simple thumbnail generation
          eager: [
            { width: 300, height: 200, crop: 'fill', format: 'jpg', resource_type: 'image' }
          ],
          chunk_size: 10000000, // 10MB chunks for faster upload
          timeout: 180000, // 3 minutes timeout
          use_filename: false, // Faster without filename processing
          unique_filename: true,
          // Optimize for speed
          quality: 'auto:low' // Lower quality for faster upload
        },
        (error, result) => {
          clearTimeout(timeout);
          if (error) {
            console.error('Cloudinary upload error:', error);

            // Handle specific Cloudinary errors
            if (error.http_code === 499 || error.name === 'TimeoutError') {
              reject(new Error('Upload timeout - please try again with a smaller file or check your connection'));
            } else if (error.http_code === 413) {
              reject(new Error('File too large - please use a file smaller than 100MB'));
            } else if (error.http_code === 400) {
              reject(new Error('Invalid file format - please upload a valid video file'));
            } else {
              reject(new Error(`Upload failed: ${error.message || 'Unknown error'}`));
            }
          } else {
            resolve(result);
          }
        }
      );

      uploadStream.end(req.file.buffer);
    });

    console.log('Video uploaded to Cloudinary:', uploadResult.public_id);

    // Save video metadata to memory storage
    const video = await memoryStorage.createVideo({
      userId: req.user.userId,
      title: title || `Video ${new Date().toLocaleDateString()}`,
      description: description || '',
      url: uploadResult.secure_url,
      cloudinaryId: uploadResult.public_id,
      duration: uploadResult.duration,
      thumbnailUrl: uploadResult.eager?.[0]?.secure_url || uploadResult.secure_url,
      transcriptionStatus: 'pending',
      visionStatus: 'pending'
    });

    console.log('Video metadata saved to database:', video.id);

    // Start AI processing in background (don't wait for completion)
    setTimeout(async () => {
      try {
        // Use Groq Whisper for transcription, fallback to Deepgram, then mock
        let transcriptionService;
        let transcriptionMethod;

        if (process.env.GROQ_API_KEY) {
          console.log('🎙️ Using Groq Whisper for real transcription');
          transcriptionService = require('../services/groqWhisperService');
          transcriptionMethod = 'transcribeVideoWithWhisper';
        } else if (process.env.DEEPGRAM_API_KEY) {
          console.log('🎙️ Using Deepgram for real transcription with auto-detection');
          transcriptionService = require('../services/deepgramTranscriptionService');
          transcriptionMethod = 'transcribeWithAutoDetection';
        } else {
          console.log('⚠️ No transcription API keys found, using enhanced mock transcription');
          transcriptionService = require('../services/fastTranscriptionService');
          transcriptionMethod = 'transcribeVideoFast';
        }

        console.log(`🎬 Starting background processing for video ${video.id}`);

        // Update status to processing
        await memoryStorage.updateVideo(video.id, {
          transcriptionStatus: 'processing',
          visionStatus: 'processing'
        });

        // Start both transcription and vision analysis
        const [transcriptionResult] = await Promise.allSettled([
          transcriptionService[transcriptionMethod](video.url, ['en-US'])
            .then(async (result) => {
              // Store transcription results (handle both Deepgram auto-detection and mock formats)
              const transcriptions = result.transcriptions || result;
              const detectedLanguages = Object.keys(transcriptions);
              console.log(`📝 Storing transcript with ${detectedLanguages.length} language(s): ${detectedLanguages.join(', ')}`);

              await memoryStorage.createTranscript(video.id, {
                transcriptions: transcriptions,
                processedLanguages: detectedLanguages,
                processingStatus: 'completed'
              });

              // Update video status
              await memoryStorage.updateVideo(video.id, {
                transcriptionStatus: 'completed'
              });

              console.log(`✅ Transcription completed for video ${video.id}`);
              return result;
            })
            .catch(async (error) => {
              console.error(`❌ Transcription failed for video ${video.id}:`, error);
              await memoryStorage.updateVideo(video.id, {
                transcriptionStatus: 'failed'
              });
              throw error;
            }),

          visionService.autoAnalyzeVideo(video.id, video.url).catch(async (error) => {
            console.error(`❌ Vision analysis failed for video ${video.id}:`, error);
            await memoryStorage.updateVideo(video.id, {
              visionStatus: 'failed'
            });
            throw error;
          })
        ]);

        console.log(`🎉 Background processing completed for video ${video.id}`);

      } catch (error) {
        console.error(`❌ Background processing error for video ${video.id}:`, error);
      }
    }, 1000); // Small delay to ensure response is sent first

    res.status(201).json({
      message: 'Video uploaded successfully',
      video: {
        id: video.id,
        title: video.title,
        description: video.description,
        url: video.url,
        thumbnailUrl: video.thumbnailUrl,
        duration: video.duration,
        uploadDate: video.uploadDate,
        transcriptionStatus: video.transcriptionStatus,
        visionStatus: video.visionStatus
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    if (error.message === 'Only video files are allowed') {
      return res.status(400).json({ error: error.message });
    }
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum size is 100MB.' });
    }

    res.status(500).json({ 
      error: 'Failed to upload video',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get upload status
router.get('/status/:videoId', authenticateToken, async (req, res) => {
  try {
    const video = await memoryStorage.getVideoById(req.params.videoId, req.user.userId);

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Return only the needed fields
    res.json({
      id: video.id,
      title: video.title,
      transcriptionStatus: video.transcriptionStatus,
      visionStatus: video.visionStatus,
      uploadDate: video.uploadDate
    });
  } catch (error) {
    console.error('Error fetching upload status:', error);
    res.status(500).json({ error: 'Failed to fetch upload status' });
  }
});

// Upload profile image endpoint
router.post('/image', authenticateToken, imageUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    console.log('Uploading image to Cloudinary...');

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: 'footage-flow/avatars',
          public_id: `avatar_${req.user.userId}_${Date.now()}`,
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' }
          ]
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(new Error(`Upload failed: ${error.message || 'Unknown error'}`));
          } else {
            resolve(result);
          }
        }
      );

      uploadStream.end(req.file.buffer);
    });

    console.log('Image uploaded to Cloudinary:', uploadResult.public_id);

    res.status(201).json({
      message: 'Image uploaded successfully',
      imageUrl: uploadResult.secure_url
    });

  } catch (error) {
    console.error('Image upload error:', error);

    if (error.message === 'Only image files are allowed') {
      return res.status(400).json({ error: error.message });
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum size is 5MB.' });
    }

    res.status(500).json({
      error: 'Failed to upload image',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
