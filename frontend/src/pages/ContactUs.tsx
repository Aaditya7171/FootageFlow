import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Mail,
  Star,
  Send,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Heart,
  ExternalLink,
  Home
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import AnimatedButton from '../components/AnimatedButton';
import emailService from '../services/emailService';

const ContactUs: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      setSubmitMessage({ type: 'error', text: 'Please provide a rating' });
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      const success = await emailService.sendFeedback(
        user?.email || '',
        user?.name || user?.username || 'Anonymous',
        rating,
        message
      );

      if (success) {
        setSubmitMessage({ type: 'success', text: 'Thank you for your feedback! We\'ll review it soon.' });
        setRating(0);
        setMessage('');
      } else {
        throw new Error('Failed to send feedback');
      }
    } catch (error) {
      setSubmitMessage({ type: 'error', text: 'Failed to send feedback. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDirectEmail = () => {
    window.open('mailto:footageflow01@gmail.com?subject=FootageFlow Support', '_blank');
  };

  // Get star color based on rating (1-4: red to yellow, 5-7: yellow, 8-10: yellow to green)
  const getStarColor = (starNumber: number, currentRating: number) => {
    if (starNumber > currentRating) {
      return 'bg-white/10 text-white/50 hover:bg-white/20';
    }

    if (currentRating <= 4) {
      // Red to yellow gradient (1-4 stars)
      const intensity = currentRating / 4;
      return `bg-gradient-to-r from-red-500 to-yellow-500 text-white`;
    } else if (currentRating <= 7) {
      // Yellow (5-7 stars)
      return 'bg-yellow-500 text-white';
    } else {
      // Yellow to green gradient (8-10 stars)
      return `bg-gradient-to-r from-yellow-500 to-green-500 text-white`;
    }
  };

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
        <h1 className="text-4xl font-bold text-white mb-4">Contact Us</h1>
        <p className="text-white/70 text-lg">
          We'd love to hear from you! Share your feedback or get in touch.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Feedback Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-8"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white">Send Feedback</h2>
              <p className="text-white/70">Help us improve FootageFlow</p>
            </div>
          </div>

          {/* Success/Error Messages */}
          {submitMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-6 p-4 rounded-xl border flex items-center space-x-3 ${
                submitMessage.type === 'success'
                  ? 'bg-green-500/20 border-green-500/30 text-green-200'
                  : 'bg-red-500/20 border-red-500/30 text-red-200'
              }`}
            >
              {submitMessage.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span>{submitMessage.text}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmitFeedback} className="space-y-6">
            {/* User Info (Auto-filled) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Name</label>
                <input
                  type="text"
                  value={user?.name || user?.username || 'Anonymous'}
                  disabled
                  className="w-full px-4 py-3 rounded-xl backdrop-blur-md border bg-white/5 border-white/10 text-white/70 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Email</label>
                <input
                  type="email"
                  value={user?.email || 'Not logged in'}
                  disabled
                  className="w-full px-4 py-3 rounded-xl backdrop-blur-md border bg-white/5 border-white/10 text-white/70 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-white/90 mb-3">
                Rating <span className="text-red-400">*</span>
              </label>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => {
                  const currentRating = hoveredRating || rating;
                  const isActive = star <= currentRating;

                  return (
                    <motion.button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${getStarColor(star, currentRating)}`}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Star
                        className="w-4 h-4"
                        fill={isActive ? 'currentColor' : 'none'}
                      />
                    </motion.button>
                  );
                })}
                <span className="ml-3 text-white/70">
                  {rating > 0 ? `${rating}/10` : 'Select rating'}
                </span>
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Message <span className="text-white/50">(Optional)</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="w-full px-4 py-3 rounded-xl backdrop-blur-md border transition-all duration-300 bg-white/10 border-white/20 text-white placeholder-white/50 focus:bg-white/20 focus:border-white/40 resize-none"
                placeholder="Tell us about your experience, suggestions for improvement, or any issues you've encountered..."
              />
              <p className="text-white/50 text-xs mt-1">
                {message.length}/1000 characters
              </p>
            </div>

            {/* Submit Button */}
            <AnimatedButton
              type="submit"
              loading={isSubmitting}
              disabled={rating === 0 || isSubmitting}
              icon={<Send className="w-5 h-5" />}
              className="w-full"
            >
              {isSubmitting ? 'Sending...' : 'Send Feedback'}
            </AnimatedButton>
          </form>
        </motion.div>

        {/* Contact Information */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          {/* Direct Email */}
          <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Direct Email</h3>
                <p className="text-white/70 text-sm">Get in touch directly</p>
              </div>
            </div>
            
            <p className="text-white/80 mb-4">
              For urgent matters or detailed inquiries, you can reach us directly at:
            </p>
            
            <div className="bg-white/5 rounded-lg p-4 mb-4">
              <p className="text-blue-400 font-mono">footageflow01@gmail.com</p>
            </div>
            
            <AnimatedButton
              onClick={handleDirectEmail}
              variant="ghost"
              icon={<ExternalLink className="w-4 h-4" />}
              className="w-full"
            >
              Open Email Client
            </AnimatedButton>
          </div>

          {/* About */}
          <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Heart className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">About FootageFlow</h3>
                <p className="text-white/70 text-sm">Built with love for creators</p>
              </div>
            </div>
            
            <p className="text-white/80 mb-4">
              FootageFlow is an AI-powered video management platform designed to help content creators 
              organize, search, and create stories from their video content effortlessly.
            </p>
            
            <div className="space-y-2 text-sm text-white/70">
              <p>• AI-powered transcription and tagging</p>
              <p>• Smart search across your video library</p>
              <p>• Automated story generation</p>
              <p>• Secure cloud storage</p>
            </div>
          </div>

          {/* Response Time */}
          <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-3">Response Time</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-white/70">Feedback Form:</span>
                <span className="text-green-400">24-48 hours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Direct Email:</span>
                <span className="text-blue-400">12-24 hours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Urgent Issues:</span>
                <span className="text-yellow-400">2-6 hours</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ContactUs;
