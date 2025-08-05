import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import axios from 'axios';

export interface Tag {
  id: string;
  label: string;
  confidence?: number;
  type: string;
  timestamp?: number;
}

export interface Transcript {
  id: string;
  fullText: string;
  segments?: any[];
  language?: string;
  createdAt: string;
}

export interface Video {
  id: string;
  title: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  uploadDate: string;
  transcriptionStatus: string;
  visionStatus: string;
  transcript?: Transcript;
  transcriptTimestamps?: any;
  tags: Tag[];
  visionAnalysis?: any;
}

interface VideoContextType {
  videos: Video[];
  loading: boolean;
  error: string | null;
  uploadProgress: number;
  uploadingVideos: Map<string, { progress: number; title: string; file: File }>;
  fetchVideos: () => Promise<void>;
  uploadVideo: (file: File, title?: string, description?: string) => Promise<Video>;
  deleteVideo: (id: string) => Promise<void>;
  updateVideo: (id: string, updates: Partial<Video>) => Promise<Video>;
  searchVideos: (query: string) => Promise<Video[]>;
  getVideo: (id: string) => Promise<Video>;
}

const VideoContext = createContext<VideoContextType | undefined>(undefined);

export const VideoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingVideos, setUploadingVideos] = useState<Map<string, { progress: number; title: string; file: File }>>(new Map());

  // Auto-refresh videos every 2 minutes to update processing status (less frequent)
  useEffect(() => {
    const interval = setInterval(() => {
      // Only refresh if there are videos being processed
      const hasProcessingVideos = videos.some(video =>
        video.transcriptionStatus === 'processing' ||
        video.visionStatus === 'processing'
      );

      // Only refresh if actively processing and not too many uploads in progress
      if (hasProcessingVideos && uploadingVideos.size === 0) {
        console.log('🔄 Auto-refreshing videos for processing status...');
        fetchVideos();
      }
    }, 120000); // 2 minutes instead of 30 seconds

    return () => clearInterval(interval);
  }, [videos, uploadingVideos.size]);

  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/videos');

      // Handle new API response format
      if (response.data.success) {
        setVideos(response.data.videos || []);
      } else {
        throw new Error(response.data.error || 'Failed to fetch videos');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch videos');
      console.error('Error fetching videos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadVideo = useCallback(async (file: File, title?: string, description?: string): Promise<Video> => {
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const videoTitle = title || `Video ${new Date().toLocaleDateString()}`;

    try {
      setLoading(true);
      setError(null);
      setUploadProgress(0);

      // Create immediate entry for uploading video
      setUploadingVideos(prev => new Map(prev.set(uploadId, {
        progress: 0,
        title: videoTitle,
        file
      })));

      const formData = new FormData();
      formData.append('video', file);
      if (title) formData.append('title', title);
      if (description) formData.append('description', description);

      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 600000, // 10 minutes timeout for large files
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);

            // Update uploading video progress
            setUploadingVideos(prev => {
              const newMap = new Map(prev);
              const uploadData = newMap.get(uploadId);
              if (uploadData) {
                newMap.set(uploadId, { ...uploadData, progress: percentCompleted });
              }
              return newMap;
            });

            console.log(`Upload progress: ${percentCompleted}%`);
          }
        },
      });

      const newVideo = response.data.video;

      // Remove from uploading videos and add to videos list
      setUploadingVideos(prev => {
        const newMap = new Map(prev);
        newMap.delete(uploadId);
        return newMap;
      });

      setVideos(prev => [newVideo, ...prev]);
      setUploadProgress(100);

      // Refresh videos list to get updated data
      setTimeout(() => {
        fetchVideos();
      }, 1000);

      return newVideo;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to upload video';
      setError(errorMessage);
      setUploadProgress(0);

      // Remove failed upload from uploading videos
      setUploadingVideos(prev => {
        const newMap = new Map(prev);
        newMap.delete(uploadId);
        return newMap;
      });

      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteVideo = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await axios.delete(`/api/videos/${id}`);
      setVideos(prev => prev.filter(video => video.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete video');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateVideo = useCallback(async (id: string, updates: Partial<Video>): Promise<Video> => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.put(`/api/videos/${id}`, updates);
      const updatedVideo = response.data;
      
      setVideos(prev => prev.map(video => 
        video.id === id ? updatedVideo : video
      ));
      
      return updatedVideo;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update video');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const searchVideos = useCallback(async (query: string): Promise<Video[]> => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`/api/videos/search?query=${encodeURIComponent(query)}`);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to search videos');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getVideo = useCallback(async (id: string): Promise<Video> => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`/api/videos/${id}`);

      // Handle new API response format
      if (response.data.success) {
        return response.data.video;
      } else {
        throw new Error(response.data.error || 'Failed to fetch video');
      }
    } catch (err: any) {
      console.error('Error fetching video:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch video');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const value: VideoContextType = {
    videos,
    loading,
    error,
    uploadProgress,
    uploadingVideos,
    fetchVideos,
    uploadVideo,
    deleteVideo,
    updateVideo,
    searchVideos,
    getVideo,
  };

  return (
    <VideoContext.Provider value={value}>
      {children}
    </VideoContext.Provider>
  );
};

export const useVideo = (): VideoContextType => {
  const context = useContext(VideoContext);
  if (context === undefined) {
    throw new Error('useVideo must be used within a VideoProvider');
  }
  return context;
};
