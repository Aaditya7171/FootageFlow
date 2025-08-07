import emailjs from '@emailjs/browser';

// EmailJS configuration with your credentials
const EMAILJS_CONFIG = {
  serviceId: 'service_zjq8dwl', // Gmail service
  publicKey: 'MSiVbOubU1kt61rS4',
  privateKey: 'thzH8xpk5kbrbnZxBI95r',
  templates: {
    feedback: 'template_chzxo6w', // Feedback Request template
    welcome: 'template_gti5q1o', // Welcome template
    otp: 'template_v3dpvm1' // One-Time Password template
  }
};

// Initialize EmailJS
emailjs.init(EMAILJS_CONFIG.publicKey);

interface EmailTemplateParams {
  to_email?: string;
  to_name?: string;
  from_name: string;
  [key: string]: any;
}

class EmailService {
  private serviceId = EMAILJS_CONFIG.serviceId;

  // Test EmailJS configuration
  async testEmailJSConfig(): Promise<void> {
    console.log('📧 EmailJS Configuration:');
    console.log('Service ID:', this.serviceId);
    console.log('Public Key:', EMAILJS_CONFIG.publicKey);
    console.log('Templates:', EMAILJS_CONFIG.templates);
  }

  // Send OTP email for password reset
  async sendPasswordResetOTP(email: string, name: string, otp: string): Promise<boolean> {
    try {
      console.log('📧 Attempting to send password reset OTP to:', email);

      const templateParams: EmailTemplateParams = {
        to_email: email,
        to_name: name || 'User',
        from_name: 'FootageFlow Team',
        otp_code: otp,
        user_name: name || 'User',
        reply_to: 'footageflow01@gmail.com'
      };

      console.log('📧 Template params:', templateParams);
      console.log('📧 Using service ID:', this.serviceId);
      console.log('📧 Using template ID:', EMAILJS_CONFIG.templates.otp);

      const response = await emailjs.send(
        this.serviceId,
        EMAILJS_CONFIG.templates.otp,
        templateParams
      );

      console.log('✅ Password reset OTP sent successfully:', response);
      return true;
    } catch (error) {
      console.error('❌ Failed to send password reset OTP:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      return false;
    }
  }

  // Send welcome email for new users
  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    try {
      console.log('📧 Attempting to send welcome email to:', email);

      const templateParams: EmailTemplateParams = {
        to_email: email,
        to_name: name || 'User',
        from_name: 'FootageFlow Team',
        user_name: name || 'User',
        reply_to: 'footageflow01@gmail.com'
      };

      console.log('📧 Welcome email template params:', templateParams);

      const response = await emailjs.send(
        this.serviceId,
        EMAILJS_CONFIG.templates.welcome,
        templateParams
      );

      console.log('✅ Welcome email sent successfully:', response);
      return true;
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      return false;
    }
  }

  // Send feedback email
  async sendFeedback(userEmail: string, userName: string, rating: number, message: string): Promise<boolean> {
    try {
      const templateParams: EmailTemplateParams = {
        to_email: 'toadityavijay@gmail.com', // Your feedback recipient email
        to_name: 'FootageFlow Team',
        user_email: userEmail,
        user_name: userName || 'Anonymous',
        rating: rating.toString(),
        message: message || 'No additional feedback provided',
        from_name: 'Team-FootageFlow'
      };

      const response = await emailjs.send(
        this.serviceId,
        EMAILJS_CONFIG.templates.feedback,
        templateParams
      );

      console.log('✅ Feedback sent successfully:', response);
      return true;
    } catch (error) {
      console.error('❌ Failed to send feedback:', error);
      return false;
    }
  }

