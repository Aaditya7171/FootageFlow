import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import ForgotPassword from './ForgotPassword';
import { firebaseAuthService } from '../services/firebaseAuth';

interface AuthFormProps {
  mode: 'login' | 'signup';
  onToggleMode: () => void;
  onSuccess: (user: any, token: string) => void;
}

const AuthFormSimple: React.FC<AuthFormProps> = ({ mode, onToggleMode, onSuccess }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    emailOrUsername: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      if (mode === 'login') {
        // Firebase email/password login
        const user = await firebaseAuthService.signInWithEmail(
          formData.emailOrUsername,
          formData.password
        );

        // Get Firebase ID token
        const idToken = await firebaseAuthService.getIdToken();

        if (!idToken) {
          throw new Error('Failed to get authentication token');
        }

        // Send to our backend
        const response = await fetch('/api/auth/firebase/google', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ idToken })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Login failed');
        }

        // Store token and user data
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        onSuccess(data.user, data.token);
      } else {
        // Firebase email/password registration
        const user = await firebaseAuthService.createAccountWithEmail(
          formData.email,
          formData.password
        );

        // Get Firebase ID token
        const idToken = await firebaseAuthService.getIdToken();

        if (!idToken) {
          throw new Error('Failed to get authentication token');
        }

        // Send to our backend with username
        const response = await fetch('/api/auth/firebase/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            idToken,
            username: formData.username
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Registration failed');
        }

        // Store token and user data
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        onSuccess(data.user, data.token);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    // Prevent multiple clicks
    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      // Sign in with Firebase Google
      const { user, isNewUser } = await firebaseAuthService.signInWithGoogle();

      // Get Firebase ID token
      const idToken = await firebaseAuthService.getIdToken();

      if (!idToken) {
        throw new Error('Failed to get authentication token');
      }

      // Send to our backend
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5174';
      const response = await fetch(`${API_BASE_URL}/api/auth/firebase/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ idToken })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Store token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Call success callback
      onSuccess(data.user, data.token);

    } catch (err: any) {
      console.error('Google login error:', err);

      // Handle different types of errors
      if (err.message.includes('cancelled') || err.message.includes('closed')) {
        // User cancelled - don't show error
        return;
      } else if (err.message.includes('Firebase authentication not configured')) {
        setError('Authentication service is not configured. Please contact support.');
      } else if (err.message.includes('Cross-Origin-Opener-Policy') || err.message.includes('window.closed')) {
        setError('Browser security settings are blocking sign-in. Please try refreshing the page and try again.');
      } else if (err.message.includes('popup-blocked')) {
        setError('Pop-ups are blocked. Please allow pop-ups for this site and try again.');
      } else if (err.message.includes('network')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(err.message || 'Google authentication failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showForgotPassword) {
    return (
      <ForgotPassword
        onBack={() => setShowForgotPassword(false)}
        onComplete={() => {
          setShowForgotPassword(false);
          // Could show a success message here
        }}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="p-8 rounded-2xl shadow-2xl backdrop-blur-md border bg-white/10 border-white/20">
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl font-bold mb-2 text-white">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-white/70">
            {mode === 'login'
              ? 'Sign in to your account to continue'
              : 'Join FootageFlow and start creating amazing stories'
            }
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm">
              {error}
            </div>
          )}

          {mode === 'signup' && (
            <>
              {/* Username Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/90">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full pl-10 pr-10 py-3 rounded-xl backdrop-blur-md border transition-all duration-300 bg-white/10 border-white/20 text-white placeholder-white/50 focus:bg-white/20 focus:border-white/40"
                    placeholder="Choose a username"
                    required
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/90">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full pl-10 pr-10 py-3 rounded-xl backdrop-blur-md border transition-all duration-300 bg-white/10 border-white/20 text-white placeholder-white/50 focus:bg-white/20 focus:border-white/40"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>
            </>
          )}

          {mode === 'login' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/90">Email or Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
                <input
                  type="text"
                  value={formData.emailOrUsername}
                  onChange={(e) => setFormData(prev => ({ ...prev, emailOrUsername: e.target.value }))}
                  className="w-full pl-10 py-3 rounded-xl backdrop-blur-md border transition-all duration-300 bg-white/10 border-white/20 text-white placeholder-white/50 focus:bg-white/20 focus:border-white/40"
                  placeholder="Enter email or username"
                  required
                />
              </div>
            </div>
          )}

          {/* Password Field */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/90">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="w-full pl-10 pr-10 py-3 rounded-xl backdrop-blur-md border transition-all duration-300 bg-white/10 border-white/20 text-white placeholder-white/50 focus:bg-white/20 focus:border-white/40"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors text-white/50 hover:text-white/80"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/90">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full pl-10 pr-10 py-3 rounded-xl backdrop-blur-md border transition-all duration-300 bg-white/10 border-white/20 text-white placeholder-white/50 focus:bg-white/20 focus:border-white/40"
                  placeholder="Confirm your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors text-white/50 hover:text-white/80"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}

          {/* Forgot Password Link (Login only) */}
          {mode === 'login' && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-white/70 hover:text-white transition-colors"
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-6 rounded-xl font-semibold backdrop-blur-md border transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-blue-500/80 border-blue-400 text-white hover:bg-blue-600/80"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{mode === 'login' ? 'Signing In...' : 'Creating Account...'}</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight className="w-5 h-5" />
              </div>
            )}
          </motion.button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white/10 text-white/70">Or continue with</span>
            </div>
          </div>

          {/* Google OAuth Button */}
          <motion.button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full py-3 px-6 rounded-xl font-semibold backdrop-blur-md border transition-all duration-300 bg-white/10 border-white/20 text-white hover:bg-white/20"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center justify-center space-x-3">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continue with Google</span>
            </div>
          </motion.button>

          {/* Toggle Mode */}
          <div className="text-center">
            <button
              type="button"
              onClick={onToggleMode}
              className="transition-colors text-sm text-white/70 hover:text-white"
            >
              {mode === 'login' 
                ? "Don't have an account? Sign up" 
                : 'Already have an account? Sign in'
              }
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default AuthFormSimple;
