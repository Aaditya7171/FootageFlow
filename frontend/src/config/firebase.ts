import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyBBXdO8fhegyZDCyHIxbcBZng1WWQ4mS2c",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "footageflow-151b6.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "footageflow-151b6",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "footageflow-151b6.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "868268917843",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:868268917843:web:a1b2c3d4e5f6g7h8i9j0k1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export default app;
