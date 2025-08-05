const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class TranscriptionService {
  constructor() {
    this.assemblyAIKey = process.env.ASSEMBLYAI_API_KEY;
    this.assemblyAIUrl = 'https://api.assemblyai.com/v2';
  }

  async transcribeVideo(videoId, videoUrl) {
    try {
      console.log(`Starting transcription for video ${videoId}`);
      
      // Update status to processing
      await prisma.video.update({
        where: { id: videoId },
        data: { transcriptionStatus: 'processing' }
      });

      // Submit transcription job to AssemblyAI
      const transcriptResponse = await axios.post(
        `${this.assemblyAIUrl}/transcript`,
        {
          audio_url: videoUrl,
          speaker_labels: true,
          auto_highlights: true,
          sentiment_analysis: true,
          entity_detection: true,
          word_boost: ['video', 'content', 'story', 'scene'],
          boost_param: 'high'
        },
        {
          headers: {
            'Authorization': this.assemblyAIKey,
            'Content-Type': 'application/json'
          }
        }
      );

      const transcriptId = transcriptResponse.data.id;
      console.log(`Transcription job submitted: ${transcriptId}`);

      // Poll for completion
      const transcript = await this.pollTranscriptionStatus(transcriptId);
      
      if (transcript.status === 'completed') {
        // Save transcript to database
        await prisma.video.update({
          where: { id: videoId },
          data: {
            transcript: transcript.text,
            transcriptTimestamps: {
              words: transcript.words || [],
              sentences: transcript.sentences || [],
              highlights: transcript.auto_highlights_result?.results || [],
              sentiment: transcript.sentiment_analysis_results || [],
              entities: transcript.entities || []
            },
            transcriptionStatus: 'completed'
          }
        });

        console.log(`Transcription completed for video ${videoId}`);
        return transcript;
      } else {
        throw new Error(`Transcription failed: ${transcript.error}`);
      }

    } catch (error) {
      console.error(`Transcription error for video ${videoId}:`, error);
      
      // Update status to failed
      await prisma.video.update({
        where: { id: videoId },
        data: { transcriptionStatus: 'failed' }
      });

      throw error;
    }
  }

  async pollTranscriptionStatus(transcriptId, maxAttempts = 60) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await axios.get(
          `${this.assemblyAIUrl}/transcript/${transcriptId}`,
          {
            headers: {
              'Authorization': this.assemblyAIKey
            }
          }
        );

        const transcript = response.data;
        
        if (transcript.status === 'completed' || transcript.status === 'error') {
          return transcript;
        }

        // Wait 5 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 5000));
        
      } catch (error) {
        console.error(`Error polling transcription status:`, error);
        if (attempt === maxAttempts - 1) throw error;
      }
    }

    throw new Error('Transcription timeout - max attempts reached');
  }

  // Fallback method using OpenAI Whisper (for future implementation)
  async transcribeWithWhisper(videoId, audioBuffer) {
    try {
      // This would require audio extraction from video
      // For now, we'll use AssemblyAI as primary service
      console.log('Whisper transcription not implemented yet');
      return null;
    } catch (error) {
      console.error('Whisper transcription error:', error);
      throw error;
    }
  }

  // Extract key phrases and topics from transcript
  extractKeyPhrases(transcript) {
    if (!transcript) return [];

    // Simple keyword extraction (can be enhanced with NLP libraries)
    const words = transcript.toLowerCase().split(/\W+/);
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them']);
    
    const wordCount = {};
    words.forEach(word => {
      if (word.length > 3 && !stopWords.has(word)) {
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });

    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));
  }
}

module.exports = new TranscriptionService();
