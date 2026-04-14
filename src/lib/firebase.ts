import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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

export { app, auth, db };
