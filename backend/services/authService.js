const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
    this.jwtExpiry = process.env.JWT_EXPIRY || '7d';
  }

  // Generate JWT token
  generateToken(userId) {
    return jwt.sign({ userId }, this.jwtSecret, { expiresIn: this.jwtExpiry });
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  // Hash password
  async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // Compare password
  async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Validate email
  validateEmail(email) {
    return validator.isEmail(email);
  }

  // Validate password strength
  validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return {
      isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers,
      errors: {
        minLength: password.length < minLength,
        hasUpperCase: !hasUpperCase,
        hasLowerCase: !hasLowerCase,
        hasNumbers: !hasNumbers,
        hasSpecialChar: !hasSpecialChar
      }
    };
  }

  // Register new user
  async register(userData) {
    const { username, email, password, confirmPassword } = userData;

    try {
      // Validation
      if (!username || !email || !password || !confirmPassword) {
        throw new Error('All fields are required');
      }

      if (username.length < 3) {
        throw new Error('Username must be at least 3 characters long');
      }

      if (!this.validateEmail(email)) {
        throw new Error('Please provide a valid email address');
      }

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      const passwordValidation = this.validatePassword(password);
      if (!passwordValidation.isValid) {
        const errors = [];
        if (passwordValidation.errors.minLength) errors.push('at least 8 characters');
        if (passwordValidation.errors.hasUpperCase) errors.push('one uppercase letter');
        if (passwordValidation.errors.hasLowerCase) errors.push('one lowercase letter');
        if (passwordValidation.errors.hasNumbers) errors.push('one number');
        
        throw new Error(`Password must contain ${errors.join(', ')}`);
      }

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: email.toLowerCase() },
            { username: username.toLowerCase() }
          ]
        }
      });

      if (existingUser) {
        if (existingUser.email === email.toLowerCase()) {
          throw new Error('Email is already registered');
        }
        if (existingUser.username === username.toLowerCase()) {
          throw new Error('Username is already taken');
        }
      }

      // Hash password
      const hashedPassword = await this.hashPassword(password);

      // Create user
      const user = await prisma.user.create({
        data: {
          username: username.toLowerCase(),
          email: email.toLowerCase(),
          password: hashedPassword,
          provider: 'local',
          isEmailVerified: false
        }
      });

      // Generate token
      const token = this.generateToken(user.id);

      // Welcome email is now handled by frontend EmailJS service
      console.log('✅ User registered successfully. Welcome email will be sent via frontend.');

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          provider: user.provider,
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt
        },
        token
      };

    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  // Login user
  async login(credentials) {
    const { emailOrUsername, password } = credentials;

    try {
      // Validation
      if (!emailOrUsername || !password) {
        throw new Error('Email/username and password are required');
      }

      // Find user by email or username
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: emailOrUsername.toLowerCase() },
            { username: emailOrUsername.toLowerCase() }
          ],
          provider: 'local'
        }
      });

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check password
      const isPasswordValid = await this.comparePassword(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });

      // Generate token
      const token = this.generateToken(user.id);

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          provider: user.provider,
          isEmailVerified: user.isEmailVerified,
          lastLogin: new Date(),
          createdAt: user.createdAt
        },
        token
      };

    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Get user by ID
  async getUserById(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          provider: true,
          isEmailVerified: true,
          lastLogin: true,
          createdAt: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      console.error('Get user error:', error);
      throw error;
    }
  }

  // Change password
  async changePassword(userId, passwords) {
    const { currentPassword, newPassword, confirmNewPassword } = passwords;

    try {
      // Validation
      if (!currentPassword || !newPassword || !confirmNewPassword) {
        throw new Error('All password fields are required');
      }

      if (newPassword !== confirmNewPassword) {
        throw new Error('New passwords do not match');
      }

      const passwordValidation = this.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        const errors = [];
        if (passwordValidation.errors.minLength) errors.push('at least 8 characters');
        if (passwordValidation.errors.hasUpperCase) errors.push('one uppercase letter');
        if (passwordValidation.errors.hasLowerCase) errors.push('one lowercase letter');
        if (passwordValidation.errors.hasNumbers) errors.push('one number');
        
        throw new Error(`New password must contain ${errors.join(', ')}`);
      }

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user || user.provider !== 'local') {
        throw new Error('User not found or not a local account');
      }

      // Verify current password
      const isCurrentPasswordValid = await this.comparePassword(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const hashedNewPassword = await this.hashPassword(newPassword);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword }
      });

      return { success: true, message: 'Password changed successfully' };

    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }

  // Setup password for OAuth users
  async setupPassword(userId, passwordData) {
    const { password, confirmPassword } = passwordData;

    try {
      // Validation
      if (!password || !confirmPassword) {
        throw new Error('Password and confirmation are required');
      }

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      const passwordValidation = this.validatePassword(password);
      if (!passwordValidation.isValid) {
        const errors = [];
        if (passwordValidation.errors.minLength) errors.push('at least 8 characters');
        if (passwordValidation.errors.hasUpperCase) errors.push('one uppercase letter');
        if (passwordValidation.errors.hasLowerCase) errors.push('one lowercase letter');
        if (passwordValidation.errors.hasNumbers) errors.push('one number');

        throw new Error(`Password must contain ${errors.join(', ')}`);
      }

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (user.password) {
        throw new Error('Password is already set for this account');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(password);

      // Update user
      await prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
          needsPasswordSetup: false
        }
      });

      // Password setup notification is now handled by frontend EmailJS service
      console.log('✅ Password setup completed for user:', user.email);

      return { success: true, message: 'Password setup completed successfully' };

    } catch (error) {
      console.error('Setup password error:', error);
      throw error;
    }
  }

  // Send forgot password OTP
  async sendForgotPasswordOTP(email) {
    try {
      if (!email) {
        throw new Error('Email is required');
      }

      if (!this.validateEmail(email)) {
        throw new Error('Please provide a valid email address');
      }

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (!user) {
        throw new Error('No account found with this email address');
      }

      if (!user.password) {
        throw new Error('This account uses Google OAuth. Please login with Google or set up a password first.');
      }

      // OTP sending is now handled by frontend EmailJS service
      console.log('✅ Password reset requested for user:', email);

      return { success: true, message: 'OTP sent to your email address' };

    } catch (error) {
      console.error('Send forgot password OTP error:', error);
      throw error;
    }
  }

  // Reset password with OTP
  async resetPasswordWithOTP(resetData) {
    const { email, otp, newPassword, confirmPassword } = resetData;

    try {
      // Validation
      if (!email || !otp || !newPassword || !confirmPassword) {
        throw new Error('All fields are required');
      }

      if (!this.validateEmail(email)) {
        throw new Error('Please provide a valid email address');
      }

      if (newPassword !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      const passwordValidation = this.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        const errors = [];
        if (passwordValidation.errors.minLength) errors.push('at least 8 characters');
        if (passwordValidation.errors.hasUpperCase) errors.push('one uppercase letter');
        if (passwordValidation.errors.hasLowerCase) errors.push('one lowercase letter');
        if (passwordValidation.errors.hasNumbers) errors.push('one number');

        throw new Error(`Password must contain ${errors.join(', ')}`);
      }

      // Verify OTP
      emailService.verifyOTP(email, otp);

      // Get user
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update password
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      });

      return { success: true, message: 'Password reset successfully' };

    } catch (error) {
      console.error('Reset password with OTP error:', error);
      throw error;
    }
  }

  // Create or update OAuth user
  async createOrUpdateOAuthUser(profile) {
    try {
      const { id: googleId, emails, displayName, photos } = profile;
      const email = emails[0].value;
      const avatar = photos && photos[0] ? photos[0].value : null;

      // Check if user exists
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { googleId },
            { email: email.toLowerCase() }
          ]
        }
      });

      if (user) {
        // Update existing user
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId,
            name: displayName,
            avatar,
            lastLogin: new Date()
          }
        });
      } else {
        // Create new user
        user = await prisma.user.create({
          data: {
            googleId,
            email: email.toLowerCase(),
            name: displayName,
            avatar,
            provider: 'google',
            isEmailVerified: true,
            needsPasswordSetup: true, // New OAuth users need to set password
            lastLogin: new Date()
          }
        });

        // Send welcome email
        await emailService.sendWelcomeEmail(email, displayName);
      }

      return user;

    } catch (error) {
      console.error('Create/update OAuth user error:', error);
      throw error;
    }
  }

  // Get user by email
  async getUserByEmail(email) {
    try {
      return await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });
    } catch (error) {
      console.error('Get user by email error:', error);
      throw error;
    }
  }

  // Get user by ID
  async getUserById(userId) {
    try {
      return await prisma.user.findUnique({
        where: { id: userId }
      });
    } catch (error) {
      console.error('Get user by ID error:', error);
      throw error;
    }
  }

  // Update user
  async updateUser(userId, updateData) {
    try {
      return await prisma.user.update({
        where: { id: userId },
        data: updateData
      });
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  }

  // Create user
  async createUser(userData) {
    try {
      const user = await prisma.user.create({
        data: {
          ...userData,
          email: userData.email.toLowerCase()
        }
      });

      // Send welcome email for new users
      if (userData.provider === 'firebase-google') {
        await emailService.sendWelcomeEmail(userData.email, userData.name);
      }

      return user;
    } catch (error) {
      console.error('Create user error:', error);
      throw error;
    }
  }

  // Update user profile
  async updateUserProfile(userId, profileData) {
    try {
      const { displayName, email, username, avatar } = profileData;

      // Validate email if changed
      if (email && !this.validateEmail(email)) {
        throw new Error('Please provide a valid email address');
      }

      // Check if email is already taken by another user
      if (email) {
        const existingUser = await prisma.user.findFirst({
          where: {
            email: email.toLowerCase(),
            NOT: { id: userId }
          }
        });

        if (existingUser) {
          throw new Error('Email is already taken by another user');
        }
      }

      // Check if username is already taken by another user
      if (username) {
        const existingUser = await prisma.user.findFirst({
          where: {
            username: username.toLowerCase(),
            NOT: { id: userId }
          }
        });

        if (existingUser) {
          throw new Error('Username is already taken');
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          name: displayName,
          email: email ? email.toLowerCase() : undefined,
          username: username ? username.toLowerCase() : undefined,
          avatar: avatar
        }
      });

      return {
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          username: updatedUser.username,
          avatar: updatedUser.avatar
        }
      };

    } catch (error) {
      console.error('Update user profile error:', error);
      throw error;
    }
  }

  // Delete user account
  async deleteUserAccount(userId) {
    try {
      // Delete user's videos first (cascade delete)
      await prisma.video.deleteMany({
        where: { userId }
      });

      // Delete user's stories
      await prisma.story.deleteMany({
        where: { userId }
      });

      // Delete the user
      await prisma.user.delete({
        where: { id: userId }
      });

      return { success: true, message: 'Account deleted successfully' };

    } catch (error) {
      console.error('Delete user account error:', error);
      throw error;
    }
  }

  // Setup password for OAuth users
  async setupPassword(userId, password) {
    try {
      if (!password || password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
          needsPasswordSetup: false
        }
      });

      return {
        success: true,
        message: 'Password setup successfully',
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          needsPasswordSetup: false
        }
      };

    } catch (error) {
      console.error('Setup password error:', error);
      throw error;
    }
  }

  // Send password reset OTP
  async sendPasswordResetOTP(email) {
    try {
      if (!this.validateEmail(email)) {
        throw new Error('Please provide a valid email address');
      }

      const user = await this.getUserByEmail(email);
      if (!user) {
        throw new Error('No account found with this email address');
      }

      // Generate OTP
      const otp = this.generateOTP();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP in database
      await prisma.user.update({
        where: { email: email.toLowerCase() },
        data: {
          resetOTP: otp,
          resetOTPExpiry: otpExpiry
        }
      });

      // Send OTP email
      const emailService = require('./emailService');
      await emailService.sendPasswordResetOTP(email, user.name, otp);

      return {
        success: true,
        message: 'Password reset OTP sent to your email'
      };

    } catch (error) {
      console.error('Send password reset OTP error:', error);
      throw error;
    }
  }

  // Verify reset OTP without resetting password
  async verifyResetOTP(email, otp) {
    try {
      if (!email || !otp) {
        throw new Error('Email and OTP are required');
      }

      if (!this.validateEmail(email)) {
        throw new Error('Please provide a valid email address');
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Check if OTP exists
      if (!user.resetOTP) {
        throw new Error('No OTP found. Please request a new password reset');
      }

      // Check if OTP matches
      if (user.resetOTP !== otp.toString()) {
        throw new Error('Invalid OTP');
      }

      // Check OTP expiry
      if (!user.resetOTPExpiry || new Date() > user.resetOTPExpiry) {
        throw new Error('OTP has expired. Please request a new one');
      }

      return {
        success: true,
        message: 'OTP verified successfully'
      };

    } catch (error) {
      console.error('Verify reset OTP error:', error);
      throw error;
    }
  }

  // Reset password with OTP
  async resetPasswordWithOTP(data) {
    try {
      const { email, otp, newPassword } = data;

      if (!this.validateEmail(email)) {
        throw new Error('Please provide a valid email address');
      }

      if (!otp || otp.length !== 6) {
        throw new Error('Please provide a valid 6-digit OTP');
      }

      if (!newPassword || newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      const user = await this.getUserByEmail(email);
      if (!user) {
        throw new Error('No account found with this email address');
      }

      // Check OTP
      if (!user.resetOTP || user.resetOTP !== otp) {
        throw new Error('Invalid OTP code');
      }

      // Check OTP expiry
      if (!user.resetOTPExpiry || new Date() > user.resetOTPExpiry) {
        throw new Error('OTP has expired. Please request a new one');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password and clear OTP
      await prisma.user.update({
        where: { email: email.toLowerCase() },
        data: {
          password: hashedPassword,
          resetOTP: null,
          resetOTPExpiry: null,
          needsPasswordSetup: false
        }
      });

      return {
        success: true,
        message: 'Password reset successfully'
      };

    } catch (error) {
      console.error('Reset password with OTP error:', error);
      throw error;
    }
  }

  // Delete user account and all associated data
  async deleteUserAccount(userId) {
    try {
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          videos: true,
          stories: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Delete all user data (Prisma will handle cascading deletes due to onDelete: Cascade)
      await prisma.user.delete({
        where: { id: userId }
      });

      console.log(`🗑️ User account deleted: ${userId}`);
      console.log(`📊 Deleted ${user.videos.length} videos and ${user.stories.length} stories`);

      return {
        success: true,
        message: 'Account deleted successfully'
      };

    } catch (error) {
      console.error('Delete user account error:', error);
      throw error;
    }
  }
}

module.exports = new AuthService();
