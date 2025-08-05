const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const cloudinary = require('cloudinary').v2;

const prisma = new PrismaClient();

class VideoStoryService {
  constructor() {
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    this.geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
    
    if (!this.geminiApiKey) {
      console.log('⚠️ Gemini API key not found. Video story generation will be disabled.');
    }
  }

  // Analyze user prompt to understand story requirements
  async analyzePrompt(prompt, userVideos) {
    try {
      console.log('🔍 Analyzing story prompt with AI...');

      const videoTitles = userVideos.map(v => v.title).join(', ');
      const videoTags = userVideos.flatMap(v => v.tags?.map(t => t.label) || []).join(', ');

      const response = await axios.post(
        `${this.geminiUrl}?key=${this.geminiApiKey}`,
        {
          contents: [{
            parts: [{
              text: `Analyze this story prompt: "${prompt}"

Available videos: ${videoTitles}
Available tags: ${videoTags}

Based on the prompt, identify:
1. What type of story is requested (travel, adventure, tutorial, etc.)
2. What emotions/mood should the story convey
3. Which videos would be most relevant
4. What narrative structure would work best
5. Key themes to highlight

Return a JSON response with:
{
  "storyType": "travel/adventure/tutorial/etc",
  "mood": "inspiring/exciting/educational/etc",
  "relevantKeywords": ["keyword1", "keyword2"],
  "narrative": "suggested narrative approach",
  "themes": ["theme1", "theme2"]
}`
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
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.log('Could not parse JSON, using fallback analysis');
      }

      // Fallback analysis
      return {
        storyType: 'general',
        mood: 'engaging',
        relevantKeywords: prompt.toLowerCase().split(' ').filter(word => word.length > 3),
        narrative: 'chronological',
        themes: ['journey', 'experience']
      };

    } catch (error) {
      console.error('Error analyzing prompt:', error);
      return {
        storyType: 'general',
        mood: 'engaging',
        relevantKeywords: prompt.toLowerCase().split(' ').filter(word => word.length > 3),
        narrative: 'chronological',
        themes: ['journey', 'experience']
      };
    }
  }

  // Select relevant video clips based on analysis
  async selectRelevantClips(analysis, userVideos) {
    console.log('🎬 Selecting relevant video clips...');

    const relevantVideos = [];
    
    for (const video of userVideos) {
      let relevanceScore = 0;
      
      // Check title relevance
      const titleWords = video.title.toLowerCase().split(' ');
      for (const keyword of analysis.relevantKeywords) {
        if (titleWords.some(word => word.includes(keyword.toLowerCase()))) {
          relevanceScore += 3;
        }
      }
      
      // Check tag relevance
      if (video.tags) {
        for (const tag of video.tags) {
          for (const keyword of analysis.relevantKeywords) {
            if (tag.label.toLowerCase().includes(keyword.toLowerCase())) {
              relevanceScore += 2;
            }
          }
          
          // Boost score for story type matches
          if (tag.label.toLowerCase().includes(analysis.storyType.toLowerCase())) {
            relevanceScore += 5;
          }
        }
      }
      
      // Check transcript relevance
      if (video.transcript?.fullText) {
        const transcriptWords = video.transcript.fullText.toLowerCase();
        for (const keyword of analysis.relevantKeywords) {
          if (transcriptWords.includes(keyword.toLowerCase())) {
            relevanceScore += 1;
          }
        }
      }
      
      if (relevanceScore > 0) {
        relevantVideos.push({
          ...video,
          relevanceScore
        });
      }
    }
    
    // Sort by relevance and take top clips
    relevantVideos.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const selectedClips = relevantVideos.slice(0, 5); // Max 5 clips for story
    
    console.log(`✅ Selected ${selectedClips.length} relevant clips`);
    return selectedClips;
  }

  // Generate story script with narration
  async generateStoryScript(prompt, analysis, selectedClips) {
    try {
      console.log('📝 Generating story script...');

      const clipDescriptions = selectedClips.map((clip, index) => 
        `Clip ${index + 1}: ${clip.title} (${clip.transcript?.fullText?.substring(0, 100) || 'No transcript'}...)`
      ).join('\n');

      const response = await axios.post(
        `${this.geminiUrl}?key=${this.geminiApiKey}`,
        {
          contents: [{
            parts: [{
              text: `Create a compelling video story script based on:

Prompt: "${prompt}"
Story Type: ${analysis.storyType}
Mood: ${analysis.mood}
Themes: ${analysis.themes.join(', ')}

Available clips:
${clipDescriptions}

Generate a script with:
1. Opening narration (30-45 seconds)
2. Transitions between clips (10-15 seconds each)
3. Closing narration (30-45 seconds)
4. Suggested titles/text overlays

Format as JSON:
{
  "title": "Story Title",
  "opening": "Opening narration text",
  "transitions": ["Transition 1", "Transition 2", ...],
  "closing": "Closing narration text",
  "textOverlays": ["Title 1", "Title 2", ...],
  "totalDuration": "estimated duration in seconds"
}`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 32,
            topP: 1,
            maxOutputTokens: 2048,
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
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.log('Could not parse JSON, using fallback script');
      }

      // Fallback script
      return {
        title: `${analysis.storyType.charAt(0).toUpperCase() + analysis.storyType.slice(1)} Story`,
        opening: `Welcome to this ${analysis.mood} journey. Let's explore these amazing moments together.`,
        transitions: selectedClips.map((_, i) => `And here's another incredible moment from this ${analysis.storyType} experience.`),
        closing: `Thank you for joining this ${analysis.storyType} adventure. These memories will last forever.`,
        textOverlays: [`${analysis.storyType.charAt(0).toUpperCase() + analysis.storyType.slice(1)} Story`, ...analysis.themes.map(theme => theme.charAt(0).toUpperCase() + theme.slice(1))],
        totalDuration: selectedClips.length * 30 + 90 // Rough estimate
      };

    } catch (error) {
      console.error('Error generating story script:', error);
      throw error;
    }
  }

  // Create video story (simplified version - generates a story plan)
  async createVideoStory(prompt, selectedClips, script) {
    try {
      console.log('🎥 Creating video story...');

      // For now, we'll create a story plan that could be used for video editing
      // In a full implementation, this would use video editing APIs or tools
      
      const storyPlan = {
        title: script.title,
        clips: selectedClips.map((clip, index) => ({
          videoUrl: clip.url,
          title: clip.title,
          startTime: 0, // Could be customized based on transcript analysis
          duration: Math.min(clip.duration || 30, 30), // Max 30 seconds per clip
          transition: script.transitions[index] || '',
          textOverlay: script.textOverlays[index] || ''
        })),
        narration: {
          opening: script.opening,
          closing: script.closing
        },
        metadata: {
          totalClips: selectedClips.length,
          estimatedDuration: script.totalDuration,
          storyType: script.title
        }
      };

      // For demonstration, we'll create a simple video URL (in reality, this would be the edited video)
      const demoVideoUrl = selectedClips[0]?.url || null;

      console.log('✅ Video story plan created');
      return {
        storyPlan,
        videoUrl: demoVideoUrl, // This would be the actual generated video
        success: true
      };

    } catch (error) {
      console.error('Error creating video story:', error);
      throw error;
    }
  }

  // Main method to generate complete video story
  async generateVideoStory(userId, prompt, selectedVideoIds = null) {
    try {
      console.log(`🎬 Starting video story generation for user: ${userId}`);

      // Get user's videos with transcripts and tags
      let whereClause = { userId };
      if (selectedVideoIds && selectedVideoIds.length > 0) {
        whereClause.id = { in: selectedVideoIds };
      }

      const userVideos = await prisma.video.findMany({
        where: whereClause,
        include: {
          transcript: true,
          tags: true
        },
        orderBy: { uploadDate: 'desc' }
      });

      if (userVideos.length === 0) {
        throw new Error('No videos found for story generation');
      }

      // Filter only processed videos
      const processedVideos = userVideos.filter(video =>
        video.transcriptionStatus === 'completed' && video.visionStatus === 'completed'
      );

      if (processedVideos.length === 0) {
        throw new Error('No processed videos available. Please ensure your videos are fully processed before generating stories.');
      }

      // Analyze the prompt
      const analysis = await this.analyzePrompt(prompt, processedVideos);

      // Select relevant clips (or use all if specific videos were selected)
      let selectedClips;
      if (selectedVideoIds && selectedVideoIds.length > 0) {
        // Use the specifically selected videos
        selectedClips = processedVideos;
      } else {
        // Use AI to select relevant clips from all processed videos
        selectedClips = await this.selectRelevantClips(analysis, processedVideos);
      }

      if (selectedClips.length === 0) {
        throw new Error('No relevant clips found for the story prompt');
      }

      // Generate story script
      const script = await this.generateStoryScript(prompt, analysis, selectedClips);

      // Create video story
      const storyResult = await this.createVideoStory(prompt, selectedClips, script);

      // Save story to database with proper storyData
      const story = await prisma.story.create({
        data: {
          userId,
          prompt,
          status: 'completed',
          generatedVideoUrl: storyResult.videoUrl,
          storyData: JSON.stringify(storyResult.storyPlan)
        }
      });

      // Link story to videos
      for (const clip of selectedClips) {
        await prisma.storyVideo.create({
          data: {
            storyId: story.id,
            videoId: clip.id,
            order: selectedClips.indexOf(clip),
            startTime: 0,
            duration: Math.min(clip.duration || 30, 30)
          }
        });
      }

      console.log(`✅ Video story generation completed: ${story.id}`);
      return story;

    } catch (error) {
      console.error('Error in video story generation:', error);
      throw error;
    }
  }
}

module.exports = new VideoStoryService();
