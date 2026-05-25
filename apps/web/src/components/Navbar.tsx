'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, User, LogIn, LogOut } from 'lucide-react';
import { buttonVariants } from './ui/button';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';

export function Navbar() {
  const { user, userProfile, logout } = useAuth();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  const isHome = pathname === '/';
  const isAngebote = pathname === '/angebote';
  const isInserieren = pathname === '/inserieren';

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const q = query(
      collection(db, 'chats'),
      where('participantIds', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let count = 0;
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const chatUnread = (user && data.unreadCounts?.[user.uid]) || 0;
        count += chatUnread;
      });
      setUnreadCount(count);
    }, (err) => {
      console.error("Fehler beim Abrufen der ungeladenen Nachrichten:", err);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <nav className="w-full h-20 px-4 md:px-8 flex items-center justify-between bg-transparent relative z-10 border-b border-border/10">
      {/* Logo Area */}
      <Link href="/" className="flex items-center">
        <Logo size="sm" />
      </Link>

      {/* Main Navigation */}
      <div className="hidden md:flex items-center space-x-8">
        <Link
          href="/"
          className={`font-semibold text-sm transition-colors duration-200 ${
            isHome ? 'text-primary' : 'text-secondary dark:text-foreground/80 hover:text-primary'
          }`}
        >
          Home
        </Link>
        <Link
          href="/angebote"
          className={`font-semibold text-sm transition-colors duration-200 ${
            isAngebote ? 'text-primary' : 'text-secondary dark:text-foreground/80 hover:text-primary'
          }`}
        >
          Angebote durchsuchen
        </Link>
        <Link
          href="/inserieren"
          className={`font-semibold text-sm transition-all duration-200 px-5 py-2 rounded-full shadow-sm ${
            isInserieren
              ? 'bg-primary/10 text-primary border border-primary/30'
              : 'bg-secondary hover:bg-secondary/90 dark:bg-foreground dark:hover:bg-foreground/90 text-white dark:text-background'
          }`}
        >
          Inserat erstellen
        </Link>
      </div>

      {/* User / Actions */}
      <div className="flex items-center space-x-4 md:space-x-6">
        {user ? (
          <>
            <Link
              href="/nachrichten"
              className={`flex items-center font-semibold text-sm transition-colors duration-200 ${
                pathname === '/nachrichten' ? 'text-primary' : 'text-secondary dark:text-foreground/80 hover:text-primary'
              }`}
            >
              <div className="relative mr-1.5 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white dark:ring-background animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline">Nachrichten</span>
            </Link>
            <div className="flex items-center space-x-3 md:space-x-4">
              <Link
                href="/profil"
                className={`flex items-center font-semibold text-sm transition-colors duration-200 ${
                  pathname === '/profil' ? 'text-primary' : 'text-secondary dark:text-foreground/80 hover:text-primary'
                }`}
              >
                {userProfile?.photoURL || user.photoURL ? (
                  <img src={userProfile?.photoURL || user.photoURL || ''} alt="Profile" className="w-7 h-7 rounded-full mr-2 border border-border/50" />
                ) : (
                  <User className="w-4.5 h-4.5 mr-1.5" />
                )}
                <span className="truncate max-w-[120px]">{userProfile?.displayName || user.displayName || 'Profil'}</span>
              </Link>
              <button
                onClick={logout}
                className="text-muted-foreground hover:text-destructive transition-colors duration-200 p-1 rounded-full hover:bg-muted"
                aria-label="Abmelden"
              >
                <LogOut className="w-4.5 h-4.5" />
              </button>
            </div>
          </>
        ) : (
          <Link
            href="/login"
            className={buttonVariants({
              variant: "default",
              className: "bg-secondary text-white hover:bg-secondary/90 dark:bg-foreground dark:text-background dark:hover:bg-foreground/90 rounded-full px-5 py-2 text-sm font-semibold shadow-sm"
            })}
          >
            <LogIn className="w-4 h-4 mr-2" />
            Anmelden
          </Link>
        )}
      </div>
    </nav>
  );
}
