import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCgprGVaSGAo16kwxCjmZaQ0St-fXh6JJs",
  authDomain: "aura-75601.firebaseapp.com",
  projectId: "aura-75601",
  storageBucket: "aura-75601.firebasestorage.app",
  messagingSenderId: "1071239396934",
  appId: "1:1071239396934:web:1066250025564228f2d447",
  measurementId: "G-4VBXCHPSQ9"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Mevcut kullanıcı ID'sini getiren yardımcı fonksiyon
// (App.jsx tarafında giriş yapıldığında bu değer localStorage'a yazılacak)
export const getCurrentUserId = () => {
  return localStorage.getItem('lifeos_kullanici') || 'misafir';
};