  // Generate beautiful HTML template for password reset
  private getPasswordResetTemplate(name: string, otp: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - FootageFlow</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center; }
          .logo { color: white; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
          .header-text { color: rgba(255,255,255,0.9); font-size: 16px; }
          .content { padding: 40px 30px; }
          .greeting { font-size: 24px; color: #1f2937; margin-bottom: 20px; }
          .message { color: #6b7280; line-height: 1.6; margin-bottom: 30px; }
          .otp-container { background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); border-radius: 15px; padding: 30px; text-align: center; margin: 30px 0; border: 2px dashed #3b82f6; }
          .otp-label { color: #6b7280; font-size: 14px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
          .otp-code { font-size: 36px; font-weight: bold; color: #3b82f6; letter-spacing: 8px; font-family: 'Courier New', monospace; }
          .warning { background: #fef3cd; border: 1px solid #fbbf24; border-radius: 10px; padding: 15px; margin: 20px 0; color: #92400e; }
          .footer { background: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; }
          .footer-text { color: #6b7280; font-size: 14px; }
          .button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: 600; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🎬 FootageFlow</div>
            <div class="header-text">AI-Powered Video Management</div>
          </div>
          
          <div class="content">
            <div class="greeting">Hello ${name}! 👋</div>
            
            <div class="message">
              We received a request to reset your password for your FootageFlow account. 
              Use the verification code below to complete your password reset:
            </div>
            
            <div class="otp-container">
              <div class="otp-label">Verification Code</div>
              <div class="otp-code">${otp}</div>
            </div>
            
            <div class="warning">
              ⚠️ <strong>Security Notice:</strong> This code will expire in 10 minutes. 
              If you didn't request this password reset, please ignore this email.
            </div>
            
            <div class="message">
              Enter this code in the password reset form to create your new password. 
              If you have any questions, feel free to contact our support team.
            </div>
          </div>
          
          <div class="footer">
            <div class="footer-text">
              © 2024 FootageFlow. Built with ❤️ for video creators.<br>
              This is an automated message, please do not reply to this email.
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate beautiful HTML template for welcome email
  private getWelcomeTemplate(name: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to FootageFlow!</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center; }
          .logo { color: white; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
          .header-text { color: rgba(255,255,255,0.9); font-size: 16px; }
          .content { padding: 40px 30px; }
          .greeting { font-size: 28px; color: #1f2937; margin-bottom: 20px; text-align: center; }
          .message { color: #6b7280; line-height: 1.6; margin-bottom: 30px; }
          .features { background: #f8fafc; border-radius: 15px; padding: 30px; margin: 30px 0; }
          .feature { display: flex; align-items: center; margin-bottom: 20px; }
          .feature-icon { font-size: 24px; margin-right: 15px; }
          .feature-text { color: #374151; }
          .cta { text-align: center; margin: 30px 0; }
          .button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 15px 40px; border-radius: 25px; text-decoration: none; font-weight: 600; }
          .footer { background: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; }
          .footer-text { color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🎬 FootageFlow</div>
            <div class="header-text">AI-Powered Video Management</div>
          </div>
          
          <div class="content">
            <div class="greeting">Welcome to FootageFlow, ${name}! 🎉</div>
            
            <div class="message">
              Thank you for joining our community of video creators! We're thrilled to have you on board. 
              FootageFlow is designed to revolutionize how you manage, search, and create stories from your video content.
            </div>
            
            <div class="features">
              <div class="feature">
                <div class="feature-icon">🤖</div>
                <div class="feature-text"><strong>AI-Powered Analysis:</strong> Automatic transcription and visual tagging of your videos</div>
              </div>
              <div class="feature">
                <div class="feature-icon">🔍</div>
                <div class="feature-text"><strong>Smart Search:</strong> Find specific moments in your videos using natural language</div>
              </div>
              <div class="feature">
                <div class="feature-icon">✨</div>
                <div class="feature-text"><strong>Story Generation:</strong> Create compelling video stories with AI assistance</div>
              </div>
              <div class="feature">
                <div class="feature-icon">☁️</div>
                <div class="feature-text"><strong>Cloud Storage:</strong> Secure and reliable video hosting with global CDN</div>
              </div>
            </div>
            
            <div class="message">
              <strong>Quick Start Guide:</strong><br>
              1. Upload your first video from the dashboard<br>
              2. Wait for AI processing to complete (transcription + vision analysis)<br>
              3. Use the search feature to find specific content<br>
              4. Generate your first AI story with a creative prompt<br>
              5. Explore advanced features and settings
            </div>
            
            <div class="cta">
              <a href="http://localhost:5173/dashboard" class="button">Start Creating Now →</a>
            </div>
            
            <div class="message">
              If you have any questions or need assistance, don't hesitate to reach out to our support team. 
              We're here to help you make the most of FootageFlow!
            </div>
          </div>
          
          <div class="footer">
            <div class="footer-text">
              © 2024 FootageFlow. Built with ❤️ for video creators.<br>
              Follow us for updates and tips on maximizing your video workflow!
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

const emailService = new EmailService();
export default emailService;
