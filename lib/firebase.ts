/**
 * Firebase: Auth (login/registro), Firestore (authorized_users, users), Realtime (intervenciones, perfil).
 * Atenciones están en Neon; no se usan Firestore/Realtime para atenciones en el flujo principal.
 */
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCzRTO43mNQB-0YdAmb1Qv2lA1zFZ9yle4",
  authDomain: "ambulanciapro.firebaseapp.com",
  projectId: "ambulanciapro",
  databaseURL: "https://ambulanciapro-default-rtdb.firebaseio.com/",
  storageBucket: "ambulanciapro.firebasestorage.app",
  messagingSenderId: "882958082764",
  appId: "1:882958082764:web:4641d0c607223a9e871869",
  measurementId: "G-WD5VJ9DJLQ",
};

let app: ReturnType<typeof initializeApp> | null = null;
let db: ReturnType<typeof getDatabase> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let firestore: ReturnType<typeof getFirestore> | null = null;

function getFirebaseApp() {
  if (typeof window === "undefined") return null;
  if (!app) app = initializeApp(firebaseConfig);
  return app;
}

/** Base de datos Realtime. Solo disponible en el cliente. */
export function getDb() {
  if (typeof window === "undefined") return null;
  if (!db) {
    const a = getFirebaseApp();
    if (a) db = getDatabase(a);
  }
  return db;
}

/** Firestore (db). Solo disponible en el cliente. Usado para authorized_users, users y atenciones. */
export function getFirestoreInstance() {
  if (typeof window === "undefined") return null;
  if (!firestore) {
    const a = getFirebaseApp();
    if (a) firestore = getFirestore(a);
  }
  return firestore;
}

/** Alias para compatibilidad: instancia de Firestore (misma que getFirestoreInstance). */
export function getDbFirestore() {
  return getFirestoreInstance();
}

/** Firebase Authentication. Solo disponible en el cliente. */
export function getAuthInstance() {
  if (typeof window === "undefined") return null;
  if (!auth) {
    const a = getFirebaseApp();
    if (a) auth = getAuth(a);
  }
  return auth;
}
