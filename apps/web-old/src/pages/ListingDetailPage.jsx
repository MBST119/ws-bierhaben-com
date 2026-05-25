
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import SellerCard from '@/components/SellerCard.jsx';
import BeerPriceDisplay from '@/components/BeerPriceDisplay.jsx';
import ChatModal from '@/components/ChatModal.jsx';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Edit, Trash2, ArrowLeft, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';

const ListingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  
  // Chat Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState(null);

  const fetchListing = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('--- DEBUG START ---');
      console.log('Listing ID:', id);
      console.log('Current user:', currentUser);

      // Expand userId to get seller details and category for badge
      const record = await pb.collection('listings').getOne(id, {
        expand: 'category,userId',
        $autoCancel: false
      });
      
      console.log('Loaded listing:', record);
      console.log('Seller data:', record.expand?.userId);
      console.log('Is seller:', record.userId === currentUser?.id);
      console.log('--- DEBUG END ---');
      
      setListing(record);
    } catch (err) {
      console.error('Error fetching listing:', err);
      setError(err);
      toast.error('Fehler beim Laden des Inserats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchListing();
    }
  }, [id, currentUser]);

  const handleDelete = async () => {
    if (!window.confirm('Möchtest du dieses Inserat wirklich löschen?')) {
      return;
    }

    setDeleting(true);
    try {
      await pb.collection('listings').delete(id, { $autoCancel: false });
      toast.success('Inserat gelöscht');
      navigate('/my-listings');
    } catch (err) {
      console.error('Error deleting listing:', err);
      toast.error('Fehler beim Löschen');
    } finally {
      setDeleting(false);
    }
  };

  const nextImage = () => {
    if (listing?.images) {
      setCurrentImageIndex((prev) => (prev + 1) % listing.images.length);
    }
  };

  const prevImage = () => {
    if (listing?.images) {
      setCurrentImageIndex((prev) => (prev - 1 + listing.images.length) % listing.images.length);
    }
  };

  const handleOpenChat = () => {
    const seller = listing?.expand?.userId;
    if (seller) {
      setSelectedSeller(seller);
      setIsModalOpen(true);
    } else {
      toast.error('Verkäufer-Daten nicht verfügbar');
    }
  };

  if (loading) {
    return (
      <>
        <Helmet>
          <title>Lädt... - bierhaben.com</title>
        </Helmet>
        <div className="min-h-screen flex flex-col bg-background text-foreground">
          <Header />
          <main className="flex-1 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <Skeleton className="aspect-square rounded-2xl bg-muted/60" />
                  <Skeleton className="h-8 w-3/4 bg-muted/60" />
                  <Skeleton className="h-24 w-full bg-muted/60" />
                </div>
                <div className="space-y-6">
                  <Skeleton className="h-48 rounded-xl bg-muted/60" />
                  <Skeleton className="h-32 rounded-xl bg-muted/60" />
                </div>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Header />
        <main className="flex-1 py-20 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4 space-y-6">
            <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">🍺</span>
            </div>
            <h1 className="text-3xl font-bold">Inserat nicht gefunden</h1>
            <p className="text-muted-foreground">
              Das gesuchte Inserat existiert nicht, wurde gelöscht oder konnte nicht geladen werden.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
              <Button asChild variant="default">
                <Link to="/listings">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Alle Inserate ansehen
                </Link>
              </Button>
              <Button onClick={fetchListing} variant="outline">
                <RefreshCcw className="mr-2 h-4 w-4" />
                Erneut versuchen
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isOwner = currentUser?.id === listing.userId;
  const seller = listing.expand?.userId;
  const category = listing.expand?.category;

  return (
    <>
      <Helmet>
        <title>{`${listing.title} - bierhaben.com`}</title>
        <meta name="description" content={listing.description} />
      </Helmet>
      <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
        <Header />
        <main className="flex-1 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Button asChild variant="ghost" className="mb-6 -ml-4 text-muted-foreground hover:text-foreground">
              <Link to="/listings">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zurück zur Übersicht
              </Link>
            </Button>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-8">
                {/* Image Gallery */}
                {listing.images && listing.images.length > 0 ? (
                  <div className="relative aspect-square bg-card/60 rounded-2xl overflow-hidden group border border-border/40 shadow-sm">
                    <img
                      src={pb.files.getUrl(listing, listing.images[currentImageIndex])}
                      alt={`${listing.title} - Bild ${currentImageIndex + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {listing.images.length > 1 && (
                      <>
                        <button
                          onClick={prevImage}
                          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-background/80 backdrop-blur rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-background text-foreground shadow-sm"
                          aria-label="Vorheriges Bild"
                        >
                          <ChevronLeft className="h-6 w-6" />
                        </button>
                        <button
                          onClick={nextImage}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-background/80 backdrop-blur rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-background text-foreground shadow-sm"
                          aria-label="Nächstes Bild"
                        >
                          <ChevronRight className="h-6 w-6" />
                        </button>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                          {listing.images.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentImageIndex(index)}
                              aria-label={`Gehe zu Bild ${index + 1}`}
                              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                                index === currentImageIndex
                                  ? 'bg-primary w-8'
                                  : 'bg-background/80'
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="aspect-square bg-card/60 rounded-2xl flex items-center justify-center border border-border/40 shadow-sm">
                    <span className="text-muted-foreground text-lg">Kein Bild verfügbar</span>
                  </div>
                )}

                {/* Title and Category */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-balance text-foreground leading-tight" style={{ letterSpacing: '-0.02em' }}>
                      {listing.title}
                    </h1>
                    {isOwner && (
                      <div className="flex gap-2 shrink-0">
                        <Button variant="outline" size="icon" disabled className="bg-background shadow-sm" title="Bearbeiten kommt bald">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={handleDelete}
                          disabled={deleting}
                          className="shadow-sm"
                          title="Löschen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {category && (
                      <Badge variant="secondary" className="text-base py-1 px-3 bg-secondary/10 text-secondary border-none shadow-sm">
                        {category.emoji} {category.name}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-base py-1 px-3 border-border bg-background shadow-sm text-muted-foreground">
                      Zustand: <span className="font-semibold text-foreground ml-1">{listing.condition}</span>
                    </Badge>
                  </div>
                </div>

                {/* Description */}
                <div className="prose prose-gray max-w-none bg-card p-6 md:p-8 rounded-2xl shadow-sm border border-border/50">
                  <h2 className="text-2xl font-semibold mb-4 text-foreground">Beschreibung</h2>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-lg">
                    {listing.description}
                  </p>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-8">
                {/* Price Card */}
                <div className="bg-card rounded-2xl p-8 shadow-lg border-2 border-primary/20 flex flex-col items-center justify-center text-center">
                  <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Angebotspreis</div>
                  <BeerPriceDisplay
                    price={listing.beerPrice}
                    unit={listing.beerUnit}
                    size="xl"
                    showLabel={false}
                  />
                </div>

                {/* Seller Info */}
                {seller ? (
                  <SellerCard 
                    seller={seller} 
                    onOpenChat={handleOpenChat} 
                  />
                ) : (
                  <div className="bg-card p-6 rounded-2xl border border-border text-center text-muted-foreground shadow-sm">
                    Verkäufer-Informationen konnten nicht geladen werden.
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
        
        {/* Chat Modal connected to state */}
        <ChatModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          recipientId={selectedSeller?.id}
          listingId={listing.id}
        />
        
        <Footer />
      </div>
    </>
  );
};

export default ListingDetailPage;
