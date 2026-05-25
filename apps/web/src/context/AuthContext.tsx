'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  sendEmailVerification,
  reload
} from 'firebase/auth';
import { auth, db } from '@/lib/firebaseClient';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { UserProfile } from '@/types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Save/Update user in Firestore users collection
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          const profileData = {
            displayName: currentUser.displayName || currentUser.email?.split('@')[0] || "Anonymer User",
            email: currentUser.email || '',
            photoURL: currentUser.photoURL,
            createdAt: new Date(),
          };
          await setDoc(userRef, profileData);
          setUserProfile({ uid: currentUser.uid, ...profileData } as any);
        } else {
          const data = userSnap.data();
          setUserProfile({ uid: currentUser.uid, ...data } as any);
          
          // Keep Auth user displayName updated if it differs or is missing
          if (data.displayName && currentUser.displayName !== data.displayName) {
            try {
              await updateProfile(currentUser, { displayName: data.displayName });
            } catch (err) {
              console.warn("Could not sync Auth displayName:", err);
            }
          }
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signInWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    const { user: newUser } = await createUserWithEmailAndPassword(auth, email, pass);
    
    // Immediately set displayName on the Firebase Auth user object
    await updateProfile(newUser, { displayName: name });
    
    // Create firestore record for the new email user manually here, 
    // to ensure displayName is saved correctly right after sign up
    const userRef = doc(db, 'users', newUser.uid);
    const profileData = {
      displayName: name,
      email: newUser.email || '',
      photoURL: null,
      createdAt: new Date(),
    };
    await setDoc(userRef, profileData);
    setUserProfile({ uid: newUser.uid, ...profileData } as any);

    // Send email verification
    try {
      await sendEmailVerification(newUser);
    } catch (verifErr) {
      console.error("Error sending verification email during sign up:", verifErr);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const refreshUser = async () => {
    if (auth.currentUser) {
      await reload(auth.currentUser);
      // Force status update on React state
      setUser({ ...auth.currentUser });

      // Refresh firestore profile too
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setUserProfile({ uid: auth.currentUser.uid, ...userSnap.data() } as any);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
