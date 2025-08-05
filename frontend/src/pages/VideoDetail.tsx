import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, Tag as TagIcon, Clock, Download, Share, Trash2 } from 'lucide-react';
import { useVideo } from '../contexts/VideoContext';
import LoadingSpinner from '../components/LoadingSpinner';
import type { Video, Tag } from '../contexts/VideoContext';

const VideoDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getVideo, deleteVideo } = useVideo();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchVideo = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const videoData = await getVideo(id);

        // Ensure video has required properties to prevent crashes
        const safeVideo = {
          ...videoData,
          tags: videoData.tags || [],
          transcript: videoData.transcript || undefined,
          visionAnalysis: videoData.visionAnalysis || undefined
        };

        setVideo(safeVideo);
      } catch (err: any) {
        console.error('Error fetching video:', err);
        setError(err.message || 'Failed to load video');
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [id, getVideo]);

  const handleDelete = async () => {
    if (!video || !window.confirm('Are you sure you want to delete this video?')) return;
    
    try {
      await deleteVideo(video.id);
      navigate('/dashboard');
    } catch (err: any) {
      alert('Failed to delete video: ' + err.message);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const groupTagsByType = (tags: Tag[] | undefined) => {
    if (!tags || !Array.isArray(tags)) {
      return {};
    }
    return tags.reduce((acc, tag) => {
      if (!acc[tag.type]) {
        acc[tag.type] = [];
      }
      acc[tag.type].push(tag);
      return acc;
    }, {} as Record<string, Tag[]>);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="card text-center py-12">
        <p className="text-red-600 mb-4">{error || 'Video not found'}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="btn-primary"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const groupedTags = groupTagsByType(video?.tags);

  return (
    <div className="space-y-4 md:space-y-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">Video Details</h1>
          <p className="text-neutral-600 mt-1">Comprehensive video analysis and insights</p>
        </div>

        <div className="flex items-center space-x-1 sm:space-x-2">
          <button className="p-2 text-neutral-700 hover:text-primary-500 transition-colors">
            <Share className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button className="p-2 text-neutral-700 hover:text-primary-500 transition-colors">
            <Download className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 text-neutral-700 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
        {/* Video Player */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2"
        >
          <div className="card">
            <div className="aspect-video bg-neutral-900 rounded-lg overflow-hidden mb-4">
              <video
                controls
                className="w-full h-full"
                poster={video.thumbnailUrl}
              >
                <source src={video.url} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>

            <div className="space-y-3 md:space-y-4">
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-neutral-900 mb-2 break-words">
                  {video.title}
                </h1>
                {video.description && (
                  <p className="text-neutral-700">{video.description}</p>
                )}
              </div>

              <div className="flex items-center space-x-6 text-sm text-neutral-700">
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatDate(video.uploadDate)}</span>
                </div>
                {video.duration && (
                  <div className="flex items-center space-x-1">
                    <Play className="w-4 h-4" />
                    <span>{formatDuration(video.duration)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Transcript Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <div className="mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-neutral-900 text-center">
                Video Transcript
              </h2>
            </div>
            <div className="text-center">
              <button
                onClick={() => navigate(`/video/${video.id}/transcript`)}
                className="inline-flex items-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base"
              >
                <span className="hidden sm:inline">View Transcript</span>
                <span className="sm:hidden">Transcript</span>
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </motion.div>
        </motion.div>

        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          {/* Processing Status */}
          <div className="card">
            <h3 className="font-semibold text-neutral-900 mb-4">Processing Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-700">Transcription</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  video.transcriptionStatus === 'completed' 
                    ? 'bg-green-100 text-green-800'
                    : video.transcriptionStatus === 'processing'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-neutral-100 text-neutral-800'
                }`}>
                  {video.transcriptionStatus}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-700">Vision Analysis</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  video.visionStatus === 'completed' 
                    ? 'bg-green-100 text-green-800'
                    : video.visionStatus === 'processing'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-neutral-100 text-neutral-800'
                }`}>
                  {video.visionStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Tags */}
          {video.tags.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-neutral-900 mb-4 flex items-center space-x-2">
                <TagIcon className="w-5 h-5" />
                <span>AI Tags ({video.tags.length})</span>
              </h3>
              
              <div className="space-y-4">
                {Object.entries(groupedTags).map(([type, tags]) => (
                  <div key={type}>
                    <h4 className="text-sm font-medium text-neutral-700 mb-2 capitalize">
                      {type}s
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {(tags as Tag[]).map((tag: Tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full"
                        >
                          {tag.label}
                          {tag.confidence && (
                            <span className="ml-1 text-primary-600">
                              {Math.round(tag.confidence * 100)}%
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Video Info */}
          <div className="card">
            <h3 className="font-semibold text-neutral-900 mb-4">Video Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-700">Upload Date</span>
                <span className="text-neutral-900">{formatDate(video.uploadDate)}</span>
              </div>
              {video.duration && (
                <div className="flex justify-between">
                  <span className="text-neutral-700">Duration</span>
                  <span className="text-neutral-900">{formatDuration(video.duration)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-neutral-700">Status</span>
                <span className="text-neutral-900">
                  {video.transcriptionStatus === 'completed' && video.visionStatus === 'completed'
                    ? 'Ready'
                    : 'Processing'
                  }
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default VideoDetail;
