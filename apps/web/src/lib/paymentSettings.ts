import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebaseClient';

export const DEFAULT_UNITS = ['flasche', 'kiste', 'dose', 'andere'];

export async function fetchPaymentUnits(): Promise<string[]> {
  try {
    const docRef = doc(db, 'settings', 'paymentMethods');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (Array.isArray(data.units) && data.units.length > 0) {
        return data.units;
      }
    }
  } catch (e) {
    console.warn("Failed to fetch payment units from Firestore, using default:", e);
  }
  return DEFAULT_UNITS;
}

export async function savePaymentUnits(units: string[]): Promise<void> {
  const docRef = doc(db, 'settings', 'paymentMethods');
  await setDoc(docRef, { units }, { merge: true });
}
