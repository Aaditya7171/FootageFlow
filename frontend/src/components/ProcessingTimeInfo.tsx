import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Upload, Mic, Sparkles, Info } from 'lucide-react';

interface ProcessingTimeInfoProps {
  stage: 'uploading' | 'transcribing' | 'generating' | 'completed';
  fileSize?: number;
  className?: string;
}

const ProcessingTimeInfo: React.FC<ProcessingTimeInfoProps> = ({ 
  stage, 
  fileSize = 0, 
  className = '' 
}) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getEstimatedTime = (stage: string, fileSizeMB: number) => {
    const mb = fileSizeMB || 20; // Default to 20MB if not provided
    
    switch (stage) {
      case 'uploading':
        // Estimate: ~1-2 minutes per 10MB
        const uploadMinutes = Math.max(1, Math.ceil(mb / 10) * 1.5);
        return `${uploadMinutes}-${uploadMinutes + 1} minutes`;
      
      case 'transcribing':
        // Fast transcription: 5-10 seconds
        return '5-10 seconds';
      
      case 'generating':
        // Story generation: 10-30 seconds
        return '10-30 seconds';
      
      default:
        return '1-2 minutes';
    }
  };

  const getStageInfo = () => {
    const fileSizeMB = fileSize / (1024 * 1024);
    
    switch (stage) {
      case 'uploading':
        return {
          icon: <Upload className="w-5 h-5" />,
          title: 'Uploading Video',
          description: `Uploading ${formatFileSize(fileSize)} to cloud storage`,
          estimatedTime: getEstimatedTime('uploading', fileSizeMB),
          tips: [
            'Larger files take longer to upload',
            'Keep your browser tab open during upload',
            'Stable internet connection recommended'
          ]
        };
      
      case 'transcribing':
        return {
          icon: <Mic className="w-5 h-5" />,
          title: 'Transcribing Audio',
          description: 'Converting speech to text in multiple languages',
          estimatedTime: getEstimatedTime('transcribing', fileSizeMB),
          tips: [
            'Processing 3 languages: English, Spanish, French',
            'Includes timestamps and speaker detection',
            'Clear audio produces better results'
          ]
        };
      
      case 'generating':
        return {
          icon: <Sparkles className="w-5 h-5" />,
          title: 'Generating Story',
          description: 'AI is creating a compelling narrative from your video',
          estimatedTime: getEstimatedTime('generating', fileSizeMB),
          tips: [
            'Analyzing video content and transcript',
            'Creating engaging story structure',
            'Adding creative elements and flow'
          ]
        };
      
      case 'completed':
        return {
          icon: <Clock className="w-5 h-5" />,
          title: 'Processing Complete',
          description: 'Your video is ready with transcripts and story!',
          estimatedTime: 'Done!',
          tips: [
            'View multilingual transcripts',
            'Read AI-generated story',
            'Share or download content'
          ]
        };
      
      default:
        return {
          icon: <Clock className="w-5 h-5" />,
          title: 'Processing',
          description: 'Working on your video...',
          estimatedTime: '1-2 minutes',
          tips: ['Please be patient while we process your video']
        };
    }
  };

  const stageInfo = getStageInfo();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-blue-500/10 backdrop-blur-md rounded-xl p-6 border border-blue-500/20 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
          {stageInfo.icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">{stageInfo.title}</h3>
          <p className="text-white/70 text-sm">{stageInfo.description}</p>
        </div>
      </div>

      {/* Estimated Time */}
      <div className="bg-white/5 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-white/80 font-medium">Estimated Time:</span>
          <span className="text-blue-400 font-bold">{stageInfo.estimatedTime}</span>
        </div>
      </div>

      {/* Tips */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-white/60 text-sm">
          <Info className="w-4 h-4" />
          <span>Tips & Information:</span>
        </div>
        <ul className="space-y-1 text-white/70 text-sm">
          {stageInfo.tips.map((tip, index) => (
            <li key={index} className="flex items-start space-x-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Progress Indicator */}
      {stage !== 'completed' && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center space-x-2 text-white/60 text-sm">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <span>Processing in progress... Please keep this tab open</span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ProcessingTimeInfo;
