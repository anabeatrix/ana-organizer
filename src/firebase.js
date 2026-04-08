import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDKKMD2qgp_WXIoZoDL9jTqaJlZJxXbY4Y",
  authDomain: "ana-organizer.firebaseapp.com",
  projectId: "ana-organizer",
  storageBucket: "ana-organizer.firebasestorage.app",
  messagingSenderId: "21585629064",
  appId: "1:21585629064:web:679b8a2f44e1b853f2343d",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
