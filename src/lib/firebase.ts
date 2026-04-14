import { initializeApp, getApps } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAEna6As27XcKygurMoBUJuYu742Gfud5E",
  authDomain: "crm-sis-f9c29.firebaseapp.com",
  projectId: "crm-sis-f9c29",
  storageBucket: "crm-sis-f9c29.firebasestorage.app",
  messagingSenderId: "432058407817",
  appId: "1:432058407817:web:54398396d18a45afe89f58",
  measurementId: "G-5M5V0KJ47Q",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

// Log Firebase config for debugging (remove in production)
if (typeof window !== 'undefined') {
  console.log('[Firebase] Initialized with project:', firebaseConfig.projectId);
  console.log('[Firebase] Auth domain:', firebaseConfig.authDomain);
}

export { app, auth, db };

/**
 * Utility to test Firebase connectivity
 * Call this to verify Auth + Firestore are reachable
 */
export async function testFirebaseConnection(): Promise<{ auth: boolean; firestore: boolean; errors: string[] }> {
  const result = { auth: false, firestore: false, errors: [] as string[] };

  // Test Auth - just check if auth object is initialized
  try {
    if (auth && auth.app) {
      result.auth = true;
      console.log('[Firebase Test] Auth: OK');
    }
  } catch (e: any) {
    result.errors.push(`Auth: ${e.message}`);
    console.error('[Firebase Test] Auth error:', e.message);
  }

  // Test Firestore - try a simple read
  try {
    const { getDocs, collection } = await import('firebase/firestore');
    // Try to read from a collection - this will test permissions too
    const snapshot = await getDocs(collection(db, 'users'));
    result.firestore = true;
    console.log('[Firebase Test] Firestore: OK -', snapshot.size, 'documents in users collection');
  } catch (e: any) {
    const msg = e.code || e.message || String(e);
    result.errors.push(`Firestore: ${msg}`);
    console.error('[Firebase Test] Firestore error:', e.code, e.message);

    // Provide specific guidance
    if (e.code === 'permission-denied') {
      result.errors.push('DICA: Vá em Firebase Console > Firestore > Rules e configure as regras para permitir acesso.');
    }
  }

  return result;
}
