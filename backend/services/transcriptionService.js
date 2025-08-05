const ffmpeg = require('fluent-ffmpeg');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Initialize OpenAI (optional)
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
} else {
  console.log('⚠️ OpenAI API key not found. Using Deepgram for transcription instead.');
}

class TranscriptionService {
  constructor() {
    // Set FFmpeg path if needed (for Windows)
    if (process.platform === 'win32') {
      // You might need to install ffmpeg and set the path
      // ffmpeg.setFfmpegPath('path/to/ffmpeg.exe');
    }
  }

  // Extract audio from video
  async extractAudio(videoPath, outputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .output(outputPath)
        .audioCodec('libmp3lame')
        .audioFrequency(16000) // Whisper works best with 16kHz
        .audioChannels(1) // Mono
        .on('end', () => {
          console.log('✅ Audio extraction completed');
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('❌ Audio extraction failed:', err);
          reject(err);
        })
        .run();
    });
  }

  // Transcribe audio using OpenAI Whisper
  async transcribeAudio(audioPath) {
    try {
      if (!openai) {
        throw new Error('OpenAI API key not configured. Transcription is disabled.');
      }

      console.log('🎤 Starting transcription with OpenAI Whisper...');

      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(audioPath),
        model: 'whisper-1',
        response_format: 'verbose_json',
        timestamp_granularities: ['segment']
      });

      console.log('✅ Transcription completed');
      return {
        fullText: transcription.text,
        segments: transcription.segments || []
      };
    } catch (error) {
      console.error('❌ Transcription failed:', error);
      throw error;
    }
  }

  // Process video transcription
  async processVideoTranscription(videoId, videoUrl) {
    const tempDir = path.join(__dirname, '../temp');
    const audioPath = path.join(tempDir, `${videoId}_audio.mp3`);

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

      // Clean up temporary audio file
      if (fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
      }

      return transcriptionResult;

    } catch (error) {
      console.error(`❌ Transcription failed for video ${videoId}:`, error);

      // Update status to failed
      await prisma.video.update({
        where: { id: videoId },
        data: { transcriptionStatus: 'failed' }
      });

      // Clean up temporary audio file
      if (fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
      }

      throw error;
    }
  }

  // Get transcript for a video
  async getTranscript(videoId) {
    try {
      const transcript = await prisma.transcript.findUnique({
        where: { videoId }
      });

      return transcript;
    } catch (error) {
      console.error('Error getting transcript:', error);
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
              thumbnailUrl: true,
              duration: true
            }
          }
        }
      });

      // Find specific segments that match the query
      const results = [];
      for (const transcript of transcripts) {
        const segments = transcript.segments || [];
        const matchingSegments = segments.filter(segment => 
          segment.text && segment.text.toLowerCase().includes(query.toLowerCase())
        );

        if (matchingSegments.length > 0) {
          results.push({
            videoId: transcript.videoId,
            video: transcript.video,
            matches: matchingSegments.map(segment => ({
              text: segment.text,
              start: segment.start,
              end: segment.end
            }))
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error searching transcripts:', error);
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
}

module.exports = new TranscriptionService();
