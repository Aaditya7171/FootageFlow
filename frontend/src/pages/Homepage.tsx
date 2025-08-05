import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Video, Clock, Sparkles, Upload, Play } from 'lucide-react';
import { useVideo } from '../contexts/VideoContext';
import { useAuth } from '../contexts/AuthContext';
import VideoUpload from '../components/VideoUpload';
import VideoCard from '../components/VideoCard';
import UploadingVideoCard from '../components/UploadingVideoCard';
import ProcessingTimeInfo from '../components/ProcessingTimeInfo';
import StoryGenerator from '../components/StoryGenerator';
import LoadingSpinner from '../components/LoadingSpinner';
import AnimatedButton from '../components/AnimatedButton';

const Homepage: React.FC = () => {
  const { user } = useAuth();
  const { videos, loading, error, fetchVideos, uploadingVideos } = useVideo();
  const [showUpload, setShowUpload] = useState(false);
  const [showStoryGenerator, setShowStoryGenerator] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredVideos, setFilteredVideos] = useState(videos);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = videos.filter(video =>
        video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.tags?.some(tag => tag.label.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredVideos(filtered);
    } else {
      setFilteredVideos(videos);
    }
  }, [searchQuery, videos]);

  const totalVideos = videos.length;
  const processingVideos = videos.filter(video => 
    video.transcriptionStatus === 'processing' || video.visionStatus === 'processing'
  ).length;
  const readyVideos = videos.filter(video => 
    video.transcriptionStatus === 'completed' && video.visionStatus === 'completed'
  ).length;



  if (loading && videos.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-4xl font-bold text-white mb-2">
          Welcome back, {user?.name || user?.username || 'Footage'}!
        </h1>
        <p className="text-white/70 text-lg">
          Manage your video content and create amazing stories
        </p>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4 justify-center"
      >
        <AnimatedButton
          onClick={() => setShowUpload(true)}
          icon={<Upload className="w-5 h-5" />}
          className="flex-1 sm:flex-none"
        >
          Upload Video
        </AnimatedButton>
        <AnimatedButton
          onClick={() => setShowStoryGenerator(true)}
          icon={<Sparkles className="w-5 h-5" />}
          variant="secondary"
          className="flex-1 sm:flex-none"
        >
          Create Story
        </AnimatedButton>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Video className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalVideos}</p>
              <p className="text-white/70 text-sm">Total Videos</p>
            </div>
          </div>
        </div>

        <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{processingVideos}</p>
              <p className="text-white/70 text-sm">Processing</p>
            </div>
          </div>
        </div>

        <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Play className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{readyVideos}</p>
              <p className="text-white/70 text-sm">Ready</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Videos and Stories Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">Videos</h2>
          <div className="text-sm text-white/70">Stories</div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search videos with AI... (e.g., 'happy moments', 'outdoor scenes')"
            className="w-full pl-12 pr-4 py-4 rounded-xl backdrop-blur-md border transition-all duration-300 bg-white/10 border-white/20 text-white placeholder-white/50 focus:bg-white/20 focus:border-white/40"
          />
        </div>

        {/* Videos Grid */}
        {error && (
          <div className="text-center py-8">
            <p className="text-red-400">Error loading videos: {error}</p>
          </div>
        )}

        {!loading && filteredVideos.length === 0 && !error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Video className="w-12 h-12 text-white/50" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {searchQuery ? 'No videos found' : 'No videos yet'}
            </h3>
            <p className="text-white/70 mb-6">
              {searchQuery 
                ? 'Try adjusting your search terms or upload more videos'
                : 'Upload your first video to get started with AI-powered video management'
              }
            </p>
            {!searchQuery && (
              <AnimatedButton
                onClick={() => setShowUpload(true)}
                icon={<Plus className="w-5 h-5" />}
              >
                Upload Your First Video
              </AnimatedButton>
            )}
          </motion.div>
        )}

        {/* Processing Time Information */}
        {uploadingVideos.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <ProcessingTimeInfo
              stage="uploading"
              fileSize={Array.from(uploadingVideos.values())[0]?.file.size || 0}
              className="mb-6"
            />
          </motion.div>
        )}

        {/* Uploading Videos */}
        {uploadingVideos.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="space-y-4"
          >
            <h3 className="text-xl font-semibold text-white flex items-center space-x-2">
              <Upload className="w-5 h-5" />
              <span>Uploading Videos ({uploadingVideos.size})</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from(uploadingVideos.entries()).map(([uploadId, uploadData]) => (
                <UploadingVideoCard
                  key={uploadId}
                  title={uploadData.title}
                  progress={uploadData.progress}
                  file={uploadData.file}
                />
              ))}
            </div>
          </motion.div>
        )}

        {filteredVideos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="space-y-4"
          >
            <h3 className="text-xl font-semibold text-white flex items-center space-x-2">
              <Video className="w-5 h-5" />
              <span>Your Videos</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVideos.map((video, index) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                >
                  <VideoCard video={video} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Upload Modal */}
      {showUpload && (
        <VideoUpload
          onClose={() => setShowUpload(false)}
          onUploadComplete={() => {
            setShowUpload(false);
            fetchVideos();
          }}
        />
      )}

      {/* Story Generator Modal */}
      {showStoryGenerator && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-white">AI Story Generator</h2>
              <button
                onClick={() => setShowStoryGenerator(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
              >
                ×
              </button>
            </div>
            <StoryGenerator onStoryGenerated={() => setShowStoryGenerator(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Homepage;
