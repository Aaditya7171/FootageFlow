import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import PasswordSetup from '../components/PasswordSetup';

const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'password-setup'>('loading');
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const token = searchParams.get('token');
        const needsPasswordSetup = searchParams.get('needsPasswordSetup') === 'true';
        const errorParam = searchParams.get('error');

        if (errorParam) {
          setError(getErrorMessage(errorParam));
          setStatus('error');
          return;
        }

        if (!token) {
          setError('Authentication token not received');
          setStatus('error');
          return;
        }

        // Store token and get user info
        localStorage.setItem('token', token);

        // Fetch user profile to get email and check password setup status
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user profile');
        }

        const data = await response.json();
        const user = data.user;

        setUserEmail(user.email);

        if (needsPasswordSetup || user.needsPasswordSetup) {
          setStatus('password-setup');
        } else {
          // Login successful, redirect to dashboard
          login(user);
          setStatus('success');
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        }

      } catch (err: any) {
        console.error('Auth callback error:', err);
        setError(err.message || 'Authentication failed');
        setStatus('error');
      }
    };

    handleCallback();
  }, [searchParams, navigate, login]);

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'auth_failed':
        return 'Google authentication failed. Please try again.';
      case 'token_generation_failed':
        return 'Failed to generate authentication token. Please try again.';
      default:
        return 'Authentication failed. Please try again.';
    }
  };

  const handlePasswordSetupComplete = async () => {
    try {
      // Fetch updated user profile
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch updated user profile');
      }

      const data = await response.json();
      const user = data.user;

      // Login and redirect to dashboard
      login(user);
      setStatus('success');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (err: any) {
      console.error('Password setup completion error:', err);
      setError(err.message || 'Failed to complete setup');
      setStatus('error');
    }
  };

  if (status === 'password-setup') {
    return <PasswordSetup onComplete={handlePasswordSetupComplete} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md text-center"
      >
        <div className="p-8 rounded-2xl shadow-2xl backdrop-blur-md border bg-white/10 border-white/20">
          {status === 'loading' && (
            <>
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">Completing Authentication</h2>
              <p className="text-white/70">Please wait while we set up your account...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">Authentication Successful!</h2>
              <p className="text-white/70 mb-6">Welcome to FootageFlow. Redirecting to your dashboard...</p>
              <div className="flex justify-center">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">Authentication Failed</h2>
              <p className="text-white/70 mb-6">{error}</p>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full py-3 px-6 rounded-xl font-semibold backdrop-blur-md border transition-all duration-300 bg-blue-500/80 border-blue-400 text-white hover:bg-blue-600/80"
                >
                  Try Again
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full py-2 text-white/70 hover:text-white transition-colors"
                >
                  Go to Home
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AuthCallback;
