'use client';

import { LetterService } from '@/app/(main)/layanan-surat/_components/letter-service';

export default function AdminPengajuanSuratPage() {
  return (
    <div className="p-6 md:p-8 space-y-6 pb-16 max-w-7xl mx-auto">


      {/* Header Admin Pengajuan Surat */}
      <div className="space-y-1.5 mb-2">
        <div className="flex items-center gap-2.5">
          <div className="h-6 w-1.5 bg-[#0f5132] rounded-full" />
          <h1 className="text-xl md:text-2xl font-black uppercase text-slate-900 tracking-tight font-serif italic">
            PENGAJUAN SURAT BARU
          </h1>
        </div>
        <p className="text-xs text-slate-500 font-medium pl-4">
          Input pengajuan surat secara langsung dari dashboard administrasi. Khusus admin, lampiran berkas bersifat opsional.
        </p>
      </div>

      {/* Main Grid & Form Selection UI */}
      <LetterService isAdmin={true} />
    </div>

  );
}
