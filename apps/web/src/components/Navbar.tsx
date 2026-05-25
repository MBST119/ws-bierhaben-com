'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, User, LogIn, LogOut } from 'lucide-react';
import { buttonVariants } from './ui/button';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';

export function Navbar() {
  const { user, userProfile, logout } = useAuth();
  const pathname = usePathname();

  const isHome = pathname === '/';
  const isAngebote = pathname === '/angebote';
  const isInserieren = pathname === '/inserieren';

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
              <MessageSquare className="w-4.5 h-4.5 mr-1.5" />
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
