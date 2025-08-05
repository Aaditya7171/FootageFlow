import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Clock, Tag, Eye, MoreVertical, Trash2, Edit, Languages, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useVideo } from '../contexts/VideoContext';

// Import types from VideoContext to avoid conflicts
import type { Video } from '../contexts/VideoContext';

interface VideoCardProps {
  video: Video;
}

const VideoCard: React.FC<VideoCardProps> = ({ video }) => {
  const navigate = useNavigate();
  const { deleteVideo } = useVideo();
  const [showMenu, setShowMenu] = useState(false);

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  };

  const getStatusText = (transcriptionStatus: string, visionStatus: string): string => {
    if (transcriptionStatus === 'completed' && visionStatus === 'completed') {
      return 'Ready';
    }
    if (transcriptionStatus === 'processing' || visionStatus === 'processing') {
      return 'Processing';
    }
    if (transcriptionStatus === 'failed' || visionStatus === 'failed') {
      return 'Failed';
    }
    return 'Pending';
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on menu or delete button
    if ((e.target as HTMLElement).closest('.menu-button')) {
      return;
    }
    navigate(`/video/${video.id}`);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this video?')) {
      try {
        await deleteVideo(video.id);
      } catch (error) {
        alert('Failed to delete video. Please try again.');
      }
    }
    setShowMenu(false);
  };

  const getTranscriptionStatusIcon = () => {
    switch (video.transcriptionStatus) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getTranscriptionStatusText = () => {
    switch (video.transcriptionStatus) {
      case 'completed':
        return 'Transcription ready';
      case 'processing':
        return 'Transcribing...';
      case 'failed':
        return 'Transcription failed';
      default:
        return 'Pending transcription';
    }
  };

  return (
    <motion.div
      className="card-interactive cursor-pointer group spotlight"
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleCardClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-neutral-200 rounded-lg overflow-hidden mb-4">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-12 h-12 text-neutral-400" />
          </div>
        )}
        
        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
          <motion.div
            className="w-16 h-16 bg-white/95 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg"
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
          >
            <Play className="w-7 h-7 text-primary-500 ml-1" />
          </motion.div>
        </div>

        {/* Menu Button */}
        <div className="absolute top-2 right-2 menu-button">
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-black/70"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 z-10 min-w-[120px]">
                <button
                  onClick={handleDelete}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Duration badge */}
        {video.duration && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {formatDuration(video.duration)}
          </div>
        )}

        {/* Status badge */}
        <motion.div
          className={`absolute top-2 left-2 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${getStatusColor(getStatusText(video.transcriptionStatus, video.visionStatus))}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          {getStatusText(video.transcriptionStatus, video.visionStatus)}
        </motion.div>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {/* Title and menu */}
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-neutral-900 line-clamp-2 flex-1">
            {video.title}
          </h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Implement dropdown menu
            }}
            className="p-1 text-neutral-700 hover:text-neutral-900 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

        {/* Description */}
        {video.description && (
          <p className="text-sm text-neutral-700 line-clamp-2">
            {video.description}
          </p>
        )}

        {/* Tags */}
        {video.tags && video.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {video.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center px-2 py-1 bg-blue-500/20 text-blue-200 text-xs rounded-full"
              >
                <Tag className="w-3 h-3 mr-1" />
                {tag.label}
              </span>
            ))}
            {video.tags.length > 3 && (
              <span className="text-xs text-white/70 px-2 py-1">
                +{video.tags.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Transcription Status */}
        <div className="flex items-center space-x-2 text-sm">
          {getTranscriptionStatusIcon()}
          <span className="text-neutral-700">{getTranscriptionStatusText()}</span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-sm text-neutral-700 pt-2 border-t border-neutral-200">
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>{formatDate(video.uploadDate)}</span>
          </div>
          
          <div className="flex items-center space-x-3">
            {video.transcript && (
              <div className="flex items-center space-x-1" title="Transcribed">
                <Eye className="w-4 h-4" />
                <span className="text-xs">Transcript</span>
              </div>
            )}
            {video.tags && video.tags.length > 0 && (
              <div className="flex items-center space-x-1" title="AI Tagged">
                <Tag className="w-4 h-4" />
                <span className="text-xs">{video.tags.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default VideoCard;
