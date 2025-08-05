import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Video, Search, Sparkles } from 'lucide-react';
import AuthFormSimple from '../components/AuthFormSimple';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5174';

const Login: React.FC = () => {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const { login } = useAuth();

  const handleAuthSuccess = (user: any, token: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    login(user);
  };

  const toggleAuthMode = () => {
    setAuthMode(prev => prev === 'login' ? 'signup' : 'login');
  };

  const features = [
    {
      icon: Video,
      title: 'Upload & Store',
      description: 'Securely upload your videos to the cloud with automatic processing'
    },
    {
      icon: Search,
      title: 'AI-Powered Search',
      description: 'Find any video using natural language queries and smart tagging'
    },
    {
      icon: Sparkles,
      title: 'Story Generation',
      description: 'Create compelling narratives by combining your video clips'
    }
  ];

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center animate-float bg-gradient-to-r from-blue-500 to-blue-400">
              <img src="/footage-flow.png" alt="FootageFlow" className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold text-white">
              Footage<span className="bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">Flow</span>
            </h1>
          </div>
          <p className="text-xl max-w-2xl mx-auto text-white/90">
            Transform your video content with AI-powered transcription, intelligent search, and automated story generation
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Features */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-8"
          >
            <h2 className="text-3xl font-semibold mb-8 text-white">
              Everything you need to manage your video content
            </h2>

            <div className="space-y-6">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  className="flex items-start space-x-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                  whileHover={{ x: 10 }}
                >
                  <div className="w-12 h-12 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0 border bg-white/10 border-white/20">
                    <feature.icon className="w-6 h-6 text-blue-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-white">{feature.title}</h3>
                    <p className="text-white/70">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right side - Authentication */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="space-y-6"
          >
            {/* JWT Authentication Form */}
            <AuthFormSimple
              mode={authMode}
              onToggleMode={toggleAuthMode}
              onSuccess={handleAuthSuccess}
            />


          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Login;
