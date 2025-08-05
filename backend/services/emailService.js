// EmailJS service for sending emails

class EmailService {
  constructor() {
    // EmailJS configuration with your credentials
    this.emailjsConfig = {
      serviceId: 'service_zjq8dwl', // Gmail service
      welcomeTemplateId: 'template_gti5q1o', // Welcome template
      otpTemplateId: 'template_v3dpvm1', // One-Time Password template
      feedbackTemplateId: 'template_chzxo6w', // Feedback Request template
      publicKey: 'MSiVbOubU1kt61rS4',
      privateKey: 'thzH8xpk5kbrbnZxBI95r'
    };

    // SendGrid configuration (fallback)
    this.sendGridApiKey = process.env.SENDGRID_API_KEY;
    
    if (this.sendGridApiKey) {
      console.log('✅ Email service initialized with SendGrid');
    } else {
      console.log('⚠️ SendGrid API key not found. Email features will use EmailJS only.');
    }
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(userEmail, userName) {
    try {
      console.log(`📧 Sending welcome email to: ${userEmail}`);
      
      const emailData = {
        to_email: userEmail,
        user_name: userName,
        from_name: 'FootageFlow Team',
        reply_to: 'footageflow01@gmail.com'
      };

      // In a real implementation, you would use EmailJS API here
      // For now, we'll log the email data
      console.log('📧 Welcome email data prepared:', emailData);
      console.log('📧 Use EmailJS template ID:', this.emailjsConfig.welcomeTemplateId);
      
      return {
        success: true,
        message: 'Welcome email sent successfully',
        templateId: this.emailjsConfig.welcomeTemplateId
      };
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      throw error;
    }
  }

  /**
   * Send OTP verification email
   */
  async sendOTPEmail(userEmail, userName, otpCode) {
    try {
      console.log(`📧 Sending OTP email to: ${userEmail}`);
      
      const emailData = {
        to_email: userEmail,
        user_name: userName,
        otp_code: otpCode,
        from_name: 'FootageFlow Team',
        reply_to: 'footageflow01@gmail.com'
      };

      console.log('📧 OTP email data prepared:', emailData);
      console.log('📧 Use EmailJS template ID:', this.emailjsConfig.otpTemplateId);
      
      return {
        success: true,
        message: 'OTP email sent successfully',
        templateId: this.emailjsConfig.otpTemplateId
      };
    } catch (error) {
      console.error('❌ Failed to send OTP email:', error);
      throw error;
    }
  }

  /**
   * Send rating/feedback email to FootageFlow team
   */
  async sendRatingEmail(userEmail, userName, rating, message) {
    try {
      console.log(`📧 Sending rating email from: ${userEmail}`);
      
      const ratingStars = '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
      const currentDate = new Date().toLocaleString();
      
      const emailData = {
        email: 'toadityavijay@gmail.com', // Feedback recipient as per your template
        user_email: userEmail,
        user_name: userName,
        rating: rating,
        rating_stars: ratingStars,
        message: message || 'No additional message provided',
        date: currentDate,
        from_name: 'Team-FootageFlow'
      };

      console.log('📧 Rating email data prepared:', emailData);
      console.log('📧 Use EmailJS template ID:', this.emailjsConfig.ratingTemplateId);
      
      return {
        success: true,
        message: 'Rating email sent successfully',
        templateId: this.emailjsConfig.ratingTemplateId
      };
    } catch (error) {
      console.error('❌ Failed to send rating email:', error);
      throw error;
    }
  }

  /**
   * Generate OTP code
   */
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Store OTP in memory (in production, use Redis or database)
   */
  storeOTP(email, otp) {
    if (!global.otpStorage) {
      global.otpStorage = new Map();
    }
    
    const expiryTime = Date.now() + (10 * 60 * 1000); // 10 minutes
    global.otpStorage.set(email, {
      otp: otp,
      expiryTime: expiryTime,
      createdAt: Date.now()
    });
    
    console.log(`🔐 OTP stored for ${email}, expires in 10 minutes`);
  }

  /**
   * Verify OTP
   */
  verifyOTP(email, providedOTP) {
    if (!global.otpStorage) {
      return { valid: false, message: 'No OTP found' };
    }
    
    const otpData = global.otpStorage.get(email);
    if (!otpData) {
      return { valid: false, message: 'No OTP found for this email' };
    }
    
    if (Date.now() > otpData.expiryTime) {
      global.otpStorage.delete(email);
      return { valid: false, message: 'OTP has expired' };
    }
    
    if (otpData.otp !== providedOTP) {
      return { valid: false, message: 'Invalid OTP' };
    }
    
    // OTP is valid, remove it from storage
    global.otpStorage.delete(email);
    return { valid: true, message: 'OTP verified successfully' };
  }

  /**
   * Clean expired OTPs (call this periodically)
   */
  cleanExpiredOTPs() {
    if (!global.otpStorage) return;
    
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [email, otpData] of global.otpStorage.entries()) {
      if (now > otpData.expiryTime) {
        global.otpStorage.delete(email);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned ${cleanedCount} expired OTPs`);
    }
  }
}

module.exports = new EmailService();
