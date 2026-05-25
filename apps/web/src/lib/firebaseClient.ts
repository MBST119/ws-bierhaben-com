import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const devConfig = {
  projectId: "bierhaben-com-dev",
  appId: "1:701862115545:web:baa7da71bb41e1777e26c8",
  storageBucket: "bierhaben-com-dev.firebasestorage.app",
  apiKey: "AIzaSyCAlVqBwsL01LYiJLDrHUEqzcPeKLgHw5Q",
  authDomain: "bierhaben-com-dev.firebaseapp.com",
  messagingSenderId: "701862115545"
};

const prodConfig = {
  projectId: "bierhaben-com-prod",
  appId: "1:33740397108:web:0a640cfa6ac05a2b328861",
  storageBucket: "bierhaben-com-prod.firebasestorage.app",
  apiKey: "AIzaSyDeheFTcMDqhCf95OSX624m-Usqr9Xdu_M",
  authDomain: "bierhaben-com-prod.firebaseapp.com",
  messagingSenderId: "33740397108"
};

// Use environment variables if set, otherwise fallback to window checks for client
const isProd = process.env.NEXT_PUBLIC_ENV === 'production' || 
  (typeof window !== 'undefined' && (window.location.hostname.includes('bierhaben-com-prod') || window.location.hostname.includes('bierhaben-prod')));

const firebaseConfig = isProd ? prodConfig : devConfig;

// Initialize Firebase (prevent re-initialization in Next.js fast refresh)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
