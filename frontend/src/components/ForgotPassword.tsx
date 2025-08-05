import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, ArrowLeft, Shield, Eye, EyeOff, Lock } from 'lucide-react';

interface ForgotPasswordProps {
  onBack: () => void;
  onComplete: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBack, onComplete }) => {
  const [step, setStep] = useState<'email' | 'otp' | 'reset'>('email');
  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      setSuccess('OTP sent to your email address');
      setStep('otp');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          otp: formData.otp,
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Password reset failed');
      }

      setSuccess('Password reset successfully!');
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderEmailStep = () => (
    <form onSubmit={handleSendOTP} className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
          <Mail className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Forgot Password?</h2>
        <p className="text-white/70">
          Enter your email address and we'll send you an OTP to reset your password.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-200 text-sm">
          {success}
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-sm font-medium text-white/90">Email Address</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="w-full pl-10 py-3 rounded-xl backdrop-blur-md border transition-all duration-300 bg-white/10 border-white/20 text-white placeholder-white/50 focus:bg-white/20 focus:border-white/40"
            placeholder="Enter your email address"
            required
          />
        </div>
      </div>

      <motion.button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 px-6 rounded-xl font-semibold backdrop-blur-md border transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-blue-500/80 border-blue-400 text-white hover:bg-blue-600/80"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {isSubmitting ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Sending OTP...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-2">
            <span>Send OTP</span>
            <ArrowRight className="w-5 h-5" />
          </div>
        )}
      </motion.button>

      <button
        type="button"
        onClick={onBack}
        className="w-full py-2 text-white/70 hover:text-white transition-colors flex items-center justify-center space-x-2"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Login</span>
      </button>
    </form>
  );

  const renderOTPStep = () => (
    <form onSubmit={(e) => { e.preventDefault(); setStep('reset'); }} className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Enter OTP</h2>
        <p className="text-white/70">
          We've sent a 6-digit code to {formData.email}
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-sm font-medium text-white/90">Verification Code</label>
        <input
          type="text"
          value={formData.otp}
          onChange={(e) => setFormData(prev => ({ ...prev, otp: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
          className="w-full py-3 px-4 rounded-xl backdrop-blur-md border transition-all duration-300 bg-white/10 border-white/20 text-white placeholder-white/50 focus:bg-white/20 focus:border-white/40 text-center text-2xl tracking-widest"
          placeholder="000000"
          maxLength={6}
          required
        />
      </div>

      <motion.button
        type="submit"
        disabled={formData.otp.length !== 6}
        className="w-full py-3 px-6 rounded-xl font-semibold backdrop-blur-md border transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-blue-500/80 border-blue-400 text-white hover:bg-blue-600/80"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center justify-center space-x-2">
          <span>Verify OTP</span>
          <ArrowRight className="w-5 h-5" />
        </div>
      </motion.button>

      <button
        type="button"
        onClick={() => setStep('email')}
        className="w-full py-2 text-white/70 hover:text-white transition-colors flex items-center justify-center space-x-2"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Change Email</span>
      </button>
    </form>
  );

  const renderResetStep = () => (
    <form onSubmit={handleResetPassword} className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
          <Lock className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Reset Password</h2>
        <p className="text-white/70">
          Create a new secure password for your account
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-200 text-sm">
          {success}
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-sm font-medium text-white/90">New Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={formData.newPassword}
            onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
            className="w-full pl-10 pr-10 py-3 rounded-xl backdrop-blur-md border transition-all duration-300 bg-white/10 border-white/20 text-white placeholder-white/50 focus:bg-white/20 focus:border-white/40"
            placeholder="Enter new password"
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

      <div className="space-y-2">
        <label className="block text-sm font-medium text-white/90">Confirm Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
            className="w-full pl-10 pr-10 py-3 rounded-xl backdrop-blur-md border transition-all duration-300 bg-white/10 border-white/20 text-white placeholder-white/50 focus:bg-white/20 focus:border-white/40"
            placeholder="Confirm new password"
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

      <motion.button
        type="submit"
        disabled={isSubmitting || formData.newPassword !== formData.confirmPassword}
        className="w-full py-3 px-6 rounded-xl font-semibold backdrop-blur-md border transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-blue-500/80 border-blue-400 text-white hover:bg-blue-600/80"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {isSubmitting ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Resetting Password...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-2">
            <span>Reset Password</span>
            <ArrowRight className="w-5 h-5" />
          </div>
        )}
      </motion.button>
    </form>
  );

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="p-8 rounded-2xl shadow-2xl backdrop-blur-md border bg-white/10 border-white/20">
          {step === 'email' && renderEmailStep()}
          {step === 'otp' && renderOTPStep()}
          {step === 'reset' && renderResetStep()}
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
