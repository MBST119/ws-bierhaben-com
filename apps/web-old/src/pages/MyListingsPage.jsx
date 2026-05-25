
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import ListingCard from '@/components/ListingCard.jsx';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Plus } from 'lucide-react';

const MyListingsPage = () => {
  const { currentUser } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const data = await pb.collection('listings').getList(1, 50, {
          filter: `userId = "${currentUser.id}"`,
          sort: '-created',
          expand: 'category,userId',
          $autoCancel: false
        });
        setListings(data.items);
      } catch (error) {
        console.error('Error fetching listings:', error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchListings();
    }
  }, [currentUser]);

  return (
    <>
      <Helmet>
        <title>Meine Inserate - bierhaben.com</title>
        <meta name="description" content="Verwalte deine Inserate auf bierhaben.com" />
      </Helmet>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance" style={{ letterSpacing: '-0.02em' }}>
                  Meine Inserate
                </h1>
                <p className="text-lg text-muted-foreground">
                  Verwalte deine aktiven Angebote
                </p>
              </div>
              <Button asChild className="gap-2">
                <Link to="/create-listing">
                  <Plus className="h-5 w-5" />
                  Neues Inserat
                </Link>
              </Button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-square rounded-xl" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : listings.length === 0 ? (
              <div className="text-center py-16">
                <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Noch keine Inserate</h3>
                <p className="text-muted-foreground mb-6">
                  Erstelle dein erstes Inserat und beginne zu tauschen
                </p>
                <Button asChild>
                  <Link to="/create-listing">Inserat erstellen</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-6 text-sm text-muted-foreground">
                  {listings.length} {listings.length === 1 ? 'Inserat' : 'Inserate'}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {listings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              </>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default MyListingsPage;
