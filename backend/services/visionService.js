const ffmpeg = require('fluent-ffmpeg');
const vision = require('@google-cloud/vision');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Initialize Google Cloud Vision client (optional)
let visionClient = null;
try {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CLOUD_PROJECT) {
    visionClient = new vision.ImageAnnotatorClient({
      // For development, you can use a service account key file
      // keyFilename: 'path/to/service-account-key.json',
      // Or use environment variables for authentication
    });
  } else {
    console.log('⚠️ Google Cloud Vision credentials not found. Using AI fallback for vision analysis.');
  }
} catch (error) {
  console.log('⚠️ Google Cloud Vision initialization failed. Vision analysis features will be disabled.');
}

class VisionService {
  constructor() {
    // Set FFmpeg path if needed (for Windows)
    if (process.platform === 'win32') {
      // You might need to install ffmpeg and set the path
      // ffmpeg.setFfmpegPath('path/to/ffmpeg.exe');
    }
  }

  // Extract frames from video
  async extractFrames(videoPath, outputDir, interval = 5) {
    return new Promise((resolve, reject) => {
      const framePattern = path.join(outputDir, 'frame_%03d.jpg');
      
      ffmpeg(videoPath)
        .output(framePattern)
        .outputOptions([
          '-vf', `fps=1/${interval}`, // Extract 1 frame every N seconds
          '-q:v', '2' // High quality
        ])
        .on('end', () => {
          // Get list of generated frames
          const frames = fs.readdirSync(outputDir)
            .filter(file => file.startsWith('frame_') && file.endsWith('.jpg'))
            .map(file => path.join(outputDir, file));
          
          console.log(`✅ Extracted ${frames.length} frames`);
          resolve(frames);
        })
        .on('error', (err) => {
          console.error('❌ Frame extraction failed:', err);
          reject(err);
        })
        .run();
    });
  }

