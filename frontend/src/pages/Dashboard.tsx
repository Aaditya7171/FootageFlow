import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Video, Clock, Tag, Sparkles } from 'lucide-react';
import { useVideo } from '../contexts/VideoContext';
import { useAuth } from '../contexts/AuthContext';
import VideoUpload from '../components/VideoUpload';
import VideoCard from '../components/VideoCard';
import LoadingSpinner from '../components/LoadingSpinner';
import AnimatedButton from '../components/AnimatedButton';
import EnhancedSearch from '../components/EnhancedSearch';
import StoryGenerator from '../components/StoryGenerator';
import PasswordSetup from '../components/PasswordSetup';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { videos, loading, error, fetchVideos } = useVideo();
  const [showUpload, setShowUpload] = useState(false);
  const [showStoryGenerator, setShowStoryGenerator] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredVideos, setFilteredVideos] = useState(videos);
  const [activeTab, setActiveTab] = useState<'videos' | 'stories'>('videos');
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Poll for video status updates every 10 seconds if there are processing videos
  useEffect(() => {
    const processingCount = getProcessingCount();

    if (processingCount > 0) {
      console.log(`📊 Found ${processingCount} videos still processing, starting polling...`);

      const pollInterval = setInterval(() => {
        console.log('🔄 Polling for video status updates...');
        fetchVideos();
      }, 10000); // Poll every 10 seconds

      return () => {
        console.log('⏹️ Stopping video status polling');
        clearInterval(pollInterval);
      };
    }
  }, [videos, fetchVideos]);

  // Check if user needs password setup
  useEffect(() => {
    if (user && user.provider === 'firebase-google' && (user as any).needsPasswordSetup !== false) {
      // Show password setup after a short delay
      const timer = setTimeout(() => {
        setShowPasswordSetup(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = videos.filter(video =>
        video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.tags.some(tag => tag.label.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredVideos(filtered);
    } else {
      setFilteredVideos(videos);
    }
  }, [searchQuery, videos]);

  const handleUploadComplete = () => {
    setShowUpload(false);
    fetchVideos(); // Refresh the video list
  };

  const getProcessingCount = () => {
    return videos.filter(video => 
      video.transcriptionStatus === 'processing' || 
      video.visionStatus === 'processing'
    ).length;
  };

  const getCompletedCount = () => {
    return videos.filter(video => 
      video.transcriptionStatus === 'completed' && 
      video.visionStatus === 'completed'
    ).length;
  };

  if (loading && videos.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-white">
              Welcome back, {user?.name?.split(' ')[0] || 'there'}!
            </h1>
            <p className="text-white/70 mt-1">
              Manage your video content and create amazing stories
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <AnimatedButton
              onClick={() => setShowUpload(true)}
              icon={<Plus className="w-5 h-5" />}
              className="spotlight"
            >
              Upload Video
            </AnimatedButton>

            <AnimatedButton
              onClick={() => setShowStoryGenerator(true)}
              variant="secondary"
              icon={<Sparkles className="w-5 h-5" />}
              className="glow-effect"
            >
              Create Story
            </AnimatedButton>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <div className="p-6 rounded-2xl shadow-2xl backdrop-blur-md border bg-white/10 border-white/20">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Video className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-white">{videos.length}</p>
              <p className="text-white/70 text-sm">Total Videos</p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl shadow-2xl backdrop-blur-md border bg-white/10 border-white/20">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-white">{getProcessingCount()}</p>
              <p className="text-white/70 text-sm">Processing</p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl shadow-2xl backdrop-blur-md border bg-white/10 border-white/20">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Tag className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-white">{getCompletedCount()}</p>
              <p className="text-white/70 text-sm">Ready</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Navigation Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="flex items-center space-x-1 bg-white/10 backdrop-blur-md border border-white/20 p-1 rounded-full w-fit"
      >
        <button
          onClick={() => setActiveTab('videos')}
          className={`px-6 py-2 rounded-full font-medium transition-all duration-300 ${
            activeTab === 'videos'
              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Video className="w-4 h-4" />
            <span>Videos</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('stories')}
          className={`px-6 py-2 rounded-full font-medium transition-all duration-300 ${
            activeTab === 'stories'
              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4" />
            <span>Stories</span>
          </div>
        </button>
      </motion.div>

      {/* Enhanced Search Bar */}
      {activeTab === 'videos' && videos.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <EnhancedSearch onResultSelect={(video) => {
            // Navigate to video detail or handle selection
            window.location.href = `/video/${video.id}`;
          }} />
        </motion.div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setShowUpload(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl"
          >
            <VideoUpload onUploadComplete={handleUploadComplete} />
          </motion.div>
        </motion.div>
      )}

      {/* Story Generator Modal */}
      {showStoryGenerator && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto"
          onClick={() => setShowStoryGenerator(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl my-8"
          >
            <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-white">AI Story Generator</h2>
                <AnimatedButton
                  onClick={() => setShowStoryGenerator(false)}
                  variant="ghost"
                  size="sm"
                >
                  Close
                </AnimatedButton>
              </div>
              <StoryGenerator onStoryGenerated={() => {
                setShowStoryGenerator(false);
                // Optionally refresh or navigate
              }} />
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Content based on active tab */}
      {activeTab === 'videos' ? (
        <>
          {/* Videos Grid */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 rounded-2xl shadow-2xl backdrop-blur-md border bg-white/10 border-white/20 text-center py-8"
            >
              <p className="text-red-400 mb-2">Error loading videos</p>
              <p className="text-white/70 text-sm">{error}</p>
              <AnimatedButton onClick={fetchVideos} className="mt-4">
                Try Again
              </AnimatedButton>
            </motion.div>
          )}

          {!loading && !error && filteredVideos.length === 0 && videos.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="p-8 rounded-2xl shadow-2xl backdrop-blur-md border bg-white/10 border-white/20 text-center py-12"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                No videos yet
              </h3>
              <p className="text-white/70 mb-6">
                Upload your first video to get started with AI-powered analysis
              </p>
              <AnimatedButton
                onClick={() => setShowUpload(true)}
                icon={<Plus className="w-5 h-5" />}
              >
                Upload Your First Video
              </AnimatedButton>
            </motion.div>
          )}

          {!loading && !error && filteredVideos.length === 0 && videos.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 rounded-2xl shadow-2xl backdrop-blur-md border bg-white/10 border-white/20 text-center py-8"
            >
              <p className="text-white/70">No videos match your search</p>
            </motion.div>
          )}

          {filteredVideos.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
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
            </motion.div>
          )}
        </>
      ) : (
        /* Stories Tab */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <StoryGenerator />
        </motion.div>
      )}

      {/* Password Setup Modal */}
      {showPasswordSetup && (
        <PasswordSetup
          onComplete={() => {
            setShowPasswordSetup(false);
            // Refresh user data
            window.location.reload();
          }}
          onSkip={() => setShowPasswordSetup(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;
