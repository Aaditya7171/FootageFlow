import React from 'react';
import { motion } from 'framer-motion';
import { Upload, Clock, Info } from 'lucide-react';

interface UploadingVideoCardProps {
  title: string;
  progress: number;
  file: File;
}

const UploadingVideoCard: React.FC<UploadingVideoCardProps> = ({ title, progress, file }) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getEstimatedTime = () => {
    const fileSizeMB = file.size / (1024 * 1024);
    const estimatedMinutes = Math.max(1, Math.ceil(fileSizeMB / 10) * 1.5);
    return `${estimatedMinutes}-${estimatedMinutes + 1} min`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300"
      transition={{ duration: 0.3 }}
    >
      {/* Thumbnail placeholder */}
      <div className="relative aspect-video bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg overflow-hidden mb-4 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>
        <div className="relative z-10 flex flex-col items-center space-y-2">
          <Upload className="w-8 h-8 text-white/70 animate-pulse" />
          <span className="text-white/70 text-sm font-medium">Uploading...</span>
        </div>
        
        {/* Progress overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {/* Title and progress */}
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-white line-clamp-2 flex-1">
            {title}
          </h3>
          <span className="text-sm text-blue-400 font-medium ml-2">
            {progress}%
          </span>
        </div>

        {/* File info */}
        <div className="flex items-center space-x-4 text-sm text-white/70">
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>Uploading</span>
          </div>
          <span>{formatFileSize(file.size)}</span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-white/10 rounded-full h-3">
          <motion.div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full flex items-center justify-end pr-2"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          >
            {progress > 20 && (
              <span className="text-xs text-white font-medium">
                {progress}%
              </span>
            )}
          </motion.div>
        </div>

        {/* Status text with time estimate */}
        <div className="text-center space-y-2">
          <span className="text-sm text-white/70">
            {progress < 100 ? 'Uploading video...' : 'Processing...'}
          </span>

          {progress < 100 && (
            <div className="flex items-center justify-center space-x-2 text-xs text-white/60">
              <Info className="w-3 h-3" />
              <span>Estimated time: {getEstimatedTime()}</span>
            </div>
          )}

          {progress >= 100 && (
            <div className="flex items-center justify-center space-x-2 text-xs text-white/60">
              <Info className="w-3 h-3" />
              <span>Transcription: 5-10 seconds</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default UploadingVideoCard;
