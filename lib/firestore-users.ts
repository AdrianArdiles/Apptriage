"use client";

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirestoreInstance } from "@/lib/firebase";

export const FIRESTORE_USERS_COLLECTION = "users";

export interface UserFirestoreDocument {
  uid: string;
  email: string;
  role: string;
  createdAt: string;
}

/**
 * Asegura que exista un documento para el usuario en la colección Firestore `users`.
 * Si no existe, lo crea con uid, email, role: 'USER' y createdAt (serverTimestamp).
 * Obligatorio tras registro exitoso (Email o Google) para que el usuario no quede en limbo.
 */
export async function ensureUserDocument(uid: string, email: string): Promise<void> {
  const fs = getFirestoreInstance();
  if (!fs) return;
  const userRef = doc(fs, FIRESTORE_USERS_COLLECTION, uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) return;
  await setDoc(userRef, {
    uid,
    email: (email ?? "").trim() || "",
    role: "USER",
    createdAt: serverTimestamp(),
  });
}
