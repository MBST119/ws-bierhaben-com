'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button, buttonVariants } from '@/components/ui/button';
import { MessageSquare, ArrowLeft, ShieldCheck, Heart } from 'lucide-react';
import Link from 'next/link';
import { Listing, UserProfile } from '@/types';


export default function InseratDetailPage() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  
  const [listingId, setListingId] = useState<string | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [sellerProfile, setSellerProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  // Parse ID parameter safely client-side to prevent Next.js build-time deoptimization
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const idParam = params.get('id');
      if (idParam) {
        setListingId(idParam);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const fetchListing = async () => {
      if (!listingId) return;
      try {
        const docRef = doc(db, 'listings', listingId);
        const docSnap = await getDoc(docRef);
        
        let loadedListing: Listing | null = null;
        if (docSnap.exists()) {
          loadedListing = { id: docSnap.id, ...docSnap.data() } as Listing;
        } else {
          console.log("No such listing document!");
        }

        if (loadedListing) {
          setListing(loadedListing);

          // Fetch seller details from users collection
          try {
            const sellerDocRef = doc(db, 'users', loadedListing.sellerId);
            const sellerSnap = await getDoc(sellerDocRef);
            if (sellerSnap.exists()) {
              setSellerProfile(sellerSnap.data() as UserProfile);
            } else {
              // Fallback seller profile from listing details
              setSellerProfile({
                uid: loadedListing.sellerId,
                displayName: loadedListing.sellerName || "Anonymer User",
                email: "Kontakt über Chat",
                photoURL: loadedListing.sellerPhotoURL || null,
                createdAt: loadedListing.createdAt || { toDate: () => new Date() },
                listingsCount: 1
              } as any);
            }
          } catch (e) {
            console.error("Error fetching seller profile:", e);
            // Fallback safety
            setSellerProfile({
              uid: loadedListing.sellerId,
              displayName: loadedListing.sellerName || "Anonymer User",
              email: "Kontakt über Chat",
              photoURL: loadedListing.sellerPhotoURL || null,
              createdAt: loadedListing.createdAt || { toDate: () => new Date() },
              listingsCount: 1
            } as any);
          }
        }
      } catch (error) {
        console.error("Error fetching listing:", error);
      } finally {
        setLoading(false);
      }
    };

    if (listingId) {
      fetchListing();
    }
  }, [listingId]);

  const handleContactSeller = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!listing) return;

    // Don't chat with yourself
    if (user.uid === listing.sellerId) {
      alert("Das ist dein eigenes Inserat!");
      return;
    }

    // Generate a unique chat ID based on the listing and the two users
    const chatId = `${listing.id}_${user.uid}_${listing.sellerId}`;
    
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);

    if (!chatSnap.exists()) {
      // Create new chat document
      await setDoc(chatRef, {
        listingId: listing.id,
        listingTitle: listing.title,
        participantIds: [user.uid, listing.sellerId],
        participantNames: {
          [user.uid]: userProfile?.displayName || user.displayName || user.email || "Anonymer User",
          [listing.sellerId]: sellerProfile?.displayName || listing.sellerName || "Anonymer User"
        },
        unreadCounts: {
          [user.uid]: 0,
          [listing.sellerId]: 1
        },
        lastMessage: "Tausch-Chat gestartet",
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
    }

    // Redirect to chat page
    router.push(`/nachrichten?chat=${chatId}`);
  };

  const getUnitName = (unit: string, price: number) => {
    const plural = price > 1;
    switch (unit) {
      case 'flasche': return fontName(plural ? 'Flaschen' : 'Flasche');
      case 'kiste': return plural ? 'Kisten' : 'Kiste';
      case 'dose': return plural ? 'Dosen' : 'Dose';
      default: return 'Einheiten';
    }
  };

  const fontName = (val: string) => val;

  const getUnitEmoji = (unit: string) => {
    switch (unit) {
      case 'flasche': return '🍺';
      case 'kiste': return '🍻';
      case 'dose': return '🥫';
      default: return '🥤';
    }
  };

  if (loading) {
    return (
      <div className="w-full h-[calc(100vh-5rem)] flex justify-center items-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="w-full max-w-4xl mx-auto pt-16 px-4 text-center">
        <h1 className="text-3xl font-bold text-foreground mb-4">Inserat nicht gefunden</h1>
        <Link href="/angebote" className={buttonVariants({ variant: "default" })}>
          Zurück zur Übersicht
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto pt-8 px-4 pb-24 bg-background">
      
      {/* Back button */}
      <Link href="/angebote" className="inline-flex items-center text-secondary/70 hover:text-secondary dark:text-foreground/75 dark:hover:text-foreground mb-6 font-semibold transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Zurück zur Suche
      </Link>

      {/* Listing Title */}
      <h1 className="text-3xl md:text-4xl font-extrabold text-secondary dark:text-foreground mb-6 tracking-tight">
        {listing.title}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        
        {/* Left column: Images gallery */}
        <div className="lg:col-span-2 space-y-4">
          <div className="w-full aspect-[4/3] bg-white dark:bg-card rounded-2xl overflow-hidden border border-border/80 flex items-center justify-center relative shadow-sm">
            {listing.images && listing.images.length > 0 ? (
              <img 
                src={listing.images[activeImage]} 
                alt={listing.title} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground/60 select-none">
                <span className="text-5xl">📸</span>
                <span className="text-sm font-semibold uppercase tracking-wider">Keine Bilder vorhanden</span>
              </div>
            )}
          </div>
          
          {/* Thumbnails list */}
          {listing.images && listing.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {listing.images.map((img, idx) => (
                <button 
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                    activeImage === idx ? 'border-primary' : 'border-transparent hover:border-primary/50'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right column: Action panel, seller card, stats & details */}
        <div className="flex flex-col space-y-6">
          
          {/* Price Box */}
          <div className="bg-white dark:bg-card border border-border/85 rounded-2xl p-6 shadow-sm">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-2">Tauschwert</span>
            
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border/40">
              <span className="text-5xl font-black text-primary leading-none">{listing.beerPrice}x</span>
              <span className="text-2xl leading-none">{getUnitEmoji(listing.beerUnit)}</span>
              <span className="text-xl font-bold text-secondary dark:text-foreground/90 uppercase tracking-wide">
                {getUnitName(listing.beerUnit, listing.beerPrice)}
              </span>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleContactSeller}
                size="lg" 
                className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl py-6 text-lg font-bold shadow-md shadow-primary/25 transition-all"
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                Anfragen / Chat starten
              </Button>
            </div>
          </div>

          {/* Seller Metadata */}
          <div className="bg-white dark:bg-card border border-border/85 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-extrabold text-base text-secondary dark:text-foreground/90 uppercase tracking-wide">Über den Verkäufer</h3>
            <div className="flex items-center gap-4">
              {listing.sellerPhotoURL ? (
                <img src={listing.sellerPhotoURL} alt={listing.sellerName} className="w-12 h-12 rounded-full border border-border/60" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-lg font-black">
                  {listing.sellerName?.charAt(0) || '?'}
                </div>
              )}
              <div>
                <p className="font-bold text-secondary dark:text-foreground text-base leading-tight">{listing.sellerName}</p>
                <div className="flex items-center text-xs text-green-600 font-semibold mt-1">
                  <ShieldCheck className="w-4 h-4 mr-1 shrink-0" />
                  Geprüftes Mitglied
                </div>
              </div>
            </div>
            
            <div className="border-t border-border/40 pt-4 space-y-2 text-xs text-muted-foreground">
              {sellerProfile?.email && (
                <div className="flex justify-between">
                  <span>E-Mail:</span>
                  <span className="font-semibold text-secondary dark:text-foreground truncate max-w-[180px]">{sellerProfile.email}</span>
                </div>
              )}
              {sellerProfile?.createdAt && (
                <div className="flex justify-between">
                  <span>Mitglied seit:</span>
                  <span className="font-semibold text-secondary dark:text-foreground">
                    {typeof sellerProfile.createdAt.toDate === 'function'
                      ? sellerProfile.createdAt.toDate().toLocaleDateString('de-DE')
                      : 'Unbekannt'}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Anzeigen online:</span>
                <span className="font-semibold text-secondary dark:text-foreground">
                  {sellerProfile?.listingsCount || 1}
                </span>
              </div>
            </div>
          </div>

          {/* Details & Description */}
          <div className="bg-white dark:bg-card border border-border/85 rounded-2xl p-6 shadow-sm space-y-5">
            <h3 className="font-extrabold text-base text-secondary dark:text-foreground/90 uppercase tracking-wide">Produktdetails</h3>
            
            <dl className="space-y-3 text-sm border-b border-border/40 pb-4">
              <div className="flex justify-between">
                <dt className="text-muted-foreground font-medium">Kategorie</dt>
                <dd className="font-bold text-secondary dark:text-foreground capitalize">{listing.category}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground font-medium">Zustand</dt>
                <dd className="font-bold text-secondary dark:text-foreground capitalize">{listing.condition.replace('_', ' ')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground font-medium">Eingestellt am</dt>
                <dd className="font-bold text-secondary dark:text-foreground">
                  {listing.createdAt && typeof listing.createdAt.toDate === 'function'
                    ? listing.createdAt.toDate().toLocaleDateString('de-DE')
                    : 'Gerade eben'}
                </dd>
              </div>
            </dl>

            <div>
              <h4 className="font-extrabold text-sm text-secondary dark:text-foreground/90 uppercase tracking-wide mb-2">Beschreibung</h4>
              <p className="text-sm text-secondary/90 dark:text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {listing.description}
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
