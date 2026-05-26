'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { Search, MapPin, Clock, Layers, Grid } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Listing } from '@/types';
import { fetchPaymentUnits, PaymentUnit } from '@/lib/paymentSettings';


function AngeboteContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialCat = searchParams.get('cat') || '';

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCat);
  const [availableUnits, setAvailableUnits] = useState<PaymentUnit[]>([]);

  useEffect(() => {
    fetchPaymentUnits().then(setAvailableUnits);
  }, []);

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const q = query(
          collection(db, 'listings'),
          limit(150)
        );
        const querySnapshot = await getDocs(q);
        const fetchedListings: Listing[] = [];
        querySnapshot.forEach((doc) => {
          fetchedListings.push({ id: doc.id, ...doc.data() } as Listing);
        });

        // Client-side filter & sort to avoid needing composite indexes in Firestore
        const activeListings = fetchedListings
          .filter((item) => item.status === 'open')
          .sort((a, b) => {
            const valA = a.createdAt ? (typeof a.createdAt.toMillis === 'function' ? a.createdAt.toMillis() : (a.createdAt.seconds * 1000 || 0)) : 0;
            const valB = b.createdAt ? (typeof b.createdAt.toMillis === 'function' ? b.createdAt.toMillis() : (b.createdAt.seconds * 1000 || 0)) : 0;
            return valB - valA;
          });

        if (activeListings.length === 0) {
          setListings([]);
        } else {
          setListings(activeListings);
        }
      } catch (error) {
        console.error("Fehler beim Laden der Inserate:", error);
        setListings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, []);

  // Sync state with URL search params changes if any
  useEffect(() => {
    setSearchQuery(searchParams.get('q') || '');
    setSelectedCategory(searchParams.get('cat') || '');
  }, [searchParams]);

  // Local filtering to make search extremely responsive
  const filteredListings = listings.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === '' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getUnitEmoji = (unitId: string) => {
    const found = availableUnits.find(u => u.id === unitId);
    if (found) return found.emoji;
    switch (unitId) {
      case 'flasche': return '🍺';
      case 'kiste': return '🍻';
      case 'dose': return '🥫';
      default: return '🥤';
    }
  };

  const getUnitName = (unitId: string, price: number) => {
    const found = availableUnits.find(u => u.id === unitId);
    if (found) {
      return price > 1 ? (found.labelPlural || found.label) : found.label;
    }
    const plural = price > 1;
    switch (unitId) {
      case 'flasche': return plural ? 'Flaschen' : 'Flasche';
      case 'kiste': return plural ? 'Kisten' : 'Kiste';
      case 'dose': return plural ? 'Dosen' : 'Dose';
      default: return unitId;
    }
  };

  const getCategoryName = (cat: string) => {
    switch (cat) {
      case 'moebel': return '🪑 Möbel';
      case 'elektronik': return '📱 Elektronik';
      case 'kleidung': return '👕 Kleidung';
      default: return '📦 Sonstiges';
    }
  };

  return (
    <div className="w-full flex flex-col items-center min-h-screen bg-background">
      
      {/* Search Header Bar (Willhaben Mockup style) */}
      <div className="w-full bg-white dark:bg-card border-b border-border/40 py-6 px-4 flex justify-center sticky top-0 z-30 shadow-sm">
        <div className="w-full max-w-5xl bg-background rounded-2xl md:rounded-full shadow-inner p-2 flex flex-col md:flex-row items-stretch md:items-center gap-2.5 border border-border/50">
          
          {/* Text Input */}
          <div className="flex-1 flex items-center px-3 border-b md:border-b-0 md:border-r border-border/40 pb-2 md:pb-0">
            <Search className="w-5 h-5 text-muted-foreground mr-2 shrink-0" />
            <Input 
              type="text" 
              placeholder="Was suchst du?" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-base px-0 h-10 w-full"
            />
          </div>

          {/* Category Dropdown */}
          <div className="w-full md:w-48 px-2 flex items-center gap-1.5 border-b md:border-b-0 border-border/40 pb-2 md:pb-0">
            <Layers className="w-4.5 h-4.5 text-muted-foreground shrink-0" />
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-10 bg-transparent border-0 outline-none text-secondary dark:text-foreground font-semibold cursor-pointer focus:ring-0 text-sm"
            >
              <option value="">Alle Kategorien</option>
              <option value="moebel">🪑 Möbel</option>
              <option value="elektronik">📱 Elektronik</option>
              <option value="kleidung">👕 Kleidung</option>
            </select>
          </div>

          <Button className="h-10 px-8 rounded-xl md:rounded-full bg-primary hover:bg-primary/90 text-white font-bold transition-all shadow-sm">
            Finden
          </Button>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="w-full max-w-7xl mx-auto pt-10 px-4 pb-24">
        
        {/* Results Header */}
        <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-8">
          <div className="flex items-center gap-2">
            <Grid className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-extrabold text-secondary dark:text-foreground">
              {selectedCategory ? `${getCategoryName(selectedCategory)} Angebote` : 'Alle Angebote'}
            </h1>
          </div>
          <p className="text-sm font-semibold text-muted-foreground bg-muted px-3 py-1 rounded-full">
            {filteredListings.length} Ergebnisse
          </p>
        </div>
        
        {loading ? (
          <div className="w-full flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="w-full text-center py-24 bg-white dark:bg-card rounded-2xl border border-border/60 shadow-sm">
            <span className="text-5xl mb-4 block">🔍</span>
            <p className="text-lg text-muted-foreground font-medium">Keine passende Angebote gefunden.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredListings.map((listing) => (
              <Link href={`/angebote/detail?id=${listing.id}`} key={listing.id} className="group block">
                <div className="bg-white dark:bg-card border border-border/60 rounded-2xl overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col h-full hover:-translate-y-1">
                  
                  {/* Image Container with Badge */}
                  <div className="w-full h-48 bg-slate-100 dark:bg-slate-900 relative overflow-hidden flex items-center justify-center border-b border-border/40">
                    {listing.images && listing.images.length > 0 ? (
                      <img 
                        src={listing.images[0]} 
                        alt={listing.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground/60 select-none">
                        <span className="text-3xl">📸</span>
                        <span className="text-xs font-semibold uppercase tracking-wider">Kein Bild</span>
                      </div>
                    )}
                    
                    {/* Condition Badge */}
                    <div className="absolute top-3 right-3 bg-white/95 dark:bg-card/95 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-bold text-primary shadow-sm border border-border/50 uppercase tracking-wide">
                      {listing.condition}
                    </div>

                    {/* Price/Unit Badge */}
                    <div className="absolute bottom-3 left-3 bg-primary text-white px-3 py-1 rounded-xl shadow-md border border-white/10 flex items-center gap-1.5 font-bold transition-all transform group-hover:scale-105">
                      <span>{listing.beerPrice}x</span>
                      <span className="text-lg">{getUnitEmoji(listing.beerUnit)}</span>
                      <span className="text-xs uppercase tracking-wide font-extrabold">{getUnitName(listing.beerUnit, listing.beerPrice)}</span>
                    </div>
                  </div>

                  {/* Details block */}
                  <div className="p-5 flex flex-col flex-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                      {getCategoryName(listing.category)}
                    </span>

                    <h3 className="font-extrabold text-base md:text-lg text-secondary dark:text-foreground line-clamp-1 mb-2 group-hover:text-primary transition-colors">
                      {listing.title}
                    </h3>

                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-4 flex-1">
                      {listing.description}
                    </p>
                    
                    {/* User profile row */}
                    <div className="pt-4 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5 font-medium">
                        <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-[10px] font-black">
                          {listing.sellerName?.charAt(0) || '?'}
                        </div>
                        <span className="truncate max-w-[90px]">{listing.sellerName}</span>
                      </div>
                      <div className="flex items-center gap-1 font-semibold text-primary/80">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate max-w-[90px]">
                          {listing.sellerZipCode && listing.sellerCity 
                            ? `${listing.sellerZipCode} ${listing.sellerCity}` 
                            : 'AT/DE'}
                        </span>
                      </div>
                    </div>

                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AngebotePage() {
  return (
    <Suspense fallback={
      <div className="w-full h-screen flex justify-center items-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <AngeboteContent />
    </Suspense>
  );
}
