'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Plus, MapPin, Grid, Layers, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/Logo';
import { db } from '@/lib/firebaseClient';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { Listing } from '@/types';


export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Fetch from Firestore
  useEffect(() => {
    async function fetchListings() {
      try {
        const q = query(
          collection(db, 'listings'),
          limit(100)
        );
        const querySnapshot = await getDocs(q);
        const fetched: Listing[] = [];
        querySnapshot.forEach((doc) => {
          fetched.push({ id: doc.id, ...doc.data() } as Listing);
        });

        // Client-side filter & sort to avoid needing composite indexes in Firestore
        const activeListings = fetched
          .filter((item) => item.status === 'open')
          .sort((a, b) => {
            const valA = a.createdAt ? (typeof a.createdAt.toMillis === 'function' ? a.createdAt.toMillis() : (a.createdAt.seconds * 1000 || 0)) : 0;
            const valB = b.createdAt ? (typeof b.createdAt.toMillis === 'function' ? b.createdAt.toMillis() : (b.createdAt.seconds * 1000 || 0)) : 0;
            return valB - valA;
          })
          .slice(0, 8); // Display top 8 listings on homepage

        if (activeListings.length === 0) {
          setListings([]);
        } else {
          setListings(activeListings);
        }
      } catch (err) {
        console.error('Error fetching listings:', err);
        setListings([]);
      } finally {
        setLoading(false);
      }
    }

    fetchListings();
  }, []);

  // Filter listings based on search
  const filteredListings = listings.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === '' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getUnitEmoji = (unit: string) => {
    switch (unit) {
      case 'flasche': return '🍺';
      case 'kiste': return '🍻';
      case 'dose': return '🥫';
      default: return '🥤';
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
    <div className="w-full flex flex-col items-center pb-24 bg-background">
      
      {/* Hero Section */}
      <section className="w-full flex flex-col items-center pt-16 pb-12 px-4 text-center max-w-6xl">
        {/* Subtle sub-heading badge */}
        <span className="text-secondary dark:text-primary font-bold text-sm uppercase tracking-widest bg-primary/10 dark:bg-primary/20 px-4 py-1.5 rounded-full mb-6 flex items-center gap-1.5 shadow-sm border border-primary/10">
          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          Der Biermarkt für die DACH-Region
        </span>

        {/* Big Logo Representation */}
        <div className="mb-10 flex justify-center">
          <Logo size="lg" />
        </div>

        {/* Primary Headline */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-secondary dark:text-foreground tracking-tight max-w-4xl leading-[1.1] mb-6">
          Der Biermarkt für die DACH-Region
        </h1>
        
        {/* Sub-headline */}
        <p className="text-lg md:text-xl text-secondary/80 dark:text-foreground/80 max-w-2xl leading-relaxed mb-10">
          Alles für eine Kiste Bier. Die Tauschbörse, wo Gegenstände in Bier statt Euro gehandelt werden.
        </p>

        {/* Hero Quick Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full px-4 mb-16">
          <Link href="/angebote" className="w-full sm:w-auto">
            <Button size="lg" className="w-full bg-primary hover:bg-primary/90 text-white rounded-full px-8 py-6 text-lg font-semibold shadow-md shadow-primary/20 transition-all hover:scale-105">
              <Search className="w-5 h-5 mr-2" />
              Angebote durchsuchen
            </Button>
          </Link>
          <Link href="/inserieren" className="w-full sm:w-auto">
            <Button size="lg" className="w-full bg-secondary hover:bg-secondary/90 dark:bg-foreground dark:hover:bg-foreground/90 text-white dark:text-background rounded-full px-8 py-6 text-lg font-semibold shadow-md transition-all hover:scale-105">
              <Plus className="w-5 h-5 mr-2" />
              Inserat erstellen
            </Button>
          </Link>
        </div>
      </section>

      {/* Interactive Search / Category Bar */}
      <section className="w-full max-w-4xl px-4 mb-16 relative z-20">
        <div className="w-full bg-white dark:bg-card rounded-2xl md:rounded-full shadow-lg p-3 flex flex-col md:flex-row items-stretch md:items-center gap-3 border border-border/50 backdrop-blur-sm">
          {/* Text Search Input */}
          <div className="flex-1 flex items-center px-3 border-b md:border-b-0 md:border-r border-border/50 pb-2 md:pb-0">
            <Search className="w-5 h-5 text-muted-foreground mr-3 shrink-0" />
            <Input 
              type="text" 
              placeholder="Suche nach Titel oder Beschreibung..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-base md:text-lg px-0 h-10 md:h-12 placeholder:text-muted-foreground/60 w-full"
            />
          </div>

          {/* Categories Selector */}
          <div className="w-full md:w-56 px-2 flex items-center gap-1.5 border-b md:border-b-0 border-border/50 pb-2 md:pb-0">
            <Layers className="w-5 h-5 text-muted-foreground shrink-0" />
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-10 md:h-12 bg-transparent border-0 outline-none text-secondary dark:text-foreground font-medium cursor-pointer focus:ring-0 text-sm md:text-base"
            >
              <option value="">Alle Kategorien</option>
              <option value="moebel">🪑 Möbel</option>
              <option value="elektronik">📱 Elektronik</option>
              <option value="kleidung">👕 Kleidung</option>
            </select>
          </div>

          {/* Action Trigger */}
          <Link href={`/angebote?q=${searchQuery}&cat=${selectedCategory}`} className="w-full md:w-auto">
            <Button className="w-full h-12 md:h-12 px-8 rounded-xl md:rounded-full bg-secondary hover:bg-secondary/90 dark:bg-foreground dark:text-background dark:hover:bg-foreground/90 font-bold transition-all shrink-0">
              Finden
            </Button>
          </Link>
        </div>
      </section>

      {/* Listing Grid Section */}
      <section className="w-full max-w-7xl px-4 md:px-8 mt-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-8">
          <div className="flex items-center gap-2">
            <Grid className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-bold text-secondary dark:text-foreground">Aktuelle Angebote</h2>
          </div>
          <span className="text-sm font-semibold text-muted-foreground bg-muted px-3 py-1 rounded-full">
            {filteredListings.length} Inserate
          </span>
        </div>

        {loading ? (
          <div className="w-full flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="w-full text-center py-20 bg-white dark:bg-card rounded-2xl border border-border shadow-sm">
            <p className="text-lg text-muted-foreground font-medium">Keine Inserate für deine Kriterien gefunden.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredListings.map((listing) => (
              <Link href={`/angebote/detail?id=${listing.id}`} key={listing.id} className="group">
                <div className="bg-white dark:bg-card border border-border/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full hover:-translate-y-1">
                  
                  {/* Image Container with visual badge */}
                  <div className="w-full h-52 bg-slate-100 dark:bg-slate-900 relative overflow-hidden flex items-center justify-center border-b border-border/40">
                    {listing.images && listing.images.length > 0 ? (
                      <img 
                        src={listing.images[0]} 
                        alt={listing.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground/60 select-none">
                        <span className="text-4xl">📸</span>
                        <span className="text-xs font-semibold uppercase tracking-wider">Kein Bild</span>
                      </div>
                    )}

                    {/* Condition Badge */}
                    <div className="absolute top-3 right-3 bg-white/95 dark:bg-card/95 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-bold text-primary shadow-sm border border-border/50 uppercase tracking-wide">
                      {listing.condition}
                    </div>

                    {/* Price/Unit Badge */}
                    <div className="absolute bottom-3 left-3 bg-primary text-white px-3.5 py-1.5 rounded-xl shadow-md border border-white/20 flex items-center gap-1.5 font-bold transition-all transform group-hover:scale-105">
                      <span>{listing.beerPrice}x</span>
                      <span className="text-lg">{getUnitEmoji(listing.beerUnit)}</span>
                      <span className="text-xs uppercase tracking-wide font-extrabold">{listing.beerUnit}</span>
                    </div>
                  </div>

                  {/* Listing Info */}
                  <div className="p-5 flex flex-col flex-1">
                    {/* Category */}
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
                      {getCategoryName(listing.category)}
                    </span>
                    
                    {/* Title */}
                    <h3 className="font-extrabold text-base md:text-lg text-secondary dark:text-foreground line-clamp-1 mb-2 group-hover:text-primary transition-colors">
                      {listing.title}
                    </h3>
                    
                    {/* Description snippet */}
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-4 flex-1">
                      {listing.description}
                    </p>

                    {/* Footer Row */}
                    <div className="pt-4 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5 font-medium">
                        <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-[10px] font-black">
                          {listing.sellerName?.charAt(0) || '?'}
                        </div>
                        <span className="truncate max-w-[90px]">{listing.sellerName}</span>
                      </div>
                      <div className="flex items-center gap-1 font-semibold text-primary/80">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>AT/DE</span>
                      </div>
                    </div>
                  </div>

                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
