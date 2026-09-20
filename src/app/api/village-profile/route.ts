import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminDb() {
  if (!getApps().length) {
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
        privateKey: privateKey,
      })
    });
  }
  return getFirestore();
}

export async function GET() {
  try {
    const db = getAdminDb();
    const snap = await db.doc('settings/village').get();
    if (!snap.exists) {
      return NextResponse.json({
        logoBase64: null,
        heroPhotoBase64: null,
        heroPhotoUrl: null,
        headline: null,
        subheadline: null,
      });
    }
    const data = snap.data();
    return NextResponse.json({
      logoBase64: data?.logoBase64 || null,
      heroPhotoBase64: data?.heroPhotoBase64 || null,
      heroPhotoUrl: data?.heroPhotoUrl || null,
      headline: data?.headline || null,
      subheadline: data?.subheadline || null,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120'
      }
    });
  } catch (error: any) {
    console.error('Error in village-profile API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
