// Simple in-memory storage for development when database is unavailable
class MemoryStorage {
  constructor() {
    this.videos = new Map();
    this.transcripts = new Map();
    this.users = new Map();
    
    console.log('📦 Memory storage initialized for development');
  }

  // Video operations
  async createVideo(videoData) {
    const id = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const video = {
      id,
      ...videoData,
      uploadDate: new Date().toISOString(),
      transcriptionStatus: 'pending',
      visionStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.videos.set(id, video);
    console.log(`📹 Video stored in memory: ${id}`);
    return video;
  }

  async getVideosByUser(userId) {
    const userVideos = Array.from(this.videos.values())
      .filter(video => video.userId === userId)
      .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
    
    return userVideos;
  }

  async getVideoById(id, userId) {
    const video = this.videos.get(id);
    if (!video || video.userId !== userId) {
      return null;
    }
    
    // Add transcript if exists
    const transcript = this.transcripts.get(id);
    if (transcript) {
      video.transcript = transcript;
    }
    
    return video;
  }

  async updateVideo(id, updates) {
    const video = this.videos.get(id);
    if (!video) {
      throw new Error('Video not found');
    }
    
    const updatedVideo = {
      ...video,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    this.videos.set(id, updatedVideo);
    return updatedVideo;
  }

  async deleteVideo(id, userId) {
    const video = this.videos.get(id);
    if (!video || video.userId !== userId) {
      throw new Error('Video not found or access denied');
    }
    
    this.videos.delete(id);
    this.transcripts.delete(id);
    return true;
  }

  // Transcript operations
  async createTranscript(videoId, transcriptData) {
    const transcript = {
      id: `transcript_${Date.now()}`,
      videoId,
      ...transcriptData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.transcripts.set(videoId, transcript);
    console.log(`📝 Transcript stored in memory for video: ${videoId}`);
    return transcript;
  }

  async getTranscriptByVideoId(videoId) {
    return this.transcripts.get(videoId) || null;
  }

  async getAllTranscripts() {
    return Array.from(this.transcripts.values());
  }

  async updateTranscript(videoId, updates) {
    const transcript = this.transcripts.get(videoId);
    if (!transcript) {
      // Create new transcript if doesn't exist
      return this.createTranscript(videoId, updates);
    }
    
    const updatedTranscript = {
      ...transcript,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    this.transcripts.set(videoId, updatedTranscript);
    return updatedTranscript;
  }

  // User operations
  async createUser(userData) {
    const id = userData.id || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const user = {
      id,
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.users.set(id, user);
    console.log(`👤 User stored in memory: ${id}`);
    return user;
  }

  async getUserById(id) {
    return this.users.get(id) || null;
  }

  async getUserByEmail(email) {
    return Array.from(this.users.values()).find(user => user.email === email) || null;
  }

  async updateUser(id, updates) {
    const user = this.users.get(id);
    if (!user) {
      throw new Error('User not found');
    }
    
    const updatedUser = {
      ...user,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Search operations
  async searchVideos(userId, query) {
    const userVideos = await this.getVideosByUser(userId);
    
    if (!query) {
      return userVideos;
    }
    
    const searchTerm = query.toLowerCase();
    return userVideos.filter(video => {
      // Search in title and description
      const titleMatch = video.title?.toLowerCase().includes(searchTerm);
      const descMatch = video.description?.toLowerCase().includes(searchTerm);
      
      // Search in transcript if available
      const transcript = this.transcripts.get(video.id);
      let transcriptMatch = false;
      
      if (transcript && transcript.transcriptions) {
        const transcriptText = JSON.stringify(transcript.transcriptions).toLowerCase();
        transcriptMatch = transcriptText.includes(searchTerm);
      }
      
      return titleMatch || descMatch || transcriptMatch;
    });
  }

  // Utility methods
  getStats() {
    return {
      videos: this.videos.size,
      transcripts: this.transcripts.size,
      users: this.users.size
    };
  }

  // Tag operations
  async createTag(tagData) {
    if (!this.tags) {
      this.tags = new Map();
    }

    const id = `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const tag = {
      id,
      ...tagData,
      createdAt: new Date().toISOString()
    };

    this.tags.set(id, tag);
    console.log(`🏷️ Tag stored in memory: ${tag.label} for video ${tagData.videoId}`);
    return tag;
  }

  async getTagsByVideoId(videoId) {
    if (!this.tags) {
      return [];
    }

    const videoTags = Array.from(this.tags.values())
      .filter(tag => tag.videoId === videoId)
      .sort((a, b) => b.confidence - a.confidence); // Sort by confidence descending

    return videoTags;
  }

  clear() {
    this.videos.clear();
    this.transcripts.clear();
    this.users.clear();
    if (this.tags) {
      this.tags.clear();
    }
    console.log('🗑️ Memory storage cleared');
  }
}

// Export singleton instance
module.exports = new MemoryStorage();
