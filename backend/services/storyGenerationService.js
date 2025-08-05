const path = require('path');
const fs = require('fs');
const videoProcessingService = require('./videoProcessingService');

class StoryGenerationService {
  constructor() {
    // Initialize Gemini AI (if available)
    try {
      if (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('YOUR_API_KEY')) {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        console.log('✅ Gemini AI initialized for story generation');
      } else {
        console.log('⚠️ Gemini AI not configured, using fallback story generation');
      }
    } catch (error) {
      console.log('⚠️ Gemini AI module not available, using fallback story generation');
    }
  }

  /**
   * Generate a text-based story from video transcripts
   */
  async generateTextStory(prompt, videos, transcripts) {
    try {
      console.log('📝 Generating text story...');
      
      if (this.model) {
        console.log('🤖 Using Gemini AI for text story generation...');
        return await this.generateWithGemini(prompt, videos, transcripts);
      } else {
        return await this.generateFallbackTextStory(prompt, videos, transcripts);
      }
    } catch (error) {
      console.error('❌ Text story generation failed:', error);
      return await this.generateFallbackTextStory(prompt, videos, transcripts);
    }
  }

  /**
   * Generate a video story with editing and transitions
   */
  async generateVideoStory(prompt, videos, selectedVideoIds) {
    try {
      console.log('🎬 Generating video story...');

      if (this.model) {
        console.log('🤖 Using Gemini AI for video story generation...');
        return await this.generateWithGeminiVideo(prompt, videos, selectedVideoIds);
      } else {
        console.log('⚠️ Using fallback video story generation...');
        return await this.generateFallbackVideoStory(prompt, videos, selectedVideoIds);
      }
    } catch (error) {
      console.error('❌ Video story generation failed:', error);
      return await this.generateFallbackVideoStory(prompt, videos, selectedVideoIds);
    }
  }

