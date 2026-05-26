'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  MessageSquare, User, LogIn, LogOut, Settings, Menu, X, Home, 
  Search, PlusCircle, UserCircle, ChevronDown, Sparkles, UploadCloud, Loader2 
} from 'lucide-react';
import { Button, buttonVariants } from './ui/button';
import { Input } from './ui/input';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, app } from '@/lib/firebaseClient';
import { fetchSuggestionCategories, SuggestionCategory } from '@/lib/suggestionSettings';

export function Navbar() {
  const { user, userProfile, loading: authLoading, logout } = useAuth();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Dropdown & Modal States
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);

  // Suggestion Form State
  const [suggestionTitle, setSuggestionTitle] = useState('');
  const [suggestionText, setSuggestionText] = useState('');
  const [suggestionCategory, setSuggestionCategory] = useState('');
  const [suggestionImages, setSuggestionImages] = useState<File[]>([]);
  const [isSubmittingSuggestion, setIsSubmittingSuggestion] = useState(false);
  const [suggestionCats, setSuggestionCats] = useState<SuggestionCategory[]>([]);
  const [recaptchaToken, setRecaptchaToken] = useState('');
  const enableRecaptcha = true;

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch suggestion categories and load/render reCAPTCHA on modal open
  useEffect(() => {
    if (!showSuggestionModal) {
      setRecaptchaToken('');
      return;
    }

    fetchSuggestionCategories().then((cats) => {
      setSuggestionCats(cats);
      if (cats.length > 0) {
        setSuggestionCategory(cats[0].id);
      }
    });

    if (!enableRecaptcha) return;

    const loadAndRenderRecaptcha = () => {
      if ((window as any).grecaptcha) {
        renderRecaptcha();
      } else {
        const existingScript = document.getElementById('recaptcha-script');
        if (!existingScript) {
          const script = document.createElement('script');
          script.id = 'recaptcha-script';
          script.src = 'https://www.google.com/recaptcha/api.js?onload=onloadCallbackSuggestion&render=explicit';
          script.async = true;
          script.defer = true;
          document.body.appendChild(script);

          (window as any).onloadCallbackSuggestion = () => {
            renderRecaptcha();
          };
        } else {
          // If script exists but onload wasn't fired for suggestions
          // Wait briefly then try rendering
          setTimeout(renderRecaptcha, 500);
        }
      }
    };

    const renderRecaptcha = () => {
      const container = document.getElementById('recaptcha-suggestion-container');
      if (container && (window as any).grecaptcha) {
        try {
          container.innerHTML = '';
          const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '6LcNUf0sAAAAAORSPXOF0FuZh-iH9aOaEDprsejj';
          (window as any).grecaptcha.render('recaptcha-suggestion-container', {
            sitekey: siteKey,
            callback: (token: string) => {
              setRecaptchaToken(token);
            },
            'expired-callback': () => {
              setRecaptchaToken('');
            }
          });
        } catch (e) {
          console.warn("reCAPTCHA suggestion rendering issue:", e);
        }
      }
    };

    // Small delay to ensure the container div is mounted before rendering
    const timer = setTimeout(() => {
      loadAndRenderRecaptcha();
    }, 150);

    return () => {
      clearTimeout(timer);
      delete (window as any).onloadCallbackSuggestion;
    };
  }, [showSuggestionModal]);

  // Close menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }
    const q = query(collection(db, 'chats'), where('participantIds', 'array-contains', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let count = 0;
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        count += (user && data.unreadCounts?.[user.uid]) || 0;
      });
      setUnreadCount(count);
    }, (err) => console.error('Fehler beim Abrufen der Nachrichten:', err));
    return () => unsubscribe();
  }, [user]);

  const isActive = (path: string) => pathname === path;

  const navLinkClass = (path: string) =>
    `flex items-center gap-3 px-5 py-4 rounded-2xl text-lg font-semibold transition-all duration-200 ${
      isActive(path)
        ? 'bg-primary/15 text-primary'
        : 'text-foreground hover:bg-white/10'
    }`;

  const handleSubmitSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("Bitte melde dich an, um einen Verbesserungsvorschlag zu machen.");
      return;
    }
    if (!suggestionTitle.trim() || !suggestionText.trim()) {
      alert("Bitte fülle alle erforderlichen Felder aus.");
      return;
    }
    if (enableRecaptcha && !recaptchaToken) {
      alert("Bitte bestätige das Re-CAPTCHA.");
      return;
    }
    setIsSubmittingSuggestion(true);
    try {
      if (enableRecaptcha && recaptchaToken) {
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const functions = getFunctions(app, 'europe-west1');
        const verifyRecaptcha = httpsCallable(functions, 'verifyRecaptcha');
        try {
          await verifyRecaptcha({ token: recaptchaToken });
        } catch (verifyErr: any) {
          const message = verifyErr?.message || 'reCAPTCHA-Verifizierung fehlgeschlagen.';
          alert(message);
          setIsSubmittingSuggestion(false);
          if ((window as any).grecaptcha) {
            try {
              (window as any).grecaptcha.reset();
            } catch (e) {}
            setRecaptchaToken('');
          }
          return;
        }
      }

      const suggestionId = doc(collection(db, 'suggestions')).id;
      const uploadedImageUrls: string[] = [];

      // Upload files if any
      for (const file of suggestionImages) {
        const fileRef = ref(storage, `suggestions/${suggestionId}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(fileRef, file);
        const url = await getDownloadURL(snapshot.ref);
        uploadedImageUrls.push(url);
      }

      // Save suggestion doc to Firestore
      await setDoc(doc(db, 'suggestions', suggestionId), {
        id: suggestionId,
        title: suggestionTitle.trim(),
        text: suggestionText.trim(),
        categoryId: suggestionCategory,
        images: uploadedImageUrls,
        userId: user.uid,
        userName: userProfile?.displayName || user.displayName || user.email?.split('@')[0] || "Anonymer User",
        createdAt: new Date(),
        isRead: false,
        status: 'pending'
      });

      alert("Vielen Dank für deinen Verbesserungsvorschlag!");
      // Reset form states
      setSuggestionTitle('');
      setSuggestionText('');
      setSuggestionImages([]);
      if ((window as any).grecaptcha) {
        try {
          (window as any).grecaptcha.reset();
        } catch (e) {}
      }
      setRecaptchaToken('');
      setShowSuggestionModal(false);
    } catch (err: any) {
      console.error("Fehler beim Senden des Vorschlags:", err);
      alert("Fehler beim Senden: " + err.message);
      if ((window as any).grecaptcha) {
        try {
          (window as any).grecaptcha.reset();
        } catch (e) {}
        setRecaptchaToken('');
      }
    } finally {
      setIsSubmittingSuggestion(false);
    }
  };

  return (
    <>
      {/* ── Desktop + Mobile Top Bar ── */}
      <nav className="w-full h-16 md:h-20 px-4 md:px-8 flex items-center justify-between bg-transparent relative z-40 border-b border-border/10">
        
        {/* Logo */}
        <Link href="/" className="flex items-center shrink-0">
          <Logo size="sm" />
        </Link>

        {/* Desktop: center nav links */}
        <div className="hidden md:flex items-center space-x-8">
          <Link href="/" className={`font-semibold text-sm transition-colors duration-200 ${isActive('/') ? 'text-primary' : 'text-secondary dark:text-foreground/80 hover:text-primary'}`}>
            Home
          </Link>
          <Link href="/angebote" className={`font-semibold text-sm transition-colors duration-200 ${isActive('/angebote') ? 'text-primary' : 'text-secondary dark:text-foreground/80 hover:text-primary'}`}>
            Angebote durchsuchen
          </Link>
          <a href="/inserieren" className={`font-semibold text-sm transition-all duration-200 px-5 py-2 rounded-full shadow-sm active:scale-95 active:opacity-90 ${isActive('/inserieren') ? 'bg-primary/10 text-primary border border-primary/30' : 'bg-secondary hover:bg-secondary/90 dark:bg-foreground dark:hover:bg-foreground/90 text-white dark:text-background'}`}>
            Inserat erstellen
          </a>
        </div>

        {/* Desktop: user actions */}
        <div className="hidden md:flex items-center space-x-4 md:space-x-6">
          {authLoading ? (
            <div className="w-24 h-9 bg-muted rounded-full animate-pulse" />
          ) : user ? (
            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-border/60 hover:border-primary/40 bg-card active:scale-95 transition-all text-secondary dark:text-foreground/90 font-semibold text-sm shadow-sm"
              >
                {userProfile?.photoURL || user.photoURL ? (
                  <img src={userProfile?.photoURL || user.photoURL || ''} alt="Profile" className="w-7 h-7 rounded-full border border-border/50" />
                ) : (
                  <User className="w-4 h-4" />
                )}
                <span className="truncate max-w-[100px]">{userProfile?.displayName || user.displayName || 'Profil'}</span>
                {unreadCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-red-500 ring-2 ring-background animate-pulse" />
                )}
                <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2.5 w-60 bg-white dark:bg-card border border-border/80 shadow-lg rounded-2xl py-2 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
                  {/* Item: Nachrichten */}
                  <a 
                    href="/nachrichten" 
                    onClick={() => setUserMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-colors ${isActive('/nachrichten') ? 'text-primary bg-primary/5' : 'text-secondary dark:text-foreground/80 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                  >
                    <div className="relative flex items-center justify-center">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <span>Nachrichten</span>
                  </a>

                  {/* Item: App-Einstellungen */}
                  {userProfile?.role === 'superAdmin' && (
                    <a 
                      href="/admin" 
                      onClick={() => setUserMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-colors ${isActive('/admin') ? 'text-primary bg-primary/5' : 'text-secondary dark:text-foreground/80 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                    >
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      <span>App-Einstellungen</span>
                    </a>
                  )}

                  {/* Item: Mein Profil */}
                  <a 
                    href="/profil" 
                    onClick={() => setUserMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-colors ${isActive('/profil') ? 'text-primary bg-primary/5' : 'text-secondary dark:text-foreground/80 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                  >
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>Mein Profil</span>
                  </a>

                  {/* Item: Verbesserungsvorschlag */}
                  <button 
                    type="button"
                    onClick={() => { setUserMenuOpen(false); setShowSuggestionModal(true); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-secondary dark:text-foreground/80 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-left transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-muted-foreground" />
                    <span>Verbesserungsvorschlag</span>
                  </button>

                  <div className="my-1.5 border-t border-border/40" />

                  {/* Item: Abmelden */}
                  <button 
                    type="button"
                    onClick={() => { logout(); setUserMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10 text-left transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-destructive" />
                    <span>Abmelden</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <a href="/login" className={`${buttonVariants({ variant: 'default', className: 'bg-secondary text-white hover:bg-secondary/90 dark:bg-foreground dark:text-background dark:hover:bg-foreground/90 rounded-full px-5 py-2 text-sm font-semibold shadow-sm' })} active:scale-95 active:opacity-90`}>
              <LogIn className="w-4 h-4 mr-2 pointer-events-none" />
              Anmelden
            </a>
          )}
        </div>

        {/* Mobile: right side – notification dot + hamburger */}
        <div className="flex md:hidden items-center gap-3">
          {user && unreadCount > 0 && (
            <a href="/nachrichten" className="relative">
              <MessageSquare className="w-5 h-5 text-secondary dark:text-foreground/80 pointer-events-none" />
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white dark:ring-background pointer-events-none">
                {unreadCount}
              </span>
            </a>
          )}
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Menü öffnen"
            className="p-2 rounded-xl text-secondary dark:text-foreground hover:bg-muted transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {/* ── Mobile Fullscreen Overlay Menu ── */}
      {/* Backdrop */}
      <div
        onClick={() => setMobileOpen(false)}
        className={`md:hidden fixed inset-0 z-40 transition-all duration-300 ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ background: 'rgba(0,38,77,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      />

      {/* Slide-in panel */}
      <div
        className={`md:hidden fixed top-0 right-0 bottom-0 z-50 w-full transition-transform duration-300 ease-in-out flex flex-col ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ background: 'rgba(234,244,252,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/20">
          <Logo size="sm" />
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Menü schließen"
            className="p-2 rounded-xl text-secondary hover:bg-black/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation links */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">

          {/* User greeting */}
          {user && (
            <div className="flex items-center gap-3 px-5 py-4 mb-4 bg-primary/10 rounded-2xl">
              {userProfile?.photoURL || user.photoURL ? (
                <img src={userProfile?.photoURL || user.photoURL || ''} alt="Profile" className="w-10 h-10 rounded-full border-2 border-primary/30" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <UserCircle className="w-6 h-6 text-primary" />
                </div>
              )}
              <div>
                <p className="font-bold text-secondary text-sm">{userProfile?.displayName || user.displayName || 'Profil'}</p>
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">{user.email}</p>
              </div>
            </div>
          )}

          <a href="/" className={`${navLinkClass('/')} active:scale-95 active:opacity-90`}>
            <Home className="w-5 h-5 shrink-0 pointer-events-none" />
            Home
          </a>
          <a href="/angebote" className={`${navLinkClass('/angebote')} active:scale-95 active:opacity-90`}>
            <Search className="w-5 h-5 shrink-0 pointer-events-none" />
            Angebote durchsuchen
          </a>
          <a href="/inserieren" className={`${navLinkClass('/inserieren')} active:scale-95 active:opacity-90`}>
            <PlusCircle className="w-5 h-5 shrink-0 pointer-events-none" />
            Inserat erstellen
          </a>

          {user && (
            <>
              <div className="my-4 border-t border-border/30" />
              <a href="/nachrichten" className={`${navLinkClass('/nachrichten')} active:scale-95 active:opacity-90`}>
                <div className="relative pointer-events-none">
                  <MessageSquare className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </div>
                Nachrichten
                {unreadCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full pointer-events-none">{unreadCount}</span>
                )}
              </a>
              <a href="/profil" className={`${navLinkClass('/profil')} active:scale-95 active:opacity-90`}>
                <User className="w-5 h-5 shrink-0 pointer-events-none" />
                Mein Profil
              </a>
              {userProfile?.role === 'superAdmin' && (
                <a href="/admin" className={`${navLinkClass('/admin')} active:scale-95 active:opacity-90`}>
                  <Settings className="w-5 h-5 shrink-0 pointer-events-none" />
                  App-Einstellungen
                </a>
              )}
              {/* Mobile Item: Verbesserungsvorschlag */}
              <button 
                type="button"
                onClick={() => { setMobileOpen(false); setShowSuggestionModal(true); }}
                className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-lg font-semibold text-foreground hover:bg-white/10 active:scale-95 active:opacity-90 transition-all text-left"
              >
                <Sparkles className="w-5 h-5 shrink-0 pointer-events-none text-muted-foreground" />
                Verbesserungsvorschlag
              </button>
            </>
          )}
        </div>

        {/* Bottom actions */}
        <div className="px-4 pb-8 pt-4 border-t border-border/20 space-y-3">
          {authLoading ? (
            <div className="w-full h-12 bg-muted rounded-2xl animate-pulse" />
          ) : user ? (
            <button
              onClick={() => { logout(); setMobileOpen(false); }}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-destructive/10 text-destructive font-semibold text-base hover:bg-destructive/20 transition-all active:scale-95 active:opacity-90"
            >
              <LogOut className="w-5 h-5 pointer-events-none" />
              Abmelden
            </button>
          ) : (
            <a
              href="/login"
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-white font-bold text-base hover:bg-primary/90 transition-all active:scale-95 active:opacity-90 shadow-lg shadow-primary/20"
            >
              <LogIn className="w-5 h-5 pointer-events-none" />
              Anmelden
            </a>
          )}
        </div>
      </div>

      {/* SUGGESTION MODAL OVERLAY */}
      {showSuggestionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-card w-full max-w-lg rounded-2xl shadow-xl border border-border overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-border/80 flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="w-5 h-5 pointer-events-none" />
                <h3 className="font-extrabold text-xl text-secondary dark:text-foreground">Verbesserungsvorschlag machen</h3>
              </div>
              <button 
                onClick={() => setShowSuggestionModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmitSuggestion} className="p-6 overflow-y-auto space-y-5 flex-1 text-left">
              
              {/* Category */}
              <div className="space-y-2">
                <label htmlFor="suggestCat" className="text-sm font-bold text-secondary dark:text-foreground uppercase tracking-wide">Kategorie *</label>
                <select 
                  id="suggestCat"
                  value={suggestionCategory}
                  onChange={(e) => setSuggestionCategory(e.target.value)}
                  className="w-full h-12 bg-transparent border border-input rounded-xl px-3 outline-none focus:ring-1 focus:ring-primary text-secondary dark:text-foreground font-semibold"
                  required
                >
                  {suggestionCats.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.emoji} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <label htmlFor="suggestTitle" className="text-sm font-bold text-secondary dark:text-foreground uppercase tracking-wide">Titel *</label>
                <Input 
                  id="suggestTitle" 
                  value={suggestionTitle}
                  onChange={(e) => setSuggestionTitle(e.target.value)}
                  required
                  placeholder="Kurzer, beschreibender Titel"
                  className="h-12 rounded-xl border-input focus-visible:ring-primary"
                />
              </div>

              {/* Text */}
              <div className="space-y-2">
                <label htmlFor="suggestText" className="text-sm font-bold text-secondary dark:text-foreground uppercase tracking-wide">Beschreibung *</label>
                <textarea 
                  id="suggestText" 
                  value={suggestionText}
                  onChange={(e) => setSuggestionText(e.target.value)}
                  required
                  placeholder="Beschreibe deinen Vorschlag im Detail..."
                  className="w-full min-h-[120px] rounded-xl text-base px-3 py-2 border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-primary text-secondary dark:text-foreground"
                />
              </div>

              {/* Image upload */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-secondary dark:text-foreground uppercase tracking-wide block">Bilder hinzufügen (Optional)</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border/80 hover:border-primary/50 rounded-2xl cursor-pointer bg-slate-50/50 hover:bg-slate-50 dark:bg-card dark:hover:bg-slate-800/25 transition-all">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <UploadCloud className="w-8 h-8 text-muted-foreground mb-2 pointer-events-none" />
                      <p className="text-sm text-muted-foreground font-semibold">Klicken zum Hochladen</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">PNG, JPG bis zu 5MB</p>
                    </div>
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*" 
                      onChange={(e) => {
                        if (e.target.files) {
                          setSuggestionImages(prev => [...prev, ...Array.from(e.target.files!)]);
                        }
                      }}
                      className="hidden" 
                    />
                  </label>
                </div>
                
                {/* Images preview list */}
                {suggestionImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {suggestionImages.map((img, index) => (
                      <div key={index} className="relative w-16 h-16 rounded-xl overflow-hidden border border-border">
                        <img 
                          src={URL.createObjectURL(img)} 
                          alt="" 
                          className="w-full h-full object-cover" 
                        />
                        <button 
                          type="button"
                          onClick={() => setSuggestionImages(prev => prev.filter((_, i) => i !== index))}
                          className="absolute top-1 right-1 p-0.5 bg-black/70 hover:bg-black text-white rounded-full transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* reCAPTCHA */}
              {enableRecaptcha && (
                <div className="flex justify-center py-2">
                  <div id="recaptcha-suggestion-container"></div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 pt-4 border-t border-border/40">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowSuggestionModal(false)}
                  className="flex-1 h-12 rounded-xl font-bold border-border/80 text-secondary dark:text-foreground"
                >
                  Abbrechen
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmittingSuggestion}
                  className="flex-1 h-12 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmittingSuggestion ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Wird gesendet...
                    </>
                  ) : (
                    'Vorschlag absenden'
                  )}
                </Button>
              </div>

            </form>
          </div>
        </div>
      )}
    </>
  );
}
