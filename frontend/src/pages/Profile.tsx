import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Camera,
  Save,
  Edit3,
  Video,
  Sparkles,
  Calendar,
  Mail,
  CheckCircle,
  AlertCircle,
  Home
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useVideo } from '../contexts/VideoContext';
import { useNavigate } from 'react-router-dom';
import AnimatedButton from '../components/AnimatedButton';

interface ProfileData {
  displayName: string;
  email: string;
  username: string;
  avatar: string;
}

const Profile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { videos } = useVideo();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profileData, setProfileData] = useState<ProfileData>({
    displayName: user?.name || '',
    email: user?.email || '',
    username: user?.username || '',
    avatar: user?.avatar || ''
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Image size must be less than 5MB' });
        return;
      }

      try {
        setIsLoading(true);
        setMessage({ type: 'success', text: 'Uploading image...' });

        // Create FormData for file upload
        const formData = new FormData();
        formData.append('image', file);

        const token = localStorage.getItem('token');
        const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5174';

        const response = await fetch(`${API_BASE_URL}/api/upload/image`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to upload image');
        }

        // Set the uploaded image URL
        setProfileData(prev => ({ ...prev, avatar: data.imageUrl }));
        setPreviewImage(data.imageUrl);
        setMessage({ type: 'success', text: 'Image uploaded successfully!' });

      } catch (error: any) {
        setMessage({ type: 'error', text: error.message });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5174';
      const response = await fetch(`${API_BASE_URL}/api/auth/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      await refreshUser();
      setIsEditing(false);
      setPreviewImage(null);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setProfileData({
      displayName: user?.name || '',
      email: user?.email || '',
      username: user?.username || '',
      avatar: user?.avatar || ''
    });
    setPreviewImage(null);
    setIsEditing(false);
    setMessage(null);
  };

  // Calculate user stats
  const totalVideos = videos.length;
  const processedVideos = videos.filter(video => 
    video.transcriptionStatus === 'completed' && video.visionStatus === 'completed'
  ).length;
  const totalDuration = videos.reduce((acc, video) => acc + (video.duration || 0), 0);
  const joinDate = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  }) : 'Unknown';

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Home Button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex justify-start"
      >
        <AnimatedButton
          onClick={() => navigate('/dashboard')}
          variant="ghost"
          size="sm"
          icon={<Home className="w-4 h-4" />}
        >
          Dashboard
        </AnimatedButton>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-3xl font-bold text-white mb-2">Profile</h1>
        <p className="text-white/70">Manage your account and view your statistics</p>
      </motion.div>

      {/* Error/Success Messages */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl border flex items-center space-x-3 ${
            message.type === 'success'
              ? 'bg-green-500/20 border-green-500/30 text-green-200'
              : 'bg-red-500/20 border-red-500/30 text-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Information */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 space-y-6"
        >
          <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-white">Profile Information</h2>
              {!isEditing ? (
                <AnimatedButton
                  onClick={() => setIsEditing(true)}
                  variant="ghost"
                  size="sm"
                  icon={<Edit3 className="w-4 h-4" />}
                >
                  Edit
                </AnimatedButton>
              ) : (
                <div className="flex space-x-2">
                  <AnimatedButton
                    onClick={handleCancel}
                    variant="ghost"
                    size="sm"
                  >
                    Cancel
                  </AnimatedButton>
                  <AnimatedButton
                    onClick={handleSave}
                    loading={isLoading}
                    size="sm"
                    icon={<Save className="w-4 h-4" />}
                  >
                    Save
                  </AnimatedButton>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                    {(previewImage || profileData.avatar) ? (
                      <img
                        src={previewImage || profileData.avatar}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-12 h-12 text-white" />
                    )}
                  </div>
                  {isEditing && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
                    >
                      <Camera className="w-4 h-4 text-white" />
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    {profileData.displayName || profileData.username || 'User'}
                  </h3>
                  <p className="text-white/70">{profileData.email}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Calendar className="w-4 h-4 text-white/50" />
                    <span className="text-white/60 text-sm">Joined {joinDate}</span>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">Display Name</label>
                  <input
                    type="text"
                    value={profileData.displayName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, displayName: e.target.value }))}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 rounded-xl backdrop-blur-md border transition-all duration-300 bg-white/10 border-white/20 text-white placeholder-white/50 focus:bg-white/20 focus:border-white/40 disabled:opacity-50"
                    placeholder="Enter your display name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">Username</label>
                  <input
                    type="text"
                    value={profileData.username}
                    onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 rounded-xl backdrop-blur-md border transition-all duration-300 bg-white/10 border-white/20 text-white placeholder-white/50 focus:bg-white/20 focus:border-white/40 disabled:opacity-50"
                    placeholder="Enter your username"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-white/90 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
                    <input
                      type="email"
                      value={profileData.email}
                      disabled={true} // Email should not be editable
                      className="w-full pl-12 pr-4 py-3 rounded-xl backdrop-blur-md border transition-all duration-300 bg-white/5 border-white/10 text-white/70 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-white/50 text-xs mt-1">Email cannot be changed</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Statistics */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-white mb-6">Statistics</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Video className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Total Videos</p>
                    <p className="text-white/60 text-sm">Uploaded content</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-white">{totalVideos}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Processed</p>
                    <p className="text-white/60 text-sm">Ready for AI</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-white">{processedVideos}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Total Duration</p>
                    <p className="text-white/60 text-sm">Content length</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-white">{formatDuration(totalDuration)}</span>
              </div>
            </div>
          </div>

          {/* Account Type */}
          <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Account</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/70">Provider</span>
                <span className="text-white capitalize">{user.provider}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Email Verified</span>
                <span className={`text-sm px-2 py-1 rounded-full ${
                  user.isEmailVerified 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {user.isEmailVerified ? 'Verified' : 'Pending'}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
