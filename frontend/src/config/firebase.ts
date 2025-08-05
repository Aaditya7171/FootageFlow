import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCpH0FQWDRZUHIv04MymmwjGlsg4k4gLO0",
  authDomain: "footageflow-151b6.firebaseapp.com",
  projectId: "footageflow-151b6",
  storageBucket: "footageflow-151b6.appspot.com",
  messagingSenderId: "501666718854",
  appId: "1:501666718854:web:a1b2c3d4e5f6g7h8i9j0k1"
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
