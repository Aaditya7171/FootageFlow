const vision = require('@google-cloud/vision');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class VisionService {
  constructor() {
    // Initialize Google Cloud Vision client
    this.client = new vision.ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS, // Optional: use service account
      // Or use API key (simpler for MVP)
    });
    
    this.geminiApiKey = process.env.GEMINI_API_KEY;
  }

  async analyzeVideo(videoId, videoUrl) {
    try {
      console.log(`Starting vision analysis for video ${videoId}`);
      
      // Update status to processing
      await prisma.video.update({
        where: { id: videoId },
        data: { visionStatus: 'processing' }
      });

      // Extract frames from video (using Cloudinary transformations)
      const frames = await this.extractFrames(videoUrl);
      
      // Analyze each frame
      const allTags = [];
      for (let i = 0; i < frames.length; i++) {
        const frameUrl = frames[i];
        const timestamp = (i * 10); // Assuming frames every 10 seconds
        
        try {
          const frameTags = await this.analyzeFrame(frameUrl, timestamp);
          allTags.push(...frameTags);
        } catch (error) {
          console.error(`Error analyzing frame ${i}:`, error);
        }
      }

      // Remove duplicates and save tags
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

      console.log(`Vision analysis completed for video ${videoId}. Generated ${uniqueTags.length} tags.`);
      return uniqueTags;

    } catch (error) {
      console.error(`Vision analysis error for video ${videoId}:`, error);
      
      // Update status to failed
      await prisma.video.update({
        where: { id: videoId },
        data: { visionStatus: 'failed' }
      });

      throw error;
    }
  }

  async extractFrames(videoUrl, maxFrames = 5) {
    try {
      // Use Cloudinary's video transformation to extract frames
      const cloudinaryBaseUrl = videoUrl.split('/upload/')[0] + '/upload/';
      const videoPath = videoUrl.split('/upload/')[1];
      
      const frames = [];
      for (let i = 0; i < maxFrames; i++) {
        const timestamp = Math.floor((i + 1) * (100 / (maxFrames + 1))); // Distribute frames across video
        const frameUrl = `${cloudinaryBaseUrl}so_${timestamp}p,f_jpg/${videoPath}`;
        frames.push(frameUrl);
      }
      
      return frames;
    } catch (error) {
      console.error('Error extracting frames:', error);
      // Fallback: return original video URL (will be handled by vision API)
      return [videoUrl];
    }
  }

  async analyzeFrame(imageUrl, timestamp = 0) {
    try {
      // Use Gemini Vision API for analysis (more cost-effective than Google Cloud Vision)
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${this.geminiApiKey}`,
        {
          contents: [{
            parts: [
              {
                text: "Analyze this video frame and provide a JSON response with the following structure: {\"objects\": [list of objects/items visible], \"scenes\": [description of the scene/setting], \"activities\": [actions or activities happening], \"emotions\": [emotions or moods conveyed], \"text\": [any text visible in the image]}. Be concise and focus on the most prominent elements."
              },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: await this.getImageAsBase64(imageUrl)
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.4,
            topK: 32,
            topP: 1,
            maxOutputTokens: 1024,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const analysisText = response.data.candidates[0].content.parts[0].text;
      return this.parseGeminiResponse(analysisText, timestamp);

    } catch (error) {
      console.error('Error analyzing frame with Gemini:', error);
      
      // Fallback to basic analysis
      return this.generateFallbackTags(timestamp);
    }
  }

  async getImageAsBase64(imageUrl) {
    try {
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      return Buffer.from(response.data, 'binary').toString('base64');
    } catch (error) {
      console.error('Error fetching image:', error);
      throw error;
    }
  }

  parseGeminiResponse(analysisText, timestamp) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        const tags = [];

        // Convert analysis to tags
        if (analysis.objects) {
          analysis.objects.forEach(obj => {
            tags.push({
              label: obj.toLowerCase(),
              confidence: 0.8,
              timestamp,
              type: 'object'
            });
          });
        }

        if (analysis.scenes) {
          analysis.scenes.forEach(scene => {
            tags.push({
              label: scene.toLowerCase(),
              confidence: 0.7,
              timestamp,
              type: 'scene'
            });
          });
        }

        if (analysis.activities) {
          analysis.activities.forEach(activity => {
            tags.push({
              label: activity.toLowerCase(),
              confidence: 0.75,
              timestamp,
              type: 'activity'
            });
          });
        }

        if (analysis.emotions) {
          analysis.emotions.forEach(emotion => {
            tags.push({
              label: emotion.toLowerCase(),
              confidence: 0.6,
              timestamp,
              type: 'emotion'
            });
          });
        }

        if (analysis.text && analysis.text.length > 0) {
          analysis.text.forEach(text => {
            if (text.trim()) {
              tags.push({
                label: text.toLowerCase(),
                confidence: 0.9,
                timestamp,
                type: 'text'
              });
            }
          });
        }

        return tags;
      }
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
    }

    // Fallback parsing
    return this.generateFallbackTags(timestamp);
  }

  generateFallbackTags(timestamp) {
    // Generate some basic tags as fallback
    return [
      { label: 'video content', confidence: 0.5, timestamp, type: 'general' },
      { label: 'media', confidence: 0.5, timestamp, type: 'general' }
    ];
  }

  deduplicateTags(tags) {
    const tagMap = new Map();
    
    tags.forEach(tag => {
      const key = `${tag.label}-${tag.type}`;
      if (!tagMap.has(key) || tagMap.get(key).confidence < tag.confidence) {
        tagMap.set(key, tag);
      }
    });

    return Array.from(tagMap.values())
      .filter(tag => tag.confidence > 0.3) // Filter low confidence tags
      .sort((a, b) => b.confidence - a.confidence);
  }
}

module.exports = new VisionService();
