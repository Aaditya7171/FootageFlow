const ffmpeg = require('fluent-ffmpeg');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class GeminiTranscriptionService {
  constructor() {
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    this.geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
    
    if (!this.geminiApiKey) {
      console.log('⚠️ Gemini API key not found. Transcription features will be disabled.');
    }
  }

  // Extract audio from video using ffmpeg
  async extractAudio(videoUrl, outputPath) {
    return new Promise((resolve, reject) => {
      console.log('🎵 Extracting audio from video...');
      
      ffmpeg(videoUrl)
        .audioCodec('libmp3lame')
        .audioBitrate(128)
        .audioChannels(1)
        .audioFrequency(16000)
        .format('mp3')
        .output(outputPath)
        .on('end', () => {
          console.log('✅ Audio extraction completed');
          resolve();
        })
        .on('error', (err) => {
          console.error('❌ Audio extraction failed:', err);
          reject(err);
        })
        .run();
    });
  }

  // Convert audio file to base64 for Gemini API
  async audioToBase64(audioPath) {
    try {
      const audioBuffer = fs.readFileSync(audioPath);
      return audioBuffer.toString('base64');
    } catch (error) {
      console.error('Error converting audio to base64:', error);
      throw error;
    }
  }

  // Transcribe audio using Gemini API
  async transcribeAudio(audioPath) {
    try {
      if (!this.geminiApiKey) {
        throw new Error('Gemini API key not configured. Transcription is disabled.');
      }

      console.log('🎤 Starting transcription with Gemini...');

      const audioBase64 = await this.audioToBase64(audioPath);

      const response = await axios.post(
        `${this.geminiUrl}?key=${this.geminiApiKey}`,
        {
          contents: [{
            parts: [
              {
                text: "Please transcribe this audio file. Provide the full text transcription. If there are multiple speakers, try to identify them as Speaker 1, Speaker 2, etc. Also provide approximate timestamps if possible."
              },
              {
                inline_data: {
                  mime_type: "audio/mp3",
                  data: audioBase64
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            topK: 32,
            topP: 1,
            maxOutputTokens: 8192,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const transcriptionText = response.data.candidates[0].content.parts[0].text;
      
      console.log('✅ Transcription completed');
      
      // Parse the response to extract segments if possible
      const segments = this.parseTranscriptionSegments(transcriptionText);
      
      return {
        fullText: transcriptionText,
        segments: segments
      };
    } catch (error) {
      console.error('❌ Transcription failed:', error);
      throw error;
    }
  }

  // Parse transcription text to extract segments with timestamps
  parseTranscriptionSegments(text) {
    const segments = [];
    
    // Try to find timestamp patterns like [00:30] or (0:30) or Speaker 1 at 0:30:
    const timestampPatterns = [
      /\[(\d{1,2}):(\d{2})\]/g,
      /\((\d{1,2}):(\d{2})\)/g,
      /(\d{1,2}):(\d{2})/g
    ];
    
    let lastEnd = 0;
    const lines = text.split('\n').filter(line => line.trim());
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      let timestamp = null;
      
      // Try to extract timestamp from the line
      for (const pattern of timestampPatterns) {
        const match = pattern.exec(line);
        if (match) {
          const minutes = parseInt(match[1]);
          const seconds = parseInt(match[2]);
          timestamp = minutes * 60 + seconds;
          break;
        }
      }
      
      // If no timestamp found, estimate based on position
      if (timestamp === null) {
        timestamp = lastEnd + (i * 10); // Estimate 10 seconds per segment
      }
      
      segments.push({
        id: i,
        start: timestamp,
        end: timestamp + 10, // Estimate 10-second segments
        text: line.replace(/\[?\d{1,2}:\d{2}\]?/g, '').replace(/\(?\d{1,2}:\d{2}\)?/g, '').trim()
      });
      
      lastEnd = timestamp + 10;
    }
    
    return segments;
  }

  // Process video transcription (main method)
  async processVideoTranscription(videoId, videoUrl) {
    const tempDir = path.join(__dirname, '../temp', videoId);
    const audioPath = path.join(tempDir, 'audio.mp3');
    
    try {
      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Update status to processing
      await prisma.video.update({
        where: { id: videoId },
        data: { transcriptionStatus: 'processing' }
      });

      console.log(`🎬 Processing transcription for video: ${videoId}`);

      // Extract audio from video
      await this.extractAudio(videoUrl, audioPath);

      // Transcribe audio
      const transcriptionResult = await this.transcribeAudio(audioPath);

      // Save transcript to database
      await prisma.transcript.create({
        data: {
          videoId,
          fullText: transcriptionResult.fullText,
          segments: transcriptionResult.segments
        }
      });

      // Update video status
      await prisma.video.update({
        where: { id: videoId },
        data: { transcriptionStatus: 'completed' }
      });

      console.log(`✅ Transcription completed for video: ${videoId}`);

      // Clean up temporary files
      this.cleanupTempDir(tempDir);

      return transcriptionResult;

    } catch (error) {
      console.error(`❌ Transcription error for video ${videoId}:`, error);
      
      // Update status to failed
      await prisma.video.update({
        where: { id: videoId },
        data: { transcriptionStatus: 'failed' }
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

  // Get transcription status
  async getTranscriptionStatus(videoId) {
    try {
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        select: {
          transcriptionStatus: true,
          transcript: {
            select: {
              fullText: true,
              segments: true,
              createdAt: true
            }
          }
        }
      });

      if (!video) {
        throw new Error('Video not found');
      }

      return {
        status: video.transcriptionStatus,
        transcript: video.transcript
      };
    } catch (error) {
      console.error('Error getting transcription status:', error);
      throw error;
    }
  }

  // Auto-transcribe after upload (can be called from upload route)
  async autoTranscribeVideo(videoId, videoUrl) {
    try {
      // Run transcription in background
      setImmediate(() => {
        this.processVideoTranscription(videoId, videoUrl)
          .catch(error => {
            console.error(`Background transcription failed for video ${videoId}:`, error);
          });
      });

      return { success: true, message: 'Transcription started in background' };
    } catch (error) {
      console.error('Error starting auto-transcription:', error);
      throw error;
    }
  }

  // Search transcripts
  async searchTranscripts(query) {
    try {
      const transcripts = await prisma.transcript.findMany({
        where: {
          fullText: {
            contains: query,
            mode: 'insensitive'
          }
        },
        include: {
          video: {
            select: {
              id: true,
              title: true,
              url: true,
              thumbnailUrl: true,
              userId: true,
              uploadDate: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return transcripts;
    } catch (error) {
      console.error('Error searching transcripts:', error);
      throw error;
    }
  }
}

module.exports = new GeminiTranscriptionService();
