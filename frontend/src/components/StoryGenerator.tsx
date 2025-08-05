import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Wand2, Play, Clock, CheckCircle, AlertCircle, RefreshCw, Video, Users, BookOpen, Trash2, Eye } from 'lucide-react';
import AnimatedButton from './AnimatedButton';
import VideoSelector from './VideoSelector';
import StoryModal from './StoryModal';
import axios from 'axios';

interface Story {
  id: string;
  prompt: string;
  status: string;
  storyType: 'text' | 'video';
  title?: string;
  content?: string;
  description?: string;
  videoUrl?: string;
  isVideoGenerated?: boolean;
  estimatedDuration?: number;
  generatedAt?: string;
  storyPlan?: {
    title: string;
    description: string;
    segments: Array<{
      order: number;
      startTime: number;
      endTime: number;
      description: string;
    }>;
    totalDuration: number;
    style: string;
  };
  wordCount?: number;
  generatedVideoUrl?: string;
  createdAt: string;
  storyVideos?: Array<{
    order: number;
    startTime: number;
    endTime: number;
    video: {
      title: string;
      thumbnailUrl?: string;
    };
  }>;
}

interface StoryGeneratorProps {
  onStoryGenerated?: (story: Story) => void;
}

const StoryGenerator: React.FC<StoryGeneratorProps> = ({ onStoryGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [stories, setStories] = useState<Story[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [showVideoSelector, setShowVideoSelector] = useState(false);
  const [storyType, setStoryType] = useState<'text' | 'video'>('text');
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);

  useEffect(() => {
    fetchStories();
    fetchSuggestions();
  }, []);

  useEffect(() => {
    fetchSuggestions();
  }, [storyType]);

  const fetchStories = async () => {
    try {
      console.log('📚 Fetching stories from API...');
      const response = await axios.get('/api/stories');
      console.log('📚 Stories response:', response.data);

      // Handle the new response format
      if (response.data.success && response.data.stories) {
        setStories(response.data.stories);
        console.log(`📚 Loaded ${response.data.stories.length} stories`);
      } else {
        // Fallback for old format
        setStories(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching stories:', error);
      setStories([]);
    }
  };

  const fetchSuggestions = async () => {
    try {
      // Different suggestions based on story type
      const textSuggestions = [
        'Write an inspiring story about overcoming challenges',
        'Create a narrative about personal growth and learning',
        'Tell a story of friendship and adventure',
        'Write about a life-changing travel experience',
        'Create a motivational story about achieving dreams'
      ];

      const videoSuggestions = [
        'Make a story of my Goa trip',
        'Show my trekking moments',
        'Create a day in the life video story',
        'Make a before and after transformation video',
        'Create a travel montage with music'
      ];

      setSuggestions(storyType === 'text' ? textSuggestions : videoSuggestions);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  const handleGenerateStory = async () => {
    if (!prompt.trim()) return;

    try {
      setIsGenerating(true);
      setGenerationProgress(0);
      setEstimatedTime(30); // 30 seconds estimated
      setCurrentStep('Analyzing your prompt...');

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev < 90) {
            const increment = Math.random() * 15 + 5; // 5-20% increments
            const newProgress = Math.min(prev + increment, 90);

            // Update step based on progress
            if (newProgress < 30) {
              setCurrentStep('Analyzing your prompt...');
              setEstimatedTime(Math.max(25 - Math.floor(newProgress / 3), 5));
            } else if (newProgress < 60) {
              setCurrentStep('Searching through your videos...');
              setEstimatedTime(Math.max(15 - Math.floor((newProgress - 30) / 3), 3));
            } else if (newProgress < 90) {
              setCurrentStep('Creating your story...');
              setEstimatedTime(Math.max(8 - Math.floor((newProgress - 60) / 5), 1));
            }

            return newProgress;
          }
          return prev;
        });
      }, 1000);

      await axios.post('/api/stories/generate', {
        prompt: prompt.trim(),
        storyType: storyType,
        selectedVideoIds: selectedVideoIds.length > 0 ? selectedVideoIds : null
      });

      // Complete the progress
      clearInterval(progressInterval);
      setGenerationProgress(100);
      setCurrentStep('Story generated successfully!');
      setEstimatedTime(0);

      setPrompt('');

      // Refresh stories list after a short delay
      setTimeout(() => {
        fetchStories();
        setIsGenerating(false);
        setGenerationProgress(0);
        setCurrentStep('');
      }, 2000);

      if (onStoryGenerated) {
        // This would be called when the story is actually completed
        // For now, we'll just refresh the list
      }
    } catch (error: any) {
      console.error('Error generating story:', error);
      setIsGenerating(false);
      setGenerationProgress(0);
      setCurrentStep('');
      setEstimatedTime(0);
      alert(error.response?.data?.error || 'Failed to generate story');
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    if (!window.confirm('Are you sure you want to delete this story?')) return;

    try {
      await axios.delete(`/api/stories/${storyId}`);
      setStories(prev => prev.filter(s => s.id !== storyId));
    } catch (error) {
      console.error('Error deleting story:', error);
      alert('Failed to delete story');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'processing':
        return <RefreshCw className="w-5 h-5 text-yellow-600 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-neutral-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4 md:space-y-8 px-4 sm:px-6 lg:px-8">
      {/* Story Generator */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300"
      >
        <div className="p-4 sm:p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white">AI Story Generator</h2>
              <p className="text-white/70">Create AI-generated video stories with automatic editing, narration, and transitions</p>
            </div>
          </div>

          {/* Story Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-white/90 mb-3">Story Type</label>
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
              <button
                onClick={() => setStoryType('text')}
                className={`flex-1 p-3 sm:p-4 rounded-xl border transition-all duration-300 ${
                  storyType === 'text'
                    ? 'border-blue-500 bg-blue-500/20 text-blue-200'
                    : 'border-white/20 bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-medium text-sm sm:text-base">Text Story</span>
                </div>
                <p className="text-xs mt-1 opacity-80 hidden sm:block">Generate a written narrative</p>
              </button>

              <button
                onClick={() => setStoryType('video')}
                className={`flex-1 p-3 sm:p-4 rounded-xl border transition-all duration-300 ${
                  storyType === 'video'
                    ? 'border-purple-500 bg-purple-500/20 text-purple-200'
                    : 'border-white/20 bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Video className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-medium text-sm sm:text-base">Video Story</span>
                </div>
                <p className="text-xs mt-1 opacity-80 hidden sm:block">Create an edited video compilation</p>
              </button>
            </div>
          </div>

          {/* Prompt Input */}
          {/* Generation Progress */}
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Wand2 className="w-8 h-8 text-blue-400" />
                  </motion.div>
                </div>
                <p className="text-lg font-medium text-white mb-2">
                  {currentStep}
                </p>
                <p className="text-white/70 mb-4 text-xl font-semibold">
                  {generationProgress}% complete
                </p>
                {estimatedTime > 0 && (
                  <p className="text-white/60 text-sm">
                    Estimated time remaining: {estimatedTime} seconds
                  </p>
                )}
              </div>

              {/* Enhanced Progress Bar */}
              <div className="w-full bg-white/20 rounded-full h-4 mb-4 overflow-hidden">
                <motion.div
                  className="bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 h-4 rounded-full relative"
                  initial={{ width: 0 }}
                  animate={{ width: `${generationProgress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    animate={{ x: [-100, 300] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                </motion.div>
              </div>
            </motion.div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Story Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  storyType === 'text'
                    ? "Describe the story you want to create... (e.g., 'Write an inspiring story about personal growth and overcoming challenges')"
                    : "Describe the video story you want to create... (e.g., 'Create a travel montage with smooth transitions and upbeat music')"
                }
                className="w-full px-4 py-3 rounded-xl backdrop-blur-md border transition-all duration-300 bg-white/10 border-white/20 text-white placeholder-white/50 focus:bg-white/20 focus:border-white/40 resize-none"
                rows={3}
                maxLength={500}
                disabled={isGenerating}
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-sm text-white/70">
                  {prompt.length}/500 characters
                </p>
              </div>
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && !isGenerating && (
              <div>
                <p className="text-sm font-medium text-white mb-2">Quick Ideas:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion, index) => (
                    <motion.button
                      key={index}
                      onClick={() => setPrompt(suggestion)}
                      className="px-3 py-1 bg-blue-500/20 text-blue-200 text-sm rounded-full hover:bg-blue-500/30 transition-colors duration-200"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {suggestion}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Video Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-white">Video Selection</label>
                <AnimatedButton
                  onClick={() => setShowVideoSelector(true)}
                  variant="ghost"
                  size="sm"
                  icon={<Video className="w-4 h-4" />}
                >
                  Select Videos
                </AnimatedButton>
              </div>

              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center space-x-2 text-sm text-white/70">
                  <Users className="w-4 h-4" />
                  <span>
                    {selectedVideoIds.length === 0
                      ? 'All processed videos will be used'
                      : `${selectedVideoIds.length} video${selectedVideoIds.length === 1 ? '' : 's'} selected`
                    }
                  </span>
                </div>
                {selectedVideoIds.length > 0 && (
                  <button
                    onClick={() => setSelectedVideoIds([])}
                    className="text-xs text-blue-400 hover:text-blue-300 mt-1 transition-colors"
                  >
                    Clear selection (use all videos)
                  </button>
                )}
              </div>
            </div>

            <AnimatedButton
              onClick={handleGenerateStory}
              disabled={!prompt.trim() || isGenerating}
              loading={isGenerating}
              icon={<Wand2 className="w-5 h-5" />}
              className="w-full"
            >
              {isGenerating ? 'Generating Story...' : 'Generate Story'}
            </AnimatedButton>
          </div>
        </div>
      </motion.div>

      {/* Stories List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Your Stories</h3>
          <AnimatedButton
            onClick={fetchStories}
            variant="ghost"
            size="sm"
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </AnimatedButton>
        </div>

        <AnimatePresence>
          {stories.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-white/70" />
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">No stories yet</h4>
              <p className="text-white/70">Generate your first AI-powered story from your videos</p>
            </motion.div>
          ) : (
            <div className="grid gap-6">
              {stories.map((story, index) => (
                <motion.div
                  key={story.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl hover:bg-black/30 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {getStatusIcon(story.status)}
                        <span className="text-sm font-medium text-white/90 capitalize">
                          {story.status}
                        </span>
                        <span className="text-sm text-white/70">
                          {formatDate(story.createdAt)}
                        </span>
                      </div>
                      <p className="text-white font-medium mb-2">{story.prompt}</p>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          story.storyType === 'text'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-purple-500/20 text-purple-400'
                        }`}>
                          {story.storyType === 'text' ? 'Text Story' : 'Video Story'}
                        </span>
                        {story.title && (
                          <span className="text-sm text-white/70">• {story.title}</span>
                        )}
                      </div>
                      {story.storyType === 'video' && story.storyPlan && (
                        <p className="text-sm text-white/70">
                          {story.storyPlan.segments?.length || 0} clips • Duration: {
                            Math.round(story.storyPlan.totalDuration || 0)
                          }s
                        </p>
                      )}
                      {story.storyType === 'text' && story.wordCount && (
                        <p className="text-sm text-white/70">
                          {story.wordCount} words
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {story.status === 'completed' && (
                        <>
                          {story.storyType === 'text' && story.content && (
                            <AnimatedButton
                              onClick={() => {
                                setSelectedStory(story);
                                setIsStoryModalOpen(true);
                              }}
                              variant="ghost"
                              size="sm"
                              icon={<BookOpen className="w-4 h-4" />}
                            >
                              Read
                            </AnimatedButton>
                          )}
                          {story.storyType === 'video' && story.storyPlan && (
                            <AnimatedButton
                              onClick={() => {
                                if (story.isVideoGenerated === true && story.videoUrl) {
                                  // Show generated video
                                  const newWindow = window.open('', '_blank');
                                  if (newWindow) {
                                    newWindow.document.write(`
                                      <html>
                                        <head><title>${story.title || 'Generated Video Story'}</title></head>
                                        <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; text-align: center;">
                                          <h1>${story.title || 'Generated Video Story'}</h1>
                                          <p>${story.description || 'AI-generated video story'}</p>
                                          <video controls style="max-width: 100%; height: auto; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                                            <source src="${story.videoUrl || ''}" type="video/mp4">
                                            Your browser does not support the video tag.
                                          </video>
                                          <p><strong>Duration:</strong> ${story.estimatedDuration || 0}s</p>
                                          <p><strong>Generated:</strong> ${story.generatedAt ? new Date(story.generatedAt).toLocaleString() : 'Unknown'}</p>
                                          ${story.videoUrl ? `<a href="${story.videoUrl}" download style="display: inline-block; margin-top: 10px; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">Download Video</a>` : ''}
                                        </body>
                                      </html>
                                    `);
                                    newWindow.document.close();
                                  }
                                } else {
                                  // Show video story plan
                                  const newWindow = window.open('', '_blank');
                                  if (newWindow) {
                                    newWindow.document.write(`
                                      <html>
                                        <head><title>${story.title || 'Video Story'}</title></head>
                                        <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
                                          <h1>${story.title || 'Your Video Story'}</h1>
                                          <p><strong>Description:</strong> ${story.storyPlan?.description || 'No description available'}</p>
                                          <p><strong>Style:</strong> ${story.storyPlan?.style || 'General'}</p>
                                          <p><strong>Duration:</strong> ${Math.round(story.storyPlan?.totalDuration || 0)} seconds</p>
                                          <h2>Segments:</h2>
                                          <ul>
                                            ${story.storyPlan?.segments?.map(segment =>
                                              `<li>${segment.description} (${segment.endTime - segment.startTime}s)</li>`
                                            ).join('') || '<li>No segments available</li>'}
                                          </ul>
                                        </body>
                                      </html>
                                    `);
                                    newWindow.document.close();
                                  }
                                }
                              }}
                              variant="ghost"
                              size="sm"
                              icon={story.isVideoGenerated === true ? <Play className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            >
                              {story.isVideoGenerated === true ? 'Watch Video' : 'View Plan'}
                            </AnimatedButton>
                          )}
                        </>
                      )}
                      <AnimatedButton
                        onClick={() => handleDeleteStory(story.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </AnimatedButton>
                    </div>
                  </div>

                  {/* Story clips preview */}
                  {story.storyVideos && story.storyVideos.length > 0 && (
                    <div className="flex space-x-2 overflow-x-auto">
                      {story.storyVideos.slice(0, 4).map((clip, clipIndex) => (
                        <div
                          key={clipIndex}
                          className="flex-shrink-0 w-20 h-12 bg-neutral-200 rounded overflow-hidden"
                        >
                          {clip.video.thumbnailUrl ? (
                            <img
                              src={clip.video.thumbnailUrl}
                              alt={clip.video.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Play className="w-4 h-4 text-neutral-400" />
                            </div>
                          )}
                        </div>
                      ))}
                      {story.storyVideos && story.storyVideos.length > 4 && (
                        <div className="flex-shrink-0 w-20 h-12 bg-neutral-200 rounded flex items-center justify-center">
                          <span className="text-xs text-neutral-700">
                            +{story.storyVideos.length - 4}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Video Selector Modal */}
      <VideoSelector
        isOpen={showVideoSelector}
        onClose={() => setShowVideoSelector(false)}
        onSelect={setSelectedVideoIds}
        selectedVideoIds={selectedVideoIds}
      />

      <StoryModal
        isOpen={isStoryModalOpen}
        onClose={() => {
          setIsStoryModalOpen(false);
          setSelectedStory(null);
        }}
        story={selectedStory}
      />
    </div>
  );
};

export default StoryGenerator;
