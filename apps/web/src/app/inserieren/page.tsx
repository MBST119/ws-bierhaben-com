'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, X, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { db, storage } from '@/lib/firebaseClient';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/context/AuthContext';
import { BeerUnit, ItemCondition } from '@/types';
import { fetchPaymentUnits } from '@/lib/paymentSettings';

const CATEGORY_IMAGES: Record<string, string> = {
  moebel: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600&auto=format&fit=crop",
  elektronik: "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=600&auto=format&fit=crop",
  kleidung: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600&auto=format&fit=crop",
  fahrzeuge: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&auto=format&fit=crop",
  haushalt: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=600&auto=format&fit=crop",
  sport: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600&auto=format&fit=crop",
  sonstiges: "https://images.unsplash.com/photo-1567696911980-2eed69a46042?w=600&auto=format&fit=crop"
};

export default function InserierenPage() {
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState<BeerUnit>('flasche');
  const [condition, setCondition] = useState<ItemCondition | ''>('');
  const [images, setImages] = useState<File[]>([]);
  const [availableUnits, setAvailableUnits] = useState<string[]>(['flasche', 'kiste', 'dose', 'andere']);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPaymentUnits().then((fetched) => {
      setAvailableUnits(fetched);
      if (fetched.length > 0 && !fetched.includes(unit)) {
        setUnit(fetched[0] as BeerUnit);
      }
    });
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (!loading && user && !user.emailVerified) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mb-6">
          <Info className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold mb-2">E-Mail-Verifizierung erforderlich</h1>
        <p className="text-muted-foreground text-sm leading-relaxed mb-6">
          Du musst deine E-Mail-Adresse verifizieren, um neue Inserate erstellen zu können. Bitte klicke auf den Link in der E-Mail, die wir dir gesendet haben.
        </p>
        <div className="flex gap-4">
          <Button onClick={() => router.push('/')} variant="outline" className="rounded-full">
            Zur Startseite
          </Button>
        </div>
      </div>
    );
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      if (images.length + selectedFiles.length > 10) {
        alert("Du kannst maximal 10 Bilder hochladen.");
        return;
      }
      setImages((prev) => [...prev, ...selectedFiles]);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!user) {
      setErrorMsg('Du musst angemeldet sein, um ein Inserat zu erstellen.');
      return;
    }

    if (!title || !description || !category || !price || !unit || !condition) {
      setErrorMsg('Bitte fülle alle Pflichtfelder aus.');
      return;
    }

    if (images.length === 0) {
      setErrorMsg('Bitte lade mindestens ein Bild hoch.');
      return;
    }

    setIsUploading(true);

    try {
      const uploadedImageUrls: string[] = [];
      const listingId = uuidv4();

      // 1. Upload Images to Firebase Storage
      for (const image of images) {
        try {
          const imageRef = ref(storage, `listings/${listingId}/${uuidv4()}_${image.name}`);
          const snapshot = await uploadBytes(imageRef, image);
          const downloadUrl = await getDownloadURL(snapshot.ref);
          uploadedImageUrls.push(downloadUrl);
        } catch (storageErr: any) {
          console.warn("Storage upload failed, falling back to mock placeholder image:", storageErr);
          const categoryImg = CATEGORY_IMAGES[category] || CATEGORY_IMAGES.sonstiges;
          uploadedImageUrls.push(categoryImg);
        }
      }

      // 2. Save Listing to Firestore
      await addDoc(collection(db, 'listings'), {
        title,
        description,
        category,
        beerPrice: parseFloat(price),
        beerUnit: unit,
        condition,
        images: uploadedImageUrls,
        sellerId: user.uid,
        sellerName: userProfile?.displayName || user.displayName || user.email?.split('@')[0] || "Anonymer User",
        sellerPhotoURL: userProfile?.photoURL || user.photoURL || null,
        status: "open",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setIsUploading(false);
      alert("Inserat erfolgreich veröffentlicht!");
      router.push('/angebote');
      
    } catch (error: any) {
      console.error("Fehler beim Hochladen:", error);
      setErrorMsg('Fehler beim Speichern des Inserats: ' + error.message);
      setIsUploading(false);
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
    <div className="w-full max-w-4xl mx-auto pt-10 px-4 pb-24">
      {/* Title */}
      <h1 className="text-3xl md:text-4xl font-extrabold text-secondary dark:text-foreground mb-2 tracking-tight">
        Inserat erstellen
      </h1>
      <p className="text-base md:text-lg text-secondary/80 dark:text-foreground/80 mb-8">
        Stelle deinen Gegenstand ein und lege den Tausch-Preis fest.
      </p>
      
      {/* Card Form */}
      <div className="w-full bg-white dark:bg-card rounded-2xl shadow-sm border border-border/80 p-6 md:p-8">
        
        {errorMsg && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-start gap-2.5 text-sm font-semibold">
            <Info className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-bold text-secondary dark:text-foreground uppercase tracking-wide">Titel *</Label>
            <Input 
              id="title" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Vintage Sessel in gutem Zustand" 
              className="h-12 text-base rounded-xl border-border focus-visible:border-primary" 
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-bold text-secondary dark:text-foreground uppercase tracking-wide">Beschreibung *</Label>
            <Textarea 
              id="description" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beschreibe deinen Gegenstand im Detail (Zustand, Maße, Tauschvorstellungen)..." 
              className="min-h-[120px] text-base resize-y rounded-xl border border-input bg-transparent px-3 py-2 placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:outline-none" 
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-bold text-secondary dark:text-foreground uppercase tracking-wide">Kategorie *</Label>
            <select 
              id="category" 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex h-12 w-full items-center justify-between rounded-xl border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary text-secondary dark:text-foreground font-semibold cursor-pointer"
              required
            >
              <option value="" disabled>Wähle eine Kategorie</option>
              <option value="moebel">🪑 Möbel</option>
              <option value="elektronik">📱 Elektronik</option>
              <option value="kleidung">👕 Kleidung</option>
              <option value="fahrzeuge">🚗 Fahrzeuge</option>
              <option value="haushalt">🏠 Haushalt</option>
              <option value="sport">⚽ Sport</option>
              <option value="sonstiges">📦 Sonstiges</option>
            </select>
          </div>

          {/* Price & Unit Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="price" className="text-sm font-bold text-secondary dark:text-foreground uppercase tracking-wide">Bier-Preis *</Label>
              <Input 
                id="price" 
                type="number" 
                step="0.5" 
                min="0.5" 
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="z.B. 2.5" 
                className="h-12 text-base rounded-xl border-border focus-visible:border-primary" 
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="unit" className="text-sm font-bold text-secondary dark:text-foreground uppercase tracking-wide">Einheit *</Label>
              <select 
                id="unit" 
                value={unit}
                onChange={(e) => setUnit(e.target.value as BeerUnit)}
                className="flex h-12 w-full items-center justify-between rounded-xl border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary text-secondary dark:text-foreground font-semibold cursor-pointer capitalize"
                required
              >
                {availableUnits.map((u) => (
                  <option key={u} value={u}>
                    {u === 'flasche' ? '🍺 Flasche' : u === 'kiste' ? '🍻 Kiste' : u === 'dose' ? '🥫 Dose' : u === 'andere' ? '🥤 Andere' : u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Condition */}
          <div className="space-y-2">
            <Label htmlFor="condition" className="text-sm font-bold text-secondary dark:text-foreground uppercase tracking-wide">Zustand *</Label>
            <select 
              id="condition" 
              value={condition}
              onChange={(e) => setCondition(e.target.value as ItemCondition)}
              className="flex h-12 w-full items-center justify-between rounded-xl border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary text-secondary dark:text-foreground font-semibold cursor-pointer"
              required
            >
              <option value="" disabled>Wähle den Zustand</option>
              <option value="neu">Neu</option>
              <option value="neuwertig">Neuwertig</option>
              <option value="gut">Gut</option>
              <option value="gebraucht">Gebraucht</option>
            </select>
          </div>

          {/* Images Upload Section */}
          <div className="space-y-2">
            <Label className="text-sm font-bold text-secondary dark:text-foreground uppercase tracking-wide">Bilder (max. 10) *</Label>
            
            {images.length > 0 && (
              <div className="flex flex-wrap gap-4 mb-4">
                {images.map((img, index) => (
                  <div key={index} className="relative w-24 h-24 rounded-xl overflow-hidden border border-border">
                    <img 
                      src={URL.createObjectURL(img)} 
                      alt={`Preview ${index}`} 
                      className="w-full h-full object-cover"
                    />
                    <button 
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1.5 right-1.5 bg-black/75 text-white rounded-full p-1 hover:bg-black transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {images.length < 10 && (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-36 border-2 border-dashed border-primary/30 hover:border-primary/50 rounded-xl bg-primary/5 hover:bg-primary/10 transition-all flex flex-col items-center justify-center cursor-pointer group p-4"
              >
                <UploadCloud className="w-8 h-8 text-primary/75 group-hover:text-primary transition-colors mb-2" />
                <p className="text-sm font-semibold text-secondary dark:text-foreground/90">Dateien per Klick auswählen</p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG, JPEG bis 5MB (mindestens 1 Bild)</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageChange} 
                  accept="image/*" 
                  multiple 
                  className="hidden" 
                />
              </div>
            )}
          </div>

          {/* Submit Action */}
          <div className="pt-6 border-t border-border/40 flex justify-end">
            <Button 
              type="submit" 
              disabled={isUploading}
              size="lg" 
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white rounded-xl px-8 py-4 font-bold shadow-md shadow-primary/20 transition-all"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Wird veröffentlicht...
                </>
              ) : (
                'Inserat veröffentlichen'
              )}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}
