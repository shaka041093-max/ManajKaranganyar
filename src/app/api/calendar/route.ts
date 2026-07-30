/**
 * @fileOverview API Route: /api/calendar
 * Mengambil data agenda Google Calendar secara server-side.
 * Server-to-server request tidak terkena batasan CORS browser.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GOOGLE_CONFIG } from '@/lib/google-config';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, calendarId } = body;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const resp = await fetch(GOOGLE_CONFIG.appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'getCalendar',
        date: date || new Date().toISOString().split('T')[0],
        calendarId: calendarId || GOOGLE_CONFIG.calendarId,
      }),
      signal: controller.signal,
      redirect: 'follow', // Ikuti redirect dari Google Apps Script
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      console.warn('[api/calendar] Apps Script HTTP:', resp.status);
      return NextResponse.json({ success: false, items: [], error: `Apps Script HTTP ${resp.status}` });
    }

    const text = await resp.text();
    let result: any;
    try {
      result = JSON.parse(text);
    } catch {
      console.warn('[api/calendar] Gagal parse JSON response:', text.substring(0, 200));
      return NextResponse.json({ success: false, items: [], error: 'Invalid JSON from Apps Script' });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    // Silent: kembalikan array kosong bukan error, agar UI tidak crash
    console.warn('[api/calendar] Gagal mengambil kalender:', err?.message);
    return NextResponse.json({ success: false, items: [], error: err?.message });
  }
}

