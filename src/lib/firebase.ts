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

// Detect current domain for authorization help
export function getCurrentDomain(): string {
  if (typeof window !== 'undefined') {
    return window.location.hostname;
  }
  return '';
}

// Log Firebase config for debugging
if (typeof window !== 'undefined') {
  console.log('[Firebase] Initialized with project:', firebaseConfig.projectId);
  console.log('[Firebase] Auth domain:', firebaseConfig.authDomain);
  console.log('[Firebase] Current app domain:', window.location.hostname);
}

export { app, auth, db };

/**
 * Utility to test Firebase connectivity
 * Call this to verify Auth + Firestore are reachable
 */
export async function testFirebaseConnection(): Promise<{
  auth: boolean;
  firestore: boolean;
  errors: string[];
  currentDomain?: string;
  authDomainAuthorized?: boolean;
}> {
  const result = {
    auth: false,
    firestore: false,
    errors: [] as string[],
    currentDomain: getCurrentDomain(),
    authDomainAuthorized: undefined as boolean | undefined,
  };

  // Test Auth - check if auth object is initialized AND domain is authorized
  try {
    if (auth && auth.app) {
      result.auth = true;
      console.log('[Firebase Test] Auth object: OK');

      // Try a lightweight auth operation to verify domain authorization
      try {
        const { signInAnonymously } = await import('firebase/auth');
        await signInAnonymously(auth);
        result.authDomainAuthorized = true;
        console.log('[Firebase Test] Auth domain: Authorized');

        // Sign out the anonymous user immediately
        const { signOut } = await import('firebase/auth');
        await signOut(auth);
      } catch (authErr: any) {
        if (authErr.code === 'auth/unauthorized-domain') {
          result.authDomainAuthorized = false;
          result.errors.push(`auth/unauthorized-domain: O domínio "${result.currentDomain}" não está autorizado no Firebase.`);
          console.error('[Firebase Test] Domain NOT authorized:', result.currentDomain);
        } else if (authErr.code === 'auth/operation-not-allowed') {
          // Anonymous auth might be disabled, but domain is likely OK
          result.authDomainAuthorized = true;
          console.log('[Firebase Test] Anonymous auth disabled, but domain likely authorized');
        } else {
          // Other auth errors - domain might still be authorized
          result.authDomainAuthorized = undefined;
          console.warn('[Firebase Test] Auth test error (domain may still be OK):', authErr.code);
        }
      }
    }
  } catch (e: any) {
    result.errors.push(`Auth: ${e.message}`);
    console.error('[Firebase Test] Auth error:', e.message);
  }

  // Test Firestore - try a simple read
  try {
    const { getDocs, collection } = await import('firebase/firestore');
    const snapshot = await getDocs(collection(db, 'users'));
    result.firestore = true;
    console.log('[Firebase Test] Firestore: OK -', snapshot.size, 'documents in users collection');
  } catch (e: any) {
    const msg = e.code || e.message || String(e);
    result.errors.push(`Firestore: ${msg}`);
    console.error('[Firebase Test] Firestore error:', e.code, e.message);

    // Provide specific guidance
    if (e.code === 'permission-denied') {
      result.errors.push('DICA: Vá em Firebase Console > Firestore Database > Rules e altere as regras para permitir acesso.');
    }
  }

  return result;
}
