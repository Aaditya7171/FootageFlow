const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Check if we have proper Firebase credentials
    const hasValidCredentials =
      process.env.FIREBASE_PRIVATE_KEY &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      !process.env.FIREBASE_PRIVATE_KEY.includes('YOUR_PRIVATE_KEY_HERE');

    if (hasValidCredentials) {
      // Use service account credentials
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        projectId: process.env.FIREBASE_PROJECT_ID || 'footageflow-151b6',
      });
      console.log('🔥 Firebase Admin initialized with service account');
    } else {
      // Fallback: Initialize without credentials (limited functionality)
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'footageflow-151b6',
      });
      console.log('⚠️ Firebase Admin initialized without credentials (limited functionality)');
    }
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
    // Initialize with minimal config as fallback
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'footageflow-151b6',
    });
  }
}

class FirebaseAdminService {
  constructor() {
    this.auth = admin.auth();
  }

  // Verify Firebase ID token
  async verifyIdToken(idToken) {
    try {
      console.log('🔍 Attempting to verify Firebase ID token...');
      const decodedToken = await this.auth.verifyIdToken(idToken);
      console.log('✅ Firebase ID token verified successfully');

      return {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name,
        picture: decodedToken.picture,
        emailVerified: decodedToken.email_verified,
        provider: decodedToken.firebase.sign_in_provider
      };
    } catch (error) {
      console.error('❌ Error verifying Firebase ID token:', error.message);

      // If Firebase Admin is not properly configured, provide a fallback
      if (error.code === 'auth/project-not-found' || error.message.includes('credential')) {
        console.log('⚠️ Firebase Admin not properly configured, using fallback authentication');
        throw new Error('Firebase authentication not configured. Please use Google OAuth instead.');
      }

      throw new Error(`Invalid Firebase token: ${error.message}`);
    }
  }

  // Get user by UID
  async getUserByUid(uid) {
    try {
      const userRecord = await this.auth.getUser(uid);
      return {
        uid: userRecord.uid,
        email: userRecord.email,
        name: userRecord.displayName,
        picture: userRecord.photoURL,
        emailVerified: userRecord.emailVerified,
        provider: userRecord.providerData[0]?.providerId || 'firebase'
      };
    } catch (error) {
      console.error('Error getting user by UID:', error);
      throw new Error('User not found');
    }
  }

  // Create custom token (if needed)
  async createCustomToken(uid, additionalClaims = {}) {
    try {
      return await this.auth.createCustomToken(uid, additionalClaims);
    } catch (error) {
      console.error('Error creating custom token:', error);
      throw new Error('Failed to create custom token');
    }
  }
}

module.exports = new FirebaseAdminService();
