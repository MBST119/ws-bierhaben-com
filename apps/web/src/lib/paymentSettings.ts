import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebaseClient';

export interface PaymentUnit {
  id: string;    // lowercase key, e.g. 'flasche'
  label: string; // singular display name, e.g. 'Flasche'
  labelPlural?: string; // plural display name, e.g. 'Flaschen'
  emoji: string; // e.g. '🍺'
}

export const DEFAULT_UNITS: PaymentUnit[] = [
  { id: 'flasche', label: 'Flasche', labelPlural: 'Flaschen', emoji: '🍺' },
  { id: 'kiste',   label: 'Kiste',   labelPlural: 'Kisten',   emoji: '🍻' },
  { id: 'dose',    label: 'Dose',    labelPlural: 'Dosen',    emoji: '🥫' },
  { id: 'andere',  label: 'Andere',  labelPlural: 'Andere',   emoji: '🥤' },
];

export async function fetchPaymentUnits(): Promise<PaymentUnit[]> {
  try {
    const docRef = doc(db, 'settings', 'paymentMethods');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      // Support new object format
      if (Array.isArray(data.units) && data.units.length > 0) {
        // Migrate legacy formats on the fly
        const units = data.units.map((u: any) => {
          if (typeof u === 'string') {
            return DEFAULT_UNITS.find((d) => d.id === u) ?? { id: u, label: u, labelPlural: u, emoji: '🍺' };
          }
          const fallbackDefault = DEFAULT_UNITS.find((d) => d.id === u.id);
          return {
            id: u.id,
            label: u.label,
            labelPlural: u.labelPlural || fallbackDefault?.labelPlural || u.label,
            emoji: u.emoji || '🍺'
          };
        }) as PaymentUnit[];
        return units;
      }
    }
  } catch (e) {
    console.warn('Failed to fetch payment units from Firestore, using defaults:', e);
  }
  return DEFAULT_UNITS;
}

export async function savePaymentUnits(units: PaymentUnit[]): Promise<void> {
  const docRef = doc(db, 'settings', 'paymentMethods');
  await setDoc(docRef, { units }, { merge: true });
}
