const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class ClarifaiService {
  constructor() {
    this.apiKey = process.env.CLARIFAI_API_KEY;
    this.baseUrl = 'https://api.clarifai.com/v2';
    
    if (!this.apiKey) {
      console.log('⚠️ Clarifai API key not found. Video tagging features will be disabled.');
    }
  }

  // Extract frames from video for analysis
  async extractFrames(videoUrl, outputDir, frameInterval = 10) {
    return new Promise((resolve, reject) => {
      console.log('🎬 Extracting frames from video...');
      
      const frames = [];
      let frameCount = 0;
      
      ffmpeg(videoUrl)
        .outputOptions([
          `-vf fps=1/${frameInterval}`, // Extract one frame every N seconds
          '-q:v 2' // High quality
        ])
        .output(path.join(outputDir, 'frame_%03d.jpg'))
        .on('end', () => {
          // Get list of generated frames
          const files = fs.readdirSync(outputDir).filter(file => file.startsWith('frame_'));
          files.sort().forEach(file => {
            frames.push(path.join(outputDir, file));
          });
          
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

  // Convert image to base64
  async imageToBase64(imagePath) {
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      return imageBuffer.toString('base64');
    } catch (error) {
      console.error('Error converting image to base64:', error);
      throw error;
    }
  }

  // Analyze single frame with Clarifai
  async analyzeFrame(framePath, timestamp) {
    try {
      if (!this.apiKey) {
        throw new Error('Clarifai API key not configured');
      }

      console.log(`🔍 Analyzing frame at ${timestamp}s...`);

      const imageBase64 = await this.imageToBase64(framePath);

      const response = await axios.post(
        `${this.baseUrl}/models/aaa03c23b3724a16a56b629203edc62c/outputs`, // General model
        {
          inputs: [{
            data: {
              image: {
                base64: imageBase64
              }
            }
          }]
        },
        {
          headers: {
            'Authorization': `Key ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const predictions = response.data.outputs[0].data.concepts || [];
      
      const tags = predictions.map(concept => ({
        label: concept.name,
        confidence: concept.value,
        timestamp: timestamp,
        type: 'object'
      }));

      return tags;

    } catch (error) {
      console.error('Error analyzing frame with Clarifai:', error);
      
      // Return fallback tags
      return [{
        label: 'video content',
        confidence: 0.5,
        timestamp: timestamp,
        type: 'general'
      }];
    }
  }

  // Analyze video with Clarifai (alternative method for direct video analysis)
  async analyzeVideoDirectly(videoUrl) {
    try {
      if (!this.apiKey) {
        throw new Error('Clarifai API key not configured');
      }

      console.log('🎥 Analyzing video directly with Clarifai...');

      const response = await axios.post(
        `${this.baseUrl}/models/aaa03c23b3724a16a56b629203edc62c/outputs`,
        {
          inputs: [{
            data: {
              video: {
                url: videoUrl
              }
            }
          }]
        },
        {
          headers: {
            'Authorization': `Key ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const predictions = response.data.outputs[0].data.concepts || [];
      
      const tags = predictions.map(concept => ({
        label: concept.name,
        confidence: concept.value,
        timestamp: 0, // Video-level tags don't have specific timestamps
        type: 'video'
      }));

      return tags;

    } catch (error) {
      console.error('Error analyzing video directly with Clarifai:', error);
      throw error;
    }
  }

  // Remove duplicate tags
  deduplicateTags(tags) {
    const uniqueTags = [];
    const seen = new Set();

    for (const tag of tags) {
      const key = `${tag.label}-${tag.type}`;
      if (!seen.has(key) && tag.confidence > 0.3) { // Filter low confidence tags
        seen.add(key);
        uniqueTags.push(tag);
      }
    }

    return uniqueTags.sort((a, b) => b.confidence - a.confidence);
  }

  // Process video for vision analysis
  async processVideoVision(videoId, videoUrl, frameInterval = 10) {
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

      let allTags = [];

      try {
        // Try direct video analysis first
        const videoTags = await this.analyzeVideoDirectly(videoUrl);
        allTags.push(...videoTags);
        console.log(`✅ Direct video analysis completed: ${videoTags.length} tags`);
      } catch (error) {
        console.log('Direct video analysis failed, falling back to frame analysis...');
        
        // Fallback to frame-by-frame analysis
        const frames = await this.extractFrames(videoUrl, tempDir, frameInterval);

        for (let i = 0; i < frames.length; i++) {
          const framePath = frames[i];
          const timestamp = i * frameInterval;
          
          console.log(`🔍 Analyzing frame ${i + 1}/${frames.length} at ${timestamp}s`);
          
          const frameTags = await this.analyzeFrame(framePath, timestamp);
          allTags.push(...frameTags);
        }
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
      console.error(`❌ Vision analysis error for video ${videoId}:`, error);
      
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

  // Clean up temporary directory
  cleanupTempDir(tempDir) {
    try {
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        files.forEach(file => {
          const filePath = path.join(tempDir, file);
          fs.unlinkSync(filePath);
        });
        fs.rmdirSync(tempDir);
        console.log('🧹 Temporary files cleaned up');
      }
    } catch (error) {
      console.error('Error cleaning up temp directory:', error);
    }
  }

  // Get vision analysis status
  async getVisionStatus(videoId) {
    try {
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        include: {
          tags: {
            orderBy: { confidence: 'desc' }
          }
        }
      });

      if (!video) {
        throw new Error('Video not found');
      }

      return {
        status: video.visionStatus,
        tags: video.tags
      };
    } catch (error) {
      console.error('Error getting vision status:', error);
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

module.exports = new ClarifaiService();
