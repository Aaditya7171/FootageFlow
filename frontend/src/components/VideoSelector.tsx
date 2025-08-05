import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Play, Clock, Tag, CheckCircle2 } from 'lucide-react';
import { useVideo } from '../contexts/VideoContext';
import AnimatedButton from './AnimatedButton';

interface Video {
  id: string;
  title: string;
  thumbnailUrl?: string;
  duration?: number;
  transcriptionStatus: string;
  visionStatus: string;
  tags: Array<{
    label: string;
    confidence: number;
  }>;
  uploadDate: string;
}

interface VideoSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selectedVideoIds: string[]) => void;
  selectedVideoIds: string[];
}

const VideoSelector: React.FC<VideoSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  selectedVideoIds
}) => {
  const { videos, loading } = useVideo();
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedVideoIds);

  // Filter only processed videos
  const processedVideos = videos.filter(video => 
    video.transcriptionStatus === 'completed' && video.visionStatus === 'completed'
  );

  useEffect(() => {
    setLocalSelectedIds(selectedVideoIds);
  }, [selectedVideoIds]);

  const handleVideoToggle = (videoId: string) => {
    setLocalSelectedIds(prev => 
      prev.includes(videoId) 
        ? prev.filter(id => id !== videoId)
        : [...prev, videoId]
    );
  };

  const handleSelectAll = () => {
    if (localSelectedIds.length === processedVideos.length) {
      setLocalSelectedIds([]);
    } else {
      setLocalSelectedIds(processedVideos.map(video => video.id));
    }
  };

  const handleConfirm = () => {
    onSelect(localSelectedIds);
    onClose();
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return 'Unknown';
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6 max-w-4xl w-full max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-white">Select Videos for Story</h2>
              <p className="text-white/70 mt-1">
                Choose which videos to include in your AI-generated story
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-white/70">
              {processedVideos.length} processed videos available
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                {localSelectedIds.length === processedVideos.length ? 'Deselect All' : 'Select All'}
              </button>
              <div className="text-sm text-white/70">
                {localSelectedIds.length} selected
              </div>
            </div>
          </div>

          {/* Video List */}
          <div className="overflow-y-auto max-h-96 space-y-3 mb-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : processedVideos.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-white/70">No processed videos available</p>
                <p className="text-white/50 text-sm mt-2">
                  Upload and process videos first to create stories
                </p>
              </div>
            ) : (
              processedVideos.map((video) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                    localSelectedIds.includes(video.id)
                      ? 'bg-blue-500/20 border-blue-400/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                  onClick={() => handleVideoToggle(video.id)}
                >
                  <div className="flex items-center space-x-4">
                    {/* Selection Checkbox */}
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                      localSelectedIds.includes(video.id)
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-white/30'
                    }`}>
                      {localSelectedIds.includes(video.id) && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </div>

                    {/* Thumbnail */}
                    <div className="w-16 h-12 bg-white/10 rounded-lg flex items-center justify-center overflow-hidden">
                      {video.thumbnailUrl ? (
                        <img 
                          src={video.thumbnailUrl} 
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Play className="w-6 h-6 text-white/50" />
                      )}
                    </div>

                    {/* Video Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">{video.title}</h3>
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center space-x-1 text-white/60 text-sm">
                          <Clock className="w-4 h-4" />
                          <span>{formatDuration(video.duration)}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-green-400 text-sm">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Processed</span>
                        </div>
                        <span className="text-white/50 text-sm">{formatDate(video.uploadDate)}</span>
                      </div>
                      
                      {/* Tags */}
                      {video.tags && video.tags.length > 0 && (
                        <div className="flex items-center space-x-2 mt-2">
                          <Tag className="w-3 h-3 text-white/50" />
                          <div className="flex flex-wrap gap-1">
                            {video.tags.slice(0, 3).map((tag, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-white/10 rounded-full text-xs text-white/70"
                              >
                                {tag.label}
                              </span>
                            ))}
                            {video.tags.length > 3 && (
                              <span className="text-xs text-white/50">
                                +{video.tags.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <div className="text-sm text-white/70">
              {localSelectedIds.length === 0 
                ? 'Select videos or leave empty to use all processed videos'
                : `${localSelectedIds.length} video${localSelectedIds.length === 1 ? '' : 's'} selected`
              }
            </div>
            <div className="flex items-center space-x-3">
              <AnimatedButton
                onClick={onClose}
                variant="ghost"
                size="sm"
              >
                Cancel
              </AnimatedButton>
              <AnimatedButton
                onClick={handleConfirm}
                size="sm"
              >
                Confirm Selection
              </AnimatedButton>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VideoSelector;