  /**
   * Generate fallback video story when Gemini fails
   */
  async generateFallbackVideoStory(prompt, videos, selectedVideoIds) {
    try {
      console.log('🎬 Generating fallback video story...');

      // Create a simple video story plan
      const segments = videos.map((video, index) => ({
        id: `segment_${index + 1}`,
        videoId: video.id,
        title: `Segment ${index + 1}: ${video.title}`,
        startTime: 0,
        endTime: Math.min(video.duration, 30), // Use first 30 seconds
        duration: Math.min(video.duration, 30),
        description: `Selected clip from ${video.title}`,
        transition: index < videos.length - 1 ? 'fade' : 'none'
      }));

      const storyPlan = {
        title: this.extractTitleFromPrompt(prompt),
        description: `Video compilation: ${prompt}`,
        segments: segments,
        totalDuration: segments.reduce((total, seg) => total + seg.duration, 0),
        style: 'Simple compilation'
      };

      return {
        success: true,
        storyType: 'video',
        title: this.extractTitleFromPrompt(prompt),
        description: `AI-generated video story: ${prompt}`,
        storyPlan: storyPlan,
        estimatedDuration: storyPlan.totalDuration,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Fallback video story generation failed:', error);
      throw error;
    }
  }

  /**
   * Analyze video content to extract key moments and emotions
   */
  async analyzeVideoContent(videos, transcripts) {
    try {
      let analysis = '';

      for (const video of videos) {
        const transcript = transcripts[video.id];
        if (transcript && transcript.transcriptions) {
          const languages = Object.keys(transcript.transcriptions);
          const primaryLang = languages[0];
          const transcriptData = transcript.transcriptions[primaryLang];

          analysis += `Video: ${video.title}\n`;
          analysis += `Duration: ${video.duration} seconds\n`;
          analysis += `Tags: ${video.tags?.map(tag => tag.label).join(', ') || 'None'}\n`;

          if (transcriptData.transcript) {
            analysis += `Transcript: ${transcriptData.transcript}\n`;
          }

          if (transcriptData.segments && transcriptData.segments.length > 0) {
            analysis += `Key Segments:\n`;
            transcriptData.segments.slice(0, 5).forEach((segment, index) => {
              analysis += `[${this.formatTime(segment.start)} - ${this.formatTime(segment.end)}] ${segment.text}\n`;
            });
          }

          analysis += '\n';
        }
      }

      return analysis || 'No video content available for analysis.';
    } catch (error) {
      console.error('❌ Video analysis failed:', error);
      return 'Video analysis unavailable.';
    }
  }

  /**
   * Format time in HH:MM:SS format
   */
  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Generate text story using Gemini AI with video analysis
   */
  async generateWithGemini(prompt, videos, transcripts) {
    try {
      console.log('🤖 Sending request to Gemini AI for text story...');

      // Analyze video content and extract key moments
      const videoAnalysis = await this.analyzeVideoContent(videos, transcripts);

      const fullPrompt = `
        Create an engaging text story based on the following prompt and actual video content:

        User Prompt: "${prompt}"

        Video Analysis:
        ${videoAnalysis}

        Instructions:
        1. Write a creative story that incorporates the actual video content
        2. Use the real dialogue, emotions, and moments from the video
        3. Make it engaging and narrative-driven
        4. Length: 300-500 words
        5. Include specific details from the video transcript

        Write the story in an engaging, literary style that brings the video content to life.
      `;

      console.log('🤖 Sending request to Gemini AI...');

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API timeout after 30 seconds')), 30000)
      );

      const result = await Promise.race([
        this.model.generateContent(fullPrompt),
        timeoutPromise
      ]);

      console.log('📝 Received response from Gemini AI');
      const response = await result.response;
      const story = response.text();

      console.log(`✅ Story generated successfully (${story.length} characters)`);

      return {
        success: true,
        storyType: 'text',
        title: this.extractTitleFromPrompt(prompt),
        content: story,
        wordCount: story.split(' ').length,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Gemini story generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate video story using Gemini AI with semantic analysis
   */
  async generateWithGeminiVideo(prompt, videos, selectedVideoIds) {
    try {
      console.log('🤖 Sending request to Gemini AI for video story...');

      // Get transcripts for the videos
      const transcripts = {};
      for (const video of videos) {
        // This would be populated from the actual transcript data
        transcripts[video.id] = video.transcript || null;
      }

      // Analyze video content for semantic moments
      const videoAnalysis = await this.analyzeVideoContent(videos, transcripts);

      // Prepare video context for the prompt
      const videoContext = videos.map(video => ({
        id: video.id,
        title: video.title,
        description: video.description,
        duration: video.duration,
        tags: video.tags?.map(tag => tag.label).join(', ') || 'No tags',
        url: video.url
      }));

      const fullPrompt = `
        Create a detailed video editing plan based on the following prompt and actual video content:

        User Prompt: "${prompt}"

        Video Analysis:
        ${videoAnalysis}

        Task: Identify key moments in the video that match the prompt (e.g., "funny moments", "emotional scenes", "highlights").

        Return a structured plan with:
        1. Identified moments with timestamps
        2. Emotional tags (laughing, crying, excited, etc.)
        3. Video editing suggestions
        4. Narrative flow for the compilation

        Available Videos:
        ${videoContext.map((video, index) => `
        Video ${index + 1} (ID: ${video.id}): ${video.title}
        Description: ${video.description}
        Duration: ${video.duration} seconds
        Tags: ${video.tags}
        `).join('\n')}

        Create a comprehensive video story plan that includes:
        1. Story title and description
        2. Detailed segments using specific video clips
        3. Timing and transitions between segments
        4. Narrative flow and pacing
        5. Target duration and style

        Format as a structured video editing plan with specific timestamps and video references.
      `;

      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      const storyPlan = response.text();

      // Create structured story plan
      const segments = this.parseVideoStoryPlan(storyPlan, videos);

      const storyPlanData = {
        description: storyPlan,
        segments: segments,
        totalDuration: segments.reduce((total, seg) => total + seg.duration, 0),
        style: 'AI-generated compilation'
      };

      // Generate actual video
      console.log('🎬 Starting video generation process...');
      const videoResult = await videoProcessingService.generateVideoStory(storyPlanData, videos);

      // Upload to Cloudinary
      const storyId = `story_${Date.now()}`;
      const cloudinaryResult = await videoProcessingService.uploadToCloudinary(videoResult.videoPath, storyId);

      // Clean up local file
      videoProcessingService.cleanup([videoResult.videoPath]);

      return {
        success: true,
        storyType: 'video',
        title: this.extractTitleFromPrompt(prompt),
        description: `AI-generated video story: ${prompt}`,
        videoUrl: cloudinaryResult.url,
        storyPlan: storyPlanData,
        estimatedDuration: cloudinaryResult.duration,
        generatedAt: new Date().toISOString(),
        isVideoGenerated: true
      };
    } catch (error) {
      console.error('❌ Gemini video story generation failed:', error);
      throw error;
    }
  }

  /**
   * Parse Gemini-generated video story plan into structured segments
   */
  parseVideoStoryPlan(storyPlan, videos) {
    // Simple parsing - in production, this could be more sophisticated
    const segments = videos.map((video, index) => ({
      id: `segment_${index + 1}`,
      videoId: video.id,
      title: `Segment ${index + 1}: ${video.title}`,
      startTime: 0,
      endTime: Math.min(video.duration, 30), // Use first 30 seconds
      duration: Math.min(video.duration, 30),
      description: `AI-selected clip from ${video.title}`,
      transition: index < videos.length - 1 ? 'fade' : 'none'
    }));

    return segments;
  }

  /**
   * Fallback text story generation
   */
  async generateFallbackTextStory(prompt, videos, transcripts) {
    console.log('📝 Using fallback text story generation...');
    
    const context = this.prepareContextFromTranscripts(transcripts);
    const title = this.extractTitleFromPrompt(prompt);
    
    // Create a simple story structure
    const story = `
# ${title}

${this.generateStoryOpening(prompt)}

${this.generateStoryBody(prompt, context)}

${this.generateStoryConclusion(prompt)}
    `.trim();

    return {
      success: true,
      storyType: 'text',
      title,
      content: story,
      wordCount: story.split(' ').length,
      generatedAt: new Date().toISOString(),
      method: 'fallback'
    };
  }

  /**
   * Create a video story plan
   */
  async createVideoStoryPlan(prompt, videos, selectedVideoIds) {
    const selectedVideos = videos.filter(video => 
      selectedVideoIds.length === 0 || selectedVideoIds.includes(video.id)
    );

    const segments = selectedVideos.map((video, index) => ({
      order: index + 1,
      videoId: video.id,
      title: video.title,
      startTime: 0,
      endTime: Math.min(video.duration || 30, 30), // Max 30 seconds per segment
      transition: index === 0 ? 'fade-in' : 'crossfade',
      description: `Segment ${index + 1}: ${video.title}`
    }));

    const totalDuration = segments.reduce((sum, segment) => 
      sum + (segment.endTime - segment.startTime), 0
    );

    return {
      title: this.extractTitleFromPrompt(prompt),
      description: prompt,
      segments,
      totalDuration,
      videoCount: segments.length,
      style: this.detectVideoStyle(prompt),
      music: this.suggestMusic(prompt)
    };
  }

  /**
   * Helper methods
   */
  prepareContextFromTranscripts(transcripts) {
    if (!transcripts || transcripts.length === 0) {
      return 'No transcript content available.';
    }

    return transcripts.map(transcript => {
      if (transcript.transcriptions) {
        // Extract English transcript if available
        const englishTranscript = transcript.transcriptions['en-US'];
        return englishTranscript ? englishTranscript.transcript : 'No English transcript available.';
      }
      return 'Transcript processing in progress.';
    }).join('\n\n');
  }

  extractTitleFromPrompt(prompt) {
    // Extract a title from the prompt
    const words = prompt.split(' ').slice(0, 6);
    return words.join(' ').replace(/[^\w\s]/gi, '').trim() || 'My Story';
  }

  generateStoryOpening(prompt) {
    const openings = [
      `This is a story about ${prompt.toLowerCase()}.`,
      `Once upon a time, there was a journey that began with ${prompt.toLowerCase()}.`,
      `The adventure started when ${prompt.toLowerCase()}.`,
      `In this tale of ${prompt.toLowerCase()}, we discover...`
    ];
    return openings[Math.floor(Math.random() * openings.length)];
  }

  generateStoryBody(prompt, context) {
    if (context && context !== 'No transcript content available.') {
      return `The story unfolds through various moments captured in the videos. ${context.substring(0, 200)}... Each scene adds depth to the narrative, creating a rich tapestry of experiences.`;
    }
    return `The journey continues with various experiences and moments that shape the narrative. Each chapter brings new insights and discoveries, building towards a meaningful conclusion.`;
  }

  generateStoryConclusion(prompt) {
    return `And so, this story of ${prompt.toLowerCase()} comes to a close, leaving us with memories and lessons that will last a lifetime. The end is just the beginning of new adventures to come.`;
  }

  detectVideoStyle(prompt) {
    const styles = {
      travel: /travel|trip|vacation|journey|explore/i,
      motivational: /inspire|motivat|growth|success|achieve/i,
      lifestyle: /life|daily|routine|vlog/i,
      adventure: /adventure|trek|climb|outdoor/i
    };

    for (const [style, regex] of Object.entries(styles)) {
      if (regex.test(prompt)) {
        return style;
      }
    }
    return 'general';
  }

  suggestMusic(prompt) {
    const musicStyles = {
      travel: 'upbeat-acoustic',
      motivational: 'inspiring-orchestral',
      lifestyle: 'chill-ambient',
      adventure: 'energetic-rock'
    };

    const style = this.detectVideoStyle(prompt);
    return musicStyles[style] || 'ambient';
  }
}

module.exports = new StoryGenerationService();
