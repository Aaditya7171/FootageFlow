import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
  UserCredential
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

export class FirebaseAuthService {
  private isSigningIn = false;

  // Convert Firebase User to our AuthUser interface
  private convertUser(user: User): AuthUser {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified
    };
  }

  // Sign in with Google
  async signInWithGoogle(): Promise<{ user: AuthUser; isNewUser: boolean }> {
    // Prevent multiple simultaneous sign-in attempts
    if (this.isSigningIn) {
      throw new Error('Sign-in already in progress. Please wait.');
    }

    this.isSigningIn = true;

    try {
      console.log('🔐 Starting Google sign-in...');

      // Configure provider with additional settings
      googleProvider.setCustomParameters({
        prompt: 'select_account',
        // Add parameters to help with CORS issues
        access_type: 'online',
        include_granted_scopes: 'true'
      });

      // Add a small delay to ensure proper initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      const result: UserCredential = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if this is a new user by looking at creation time
      const isNewUser = user.metadata.creationTime === user.metadata.lastSignInTime;

      return {
        user: this.convertUser(user),
        isNewUser
      };
    } catch (error: any) {
      console.error('Google sign-in error:', error);

      // Handle specific Firebase errors
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in was cancelled. Please try again.');
      } else if (error.code === 'auth/popup-blocked') {
        throw new Error('Pop-up was blocked by your browser. Please allow pop-ups and try again.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        throw new Error('Another sign-in attempt is in progress. Please wait.');
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error('Network error. Please check your connection and try again.');
      } else if (error.message && error.message.includes('Cross-Origin-Opener-Policy')) {
        throw new Error('Browser security settings are blocking the sign-in. Please try refreshing the page.');
      } else if (error.message && error.message.includes('window.closed')) {
        throw new Error('Sign-in window was closed. Please try again.');
      }

      throw new Error(this.getErrorMessage(error.code) || 'Google sign-in failed. Please try again.');
    } finally {
      this.isSigningIn = false;
    }
  }



  // Sign in with email and password
  async signInWithEmail(email: string, password: string): Promise<AuthUser> {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return this.convertUser(result.user);
    } catch (error: any) {
      console.error('Email sign-in error:', error);
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  // Create account with email and password
  async createAccountWithEmail(email: string, password: string): Promise<AuthUser> {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      return this.convertUser(result.user);
    } catch (error: any) {
      console.error('Account creation error:', error);
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw new Error('Failed to sign out');
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  // Get ID token
  async getIdToken(): Promise<string | null> {
    const user = auth.currentUser;
    if (user) {
      return await user.getIdToken();
    }
    return null;
  }

  // Listen to auth state changes
  onAuthStateChanged(callback: (user: User | null) => void) {
    return auth.onAuthStateChanged(callback);
  }

  // Convert Firebase error codes to user-friendly messages
  private getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters long.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in was cancelled. Please try again.';
      case 'auth/popup-blocked':
        return 'Pop-up was blocked by your browser. Please allow pop-ups and try again.';
      case 'auth/cancelled-popup-request':
        return 'Sign-in was cancelled. Please try again.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection and try again.';
      default:
        return 'An error occurred during authentication. Please try again.';
    }
  }
}

export const firebaseAuthService = new FirebaseAuthService();
