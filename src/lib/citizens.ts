'use client';

import { Firestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { CitizenProfile } from './types';

export const getCitizenProfile = async (db: Firestore, uid: string): Promise<CitizenProfile | null> => {
  if (!uid) return null;
  const docRef = doc(db, 'citizens', uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as CitizenProfile;
  }
  return null;
};

export const saveCitizenProfile = async (db: Firestore, uid: string, data: { phoneNumber: string; email: string }) => {
  const docRef = doc(db, 'citizens', uid);
  await setDoc(docRef, {
    uid,
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
};
