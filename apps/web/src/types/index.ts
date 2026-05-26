import { Timestamp } from 'firebase/firestore';

export type BeerUnit = string;

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
  street?: string;
  houseNumber?: string;
  zipCode?: string;
  city?: string;
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
  sellerZipCode?: string | null;
  sellerCity?: string | null;
  viewsCount?: number;
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

/** Level 3: deepest subcategory (no further children) */
export interface SubSubCategory {
  id: string;
  label: string;
  emoji?: string;
}

/** Level 2: subcategory with optional sub-subcategories */
export interface SubCategory {
  id: string;
  label: string;
  emoji?: string;
  subcategories?: SubSubCategory[];
}

/** Level 1: top-level category */
export interface Category {
  id: string;
  label: string;
  emoji?: string;
  subcategories?: SubCategory[];
}

export interface Suggestion {
  id: string;
  title: string;
  text: string;
  categoryId: string;
  images: string[];
  userId: string;
  userName: string;
  createdAt: Timestamp;
  isRead: boolean;
  status: 'pending' | 'done' | 'rejected';
}
