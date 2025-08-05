const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { generateToken, authenticateToken } = require('../auth');
const authService = require('../services/authService');
const firebaseAdmin = require('../services/firebaseAdmin');
const emailService = require('../services/emailService');

const router = express.Router();

// Google OAuth login
router.get('/google', (req, res, next) => {
  console.log('🔐 Starting Google OAuth flow...');
  console.log('Request URL:', req.url);
  console.log('Request headers:', req.headers);
  next();
}, passport.authenticate('google', {
    scope: ['profile', 'email']
  })
);

// Google OAuth callback
router.get('/google/callback', (req, res, next) => {
  console.log('🔄 OAuth callback received');
  console.log('Callback URL:', req.url);
  console.log('Query params:', req.query);
  next();
}, passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed`,
    session: false
  }),
  (req, res) => {
    try {
      // Generate JWT token
      const token = generateToken(req.user);

      // Redirect to frontend with token and password setup flag
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const needsPasswordSetup = req.user.needsPasswordSetup ? '&needsPasswordSetup=true' : '';
      res.redirect(`${frontendUrl}/auth/callback?token=${token}${needsPasswordSetup}`);
    } catch (error) {
      console.error('Error in auth callback:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=token_generation_failed`);
    }
  }
);

// Firebase Authentication Routes

// Firebase Google OAuth
router.post('/firebase/google', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: 'Firebase ID token is required'
      });
    }

    console.log('🔐 Firebase Google OAuth attempt');

    // Verify Firebase ID token
    const firebaseUser = await firebaseAdmin.verifyIdToken(idToken);

    // Check if user exists in our database
    let user = await authService.getUserByEmail(firebaseUser.email);

    if (user) {
      // Update existing user with Firebase info, always update avatar from Google
      user = await authService.updateUser(user.id, {
        name: firebaseUser.name || user.name,
        avatar: firebaseUser.picture, // Always update with latest Google profile picture
        lastLogin: new Date()
      });
    } else {
      // Create new user
      user = await authService.createUser({
        email: firebaseUser.email,
        name: firebaseUser.name,
        avatar: firebaseUser.picture,
        provider: 'firebase-google',
        isEmailVerified: firebaseUser.emailVerified,
        needsPasswordSetup: true // Firebase users need to set password for email/password login
      });
    }

    // Generate JWT token for our app
    const token = generateToken(user);

    console.log('✅ Firebase Google OAuth successful for:', user.email);

    // Send welcome email for new users
    if (user.isNewUser) {
      try {
        await emailService.sendWelcomeEmail(user.email, user.name);
        console.log('📧 Welcome email sent to new user:', user.email);
      } catch (emailError) {
        console.error('⚠️ Failed to send welcome email:', emailError.message);
        // Don't fail the login if email fails
      }
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        needsPasswordSetup: user.needsPasswordSetup
      },
      token,
      needsPasswordSetup: user.needsPasswordSetup
    });

  } catch (error) {
    console.error('❌ Firebase Google OAuth failed:', error.message);

    // If Firebase is not configured, suggest using regular Google OAuth
    if (error.message.includes('Firebase authentication not configured')) {
      return res.status(503).json({
        success: false,
        error: 'Firebase authentication not configured. Please use Google OAuth instead.',
        suggestion: 'Try using the Google OAuth button instead.'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Authentication failed'
    });
  }
});

// Firebase Email/Password Registration
router.post('/firebase/register', async (req, res) => {
  try {
    const { idToken, username } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: 'Firebase ID token is required'
      });
    }

    console.log('🔐 Firebase email/password registration attempt');

    // Verify Firebase ID token
    const firebaseUser = await firebaseAdmin.verifyIdToken(idToken);

    // Check if user already exists
    let user = await authService.getUserByEmail(firebaseUser.email);

    if (user) {
      return res.status(400).json({
        success: false,
        error: 'User already exists with this email'
      });
    }

    // Create new user
    user = await authService.createUser({
      email: firebaseUser.email,
      name: firebaseUser.name || username,
      username: username,
      provider: 'firebase-email',
      isEmailVerified: firebaseUser.emailVerified,
      needsPasswordSetup: false // Email/password users don't need password setup
    });

    // Generate JWT token for our app
    const token = generateToken(user);

    console.log('✅ Firebase email/password registration successful for:', user.email);

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        needsPasswordSetup: user.needsPasswordSetup
      },
      token,
      needsPasswordSetup: user.needsPasswordSetup
    });

  } catch (error) {
    console.error('❌ Firebase email/password registration failed:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});



// JWT Authentication Routes

// Register new user
router.post('/register', async (req, res) => {
  try {
    console.log('📝 User registration attempt:', {
      username: req.body.username,
      email: req.body.email
    });

    const result = await authService.register(req.body);

    console.log('✅ User registered successfully:', result.user.id);
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: result.user,
      token: result.token
    });

  } catch (error) {
    console.error('❌ Registration failed:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    console.log('🔑 User login attempt:', {
      emailOrUsername: req.body.emailOrUsername
    });

    const result = await authService.login(req.body);

    console.log('✅ User logged in successfully:', result.user.id);
    res.json({
      success: true,
      message: 'Login successful',
      user: result.user,
      token: result.token
    });

  } catch (error) {
    console.error('❌ Login failed:', error.message);
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
});

