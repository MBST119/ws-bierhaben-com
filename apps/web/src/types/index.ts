import { Timestamp } from 'firebase/firestore';

export type BeerUnit = 'flasche' | 'kiste' | 'dose' | 'andere';

export type ItemCondition = 'neu' | 'neuwertig' | 'gut' | 'gebraucht';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  createdAt: Timestamp;
  listingsCount?: number;
  exchangesCount?: number;
  role?: 'superAdmin' | 'user';
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  category: string;
  beerPrice: number;
  beerUnit: BeerUnit;
  condition: ItemCondition;
  images: string[];
  status: 'open' | 'exchanged' | 'offline';
  sellerId: string;
  sellerName: string;
  sellerPhotoURL: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Exchange {
  id: string;
  listingId: string;
  listingTitle: string;
  sellerId: string;
  sellerName: string;
  buyerId: string;
  buyerName: string;
  beerPrice: number;
  beerUnit: BeerUnit;
  status: 'completed' | 'cancelled';
  createdAt: Timestamp;
}
