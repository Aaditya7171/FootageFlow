const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const { v2: cloudinary } = require('cloudinary');

const prisma = new PrismaClient();

class StoryService {
  constructor() {
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    this.geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
  }

  async generateStory(userId, prompt) {
    try {
      console.log(`Generating story for user ${userId} with prompt: ${prompt}`);

      // Create story record
      const story = await prisma.story.create({
        data: {
          userId,
          prompt,
          status: 'processing'
        }
      });

      // Get user's videos with transcripts and tags
      const videos = await prisma.video.findMany({
        where: {
          userId,
          transcriptionStatus: 'completed',
          visionStatus: 'completed'
        },
        include: {
          tags: true
        },
        orderBy: { uploadDate: 'desc' }
      });

      if (videos.length === 0) {
        await prisma.story.update({
          where: { id: story.id },
          data: { status: 'failed' }
        });
        throw new Error('No processed videos available for story generation');
      }

      // Analyze videos and select best clips
      const selectedClips = await this.selectClipsForStory(videos, prompt);
      
      if (selectedClips.length === 0) {
        await prisma.story.update({
          where: { id: story.id },
          data: { status: 'failed' }
        });
        throw new Error('No suitable clips found for the story');
      }

      // Generate story narrative
      const narrative = await this.generateNarrative(selectedClips, prompt);

      // Create video compilation (using Cloudinary)
      const compiledVideoUrl = await this.compileVideo(selectedClips);

      // Save story clips and update story
      for (let i = 0; i < selectedClips.length; i++) {
        const clip = selectedClips[i];
        await prisma.storyVideo.create({
          data: {
            storyId: story.id,
            videoId: clip.videoId,
            order: i,
            startTime: clip.startTime,
            endTime: clip.endTime
          }
        });
      }

      const updatedStory = await prisma.story.update({
        where: { id: story.id },
        data: {
          generatedVideoUrl: compiledVideoUrl,
          status: 'completed'
        },
        include: {
          storyVideos: {
            include: {
              video: true
            },
            orderBy: { order: 'asc' }
          }
        }
      });

      console.log(`Story generation completed: ${story.id}`);
      return { ...updatedStory, narrative };

    } catch (error) {
      console.error('Story generation error:', error);
      throw error;
    }
  }

