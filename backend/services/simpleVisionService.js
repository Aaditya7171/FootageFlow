const axios = require('axios');
const memoryStorage = require('./memoryStorage');

class SimpleVisionService {
  constructor() {
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    this.clarifaiApiKey = process.env.CLARIFAI_API_KEY;
    this.geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
    
    if (!this.geminiApiKey && !this.clarifaiApiKey) {
      console.log('⚠️ No AI API keys found. Vision analysis features will be disabled.');
    }
  }

  // Generate intelligent tags based on video URL and metadata
  async generateSmartTags(videoUrl, videoId) {
    try {
      console.log('🔍 Generating smart tags with AI...');

      // Extract video filename/title from URL for context
      const urlParts = videoUrl.split('/');
      const filename = urlParts[urlParts.length - 1];
      const videoTitle = filename.replace(/\.[^/.]+$/, "").replace(/_/g, ' ');

      let tags = [];

      // Try Gemini first
      if (this.geminiApiKey) {
        try {
          const response = await axios.post(
            `${this.geminiUrl}?key=${this.geminiApiKey}`,
            {
              contents: [{
                parts: [{
                  text: `Analyze this video and generate relevant tags. Video URL: ${videoUrl}, Title: ${videoTitle}
                  
                  Based on the video title and context, generate 10-15 relevant tags that might describe the video content. Include:
                  - Content type (music, tutorial, vlog, etc.)
                  - Mood/emotion tags
                  - Subject matter
                  - Visual elements that might be present
                  - Genre or category
                  
                  Return the tags as a JSON array with objects containing: label, confidence (0-1), type (content/emotion/visual/genre).
                  
                  Example format:
                  [
                    {"label": "music", "confidence": 0.9, "type": "content"},
                    {"label": "emotional", "confidence": 0.7, "type": "emotion"}
                  ]`
                }]
              }],
              generationConfig: {
                temperature: 0.3,
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

          const responseText = response.data.candidates[0].content.parts[0].text;
          
          // Try to parse JSON from the response
          try {
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              const parsedTags = JSON.parse(jsonMatch[0]);
              tags = parsedTags.map((tag, index) => ({
                label: tag.label.toLowerCase(),
                confidence: tag.confidence || 0.7,
                timestamp: index * 5, // Spread across video
                type: tag.type || 'general'
              }));
            }
          } catch (parseError) {
            console.log('Could not parse JSON, using fallback parsing');
          }
        } catch (error) {
          console.log('Gemini analysis failed, using fallback');
        }
      }

      // If no tags generated, create smart fallback tags based on filename
      if (tags.length === 0) {
        tags = this.generateFallbackTags(videoTitle, videoUrl);
      }

      console.log(`✅ Generated ${tags.length} smart tags`);
      return tags;

    } catch (error) {
      console.error('❌ Smart tag generation failed:', error);
      return this.generateFallbackTags('video', videoUrl);
    }
  }

  // Generate fallback tags based on video title and URL
  generateFallbackTags(videoTitle, videoUrl) {
    const tags = [];
    const title = videoTitle.toLowerCase();
    
    // Content type detection
    if (title.includes('music') || title.includes('song') || title.includes('audio')) {
      tags.push({ label: 'music', confidence: 0.8, timestamp: 0, type: 'content' });
      tags.push({ label: 'audio', confidence: 0.7, timestamp: 5, type: 'content' });
    }
    
    if (title.includes('tutorial') || title.includes('how to') || title.includes('guide')) {
      tags.push({ label: 'tutorial', confidence: 0.9, timestamp: 0, type: 'content' });
      tags.push({ label: 'educational', confidence: 0.8, timestamp: 5, type: 'content' });
    }
    
    if (title.includes('vlog') || title.includes('daily') || title.includes('life')) {
      tags.push({ label: 'vlog', confidence: 0.8, timestamp: 0, type: 'content' });
      tags.push({ label: 'lifestyle', confidence: 0.7, timestamp: 5, type: 'content' });
    }
    
    // Emotion detection
    if (title.includes('happy') || title.includes('joy') || title.includes('fun')) {
      tags.push({ label: 'happy', confidence: 0.7, timestamp: 10, type: 'emotion' });
    }
    
    if (title.includes('sad') || title.includes('emotional') || title.includes('touching')) {
      tags.push({ label: 'emotional', confidence: 0.7, timestamp: 10, type: 'emotion' });
    }
    
    // Generic tags
    tags.push({ label: 'video content', confidence: 0.6, timestamp: 0, type: 'general' });
    tags.push({ label: 'media', confidence: 0.5, timestamp: 15, type: 'general' });
    
    // Add more tags based on common video elements
    tags.push({ label: 'visual', confidence: 0.6, timestamp: 20, type: 'visual' });
    tags.push({ label: 'entertainment', confidence: 0.5, timestamp: 25, type: 'genre' });
    
    return tags;
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
  async processVideoVision(videoId, videoUrl) {
    try {
      // Update status to processing
      await memoryStorage.updateVideo(videoId, {
        visionStatus: 'processing'
      });

      console.log(`👁️ Processing vision analysis for video: ${videoId}`);

      // Generate smart tags
      const allTags = await this.generateSmartTags(videoUrl, videoId);

      // Filter and deduplicate tags
      const uniqueTags = this.deduplicateTags(allTags);

      // Save tags to memory storage
      for (const tag of uniqueTags) {
        await memoryStorage.createTag({
          videoId,
          label: tag.label,
          confidence: tag.confidence,
          timestamp: tag.timestamp,
          type: tag.type
        });
      }

      // Update video status
      await memoryStorage.updateVideo(videoId, {
        visionStatus: 'completed'
      });

      console.log(`✅ Vision analysis completed for video: ${videoId}. Found ${uniqueTags.length} unique tags.`);

      return uniqueTags;

    } catch (error) {
      console.error(`❌ Vision analysis error for video ${videoId}:`, error);
      
      // Update status to failed
      await memoryStorage.updateVideo(videoId, {
        visionStatus: 'failed'
      });

      throw error;
    }
  }

  // Get vision analysis status
  async getVisionStatus(videoId) {
    try {
      const video = await memoryStorage.getVideoById(videoId);

      if (!video) {
        throw new Error('Video not found');
      }

      const tags = await memoryStorage.getTagsByVideoId(videoId);

      return {
        status: video.visionStatus,
        tags: tags
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

module.exports = new SimpleVisionService();
