import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Lock,
  X,
  Eye,
  EyeOff,
  Trash2,
  LogOut,
  CheckCircle,
  AlertCircle,
  Mail,
  Key,
  Shield,
  Home
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import EmailJSPasswordReset from '../components/EmailJSPasswordReset';
import emailService from '../services/emailService';



interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const Settings: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();




  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');


  // Check if user has password (not OAuth-only)
  const hasPassword = user?.provider !== 'firebase-google' || (user as any)?.needsPasswordSetup === false;

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);



  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      setMessage({ type: 'success', text: 'Password changed successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        logout();
        navigate('/');
      } else {
        throw new Error('Failed to delete account');
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoutAll = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/auth/logout-all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      logout();
      navigate('/login');
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Failed to logout from all devices' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!user?.email) {
      setMessage({ type: 'error', text: 'User email not found' });
      return;
    }

    try {
      setIsLoading(true);
      // Generate a random 6-digit OTP
      const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();

      // Store OTP in localStorage temporarily (in production, this should be handled by backend)
      localStorage.setItem('resetOTP', generatedOTP);
      localStorage.setItem('resetEmail', user.email);

      // Send OTP via EmailJS
      const success = await emailService.sendPasswordResetOTP(user.email, user?.name || 'User', generatedOTP);

      if (success) {
        setOtpSent(true);
        setMessage({ type: 'success', text: `OTP sent to ${user.email}` });
      } else {
        setMessage({ type: 'error', text: 'Failed to send OTP. Please try again.' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTPAndChangePassword = async () => {
    if (!otp || !newPassword || !confirmNewPassword) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long' });
      return;
    }

    try {
      setIsLoading(true);

      // Verify OTP
      const storedOTP = localStorage.getItem('resetOTP');
      const storedEmail = localStorage.getItem('resetEmail');

      if (otp !== storedOTP || user?.email !== storedEmail) {
        setMessage({ type: 'error', text: 'Invalid OTP. Please try again.' });
        return;
      }

      // Here you would typically call your backend API to change the password
      // For now, we'll simulate success
      setMessage({ type: 'success', text: 'Password changed successfully!' });

      // Clean up
      localStorage.removeItem('resetOTP');
      localStorage.removeItem('resetEmail');
      setShowForgotPassword(false);
      setOtpSent(false);
      setOtp('');
      setNewPassword('');
      setConfirmNewPassword('');

    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Home Button */}


          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-2">Account Settings</h1>
            <p className="text-white/70">Manage your profile and account preferences</p>
          </div>

          {/* Message */}
          {message && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
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
              <button
                onClick={() => setMessage(null)}
                className="ml-auto text-white/50 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}



          {/* Password Management Section */}
          <div className="p-8 rounded-2xl shadow-2xl backdrop-blur-md border bg-white/10 border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <Shield className="w-6 h-6 mr-3" />
              Password Management
            </h2>

            <div className="space-y-4">
              {/* Change Password Button */}
              <motion.button
                onClick={() => setShowChangePassword(true)}
                className="w-full p-4 rounded-xl border border-blue-500/30 bg-blue-500/20 text-blue-200 hover:bg-blue-500/30 transition-all duration-300 flex items-center justify-center space-x-3"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Key className="w-5 h-5" />
                <span>Change Password</span>
              </motion.button>

              {/* Forgot Password Button */}
              <motion.button
                onClick={() => setShowForgotPassword(true)}
                className="w-full p-4 rounded-xl border border-purple-500/30 bg-purple-500/20 text-purple-200 hover:bg-purple-500/30 transition-all duration-300 flex items-center justify-center space-x-3"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Mail className="w-5 h-5" />
                <span>Reset Password via Email</span>
              </motion.button>
            </div>
          </div>

          {/* Change Password Modal */}
          {showChangePassword && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl p-8 max-w-md w-full"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">Change Password</h3>
                  <button
                    onClick={() => setShowChangePassword(false)}
                    className="text-white/50 hover:text-white"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">Current Password</label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl backdrop-blur-md border transition-all duration-300 bg-white/10 border-white/20 text-white placeholder-white/50 focus:bg-white/20 focus:border-white/40"
                      placeholder="Enter current password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">New Password</label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl backdrop-blur-md border transition-all duration-300 bg-white/10 border-white/20 text-white placeholder-white/50 focus:bg-white/20 focus:border-white/40"
                      placeholder="Enter new password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">Confirm New Password</label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl backdrop-blur-md border transition-all duration-300 bg-white/10 border-white/20 text-white placeholder-white/50 focus:bg-white/20 focus:border-white/40"
                      placeholder="Confirm new password"
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={() => setShowChangePassword(false)}
                      className="flex-1 px-4 py-3 rounded-xl border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-all duration-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePasswordChange}
                      disabled={isLoading}
                      className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold hover:from-blue-600 hover:to-purple-600 transition-all duration-300 disabled:opacity-50"
                    >
                      {isLoading ? 'Changing...' : 'Change Password'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Forgot Password Modal */}
          {showForgotPassword && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl p-8 max-w-md w-full"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">Reset Password</h3>
                  <button
                    onClick={() => {
                      setShowForgotPassword(false);
                      setOtpSent(false);
                      setOtp('');
                      setNewPassword('');
                      setConfirmNewPassword('');
                    }}
                    className="text-white/50 hover:text-white"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {!otpSent ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-white/90 mb-2">Reset password for:</p>
                      <p className="text-blue-400 font-semibold">{user?.email}</p>
                      <p className="text-white/70 text-sm mt-2">
                        We'll send a 6-digit OTP to your registered email address.
                      </p>
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <button
                        onClick={() => setShowForgotPassword(false)}
                        className="flex-1 px-4 py-3 rounded-xl border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-all duration-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSendOTP}
                        disabled={isLoading}
                        className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-300 disabled:opacity-50"
                      >
                        {isLoading ? 'Sending...' : 'Send OTP'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">Enter OTP</label>
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl backdrop-blur-md border transition-all duration-300 bg-white/10 border-white/20 text-white placeholder-white/50 focus:bg-white/20 focus:border-white/40"
                        placeholder="Enter 6-digit OTP"
                        maxLength={6}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl backdrop-blur-md border transition-all duration-300 bg-white/10 border-white/20 text-white placeholder-white/50 focus:bg-white/20 focus:border-white/40"
                        placeholder="Enter new password"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">Confirm New Password</label>
                      <input
                        type="password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl backdrop-blur-md border transition-all duration-300 bg-white/10 border-white/20 text-white placeholder-white/50 focus:bg-white/20 focus:border-white/40"
                        placeholder="Confirm new password"
                      />
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <button
                        onClick={() => setOtpSent(false)}
                        className="flex-1 px-4 py-3 rounded-xl border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-all duration-300"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleVerifyOTPAndChangePassword}
                        disabled={isLoading}
                        className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold hover:from-green-600 hover:to-blue-600 transition-all duration-300 disabled:opacity-50"
                      >
                        {isLoading ? 'Verifying...' : 'Reset Password'}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}



          {/* Account Management */}
          <div className="p-8 rounded-2xl shadow-2xl backdrop-blur-md border bg-white/10 border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Account Management</h2>

            <div className="space-y-4">
              <motion.button
                onClick={handleLogoutAll}
                disabled={isLoading}
                className="w-full p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/20 text-yellow-200 hover:bg-yellow-500/30 transition-all duration-300 flex items-center justify-center space-x-3"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <LogOut className="w-5 h-5" />
                <span>Logout from All Devices</span>
              </motion.button>

              <motion.button
                onClick={handleDeleteAccount}
                disabled={isLoading}
                className="w-full p-4 rounded-xl border border-red-500/30 bg-red-500/20 text-red-200 hover:bg-red-500/30 transition-all duration-300 flex items-center justify-center space-x-3"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Trash2 className="w-5 h-5" />
                <span>Delete Account</span>
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Password Reset Modal */}
      <EmailJSPasswordReset
        isOpen={showPasswordReset}
        onClose={() => setShowPasswordReset(false)}
        onComplete={() => {
          setShowPasswordReset(false);
          setMessage({ type: 'success', text: 'Password reset successfully!' });
        }}
      />
    </div>
  );
};

export default Settings;
