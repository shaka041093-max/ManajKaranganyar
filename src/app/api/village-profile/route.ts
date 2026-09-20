import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    
    let logoBase64 = null;
    let heroPhotoBase64 = null;
    let heroPhotoUrl = null;
    let headline = null;
    let subheadline = null;

    if (snap.exists) {
      const data = snap.data();
      logoBase64 = data?.logoBase64 || null;
      heroPhotoBase64 = data?.heroPhotoBase64 || null;
      heroPhotoUrl = data?.heroPhotoUrl || null;
      headline = data?.headline || null;
      subheadline = data?.subheadline || null;
    }

    // Default fallback jika foto utama belum ada di firestore
    if (!heroPhotoBase64 && !heroPhotoUrl) {
      heroPhotoUrl = '/hero-desa.jpg';
    }

    return NextResponse.json({
      logoBase64,
      heroPhotoBase64,
      heroPhotoUrl,
      headline,
      subheadline,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error: any) {
    console.error('Error in village-profile API:', error);
    return NextResponse.json({ 
      heroPhotoUrl: '/hero-desa.jpg',
      error: error.message 
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.heroPhotoBase64 && typeof body.heroPhotoBase64 === 'string') {
      try {
        const rawBase64 = body.heroPhotoBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(rawBase64, 'base64');
        const filePath = path.join(process.cwd(), 'public', 'hero-desa.jpg');
        fs.writeFileSync(filePath, buffer);
      } catch (fileErr) {
        console.warn('Gagal menulis foto ke public/hero-desa.jpg:', fileErr);
      }
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
