import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Video, AlertCircle, CheckCircle } from 'lucide-react';
import { useVideo } from '../contexts/VideoContext';

interface VideoUploadProps {
  onUploadComplete?: (video: any) => void;
  onClose?: () => void;
}

const VideoUpload: React.FC<VideoUploadProps> = ({ onUploadComplete, onClose }) => {
  const { uploadVideo, loading, uploadProgress } = useVideo();
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      setUploadStatus('idle');
      setErrorMessage('');
      
      // Auto-generate title from filename
      if (!title) {
        const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
        setTitle(fileName);
      }
    }
  }, [title]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.webm']
    },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024, // 100MB
    onDropRejected: (fileRejections) => {
      const rejection = fileRejections[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setErrorMessage('File size must be less than 100MB');
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setErrorMessage('Please upload a valid video file');
      } else {
        setErrorMessage('Invalid file. Please try again.');
      }
      setUploadStatus('error');
    }
  });

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploadStatus('uploading');
      setErrorMessage('');
      
      const video = await uploadVideo(selectedFile, title, description);
      
      setUploadStatus('success');
      setSelectedFile(null);
      setTitle('');
      setDescription('');
      
      if (onUploadComplete) {
        onUploadComplete(video);
      }
      
      // Reset to idle after 3 seconds
      setTimeout(() => setUploadStatus('idle'), 3000);
    } catch (error: any) {
      setUploadStatus('error');
      setErrorMessage(error.message || 'Upload failed');
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setUploadStatus('idle');
    setErrorMessage('');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
        {uploadStatus === 'success' ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="p-8 rounded-2xl shadow-2xl backdrop-blur-md border bg-white/10 border-white/20 text-center"
          >
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Upload Successful!
            </h3>
            <p className="text-white/70">
              Your video has been uploaded and is being processed.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-8 rounded-2xl shadow-2xl backdrop-blur-md border bg-white/10 border-white/20 relative"
          >
            {/* Close Button */}
            {onClose && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Upload Area */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
                isDragActive
                  ? 'border-blue-400 bg-blue-500/10'
                  : selectedFile
                  ? 'border-green-400 bg-green-500/10'
                  : 'border-white/30 hover:border-blue-400 hover:bg-blue-500/10'
              }`}
            >
              <input {...getInputProps()} />
              
              {selectedFile ? (
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                    <Video className="w-8 h-8 text-green-400" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-white">
                      {selectedFile.name}
                    </p>
                    <p className="text-white/70">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFile();
                    }}
                    className="inline-flex items-center space-x-1 text-white/70 hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span>Remove</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto">
                    <Upload className="w-8 h-8 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-white">
                      {isDragActive ? 'Drop your video here' : 'Upload a video'}
                    </p>
                    <p className="text-white/70">
                      Drag and drop or click to select • Max 100MB
                    </p>
                    <p className="text-sm text-white/60 mt-2">
                      Supports MP4, MOV, AVI, MKV, WebM
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {uploadStatus === 'error' && errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center space-x-2"
              >
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-red-200 text-sm">{errorMessage}</p>
              </motion.div>
            )}

            {/* Form Fields */}
            {selectedFile && uploadStatus !== 'uploading' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl backdrop-blur-md border transition-all duration-300 bg-white/10 border-white/20 text-white placeholder-white/50 focus:bg-white/20 focus:border-white/40"
                    placeholder="Enter video title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl backdrop-blur-md border transition-all duration-300 bg-white/10 border-white/20 text-white placeholder-white/50 focus:bg-white/20 focus:border-white/40 resize-none"
                    rows={3}
                    placeholder="Enter video description"
                  />
                </div>

                <motion.button
                  onClick={handleUpload}
                  disabled={!title.trim() || loading}
                  className="w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-purple-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-blue-500/25"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? 'Uploading...' : 'Upload Video'}
                </motion.button>
              </motion.div>
            )}

            {/* Upload Progress */}
            {uploadStatus === 'uploading' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6"
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <Upload className="w-8 h-8 text-blue-400" />
                    </motion.div>
                  </div>
                  <p className="text-lg font-medium text-white mb-2">
                    Uploading your video...
                  </p>
                  <p className="text-white/70 mb-4 text-xl font-semibold">
                    {uploadProgress}% complete
                  </p>
                </div>

                {/* Enhanced Progress Bar */}
                <div className="w-full bg-white/20 rounded-full h-4 mb-4 overflow-hidden">
                  <motion.div
                    className="bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 h-4 rounded-full relative"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      animate={{ x: [-100, 300] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </motion.div>
                </div>

                <div className="text-center space-y-2">
                  <p className="text-white/60 text-sm">
                    Please don't close this window while uploading
                  </p>
                  <div className="flex items-center justify-center space-x-2 text-white/50 text-xs">
                    <div className="w-1 h-1 bg-white/50 rounded-full animate-pulse" />
                    <span>Processing video...</span>
                    <div className="w-1 h-1 bg-white/50 rounded-full animate-pulse" />
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
};

export default VideoUpload;