  // Analyze image with Google Cloud Vision
  async analyzeImage(imagePath, timestamp) {
    try {
      if (!visionClient) {
        throw new Error('Google Cloud Vision not configured. Vision analysis is disabled.');
      }

      const [result] = await visionClient.annotateImage({
        image: { content: fs.readFileSync(imagePath) },
        features: [
          { type: 'LABEL_DETECTION', maxResults: 10 },
          { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
          { type: 'TEXT_DETECTION', maxResults: 5 },
          { type: 'SAFE_SEARCH_DETECTION' },
        ],
      });

      const tags = [];

      // Process labels
      if (result.labelAnnotations) {
        result.labelAnnotations.forEach(label => {
          tags.push({
            label: label.description,
            confidence: label.score,
            timestamp,
            type: 'label'
          });
        });
      }

      // Process objects
      if (result.localizedObjectAnnotations) {
        result.localizedObjectAnnotations.forEach(object => {
          tags.push({
            label: object.name,
            confidence: object.score,
            timestamp,
            type: 'object'
          });
        });
      }

      // Process text
      if (result.textAnnotations && result.textAnnotations.length > 0) {
        const text = result.textAnnotations[0].description;
        if (text && text.trim()) {
          tags.push({
            label: text.trim(),
            confidence: 1.0,
            timestamp,
            type: 'text'
          });
        }
      }

      return tags;
    } catch (error) {
      console.error('❌ Vision analysis failed:', error);
      return [];
    }
  }

  // Process video for vision analysis
  async processVideoVision(videoId, videoUrl, frameInterval = 5) {
    const tempDir = path.join(__dirname, '../temp', videoId);
    
    try {
      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Update status to processing
      await prisma.video.update({
        where: { id: videoId },
        data: { visionStatus: 'processing' }
      });

      console.log(`👁️ Processing vision analysis for video: ${videoId}`);

      // Extract frames from video
      const frames = await this.extractFrames(videoUrl, tempDir, frameInterval);

      const allTags = [];

      // Analyze each frame
      for (let i = 0; i < frames.length; i++) {
        const framePath = frames[i];
        const timestamp = i * frameInterval; // Approximate timestamp
        
        console.log(`🔍 Analyzing frame ${i + 1}/${frames.length} at ${timestamp}s`);
        
        const frameTags = await this.analyzeImage(framePath, timestamp);
        allTags.push(...frameTags);
      }

      // Filter and deduplicate tags
      const uniqueTags = this.deduplicateTags(allTags);

      // Save tags to database
      for (const tag of uniqueTags) {
        await prisma.tag.create({
          data: {
            videoId,
            label: tag.label,
            confidence: tag.confidence,
            timestamp: tag.timestamp,
            type: tag.type
          }
        });
      }

      // Update video status
      await prisma.video.update({
        where: { id: videoId },
        data: { visionStatus: 'completed' }
      });

      console.log(`✅ Vision analysis completed for video: ${videoId}. Found ${uniqueTags.length} unique tags.`);

      // Clean up temporary files
      this.cleanupTempDir(tempDir);

      return uniqueTags;

    } catch (error) {
      console.error(`❌ Vision analysis failed for video ${videoId}:`, error);

      // Update status to failed
      await prisma.video.update({
        where: { id: videoId },
        data: { visionStatus: 'failed' }
      });

      // Clean up temporary files
      this.cleanupTempDir(tempDir);

      throw error;
    }
  }

  // Deduplicate similar tags
  deduplicateTags(tags) {
    const tagMap = new Map();
    
    tags.forEach(tag => {
      const key = `${tag.label.toLowerCase()}_${tag.type}`;
      
      if (!tagMap.has(key)) {
        tagMap.set(key, tag);
      } else {
        // Keep the tag with higher confidence
        const existing = tagMap.get(key);
        if (tag.confidence > existing.confidence) {
          tagMap.set(key, tag);
        }
      }
    });

    return Array.from(tagMap.values())
      .filter(tag => tag.confidence > 0.5) // Filter low confidence tags
      .sort((a, b) => b.confidence - a.confidence); // Sort by confidence
  }

  // Clean up temporary directory
  cleanupTempDir(tempDir) {
    try {
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        files.forEach(file => {
          fs.unlinkSync(path.join(tempDir, file));
        });
        fs.rmdirSync(tempDir);
      }
    } catch (error) {
      console.error('Error cleaning up temp directory:', error);
    }
  }

  // Get tags for a video
  async getVideoTags(videoId) {
    try {
      const tags = await prisma.tag.findMany({
        where: { videoId },
        orderBy: { confidence: 'desc' }
      });

      return tags;
    } catch (error) {
      console.error('Error getting video tags:', error);
      throw error;
    }
  }

  // Search videos by tags
  async searchByTags(query) {
    try {
      const tags = await prisma.tag.findMany({
        where: {
          label: {
            contains: query,
            mode: 'insensitive'
          }
        },
        include: {
          video: {
            select: {
              id: true,
              title: true,
              thumbnailUrl: true,
              duration: true
            }
          }
        },
        orderBy: { confidence: 'desc' }
      });

      // Group by video
      const videoMap = new Map();
      tags.forEach(tag => {
        if (!videoMap.has(tag.videoId)) {
          videoMap.set(tag.videoId, {
            video: tag.video,
            tags: []
          });
        }
        videoMap.get(tag.videoId).tags.push({
          label: tag.label,
          confidence: tag.confidence,
          timestamp: tag.timestamp,
          type: tag.type
        });
      });

      return Array.from(videoMap.values());
    } catch (error) {
      console.error('Error searching by tags:', error);
      throw error;
    }
  }

  // Auto-analyze after upload
  async autoAnalyzeVideo(videoId, videoUrl) {
    try {
      // Run analysis in background
      setImmediate(() => {
        this.processVideoVision(videoId, videoUrl)
          .catch(error => {
            console.error(`Background vision analysis failed for video ${videoId}:`, error);
          });
      });

      return { success: true, message: 'Vision analysis started in background' };
    } catch (error) {
      console.error('Error starting auto-analysis:', error);
      throw error;
    }
  }
}

module.exports = new VisionService();
