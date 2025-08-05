import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Video, Languages, Download, Share2 } from 'lucide-react';
import MultilingualTranscript from '../components/MultilingualTranscript';
import LoadingSpinner from '../components/LoadingSpinner';
import axios from 'axios';

interface VideoData {
  id: string;
  title: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  uploadDate: string;
  transcriptionStatus: string;
}

const VideoTranscript: React.FC = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const [video, setVideo] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (videoId) {
      fetchVideoData();
    }
  }, [videoId]);

  const fetchVideoData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5174';
      
      const response = await axios.get(
        `${API_BASE_URL}/api/videos/${videoId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setVideo(response.data.video);
      } else {
        setError(response.data.error || 'Failed to fetch video data');
      }
    } catch (err: any) {
      console.error('Error fetching video data:', err);
      setError(err.response?.data?.error || 'Failed to fetch video data');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${video?.title} - Transcript`,
          text: `Check out the multilingual transcript for "${video?.title}"`,
          url: window.location.href
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      } catch (error) {
        console.error('Failed to copy link:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Video className="w-16 h-16 text-white/50 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Video Not Found</h2>
          <p className="text-white/70 mb-6">{error || 'The requested video could not be found.'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-purple-600 transition-all duration-300"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
          
          <div>
            <h1 className="text-3xl font-bold text-white">Video Transcript</h1>
            <p className="text-white/70">AI-powered transcription with timestamps</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleShare}
            className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
            title="Share transcript"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </motion.div>

      {/* Video Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10"
      >
        <div className="flex items-start space-x-6">
          {/* Video Thumbnail */}
          <div className="flex-shrink-0">
            <div className="w-48 h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg overflow-hidden">
              {video.thumbnailUrl ? (
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Video className="w-12 h-12 text-white/50" />
                </div>
              )}
            </div>
          </div>

          {/* Video Details */}
          <div className="flex-1 space-y-3">
            <h2 className="text-xl font-semibold text-white">{video.title}</h2>
            
            {video.description && (
              <p className="text-white/70">{video.description}</p>
            )}

            <div className="flex items-center space-x-6 text-sm text-white/60">
              <span>Duration: {formatDuration(video.duration)}</span>
              <span>Uploaded: {formatDate(video.uploadDate)}</span>
              <span className="flex items-center space-x-1">
                <Languages className="w-4 h-4" />
                <span>Status: {video.transcriptionStatus}</span>
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => window.open(video.url, '_blank')}
                className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
              >
                Watch Video
              </button>
              
              <button
                onClick={() => navigate(`/video/${video.id}`)}
                className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors text-sm"
              >
                Video Details
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Transcript Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10"
      >
        {video.transcriptionStatus === 'completed' ? (
          <MultilingualTranscript 
            videoId={video.id}
            onTranscriptionComplete={(transcriptions) => {
              console.log('Transcriptions loaded:', Object.keys(transcriptions));
            }}
          />
        ) : video.transcriptionStatus === 'processing' ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Languages className="w-8 h-8 text-blue-400 animate-pulse" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Transcription in Progress</h3>
            <p className="text-white/70 mb-6">
              We're processing your video in multiple languages. This may take a few minutes.
            </p>
            <button
              onClick={fetchVideoData}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-purple-600 transition-all duration-300"
            >
              Refresh Status
            </button>
          </div>
        ) : video.transcriptionStatus === 'failed' ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Languages className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Transcription Failed</h3>
            <p className="text-white/70 mb-6">
              There was an error processing the transcription. Please try again.
            </p>
            <button
              onClick={() => {
                // TODO: Implement retry transcription
                console.log('Retry transcription for video:', video.id);
              }}
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl font-semibold hover:from-red-600 hover:to-pink-600 transition-all duration-300"
            >
              Retry Transcription
            </button>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Languages className="w-8 h-8 text-yellow-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Transcription Pending</h3>
            <p className="text-white/70 mb-6">
              This video is queued for transcription processing.
            </p>
            <button
              onClick={fetchVideoData}
              className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all duration-300"
            >
              Check Status
            </button>
          </div>
        )}
      </motion.div>
      </div>
    </div>
  );
};

export default VideoTranscript;
