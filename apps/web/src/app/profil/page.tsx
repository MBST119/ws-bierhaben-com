'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User as UserIcon, 
  Settings, 
  Trash2, 
  Edit3, 
  Eye, 
  EyeOff, 
  Grid, 
  Clock, 
  Tag, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { db, auth } from '@/lib/firebaseClient';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  setDoc
} from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { Listing, BeerUnit, ItemCondition } from '@/types';

export default function ProfilPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'listings' | 'settings'>('listings');
  
  // Profile settings state
  const [displayName, setDisplayName] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');

  // User listings state
  const [userListings, setUserListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);

  // Edit Listing Modal state
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editUnit, setEditUnit] = useState<BeerUnit>('flasche');
  const [editCondition, setEditCondition] = useState<ItemCondition>('gut');
  const [isSavingListing, setIsSavingListing] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      setDisplayName(user.displayName || '');
      fetchUserListings();
    }
  }, [user, loading, router]);

  const fetchUserListings = async () => {
    if (!user) return;
    setLoadingListings(true);
    try {
      // Query user's own listings
      const q = query(
        collection(db, 'listings'),
        where('sellerId', '==', user.uid)
      );
      const querySnapshot = await getDocs(q);
      const list: Listing[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Listing);
      });
      
      // Sort client-side to avoid index requirement issues
      list.sort((a, b) => {
        const valA = a.createdAt ? (typeof a.createdAt.toMillis === 'function' ? a.createdAt.toMillis() : (a.createdAt.seconds * 1000 || 0)) : 0;
        const valB = b.createdAt ? (typeof b.createdAt.toMillis === 'function' ? b.createdAt.toMillis() : (b.createdAt.seconds * 1000 || 0)) : 0;
        return valB - valA;
      });

      setUserListings(list);
    } catch (err) {
      console.error("Fehler beim Laden der eigenen Inserate:", err);
    } finally {
      setLoadingListings(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingProfile(true);
    setProfileSuccessMsg('');
    setProfileErrorMsg('');

    try {
      // 1. Update Firebase Auth Profile
      await updateProfile(user, { displayName });

      // 2. Update Users collection in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        displayName,
        updatedAt: new Date()
      }, { merge: true });

      setProfileSuccessMsg('Profil erfolgreich aktualisiert.');
    } catch (err: any) {
      console.error("Fehler beim Profil-Update:", err);
      setProfileErrorMsg('Fehler: ' + err.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleToggleStatus = async (listing: Listing) => {
    const newStatus = listing.status === 'open' ? 'offline' : 'open';
    try {
      const listingRef = doc(db, 'listings', listing.id);
      await updateDoc(listingRef, { status: newStatus });
      
      // Update local state
      setUserListings(prev => prev.map(item => 
        item.id === listing.id ? { ...item, status: newStatus } : item
      ));
    } catch (err) {
      console.error("Fehler beim Ändern des Inserats-Status:", err);
      alert("Fehler beim Ändern des Status.");
    }
  };

  const handleDeleteListing = async (id: string) => {
    if (!confirm("Möchtest du dieses Inserat wirklich unwiderruflich löschen?")) return;
    try {
      const listingRef = doc(db, 'listings', id);
      await deleteDoc(listingRef);
      
      // Update local state
      setUserListings(prev => prev.filter(item => item.id !== id));
      alert("Inserat erfolgreich gelöscht.");
    } catch (err) {
      console.error("Fehler beim Löschen des Inserats:", err);
      alert("Fehler beim Löschen.");
    }
  };

  const openEditModal = (listing: Listing) => {
    setEditingListing(listing);
    setEditTitle(listing.title);
    setEditDescription(listing.description);
    setEditPrice(listing.beerPrice.toString());
    setEditUnit(listing.beerUnit);
    setEditCondition(listing.condition);
  };

  const handleSaveListingEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingListing) return;
    setIsSavingListing(true);

    try {
      const listingRef = doc(db, 'listings', editingListing.id);
      await updateDoc(listingRef, {
        title: editTitle,
        description: editDescription,
        beerPrice: parseFloat(editPrice),
        beerUnit: editUnit,
        condition: editCondition,
        updatedAt: new Date()
      });

      // Update local state
      setUserListings(prev => prev.map(item => 
        item.id === editingListing.id 
          ? { 
              ...item, 
              title: editTitle, 
              description: editDescription, 
              beerPrice: parseFloat(editPrice), 
              beerUnit: editUnit, 
              condition: editCondition 
            } 
          : item
      ));

      setEditingListing(null);
      alert("Inserat erfolgreich aktualisiert!");
    } catch (err) {
      console.error("Fehler beim Aktualisieren des Inserats:", err);
      alert("Fehler beim Speichern des Inserats.");
    } finally {
      setIsSavingListing(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-[calc(100vh-5rem)] flex justify-center items-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto pt-10 px-4 pb-24">
      {/* Title */}
      <h1 className="text-3xl md:text-4xl font-extrabold text-secondary dark:text-foreground mb-2 tracking-tight">
        Mein Profil
      </h1>
      <p className="text-base md:text-lg text-secondary/80 dark:text-foreground/80 mb-8">
        Verwalte deine eingestellten Inserate und passe dein Profil an.
      </p>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border/80 mb-8">
        <button 
          onClick={() => setActiveTab('listings')}
          className={`pb-3 font-bold text-base flex items-center gap-2 border-b-2 transition-all ${activeTab === 'listings' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-secondary'}`}
        >
          <Grid className="w-5 h-5" />
          Meine Inserate ({userListings.length})
        </button>
        
        <button 
          onClick={() => setActiveTab('settings')}
          className={`pb-3 font-bold text-base flex items-center gap-2 border-b-2 transition-all ${activeTab === 'settings' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-secondary'}`}
        >
          <Settings className="w-5 h-5" />
          Einstellungen
        </button>
      </div>

      {/* TAB CONTENT: LISTINGS */}
      {activeTab === 'listings' && (
        <div className="space-y-6">
          {loadingListings ? (
            <div className="w-full py-16 flex justify-center">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          ) : userListings.length === 0 ? (
            <div className="w-full text-center py-20 bg-white dark:bg-card rounded-2xl border border-border/60 shadow-sm">
              <span className="text-5xl mb-4 block">📦</span>
              <p className="text-lg text-muted-foreground font-medium mb-4">Du hast noch keine Inserate veröffentlicht.</p>
              <Button onClick={() => router.push('/inserieren')} className="bg-primary text-white rounded-xl font-bold">
                Erstes Inserat erstellen
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {userListings.map((listing) => (
                <div 
                  key={listing.id} 
                  className={`bg-white dark:bg-card border rounded-2xl overflow-hidden shadow-sm flex flex-col ${listing.status === 'offline' ? 'opacity-70 border-border/50' : 'border-border/80'}`}
                >
                  {/* Card Header Media */}
                  <div className="w-full h-44 bg-slate-100 dark:bg-slate-900 relative">
                    <img 
                      src={listing.images[0] || "https://images.unsplash.com/photo-1567696911980-2eed69a46042?w=600&auto=format&fit=crop"} 
                      alt={listing.title} 
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Status Badge */}
                    <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm border border-black/10 uppercase tracking-wide ${listing.status === 'open' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                      {listing.status === 'open' ? 'Aktiv / Online' : 'Offline'}
                    </div>

                    {/* Price Badge */}
                    <div className="absolute bottom-3 right-3 bg-primary text-white px-2.5 py-1 rounded-xl shadow-md border border-white/10 text-sm font-bold">
                      {listing.beerPrice}x {listing.beerUnit === 'flasche' ? '🍺' : listing.beerUnit === 'kiste' ? '🍻' : listing.beerUnit === 'dose' ? '🥫' : '🥤'}
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-extrabold text-lg text-secondary dark:text-foreground line-clamp-1 mb-1.5">
                      {listing.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-4 flex-1">
                      {listing.description}
                    </p>

                    {/* Action Row */}
                    <div className="flex gap-2.5 pt-4 border-t border-border/40 mt-auto">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleToggleStatus(listing)}
                        className="flex-1 rounded-xl font-bold flex items-center justify-center gap-1.5 text-xs h-10"
                      >
                        {listing.status === 'open' ? (
                          <>
                            <EyeOff className="w-4 h-4 text-amber-500" />
                            Offline nehmen
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4 text-emerald-500" />
                            Online stellen
                          </>
                        )}
                      </Button>

                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => openEditModal(listing)}
                        className="rounded-xl font-bold flex items-center justify-center gap-1.5 text-xs h-10 px-3 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <Edit3 className="w-4 h-4 text-blue-500" />
                        Bearbeiten
                      </Button>

                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDeleteListing(listing.id)}
                        className="rounded-xl font-bold flex items-center justify-center gap-1.5 text-xs h-10 px-3 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="bg-white dark:bg-card rounded-2xl shadow-sm border border-border/80 p-6 md:p-8 max-w-xl">
          <h2 className="text-xl font-bold text-secondary dark:text-foreground mb-6">Profil-Einstellungen</h2>

          {profileSuccessMsg && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-start gap-2.5 text-sm font-semibold">
              <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{profileSuccessMsg}</span>
            </div>
          )}

          {profileErrorMsg && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-start gap-2.5 text-sm font-semibold">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{profileErrorMsg}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-6">
            {/* Email (Read Only) */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-secondary dark:text-foreground uppercase tracking-wide">E-Mail-Adresse</Label>
              <Input 
                type="email" 
                value={user?.email || ''} 
                disabled 
                className="h-12 bg-slate-50 border-border text-muted-foreground cursor-not-allowed rounded-xl"
              />
              <p className="text-xs text-muted-foreground">Deine E-Mail-Adresse kann nicht geändert werden.</p>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-sm font-bold text-secondary dark:text-foreground uppercase tracking-wide">Name / Anzeigename *</Label>
              <Input 
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                placeholder="Wie möchtest du genannt werden?" 
                className="h-12 text-base border-border focus-visible:border-primary rounded-xl"
              />
            </div>

            {/* Submit */}
            <Button 
              type="submit" 
              disabled={isSavingProfile}
              className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl px-8 h-12 shadow-md shadow-primary/10 transition-all flex items-center justify-center gap-2"
            >
              {isSavingProfile ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Speichert...
                </>
              ) : (
                'Profil speichern'
              )}
            </Button>
          </form>
        </div>
      )}

      {/* EDIT LISTING OVERLAY MODAL */}
      {editingListing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-card w-full max-w-2xl rounded-2xl shadow-xl border border-border overflow-hidden max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-border/80 flex items-center justify-between">
              <h3 className="font-extrabold text-xl text-secondary dark:text-foreground">Inserat bearbeiten</h3>
              <button 
                onClick={() => setEditingListing(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveListingEdit} className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="editTitle" className="text-sm font-bold text-secondary dark:text-foreground uppercase tracking-wide">Titel *</Label>
                <Input 
                  id="editTitle" 
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="h-12 rounded-xl"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="editDesc" className="text-sm font-bold text-secondary dark:text-foreground uppercase tracking-wide">Beschreibung *</Label>
                <Textarea 
                  id="editDesc" 
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  required
                  className="min-h-[100px] rounded-xl text-base px-3 py-2 border border-input bg-transparent"
                />
              </div>

              {/* Price & Unit */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editPrice" className="text-sm font-bold text-secondary dark:text-foreground uppercase tracking-wide">Bier-Preis *</Label>
                  <Input 
                    id="editPrice" 
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    required
                    className="h-12 rounded-xl"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="editUnit" className="text-sm font-bold text-secondary dark:text-foreground uppercase tracking-wide">Einheit *</Label>
                  <select 
                    id="editUnit" 
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value as BeerUnit)}
                    className="flex h-12 w-full items-center justify-between rounded-xl border border-input bg-transparent px-3 py-2 text-base shadow-sm focus:outline-none focus:border-primary text-secondary dark:text-foreground font-semibold cursor-pointer"
                  >
                    <option value="flasche">🍺 Flasche</option>
                    <option value="kiste">🍻 Kiste</option>
                    <option value="dose">🥫 Dose</option>
                    <option value="andere">🥤 Andere</option>
                  </select>
                </div>
              </div>

              {/* Condition */}
              <div className="space-y-2">
                <Label htmlFor="editCondition" className="text-sm font-bold text-secondary dark:text-foreground uppercase tracking-wide">Zustand *</Label>
                <select 
                  id="editCondition" 
                  value={editCondition}
                  onChange={(e) => setEditCondition(e.target.value as ItemCondition)}
                  className="flex h-12 w-full items-center justify-between rounded-xl border border-input bg-transparent px-3 py-2 text-base shadow-sm focus:outline-none focus:border-primary text-secondary dark:text-foreground font-semibold cursor-pointer"
                >
                  <option value="neu">Neu</option>
                  <option value="neuwertig">Neuwertig</option>
                  <option value="gut">Gut</option>
                  <option value="gebraucht">Gebraucht</option>
                </select>
              </div>

              {/* Actions */}
              <div className="pt-6 border-t border-border flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setEditingListing(null)}
                  className="rounded-xl font-bold h-12 px-6"
                >
                  Abbrechen
                </Button>
                
                <Button 
                  type="submit" 
                  disabled={isSavingListing}
                  className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl px-8 h-12 flex items-center justify-center gap-2"
                >
                  {isSavingListing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Speichert...
                    </>
                  ) : (
                    'Speichern'
                  )}
                </Button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
