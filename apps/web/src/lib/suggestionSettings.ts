import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebaseClient';

export interface SuggestionCategory {
  id: string;      // key, e.g. 'fehler'
  label: string;   // e.g. 'Fehler / Bug'
  emoji: string;   // e.g. '🐛'
}

export const DEFAULT_SUGGESTION_CATEGORIES: SuggestionCategory[] = [
  { id: 'fehler', label: 'Fehler / Bug', emoji: '🐛' },
  { id: 'feature', label: 'Feature-Wunsch', emoji: '💡' },
  { id: 'design', label: 'Design / UI', emoji: '🎨' },
  { id: 'sonstiges', label: 'Sonstiges', emoji: '💬' },
];

export async function fetchSuggestionCategories(): Promise<SuggestionCategory[]> {
  try {
    const docRef = doc(db, 'settings', 'suggestionCategories');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (Array.isArray(data.categories) && data.categories.length > 0) {
        return data.categories as SuggestionCategory[];
      }
    }
  } catch (e) {
    console.warn('Failed to fetch suggestion categories from Firestore, using defaults:', e);
  }
  return DEFAULT_SUGGESTION_CATEGORIES;
}

export async function saveSuggestionCategories(categories: SuggestionCategory[]): Promise<void> {
  const docRef = doc(db, 'settings', 'suggestionCategories');
  await setDoc(docRef, { categories }, { merge: true });
}
