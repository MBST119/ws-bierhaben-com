
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import pb from '@/lib/pocketbaseClient';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import ListingCard from '@/components/ListingCard.jsx';
import { Button } from '@/components/ui/button';
import { ArrowRight, Search, Package, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const HomePage = () => {
  const [featuredListings, setFeaturedListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [listingsData, categoriesData] = await Promise.all([
          pb.collection('listings').getList(1, 6, {
            sort: '-created',
            expand: 'category,userId',
            $autoCancel: false
          }),
          pb.collection('categories').getFullList({ $autoCancel: false })
        ]);
        setFeaturedListings(listingsData.items);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <>
      <Helmet>
        <title>bierhaben.com - Der Biermarkt für die DACH-Region</title>
        <meta name="description" content="Die Tauschbörse mit Bier-Währung für die DACH-Region. Tausche Gegenstände gegen Bier statt Geld." />
      </Helmet>
      <div className="min-h-screen flex flex-col">
        <Header />
        
        {/* Hero Section */}
        <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNGRjk1MDAiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE0YzMuMzEgMCA2IDIuNjkgNiA2cy0yLjY5IDYtNiA2LTYtMi42OS02LTYgMi42OS02IDYtNnpNNiAzNGMzLjMxIDAgNiAyLjY5IDYgNnMtMi42OSA2LTYgNi02LTIuNjktNi02IDIuNjktNiA2LTZ6TTM2IDM0YzMuMzEgMCA2IDIuNjkgNiA2cy0yLjY5IDYtNiA2LTYtMi42OS02LTYgMi42OS02IDYtNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40"></div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <img
                src="https://horizons-cdn.hostinger.com/d1b96f74-d973-45dd-a5e2-a03216042c0c/7d28f180a22da2ede165e9992b94d0cb.jpg"
                alt="bierhaben.com Logo"
                className="mx-auto mb-8 h-32 w-auto"
              />
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-balance" style={{ letterSpacing: '-0.02em' }}>
                Der Biermarkt für die DACH-Region
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
                Alles für eine Kiste Bier. Die Tauschbörse, wo Gegenstände in Bier statt Euro gehandelt werden.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild className="gap-2">
                  <Link to="/listings">
                    <Search className="h-5 w-5" />
                    Angebote durchsuchen
                  </Link>
                </Button>
                <Button size="lg" variant="secondary" asChild className="gap-2">
                  <Link to="/create-listing">
                    <Package className="h-5 w-5" />
                    Inserat erstellen
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance">
                So funktioniert's
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Tauschen war noch nie so einfach und gesellig
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
                className="space-y-6"
              >
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">1</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Inserat erstellen</h3>
                    <p className="text-muted-foreground">
                      Stelle deinen Gegenstand ein und lege den Preis in Biereinheiten fest
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">2</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Interessenten finden</h3>
                    <p className="text-muted-foreground">
                      Andere Nutzer durchsuchen die Angebote und kontaktieren dich
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">3</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Tauschen und genießen</h3>
                    <p className="text-muted-foreground">
                      Triff dich, tausche den Gegenstand gegen Bier und stoß an!
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
                className="bg-card rounded-2xl p-8 shadow-lg"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-muted rounded-xl">
                    <Search className="h-6 w-6 text-primary" />
                    <span className="font-medium">Durchsuche tausende Angebote</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-muted rounded-xl">
                    <MessageSquare className="h-6 w-6 text-primary" />
                    <span className="font-medium">Chatte direkt mit Verkäufern</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-muted rounded-xl">
                    <Package className="h-6 w-6 text-primary" />
                    <span className="font-medium">Tausche lokal und persönlich</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance">
                Kategorien entdecken
              </h2>
              <p className="text-lg text-muted-foreground">
                Finde genau das, was du suchst
              </p>
            </motion.div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {[...Array(7)].map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {categories.map((category, index) => (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                    viewport={{ once: true }}
                  >
                    <Link
                      to={`/listings?category=${category.id}`}
                      className="block p-6 bg-card rounded-xl text-center hover:shadow-lg transition-all duration-200 hover:-translate-y-1 group"
                    >
                      <div className="text-4xl mb-2 group-hover:scale-110 transition-transform duration-200">
                        {category.emoji}
                      </div>
                      <div className="text-sm font-medium">{category.name}</div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Featured Listings */}
        <section className="py-20 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="flex items-center justify-between mb-12"
            >
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-2 text-balance">
                  Aktuelle Angebote
                </h2>
                <p className="text-lg text-muted-foreground">
                  Die neuesten Inserate auf bierhaben.com
                </p>
              </div>
              <Button variant="ghost" asChild className="gap-2">
                <Link to="/listings">
                  Alle anzeigen
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </motion.div>

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
            ) : featuredListings.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Noch keine Inserate</h3>
                <p className="text-muted-foreground mb-6">
                  Sei der Erste und erstelle ein Inserat
                </p>
                <Button asChild>
                  <Link to="/create-listing">Inserat erstellen</Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredListings.map((listing, index) => (
                  <motion.div
                    key={listing.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <ListingCard listing={listing} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default HomePage;