  async selectClipsForStory(videos, prompt) {
    try {
      // Prepare video data for AI analysis
      const videoData = videos.map(video => ({
        id: video.id,
        title: video.title,
        description: video.description,
        duration: video.duration,
        transcript: video.transcript ? video.transcript.substring(0, 500) : '', // Limit transcript length
        tags: video.tags.map(tag => ({ label: tag.label, type: tag.type, confidence: tag.confidence }))
      }));

      const analysisPrompt = `
        You are a video editor AI. Given the following prompt and available videos, select the best clips to create a compelling story.
        
        Story Prompt: "${prompt}"
        
        Available Videos:
        ${JSON.stringify(videoData, null, 2)}
        
        Please respond with a JSON array of selected clips in this format:
        [
          {
            "videoId": "video_id",
            "reason": "why this clip fits the story",
            "startTime": 0,
            "endTime": 30,
            "order": 1
          }
        ]
        
        Guidelines:
        - Select 3-5 clips maximum
        - Each clip should be 10-60 seconds long
        - Consider the story flow and narrative arc
        - Use transcript and tags to match content to the prompt
        - Provide clear reasoning for each selection
      `;

      const response = await axios.post(
        `${this.geminiUrl}?key=${this.geminiApiKey}`,
        {
          contents: [{
            parts: [{ text: analysisPrompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        }
      );

      const responseText = response.data.candidates[0].content.parts[0].text;
      
      // Extract JSON from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const selectedClips = JSON.parse(jsonMatch[0]);
        
        // Validate and enhance clips
        return selectedClips
          .filter(clip => videos.find(v => v.id === clip.videoId))
          .map(clip => ({
            ...clip,
            startTime: Math.max(0, clip.startTime || 0),
            endTime: Math.min(clip.endTime || 30, videos.find(v => v.id === clip.videoId)?.duration || 30)
          }))
          .sort((a, b) => (a.order || 0) - (b.order || 0));
      }

      // Fallback: select first few videos
      return videos.slice(0, 3).map((video, index) => ({
        videoId: video.id,
        reason: 'Selected as fallback',
        startTime: 0,
        endTime: Math.min(30, video.duration || 30),
        order: index + 1
      }));

    } catch (error) {
      console.error('Error selecting clips:', error);
      
      // Fallback selection
      return videos.slice(0, 2).map((video, index) => ({
        videoId: video.id,
        reason: 'Fallback selection',
        startTime: 0,
        endTime: Math.min(20, video.duration || 20),
        order: index + 1
      }));
    }
  }

  async generateNarrative(clips, prompt) {
    try {
      const narrativePrompt = `
        Create a compelling narrative for a video story based on these selected clips:
        
        Story Prompt: "${prompt}"
        
        Selected Clips:
        ${clips.map((clip, index) => `
          ${index + 1}. Video: ${clip.videoId}
          Duration: ${clip.startTime}s - ${clip.endTime}s
          Reason: ${clip.reason}
        `).join('\n')}
        
        Write a brief, engaging narrative (2-3 sentences) that connects these clips into a cohesive story.
      `;

      const response = await axios.post(
        `${this.geminiUrl}?key=${this.geminiApiKey}`,
        {
          contents: [{
            parts: [{ text: narrativePrompt }]
          }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 200,
          }
        }
      );

      return response.data.candidates[0].content.parts[0].text.trim();

    } catch (error) {
      console.error('Error generating narrative:', error);
      return `A story created from ${clips.length} video clips based on: ${prompt}`;
    }
  }

  async compileVideo(clips) {
    try {
      // For MVP, we'll create a simple concatenated video using Cloudinary
      // In production, you might use FFmpeg or a more sophisticated video editing service
      
      if (clips.length === 1) {
        // Single clip - just trim it
        const video = await prisma.video.findUnique({
          where: { id: clips[0].videoId }
        });
        
        if (video && video.cloudinaryId) {
          const trimmedUrl = cloudinary.url(video.cloudinaryId, {
            resource_type: 'video',
            start_offset: clips[0].startTime,
            end_offset: clips[0].endTime,
            format: 'mp4'
          });
          return trimmedUrl;
        }
      }

      // For multiple clips, we'll return the first clip URL as a placeholder
      // In a full implementation, you would use Cloudinary's video concatenation
      // or a service like FFmpeg to combine the clips
      const firstVideo = await prisma.video.findUnique({
        where: { id: clips[0].videoId }
      });

      if (firstVideo) {
        return cloudinary.url(firstVideo.cloudinaryId, {
          resource_type: 'video',
          start_offset: clips[0].startTime,
          end_offset: clips[0].endTime,
          format: 'mp4'
        });
      }

      throw new Error('No video found for compilation');

    } catch (error) {
      console.error('Error compiling video:', error);
      throw error;
    }
  }

  async getUserStories(userId) {
    try {
      const stories = await prisma.story.findMany({
        where: { userId },
        include: {
          storyVideos: {
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
            orderBy: { order: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return stories;
    } catch (error) {
      console.error('Error fetching user stories:', error);
      throw error;
    }
  }

  async deleteStory(storyId, userId) {
    try {
      // Verify ownership
      const story = await prisma.story.findFirst({
        where: { id: storyId, userId }
      });

      if (!story) {
        throw new Error('Story not found');
      }

      // Delete story (cascade will handle storyVideos)
      await prisma.story.delete({
        where: { id: storyId }
      });

      return { message: 'Story deleted successfully' };
    } catch (error) {
      console.error('Error deleting story:', error);
      throw error;
    }
  }
}

module.exports = new StoryService();
