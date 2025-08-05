const { createClient } = require('@deepgram/sdk');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

class DeepgramTranscriptionService {
  constructor() {
    this.deepgram = createClient(process.env.DEEPGRAM_API_KEY);
    
    // Supported languages with their Deepgram language codes
    this.supportedLanguages = {
      'en-US': { name: 'English (US)', code: 'en-US' },
      'fr': { name: 'French', code: 'fr' },
      'de': { name: 'German', code: 'de' },
      'ja': { name: 'Japanese', code: 'ja' },
      'es': { name: 'Spanish', code: 'es' },
      'ru': { name: 'Russian', code: 'ru' },
      'ko': { name: 'Korean', code: 'ko' },
      'hi': { name: 'Hindi', code: 'hi' }
    };
  }

  /**
   * Download audio/video file from Cloudinary URL
   */
  async downloadMediaFile(cloudinaryUrl) {
    try {
      console.log('📥 Downloading media file from Cloudinary:', cloudinaryUrl);
      
      const response = await axios({
        method: 'GET',
        url: cloudinaryUrl,
        responseType: 'stream',
        timeout: 300000 // 5 minutes timeout
      });

      // Create temporary file
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFilePath = path.join(tempDir, `temp_${Date.now()}.mp4`);
      const writer = fs.createWriteStream(tempFilePath);

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          console.log('✅ Media file downloaded successfully:', tempFilePath);
          resolve(tempFilePath);
        });
        writer.on('error', reject);
      });

    } catch (error) {
      console.error('❌ Error downloading media file:', error.message);
      throw new Error(`Failed to download media file: ${error.message}`);
    }
  }

  /**
   * Transcribe audio/video file using Deepgram for a specific language
   */
  async transcribeFile(filePath, languageCode = 'en-US') {
    try {
      console.log(`🎤 Starting transcription for language: ${languageCode}`);
      
      const fileBuffer = fs.readFileSync(filePath);
      
      const { result, error } = await this.deepgram.listen.prerecorded.transcribeFile(
        fileBuffer,
        {
          model: 'nova-2',
          language: languageCode,
          smart_format: true,
          punctuate: true,
          diarize: true,
          timestamps: true,
          paragraphs: true,
          utterances: true,
          detect_language: false // We're specifying the language
        }
      );

      if (error) {
        throw new Error(`Deepgram transcription error: ${error.message}`);
      }

      return this.formatTranscriptionResult(result, languageCode);

    } catch (error) {
      console.error(`❌ Transcription failed for ${languageCode}:`, error.message);
      throw error;
    }
  }

  /**
   * Format Deepgram result into our standard format
   */
  formatTranscriptionResult(result, languageCode) {
    const channel = result.results?.channels?.[0];
    if (!channel || !channel.alternatives?.[0]) {
      return {
        language: languageCode,
        languageName: this.supportedLanguages[languageCode]?.name || languageCode,
        transcript: '',
        confidence: 0,
        words: [],
        paragraphs: [],
        utterances: []
      };
    }

    const alternative = channel.alternatives[0];
    
    // Format words with timestamps
    const words = alternative.words?.map(word => ({
      word: word.word,
      start: word.start,
      end: word.end,
      confidence: word.confidence,
      speaker: word.speaker || 0
    })) || [];

    // Format paragraphs with timestamps
    const paragraphs = alternative.paragraphs?.paragraphs?.map(paragraph => ({
      text: paragraph.text,
      start: paragraph.start,
      end: paragraph.end,
      confidence: paragraph.confidence,
      speaker: paragraph.speaker || 0
    })) || [];

    // Format utterances (speaker segments)
    const utterances = result.results?.utterances?.map(utterance => ({
      text: utterance.transcript,
      start: utterance.start,
      end: utterance.end,
      confidence: utterance.confidence,
      speaker: utterance.speaker,
      words: utterance.words?.map(word => ({
        word: word.word,
        start: word.start,
        end: word.end,
        confidence: word.confidence
      })) || []
    })) || [];

    return {
      language: languageCode,
      languageName: this.supportedLanguages[languageCode]?.name || languageCode,
      transcript: alternative.transcript || '',
      confidence: alternative.confidence || 0,
      words,
      paragraphs,
      utterances,
      metadata: {
        duration: result.metadata?.duration || 0,
        channels: result.metadata?.channels || 1,
        created: result.metadata?.created || new Date().toISOString(),
        model_info: result.metadata?.model_info || {}
      }
    };
  }

  /**
   * Transcribe video with automatic language detection
   */
  async transcribeWithAutoDetection(cloudinaryUrl) {
    let tempFilePath = null;

    try {
      console.log('🌍 Starting automatic language detection transcription...');
      
      // Download the media file
      tempFilePath = await this.downloadMediaFile(cloudinaryUrl);

      // Use automatic language detection with enhanced options
      console.log('🎯 Transcribing with automatic language detection...');
      const result = await this.transcribeFileWithAutoDetection(tempFilePath);

      const detectedLanguage = result.detectedLanguage || 'en-US';
      console.log(`🔍 Detected language: ${detectedLanguage}`);

      const transcriptions = {
        [detectedLanguage]: {
          language: detectedLanguage,
          languageName: this.supportedLanguages[detectedLanguage]?.name || detectedLanguage,
          transcript: result.transcript || '',
          confidence: result.confidence || 0,
          words: result.words || [],
          paragraphs: result.paragraphs || [],
          utterances: result.utterances || [],
          detectedLanguage: true
        }
      };
      
      return {
        success: true,
        transcriptions,
        metadata: {
          originalUrl: cloudinaryUrl,
          processedAt: new Date().toISOString(),
          languagesProcessed: Object.keys(transcriptions),
          totalLanguages: Object.keys(transcriptions).length,
          detectedLanguage: detectedLanguage
        }
      };
      
    } catch (error) {
      console.error('❌ Multi-language transcription failed:', error.message);
      throw error;
    } finally {
      // Clean up temporary file
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          await unlink(tempFilePath);
          console.log('🗑️ Temporary file cleaned up');
        } catch (cleanupError) {
          console.warn('⚠️ Failed to clean up temporary file:', cleanupError.message);
        }
      }
    }
  }

  /**
   * Transcribe file with automatic language detection and timestamps
   */
  async transcribeFileWithAutoDetection(filePath) {
    try {
      console.log(`🎤 Starting auto-detection transcription...`);

      const fileBuffer = fs.readFileSync(filePath);

      // Enhanced Deepgram options for better Hinglish transcription
      const options = {
        model: 'nova-2',      // Use latest model for better accuracy
        language: 'en-IN',    // Indian English for better Hinglish support
        punctuate: true,      // For readable text
        utterances: true,     // For timestamps
        smart_format: true,   // Smart formatting
        diarize: true,        // Speaker separation
        multichannel: false,  // Single channel
        alternatives: 1,      // Get best alternative
        tier: 'enhanced'      // Use enhanced tier for better accuracy
      };

      let { result, error } = await this.deepgram.listen.prerecorded.transcribeFile(
        fileBuffer,
        options
      );

      // If enhanced options fail, try with basic options
      if (error) {
        console.log('⚠️ Enhanced options failed, trying basic options...');
        const basicOptions = {
          model: 'general',
          language: 'en',
          punctuate: true,
          utterances: true
        };

        const basicResult = await this.deepgram.listen.prerecorded.transcribeFile(
          fileBuffer,
          basicOptions
        );

        result = basicResult.result;
        error = basicResult.error;

        // If basic options also fail, try minimal options
        if (error) {
          console.log('⚠️ Basic options failed, trying minimal options...');
          const minimalOptions = {
            punctuate: true
          };

          const minimalResult = await this.deepgram.listen.prerecorded.transcribeFile(
            fileBuffer,
            minimalOptions
          );

          result = minimalResult.result;
          error = minimalResult.error;
        }
      }

      if (error) {
        throw new Error(`Deepgram API error: ${JSON.stringify(error)}`);
      }

      if (!result?.results?.channels?.[0]?.alternatives?.[0]) {
        throw new Error('No transcription results received from Deepgram');
      }

      const channel = result.results.channels[0];
      const alternative = channel.alternatives[0];

      // Try to detect language from metadata, fallback to Indian English for Hinglish
      let detectedLanguage = 'en-IN'; // Default to Indian English for better Hinglish support
      if (result.results.language) {
        detectedLanguage = result.results.language;
      } else if (result.results.metadata?.language) {
        detectedLanguage = result.results.metadata.language;
      } else if (result.results.channels?.[0]?.detected_language) {
        detectedLanguage = result.results.channels[0].detected_language;
      }

      console.log(`🔍 Detected language: ${detectedLanguage}`);

      // Extract words with timestamps (if available)
      const words = alternative.words?.map(word => ({
        word: word.word,
        start: word.start || 0,
        end: word.end || 0,
        confidence: word.confidence || 0,
        speaker: word.speaker || 0
      })) || [];

      // Extract utterances with timestamps (if available)
      const utterances = alternative.utterances?.map(utterance => ({
        text: utterance.transcript || utterance.text,
        start: utterance.start || 0,
        end: utterance.end || 0,
        confidence: utterance.confidence || 0,
        speaker: utterance.speaker || 0,
        words: utterance.words || []
      })) || [];

      // Extract paragraphs (fallback to main transcript)
      const paragraphs = alternative.paragraphs?.transcript || alternative.transcript || '';

      // If no utterances available, create basic ones from transcript
      if (utterances.length === 0 && alternative.transcript) {
        utterances.push({
          text: alternative.transcript,
          start: 0,
          end: result.results.summary?.duration || 0,
          confidence: alternative.confidence || 0,
          speaker: 0,
          words: words
        });
      }

      console.log(`✅ Auto-detection transcription completed for ${detectedLanguage}`);
      console.log(`📊 Found ${words.length} words, ${utterances.length} utterances`);
      console.log(`📝 Transcript content: "${alternative.transcript?.substring(0, 100)}${alternative.transcript?.length > 100 ? '...' : ''}"`);
      console.log(`🎯 Confidence: ${alternative.confidence || 0}`);

      return {
        language: detectedLanguage,
        languageName: this.supportedLanguages[detectedLanguage]?.name || detectedLanguage,
        transcript: alternative.transcript || '',
        confidence: alternative.confidence || 0,
        detectedLanguage: detectedLanguage,
        words: words,
        paragraphs: paragraphs,
        utterances: utterances,
        metadata: {
          duration: result.results.summary?.duration || 0,
          language_confidence: result.results.language_confidence || 0
        }
      };

    } catch (error) {
      console.error('❌ Auto-detection transcription failed:', error.message);
      throw error;
    }
  }

  /**
   * Get list of supported languages
   */
  getSupportedLanguages() {
    return this.supportedLanguages;
  }

  /**
   * Validate language code
   */
  isLanguageSupported(languageCode) {
    return !!this.supportedLanguages[languageCode];
  }
}

module.exports = new DeepgramTranscriptionService();
