'use client';

import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import { RefreshCw, AlertTriangle, CheckCircle, X } from 'lucide-react';

export function EmailVerificationBanner() {
  const { user, refreshUser } = useAuth();
  const [resending, setResending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!user || user.emailVerified) return null;

  const handleResend = async () => {
    setResending(true);
    setMessage('');
    setError('');
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setMessage('Verifizierungs-E-Mail wurde erneut gesendet. Bitte überprüfe deinen Posteingang.');
      } else {
        throw new Error('Benutzer nicht gefunden.');
      }
    } catch (err: any) {
      setError(err.message || 'Fehler beim Senden der Verifizierungs-E-Mail.');
    } finally {
      setResending(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setMessage('');
    setError('');
    try {
      await refreshUser?.();
      if (auth.currentUser?.emailVerified) {
        setMessage('E-Mail erfolgreich verifiziert!');
      } else {
        setError('E-Mail-Adresse ist noch nicht verifiziert. Bitte klicke auf den Link in der E-Mail.');
      }
    } catch (err: any) {
      setError(err.message || 'Fehler beim Aktualisieren des Verifizierungsstatus.');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="w-full bg-amber-500/10 border-b border-amber-500/20 px-4 py-3 text-amber-800 dark:text-amber-400 text-sm relative z-20 flex flex-col md:flex-row items-center justify-between gap-3 shadow-inner">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
        <span className="font-medium text-center md:text-left">
          Bitte verifiziere deine E-Mail-Adresse, um alle Funktionen von bierhaben.com nutzen zu können (Inserieren, Nachrichten, Profilpflege).
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={handleResend}
          disabled={resending}
          className="text-xs font-bold underline hover:text-amber-700 dark:hover:text-amber-300 disabled:opacity-50 transition-colors"
        >
          {resending ? 'Sende...' : 'E-Mail erneut senden'}
        </button>
        <span className="text-amber-500/40">|</span>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1 text-xs font-bold underline hover:text-amber-700 dark:hover:text-amber-300 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Prüfe...' : 'Status aktualisieren'}
        </button>
      </div>

      {(message || error) && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 z-50 bg-card border border-border/80 rounded-xl shadow-lg py-2 px-4 flex items-center gap-2 max-w-sm text-xs animate-in fade-in slide-in-from-top-2 duration-200">
          {message ? (
            <>
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-foreground">{message}</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <span className="text-destructive font-medium">{error}</span>
            </>
          )}
          <button onClick={() => { setMessage(''); setError(''); }} className="text-muted-foreground hover:text-foreground ml-1">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
