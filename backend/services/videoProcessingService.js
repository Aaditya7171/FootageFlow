const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

class VideoProcessingService {
  constructor() {
    this.tempDir = path.join(__dirname, '..', 'temp');
    this.outputDir = path.join(__dirname, '..', 'output');
    
    // Ensure directories exist
    [this.tempDir, this.outputDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    
    console.log('🎬 Video processing service initialized');
  }

  /**
   * Download video from URL
   */
  async downloadVideo(videoUrl, filename) {
    try {
      console.log(`📥 Downloading video: ${filename}`);
      
      const response = await axios({
        method: 'GET',
        url: videoUrl,
        responseType: 'stream'
      });

      const filePath = path.join(this.tempDir, filename);
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          console.log(`✅ Video downloaded: ${filename}`);
          resolve(filePath);
        });
        writer.on('error', reject);
      });
    } catch (error) {
      console.error(`❌ Failed to download video ${filename}:`, error.message);
      throw error;
    }
  }

  /**
   * Extract clip from video with timestamps
   */
  async extractClip(inputPath, outputPath, startTime, duration) {
    return new Promise((resolve, reject) => {
      console.log(`✂️ Extracting clip: ${startTime}s for ${duration}s`);
      
      ffmpeg(inputPath)
        .seekInput(startTime)
        .duration(duration)
        .output(outputPath)
        .on('end', () => {
          console.log(`✅ Clip extracted: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (error) => {
          console.error(`❌ Clip extraction failed:`, error.message);
          reject(error);
        })
        .run();
    });
  }

  /**
   * Concatenate multiple video clips
   */
  async concatenateClips(clipPaths, outputPath) {
    return new Promise((resolve, reject) => {
      console.log(`🔗 Concatenating ${clipPaths.length} clips`);
      
      const command = ffmpeg();
      
      // Add all input clips
      clipPaths.forEach(clipPath => {
        command.input(clipPath);
      });
      
      // Concatenate with filter
      const filterComplex = clipPaths.map((_, index) => `[${index}:v][${index}:a]`).join('') + 
                           `concat=n=${clipPaths.length}:v=1:a=1[outv][outa]`;
      
      command
        .complexFilter(filterComplex)
        .outputOptions(['-map', '[outv]', '-map', '[outa]'])
        .output(outputPath)
        .on('end', () => {
          console.log(`✅ Video concatenated: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (error) => {
          console.error(`❌ Video concatenation failed:`, error.message);
          reject(error);
        })
        .run();
    });
  }

  /**
   * Add transitions between clips
   */
  async addTransitions(clipPaths, outputPath, transitionType = 'fade') {
    return new Promise((resolve, reject) => {
      console.log(`✨ Adding ${transitionType} transitions`);
      
      if (clipPaths.length === 1) {
        // No transitions needed for single clip
        fs.copyFileSync(clipPaths[0], outputPath);
        resolve(outputPath);
        return;
      }
      
      const command = ffmpeg();
      clipPaths.forEach(clipPath => {
        command.input(clipPath);
      });
      
      // Create fade transitions
      let filterComplex = '';
      const transitionDuration = 0.5; // 0.5 second transitions
      
      for (let i = 0; i < clipPaths.length; i++) {
        if (i === 0) {
          filterComplex += `[0:v]fade=t=out:st=29.5:d=${transitionDuration}[v0fade];`;
        } else if (i === clipPaths.length - 1) {
          filterComplex += `[${i}:v]fade=t=in:st=0:d=${transitionDuration}[v${i}fade];`;
        } else {
          filterComplex += `[${i}:v]fade=t=in:st=0:d=${transitionDuration},fade=t=out:st=29.5:d=${transitionDuration}[v${i}fade];`;
        }
      }
      
      // Concatenate with fades
      filterComplex += clipPaths.map((_, index) => `[v${index}fade][${index}:a]`).join('') + 
                      `concat=n=${clipPaths.length}:v=1:a=1[outv][outa]`;
      
      command
        .complexFilter(filterComplex)
        .outputOptions(['-map', '[outv]', '-map', '[outa]'])
        .output(outputPath)
        .on('end', () => {
          console.log(`✅ Transitions added: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (error) => {
          console.error(`❌ Adding transitions failed:`, error.message);
          reject(error);
        })
        .run();
    });
  }

  /**
   * Generate video story from segments
   */
  async generateVideoStory(storyPlan, videos) {
    try {
      console.log('🎬 Starting video story generation...');
      
      const storyId = `story_${Date.now()}`;
      const clipPaths = [];
      
      // Download and process each video segment
      for (let i = 0; i < storyPlan.segments.length; i++) {
        const segment = storyPlan.segments[i];
        const video = videos.find(v => v.id === segment.videoId);
        
        if (!video) {
          console.warn(`⚠️ Video not found for segment: ${segment.videoId}`);
          continue;
        }
        
        // Download original video
        const originalFilename = `original_${i}_${Date.now()}.mp4`;
        const originalPath = await this.downloadVideo(video.url, originalFilename);
        
        // Extract clip
        const clipFilename = `clip_${i}_${Date.now()}.mp4`;
        const clipPath = path.join(this.tempDir, clipFilename);
        
        await this.extractClip(
          originalPath,
          clipPath,
          segment.startTime,
          segment.duration
        );
        
        clipPaths.push(clipPath);
        
        // Clean up original file
        fs.unlinkSync(originalPath);
      }
      
      if (clipPaths.length === 0) {
        throw new Error('No valid clips generated');
      }
      
      // Generate final video
      const finalVideoPath = path.join(this.outputDir, `${storyId}.mp4`);
      
      if (clipPaths.length === 1) {
        // Single clip - just copy
        fs.copyFileSync(clipPaths[0], finalVideoPath);
      } else {
        // Multiple clips - concatenate with transitions
        await this.addTransitions(clipPaths, finalVideoPath);
      }
      
      // Clean up clip files
      clipPaths.forEach(clipPath => {
        if (fs.existsSync(clipPath)) {
          fs.unlinkSync(clipPath);
        }
      });
      
      console.log(`✅ Video story generated: ${finalVideoPath}`);
      
      return {
        success: true,
        videoPath: finalVideoPath,
        filename: `${storyId}.mp4`,
        duration: storyPlan.totalDuration,
        segments: storyPlan.segments.length
      };
      
    } catch (error) {
      console.error('❌ Video story generation failed:', error);
      throw error;
    }
  }

  /**
   * Upload generated video to Cloudinary
   */
  async uploadToCloudinary(videoPath, storyId) {
    try {
      console.log('☁️ Uploading generated video to Cloudinary...');
      
      const cloudinary = require('cloudinary').v2;
      
      const result = await cloudinary.uploader.upload(videoPath, {
        resource_type: 'video',
        folder: 'footage-flow/generated-stories',
        public_id: storyId,
        overwrite: true
      });
      
      console.log('✅ Video uploaded to Cloudinary:', result.secure_url);
      
      return {
        url: result.secure_url,
        publicId: result.public_id,
        duration: result.duration
      };
      
    } catch (error) {
      console.error('❌ Cloudinary upload failed:', error);
      throw error;
    }
  }

  /**
   * Clean up temporary files
   */
  cleanup(filePaths) {
    filePaths.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Cleaned up: ${filePath}`);
      }
    });
  }
}

module.exports = new VideoProcessingService();
