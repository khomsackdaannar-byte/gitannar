// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDGX0u82vMu_3CTxrhrII0EB910YeyRTgc",
  authDomain: "annar-7d24a.firebaseapp.com",
  projectId: "annar-7d24a",
  storageBucket: "annar-7d24a.firebasestorage.app",
  messagingSenderId: "189343299994",
  appId: "1:189343299994:web:0942b6e34e6dde0ecaa223",
  measurementId: "G-W0CER3PK94"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const storage = getStorage(app);
export const db = getFirestore(app);
export default app;