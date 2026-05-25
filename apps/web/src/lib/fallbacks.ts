import { Listing } from '@/types';
import { Timestamp } from 'firebase/firestore';

export const FALLBACK_LISTINGS: Listing[] = [
  {
    id: 'fallback-1',
    title: 'Antiker Holzstuhl',
    description: 'Ein schöner, antiker Holzstuhl in gutem Zustand. Sehr stabil und dekorativ. Perfekt für das Esszimmer oder den Flur.',
    category: 'moebel',
    beerPrice: 2,
    beerUnit: 'flasche',
    condition: 'gut',
    images: [],
    status: 'open',
    sellerId: 'system',
    sellerName: 'Max Muster hh',
    sellerPhotoURL: null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  },
  {
    id: 'fallback-2',
    title: 'Vintage Leder-Sessel',
    description: 'Sehr bequemer Sessel aus echtem Leder mit einer tollen natürlichen Patina. Tausche nur gegen eine Kiste Augustiner Edelstoff oder gleichwertig.',
    category: 'moebel',
    beerPrice: 1,
    beerUnit: 'kiste',
    condition: 'neuwertig',
    images: [],
    status: 'open',
    sellerId: 'system',
    sellerName: 'Anna Schmidt',
    sellerPhotoURL: null,
    createdAt: Timestamp.fromMillis(Date.now() - 3600000),
    updatedAt: Timestamp.fromMillis(Date.now() - 3600000)
  },
  {
    id: 'fallback-3',
    title: 'IKEA Regalsystem Kallax',
    description: 'Weißes 4x4 Regal. Hat ein paar leichte Gebrauchsspuren an den Unterseiten, ist aber voll funktionstüchtig und stabil.',
    category: 'moebel',
    beerPrice: 3,
    beerUnit: 'kiste',
    condition: 'gebraucht',
    images: [],
    status: 'open',
    sellerId: 'system',
    sellerName: 'Stefan K.',
    sellerPhotoURL: null,
    createdAt: Timestamp.fromMillis(Date.now() - 7200000),
    updatedAt: Timestamp.fromMillis(Date.now() - 7200000)
  },
  {
    id: 'fallback-4',
    title: 'Retro Plattenspieler',
    description: 'Einwandfrei funktionierender Schallplattenspieler im coolen Koffer-Design. Netzteil und Chinch-Kabel sind im Lieferumfang enthalten.',
    category: 'elektronik',
    beerPrice: 4,
    beerUnit: 'kiste',
    condition: 'gut',
    images: [],
    status: 'open',
    sellerId: 'system',
    sellerName: 'Felix Berger',
    sellerPhotoURL: null,
    createdAt: Timestamp.fromMillis(Date.now() - 10800000),
    updatedAt: Timestamp.fromMillis(Date.now() - 10800000)
  }
];
