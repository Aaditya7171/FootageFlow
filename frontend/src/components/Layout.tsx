import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, Settings, MessageSquare, Home, Menu, X, ChevronDown, ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const isDashboard = location.pathname === '/dashboard';
  const showDashboardButton = !isDashboard;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="backdrop-blur-md border-b sticky top-0 z-50 bg-black/30 border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <motion.div 
              className="flex items-center space-x-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-r from-blue-500 to-blue-400">
                <img src="/footage-flow.png" alt="FootageFlow" className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-semibold text-white">
                Footage<span className="bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">Flow</span>
              </h1>
            </motion.div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              {/* Dashboard Button - Only show when not on dashboard */}
              {showDashboardButton && (
                <motion.button
                  onClick={() => navigate('/dashboard')}
                  className="transition-colors duration-200 flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Dashboard</span>
                </motion.button>
              )}
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors text-white"
              >
                {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              {/* User Avatar & Menu */}
              <div className="relative">
                <motion.button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-3 p-2 rounded-lg transition-all duration-200 hover:bg-white/10"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name || user.email}
                      className="w-8 h-8 rounded-full border-2 border-white/20"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                      {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-white">
                      {user?.name || user?.username || 'User'}
                    </p>
                    <p className="text-xs text-white/60">
                      {user?.email}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-white/60" />
                </motion.button>

                {/* User Dropdown Menu */}
                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-48 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50"
                    >
                      <div className="p-2">
                        <button
                          onClick={() => {
                            navigate('/profile');
                            setShowUserMenu(false);
                          }}
                          className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <User className="w-4 h-4" />
                          <span>Profile</span>
                        </button>
                        <button
                          onClick={() => {
                            navigate('/settings');
                            setShowUserMenu(false);
                          }}
                          className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          <span>Settings</span>
                        </button>
                        <button
                          onClick={() => {
                            navigate('/contact');
                            setShowUserMenu(false);
                          }}
                          className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>Contact Us</span>
                        </button>
                        <hr className="my-2 border-white/10" />
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Logout</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-white/10 bg-black/40 backdrop-blur-md"
            >
              <div className="px-4 py-4 space-y-2">
                {/* Dashboard Button - Only show when not on dashboard */}
                {showDashboardButton && (
                  <button
                    onClick={() => {
                      navigate('/dashboard');
                      setShowMobileMenu(false);
                    }}
                    className="w-full flex items-center space-x-3 px-3 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Dashboard</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    navigate('/profile');
                    setShowMobileMenu(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/profile')
                      ? 'bg-white/10 text-white'
                      : 'text-white/80 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <User className="w-5 h-5" />
                  <span>Profile</span>
                </button>

                <button
                  onClick={() => {
                    navigate('/settings');
                    setShowMobileMenu(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/settings')
                      ? 'bg-white/10 text-white'
                      : 'text-white/80 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Settings className="w-5 h-5" />
                  <span>Settings</span>
                </button>

                <button
                  onClick={() => {
                    navigate('/contact');
                    setShowMobileMenu(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/contact')
                      ? 'bg-white/10 text-white'
                      : 'text-white/80 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <MessageSquare className="w-5 h-5" />
                  <span>Contact Us</span>
                </button>

                <hr className="my-3 border-white/10" />

                <button
                  onClick={() => {
                    handleLogout();
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Enhanced Footer */}
      <footer className="backdrop-blur-md border-t mt-20 bg-black/30 border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Brand */}
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start space-x-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-500">
                  <img src="/footage-flow.png" alt="FootageFlow" className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-white">
                  Footage<span className="bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">Flow</span>
                </h3>
              </div>
              <p className="text-white/60 text-sm">
                AI-Powered Video Management Platform
              </p>
            </div>

            {/* Built Using */}
            <div className="text-center">
              <h4 className="text-white font-semibold mb-4">Built Using</h4>
              <div className="space-y-2 text-sm text-white/60">
                <p>React + TypeScript</p>
                <p>Node.js + Express</p>
                <p>Prisma + PostgreSQL</p>
                <p>Cloudinary + FFmpeg</p>
              </div>
            </div>

            {/* Powered By */}
            <div className="text-center md:text-right">
              <h4 className="text-white font-semibold mb-4">Powered By</h4>
              <div className="space-y-2 text-sm text-white/60">
                <p>Google Gemini AI</p>
                <p>Whisper API</p>
                <p>Clarifai Vision API</p>
                <p>EmailJS</p>
                <p>Cloudinary Storage</p>
              </div>
            </div>
          </div>

          <hr className="my-8 border-white/10" />

          <div className="text-center">
            <p className="text-sm text-white/70">
              © 2024 FootageFlow. Built with ❤️ for video creators.
            </p>
            <p className="text-xs text-white/50 mt-2">
              Transforming video management with artificial intelligence
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
