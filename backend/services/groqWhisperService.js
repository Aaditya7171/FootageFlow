const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

class GroqWhisperService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    this.baseUrl = 'https://api.groq.com/openai/v1/audio/transcriptions';
    
    if (!this.apiKey) {
      console.log('⚠️ Groq API key not found. Whisper transcription will be disabled.');
    } else {
      console.log('✅ Groq Whisper service initialized');
    }
  }

  /**
   * Download media file from Cloudinary URL
   */
  async downloadMediaFile(cloudinaryUrl) {
    try {
      console.log(`📥 Downloading media file from Cloudinary: ${cloudinaryUrl}`);
      
      const response = await axios({
        method: 'GET',
        url: cloudinaryUrl,
        responseType: 'stream'
      });

      // Create temp directory if it doesn't exist
      const tempDir = path.join(__dirname, '..', 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Generate unique filename
      const tempFileName = `temp_${Date.now()}.mp4`;
      const tempFilePath = path.join(tempDir, tempFileName);

      // Save file
      const writer = fs.createWriteStream(tempFilePath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          console.log(`✅ Media file downloaded successfully: ${tempFilePath}`);
          resolve(tempFilePath);
        });
        writer.on('error', reject);
      });
    } catch (error) {
      console.error('❌ Failed to download media file:', error.message);
      throw error;
    }
  }

  /**
   * Transcribe audio file using Groq Whisper API
   */
  async transcribeFile(filePath) {
    try {
      console.log(`🎤 Starting Whisper transcription...`);
      
      if (!this.apiKey) {
        throw new Error('Groq API key not configured');
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));
      formData.append('model', 'whisper-large-v3-turbo');
      formData.append('response_format', 'verbose_json');
      formData.append('timestamp_granularities[]', 'segment');

      // Make API request
      const response = await axios.post(this.baseUrl, formData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          ...formData.getHeaders()
        },
        timeout: 300000 // 5 minutes timeout
      });

      const result = response.data;
      
      console.log(`✅ Whisper transcription completed`);
      console.log(`📊 Found ${result.segments?.length || 0} segments`);
      console.log(`📝 Full text length: ${result.text?.length || 0} characters`);

      return {
        success: true,
        text: result.text || '',
        segments: result.segments || [],
        language: result.language || 'en',
        duration: result.duration || 0
      };

    } catch (error) {
      console.error('❌ Whisper transcription failed:', error.message);
      throw error;
    }
  }

  /**
   * Transcribe video with automatic language detection and timestamps
   */
  async transcribeVideoWithWhisper(cloudinaryUrl) {
    let tempFilePath = null;
    
    try {
      console.log('🌍 Starting Whisper transcription with timestamps...');
      
      // Download the media file
      tempFilePath = await this.downloadMediaFile(cloudinaryUrl);
      
      // Transcribe with Whisper
      const result = await this.transcribeFile(tempFilePath);
      
      // Process segments into our format
      const utterances = result.segments.map(segment => ({
        text: segment.text.trim(),
        start: segment.start,
        end: segment.end,
        confidence: 1.0, // Whisper doesn't provide confidence scores
        speaker: 0 // Default speaker
      }));

      // Extract words from segments (approximate)
      const words = [];
      result.segments.forEach(segment => {
        const segmentWords = segment.text.trim().split(/\s+/);
        const segmentDuration = segment.end - segment.start;
        const wordDuration = segmentDuration / segmentWords.length;
        
        segmentWords.forEach((word, index) => {
          words.push({
            word: word,
            start: segment.start + (index * wordDuration),
            end: segment.start + ((index + 1) * wordDuration),
            confidence: 1.0,
            speaker: 0
          });
        });
      });

      const detectedLanguage = result.language || 'en';
      console.log(`🔍 Detected language: ${detectedLanguage}`);
      console.log(`📝 Transcript content: "${result.text.substring(0, 100)}${result.text.length > 100 ? '...' : ''}"`);

      const transcriptions = {
        [detectedLanguage]: {
          language: detectedLanguage,
          languageName: this.getLanguageName(detectedLanguage),
          transcript: result.text,
          confidence: 1.0,
          words: words,
          paragraphs: result.text,
          utterances: utterances,
          segments: result.segments,
          detectedLanguage: true
        }
      };

      return {
        success: true,
        transcriptions: transcriptions,
        metadata: {
          originalUrl: cloudinaryUrl,
          processedAt: new Date().toISOString(),
          languagesProcessed: Object.keys(transcriptions),
          totalLanguages: Object.keys(transcriptions).length,
          detectedLanguage: detectedLanguage,
          duration: result.duration
        }
      };

    } catch (error) {
      console.error('❌ Whisper transcription failed:', error.message);
      throw error;
    } finally {
      // Clean up temporary file
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
          console.log('🗑️ Temporary file cleaned up');
        } catch (cleanupError) {
          console.error('⚠️ Failed to cleanup temporary file:', cleanupError.message);
        }
      }
    }
  }

  /**
   * Get language name from code
   */
  getLanguageName(languageCode) {
    const languageNames = {
      'en': 'English',
      'hi': 'Hindi',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'ar': 'Arabic'
    };
    
    return languageNames[languageCode] || languageCode.toUpperCase();
  }

  /**
   * Format time for display
   */
  formatTime(seconds) {
    const date = new Date(0);
    date.setSeconds(seconds);
    return date.toISOString().substr(11, 8);
  }
}

module.exports = new GroqWhisperService();
