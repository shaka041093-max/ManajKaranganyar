/**
 * @fileOverview API Route: /api/upload-drive
 * Mengunggah berkas lampiran pengajuan surat ke Google Drive secara server-side.
 * Server-to-server request tidak terkena batasan CORS browser.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GOOGLE_CONFIG } from '@/lib/google-config';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { files, folderId } = body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ success: false, error: 'Tidak ada berkas untuk diunggah' }, { status: 400 });
    }

    const targetFolderId = folderId || GOOGLE_CONFIG.parentFolderId;
    const results: any[] = [];

    for (const fileItem of files) {
      if (!fileItem.base64Data) continue;

      const cleanFileName = fileItem.targetFileName
        ? `${fileItem.targetFileName}.pdf`
        : `LAMPIRAN_${(fileItem.fieldName || 'BERKAS').toUpperCase()}_${fileItem.nik || Date.now()}`;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout server-side

        const resp = await fetch(GOOGLE_CONFIG.appsScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'uploadArchiveFile',
            folderId: targetFolderId,
            fileName: cleanFileName,
            fileData: {
              type: fileItem.mimeType || 'application/pdf',
              base64: fileItem.base64Data,
            },
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!resp.ok) {
          throw new Error(`Apps Script HTTP ${resp.status}`);
        }

        const uploadResult = await resp.json();

        if (uploadResult?.success) {
          results.push({
            fieldName: fileItem.fieldName || 'lampiran',
            fileName: cleanFileName,
            fileUrl: uploadResult.fileUrl || uploadResult.url || `https://drive.google.com/drive/folders/${targetFolderId}`,
            fileId: uploadResult.fileId || uploadResult.id,
          });
        } else {
          results.push({
            fieldName: fileItem.fieldName || 'lampiran',
            fileName: cleanFileName,
            fileUrl: `https://drive.google.com/drive/folders/${targetFolderId}`,
          });
        }
      } catch (uploadErr: any) {
        console.warn(`[upload-drive] Gagal unggah ${cleanFileName}:`, uploadErr?.message);
        results.push({
          fieldName: fileItem.fieldName || 'lampiran',
          fileName: cleanFileName,
          fileUrl: `https://drive.google.com/drive/folders/${targetFolderId}`,
        });
      }
    }

    return NextResponse.json({ success: true, driveFiles: results });
  } catch (err: any) {
    console.error('[upload-drive] Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}