// Change password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    console.log('🔒 Password change attempt for user:', req.user.id);

    const result = await authService.changePassword(req.user.id, req.body);

    console.log('✅ Password changed successfully for user:', req.user.id);
    res.json(result);

  } catch (error) {
    console.error('❌ Password change failed:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Setup password for OAuth users
router.post('/setup-password', authenticateToken, async (req, res) => {
  try {
    console.log('🔐 Password setup attempt for user:', req.user.userId);

    const result = await authService.setupPassword(req.user.userId, req.body.password);

    console.log('✅ Password setup successful for user:', req.user.userId);
    res.json(result);

  } catch (error) {
    console.error('❌ Password setup failed:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Forgot password - send OTP
router.post('/forgot-password', async (req, res) => {
  try {
    console.log('🔑 Forgot password request for:', req.body.email);

    const result = await authService.sendPasswordResetOTP(req.body.email);

    console.log('✅ Password reset OTP sent to:', req.body.email);
    res.json(result);

  } catch (error) {
    console.error('❌ Forgot password failed:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Verify OTP and reset password
router.post('/reset-password-with-otp', async (req, res) => {
  try {
    console.log('🔑 Password reset with OTP for:', req.body.email);

    const result = await authService.resetPasswordWithOTP(req.body);

    console.log('✅ Password reset successful for:', req.body.email);
    res.json(result);

  } catch (error) {
    console.error('❌ Password reset failed:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Check username availability
router.get('/check-username/:username', async (req, res) => {
  try {
    const { username } = req.params;

    if (username.length < 3) {
      return res.json({
        available: false,
        message: 'Username must be at least 3 characters long'
      });
    }

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const existingUser = await prisma.user.findUnique({
      where: { username: username.toLowerCase() }
    });

    await prisma.$disconnect();

    res.json({
      available: !existingUser,
      message: existingUser ? 'Username is already taken' : 'Username is available'
    });

  } catch (error) {
    console.error('Error checking username:', error);
    res.status(500).json({
      available: false,
      message: 'Error checking username availability'
    });
  }
});

// Check email availability
router.get('/check-email/:email', async (req, res) => {
  try {
    const { email } = req.params;

    if (!authService.validateEmail(email)) {
      return res.json({
        available: false,
        message: 'Please provide a valid email address'
      });
    }

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    await prisma.$disconnect();

    res.json({
      available: !existingUser,
      message: existingUser ? 'Email is already registered' : 'Email is available'
    });

  } catch (error) {
    console.error('Error checking email:', error);
    res.status(500).json({
      available: false,
      message: 'Error checking email availability'
    });
  }
});



// Setup password for OAuth users
router.post('/setup-password', authenticateToken, async (req, res) => {
  try {
    console.log('🔒 Password setup attempt for user:', req.user.userId);

    const result = await authService.setupPassword(req.user.userId, req.body);

    console.log('✅ Password setup successful for user:', req.user.userId);
    res.json(result);

  } catch (error) {
    console.error('❌ Password setup failed:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Send forgot password OTP
router.post('/forgot-password', async (req, res) => {
  try {
    console.log('📧 Forgot password OTP request for:', req.body.email);

    const result = await authService.sendForgotPasswordOTP(req.body.email);

    console.log('✅ Forgot password OTP sent to:', req.body.email);
    res.json(result);

  } catch (error) {
    console.error('❌ Forgot password OTP failed:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Verify OTP without resetting password
router.post('/verify-reset-otp', async (req, res) => {
  try {
    console.log('🔍 OTP verification attempt for:', req.body.email);

    const result = await authService.verifyResetOTP(req.body.email, req.body.otp);

    console.log('✅ OTP verified successfully for:', req.body.email);
    res.json(result);

  } catch (error) {
    console.error('❌ OTP verification failed:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Reset password with OTP
router.post('/reset-password', async (req, res) => {
  try {
    console.log('🔑 Password reset attempt for:', req.body.email);

    const result = await authService.resetPasswordWithOTP(req.body);

    console.log('✅ Password reset successful for:', req.body.email);
    res.json(result);

  } catch (error) {
    console.error('❌ Password reset failed:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Update profile
router.put('/update-profile', authenticateToken, async (req, res) => {
  try {
    console.log('👤 Profile update attempt for user:', req.user.userId);

    const result = await authService.updateUserProfile(req.user.userId, req.body);

    console.log('✅ Profile updated successfully for user:', req.user.userId);
    res.json(result);

  } catch (error) {
    console.error('❌ Profile update failed:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Delete account
router.delete('/delete-account', authenticateToken, async (req, res) => {
  try {
    console.log('🗑️ Account deletion attempt for user:', req.user.userId);

    const result = await authService.deleteUserAccount(req.user.userId);

    console.log('✅ Account deleted successfully for user:', req.user.userId);
    res.json(result);

  } catch (error) {
    console.error('❌ Account deletion failed:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Delete account
router.delete('/delete-account', authenticateToken, async (req, res) => {
  try {
    console.log('🗑️ Account deletion attempt for user:', req.user.userId);

    await authService.deleteUserAccount(req.user.userId);

    console.log('✅ Account deleted successfully for user:', req.user.userId);
    res.json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('❌ Account deletion failed:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Logout from all devices
router.post('/logout-all', authenticateToken, async (req, res) => {
  try {
    console.log('🚪 Logout all devices for user:', req.user.userId);

    // In a real app, you'd invalidate all tokens for this user
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'Logged out from all devices'
    });

  } catch (error) {
    console.error('❌ Logout all failed:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get current user info
router.get('/me', authenticateToken, async (req, res) => {
  try {
    console.log('👤 Get current user info for:', req.user.userId);

    const user = await authService.getUserById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        provider: user.provider,
        needsPasswordSetup: user.needsPasswordSetup
      }
    });

  } catch (error) {
    console.error('❌ Get user info failed:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Forgot Password - Send OTP
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    console.log('🔐 Forgot password request for:', email);

    // Check if user exists
    const user = await authService.findUserByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({
        success: true,
        message: 'If an account with this email exists, you will receive an OTP shortly.'
      });
    }

    // Generate and store OTP
    const otp = emailService.generateOTP();
    emailService.storeOTP(email, otp);

    // Send OTP email
    await emailService.sendOTPEmail(email, user.name, otp);

    console.log('📧 OTP sent to:', email);

    res.json({
      success: true,
      message: 'OTP sent to your email address'
    });

  } catch (error) {
    console.error('❌ Forgot password failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process forgot password request'
    });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Email and OTP are required'
      });
    }

    console.log('🔐 OTP verification for:', email);

    const verification = emailService.verifyOTP(email, otp);

    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        error: verification.message
      });
    }

    // Generate a temporary token for password reset
    const resetToken = generateToken({ email, purpose: 'password_reset' }, '15m');

    console.log('✅ OTP verified for:', email);

    res.json({
      success: true,
      message: 'OTP verified successfully',
      resetToken: resetToken
    });

  } catch (error) {
    console.error('❌ OTP verification failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify OTP'
    });
  }
});

// Reset Password with verified OTP
router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Reset token and new password are required'
      });
    }

    console.log('🔐 Password reset attempt');

    // Verify reset token
    const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    if (decoded.purpose !== 'password_reset') {
      return res.status(400).json({
        success: false,
        error: 'Invalid reset token'
      });
    }

    // Reset password
    const result = await authService.resetPassword(decoded.email, newPassword);

    if (!result.success) {
      return res.status(400).json(result);
    }

    console.log('✅ Password reset successful for:', decoded.email);

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('❌ Password reset failed:', error);

    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({
        success: false,
        error: 'Reset token has expired. Please request a new OTP.'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to reset password'
    });
  }
});

// Submit Rating
router.post('/submit-rating', authenticateToken, async (req, res) => {
  try {
    const { rating, message } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5'
      });
    }

    console.log('⭐ Rating submission from:', req.user.email);

    // Get user details
    const user = await authService.findUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Send rating email to FootageFlow team
    await emailService.sendRatingEmail(user.email, user.name, rating, message);

    console.log('📧 Rating email sent to FootageFlow team');

    res.json({
      success: true,
      message: 'Thank you for your feedback!'
    });

  } catch (error) {
    console.error('❌ Rating submission failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit rating'
    });
  }
});

module.exports = router;
