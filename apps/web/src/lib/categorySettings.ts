import { doc, getDoc, setDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from './firebaseClient';
import { Category } from '@/types';

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'moebel',
    label: 'Möbel',
    emoji: '🪑',
    subcategories: [
      {
        id: 'moebel_wohnzimmer', label: 'Wohnzimmer', emoji: '🛋️',
        subcategories: [
          { id: 'moebel_wohnzimmer_sofas', label: 'Sofas & Sessel', emoji: '🛋️' },
          { id: 'moebel_wohnzimmer_tische', label: 'Tische', emoji: '🪵' },
        ],
      },
      {
        id: 'moebel_schlafzimmer', label: 'Schlafzimmer', emoji: '🛏️',
        subcategories: [
          { id: 'moebel_schlafzimmer_betten', label: 'Betten', emoji: '🛏️' },
          { id: 'moebel_schlafzimmer_schraenke', label: 'Schränke', emoji: '🗄️' },
        ],
      },
    ],
  },
  {
    id: 'elektronik',
    label: 'Elektronik',
    emoji: '📱',
    subcategories: [
      {
        id: 'elektronik_smartphones', label: 'Smartphones', emoji: '📱',
        subcategories: [
          { id: 'elektronik_smartphones_android', label: 'Android', emoji: '🤖' },
          { id: 'elektronik_smartphones_ios', label: 'iPhone', emoji: '🍎' },
        ],
      },
      {
        id: 'elektronik_computer', label: 'Computer', emoji: '💻',
        subcategories: [
          { id: 'elektronik_computer_laptops', label: 'Laptops', emoji: '💻' },
          { id: 'elektronik_computer_desktop', label: 'Desktop-PCs', emoji: '🖥️' },
        ],
      },
    ],
  },
  {
    id: 'kleidung',
    label: 'Kleidung',
    emoji: '👕',
    subcategories: [
      {
        id: 'kleidung_herren', label: 'Herren', emoji: '👔',
        subcategories: [
          { id: 'kleidung_herren_oberteile', label: 'Oberteile', emoji: '👕' },
          { id: 'kleidung_herren_hosen', label: 'Hosen', emoji: '👖' },
        ],
      },
      {
        id: 'kleidung_damen', label: 'Damen', emoji: '👗',
        subcategories: [
          { id: 'kleidung_damen_kleider', label: 'Kleider', emoji: '👗' },
          { id: 'kleidung_damen_tops', label: 'Tops & Blusen', emoji: '👚' },
        ],
      },
    ],
  },
  {
    id: 'sonstiges',
    label: 'Sonstiges',
    emoji: '📦',
    subcategories: [],
  },
];

/** Fetch categories from Firestore, fall back to defaults */
export async function fetchCategories(): Promise<Category[]> {
  try {
    const docRef = doc(db, 'settings', 'categories');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (Array.isArray(data.categories) && data.categories.length > 0) {
        return data.categories as Category[];
      }
    }
  } catch (e) {
    console.warn('Failed to fetch categories from Firestore, using defaults:', e);
  }
  return DEFAULT_CATEGORIES;
}

/** Save categories to Firestore */
export async function saveCategories(categories: Category[]): Promise<void> {
  const docRef = doc(db, 'settings', 'categories');
  await setDoc(docRef, { categories }, { merge: true });
}

/**
 * Delete a top-level category by id.
 * All listings with that category will be migrated to 'sonstiges'.
 */
export async function deleteCategory(categoryId: string, allCategories: Category[]): Promise<Category[]> {
  if (categoryId === 'sonstiges') {
    throw new Error('Die Kategorie "Sonstiges" kann nicht gelöscht werden.');
  }

  // Batch-migrate affected listings to 'sonstiges'
  const listingsRef = collection(db, 'listings');
  const snapshot = await getDocs(listingsRef);

  const batch = writeBatch(db);
  let migrated = 0;

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.category === categoryId) {
      batch.update(docSnap.ref, { category: 'sonstiges' });
      migrated++;
    }
  });

  if (migrated > 0) {
    await batch.commit();
  }

  // Remove from local list and save
  const updated = allCategories.filter((c) => c.id !== categoryId);
  await saveCategories(updated);
  return updated;
}

/** Generate a URL-safe id from a label */
export function generateId(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}
