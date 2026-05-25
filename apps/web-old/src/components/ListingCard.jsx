
import React from 'react';
import { Link } from 'react-router-dom';
import pb from '@/lib/pocketbaseClient';
import BeerPriceDisplay from '@/components/BeerPriceDisplay.jsx';
import { Badge } from '@/components/ui/badge';

const ListingCard = ({ listing }) => {
  const imageUrl = listing.images && listing.images.length > 0
    ? pb.files.getUrl(listing, listing.images[0], { thumb: '300x300' })
    : 'https://placehold.co/300x300/e5e5e5/666666?text=Kein+Bild';

  const categoryEmoji = listing.expand?.category?.emoji || '📦';

  return (
    <Link to={`/listing/${listing.id}`}>
      <div className="group bg-card rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-1 h-full flex flex-col">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img
            src={imageUrl}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-3 right-3">
            <Badge variant="secondary" className="bg-background/90 backdrop-blur">
              {listing.condition}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-1">
          <div className="flex items-start gap-2 mb-2">
            <span className="text-2xl">{categoryEmoji}</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg leading-tight mb-1 line-clamp-2 text-balance">
                {listing.title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {listing.description}
              </p>
            </div>
          </div>

          <div className="mt-auto pt-3 border-t border-border">
            <BeerPriceDisplay 
              price={listing.beerPrice} 
              unit={listing.beerUnit} 
              size="sm"
              showLabel={false}
            />
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ListingCard;
