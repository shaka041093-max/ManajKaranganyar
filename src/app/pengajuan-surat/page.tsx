'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { 
  FileText, 
  Search, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Home,
  LogIn,
  ShieldCheck, 
  Calendar,
  AlertCircle,
  Loader2,
  Ticket,
  FilePlus2,
  UserCheck,
  Menu,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LetterService } from '@/app/(main)/layanan-surat/_components/letter-service';
import { searchSubmissionsByCitizen } from '@/lib/submissions';
import { LetterSubmission } from '@/lib/types';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

function PengajuanSuratContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'lacak' ? 'lacak' : 'ajukan';
  const [activeTab, setActiveTab] = useState<'ajukan' | 'lacak'>(initialTab);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<LetterSubmission[] | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [configData, setConfigData] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('village_profile_cache');
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return null;
  });

  const { firestore } = useFirebase();
  const { toast } = useToast();

  useEffect(() => {
    fetch('/api/village-profile')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setConfigData((prev: any) => ({ ...prev, ...data }));
          try {
            localStorage.setItem('village_profile_cache', JSON.stringify(data));
          } catch (e) {}
        }
      })
      .catch(() => {});
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      toast({
        title: "Pencarian Kosong",
        description: "Silakan masukkan NIK 16 digit atau Kode Tiket pengajuan Anda.",
        variant: "destructive",
      });
      return;
    }

    if (!firestore) {
      toast({
        title: "Koneksi Bermasalah",
        description: "Gagal terhubung ke database. Coba beberapa saat lagi.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    try {
      const results = await searchSubmissionsByCitizen(firestore, searchQuery);
      setSearchResults(results);
    } catch (error: any) {
      console.error("Error searching status:", error);
      toast({
        title: "Gagal Mencari",
        description: "Terjadi kesalahan saat memuat status permohonan.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const maskNik = (nik?: string) => {
    if (!nik || nik.length < 8) return nik || '-';
    return nik.substring(0, 6) + '******' + nik.substring(nik.length - 4);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return '-';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-primary/20 selection:text-primary">
      {/* ── Navbar Publik ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 md:px-8 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center overflow-hidden relative shadow-md shadow-primary/20 shrink-0">
            {configData?.logoBase64 ? (
              <Image src={configData.logoBase64} alt="Logo" fill className="object-contain p-1" unoptimized />
            ) : (
              <Home className="h-5 w-5 text-white" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-black tracking-tighter uppercase text-slate-900 leading-none">
              DESA KARANGANYAR
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
              Layanan Surat Mandiri Online
            </span>
          </div>
        </div>

        {/* Action Button: Kembali ke Beranda Layanan */}
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-xl font-bold border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-primary transition-all text-xs sm:text-sm">
            <Link href="/suratonline/">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              <span className="hidden xs:inline">Beranda Layanan</span>
              <span className="xs:hidden">Kembali</span>
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="rounded-xl font-bold text-slate-500 hover:text-slate-900 text-xs hidden md:inline-flex">
            <Link href="/">
              Halaman Utama
            </Link>
          </Button>
        </div>
      </header>

      {/* ── Top Header Banner ────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 text-white py-10 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_50%)] pointer-events-none" />
        <div className="max-w-5xl mx-auto space-y-3 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/15 text-amber-300 text-xs font-bold tracking-wide">
            <ShieldCheck className="w-4 h-4" />
            Formulir Resmi Pengajuan Surat Mandiri
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight">
            Pusat Pelayanan Surat <span className="text-amber-400">Desa Karanganyar</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Pilih surat yang Anda butuhkan di bawah ini, lengkapi formulir permohonan, dan lampirkan foto KTP serta KK untuk diverifikasi oleh Admin Desa.
          </p>
        </div>
      </div>

      {/* ── Main Container: Tab & Formulir ────────────────────────────── */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 -mt-6 pb-20 z-20">
        <div className="rounded-3xl border border-slate-200/90 shadow-xl bg-white overflow-hidden text-slate-900">
          {/* Tab Switcher */}
          <div className="border-b border-slate-100 bg-slate-50/90 p-3 sm:p-4">
            <div className="grid grid-cols-2 gap-2 sm:gap-4 max-w-md mx-auto">
              <button
                type="button"
                onClick={() => setActiveTab('ajukan')}
                className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl font-black text-xs sm:text-sm tracking-wide transition-all cursor-pointer ${
                  activeTab === 'ajukan'
                    ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-[1.02]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Ajukan Surat Baru</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('lacak')}
                className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl font-black text-xs sm:text-sm tracking-wide transition-all cursor-pointer ${
                  activeTab === 'lacak'
                    ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-[1.02]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>Lacak Status Surat</span>
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-8 md:p-10">
            {activeTab === 'ajukan' ? (
              <div className="space-y-8">
                {/* Petunjuk Persyaratan */}
                <div className="bg-gradient-to-r from-blue-50 via-indigo-50/40 to-blue-50 border border-blue-200/80 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <h2 className="text-sm sm:text-base font-extrabold text-blue-950 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
                      Petunjuk Permohonan Surat Online
                    </h2>
                    <p className="text-xs sm:text-sm text-blue-900/80 leading-relaxed max-w-3xl">
                      Pilih salah satu kartu jenis surat di bawah ini dan lengkapi data pemohon. Pastikan telah menyiapkan foto/scan <strong>KTP dan Kartu Keluarga (KK)</strong> Anda. Setelah permohonan dikirim, simpan <strong>Kode Tiket</strong> untuk memeriksa status persetujuan admin.
                    </p>
                  </div>
                </div>

                {/* Katalog 15 Formulir Surat Mandiri Warga */}
                <LetterService isAdmin={false} />
              </div>
            ) : (
              /* Tab Lacak Status Surat */
              <div className="space-y-8 max-w-3xl mx-auto py-4">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                    <Search className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Cek Status & Progres Surat Anda
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                    Ketik 16 Digit NIK Pemohon atau Kode Tiket Pengajuan (contoh: <span className="font-mono font-bold text-slate-700">TKT-2026-XXXX</span>) untuk melihat status verifikasi terkini.
                  </p>
                </div>

                {/* Form Pencarian */}
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Ketik NIK Pemohon atau Kode Tiket..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12 h-13 rounded-2xl text-sm border-slate-200 focus:border-primary shadow-xs"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isSearching}
                    className="h-13 px-7 rounded-2xl font-bold bg-primary hover:bg-primary/90 text-white shrink-0 shadow-lg shadow-primary/20"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Mencari...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Lacak Surat
                      </>
                    )}
                  </Button>
                </form>

                {/* Hasil Pencarian */}
                {hasSearched && (
                  <div className="space-y-5 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                        Hasil Pencarian ({searchResults?.length || 0} Ditemukan)
                      </h3>
                      {searchResults && searchResults.length > 0 && (
                        <span className="text-xs text-slate-500 font-semibold">
                          Kata kunci: "{searchQuery}"
                        </span>
                      )}
                    </div>

                    {searchResults && searchResults.length > 0 ? (
                      <div className="space-y-4">
                        {searchResults.map((sub) => {
                          const isApproved = sub.status === 'APPROVED' || sub.status === 'COMPLETED' || sub.status === 'disetujui';
                          const isRejected = sub.status === 'REJECTED' || sub.status === 'ditolak';
                          const isPending = !isApproved && !isRejected;

                          return (
                            <Card key={sub.id} className="rounded-2xl border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                              <div className={`h-1.5 w-full ${
                                isApproved ? 'bg-emerald-500' : isRejected ? 'bg-rose-500' : 'bg-amber-500'
                              }`} />
                              <CardContent className="p-5 sm:p-6 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className="font-extrabold text-base sm:text-lg text-slate-900">
                                        {sub.letterType}
                                      </h4>
                                      <Badge variant="outline" className="font-mono text-xs font-bold bg-slate-50 text-slate-700">
                                        <Ticket className="w-3 h-3 mr-1" />
                                        {sub.ticketNumber || 'Tanpa Tiket'}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                      Diajukan: {formatDate(sub.createdAt)}
                                    </p>
                                  </div>

                                  <div>
                                    {isApproved && (
                                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 font-bold px-3 py-1 text-xs gap-1.5">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        Disetujui Admin
                                      </Badge>
                                    )}
                                    {isPending && (
                                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border border-amber-300 font-bold px-3 py-1 text-xs gap-1.5">
                                        <Clock className="w-4 h-4 text-amber-600" />
                                        Menunggu Verifikasi Admin
                                      </Badge>
                                    )}
                                    {isRejected && (
                                      <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border border-rose-300 font-bold px-3 py-1 text-xs gap-1.5">
                                        <XCircle className="w-4 h-4 text-rose-600" />
                                        Ditolak / Perlu Perbaikan
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                {/* Data Pemohon Ringkas */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                                  <div>
                                    <span className="text-slate-400 font-medium block">Nama Pemohon:</span>
                                    <span className="font-bold text-slate-800 uppercase">{sub.requesterName || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 font-medium block">NIK Pemohon:</span>
                                    <span className="font-mono font-bold text-slate-800">{maskNik(sub.nik)}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 font-medium block">Nomor Surat Resmi:</span>
                                    <span className={`font-mono font-bold ${sub.documentNumber && sub.documentNumber !== 'Belum Ada' ? 'text-primary' : 'text-slate-500'}`}>
                                      {sub.documentNumber || 'Belum Diterbitkan'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 font-medium block">Terakhir Diperbarui:</span>
                                    <span className="font-medium text-slate-700">{formatDate(sub.updatedAt)}</span>
                                  </div>
                                </div>

                                {/* Kotak Status & Arahan */}
                                {isApproved && (
                                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 space-y-1.5">
                                    <p className="font-bold flex items-center gap-1.5 text-emerald-800">
                                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                      Surat Telah Siap Diambil!
                                    </p>
                                    <p className="leading-relaxed">
                                      Permohonan surat Anda telah selesai diverifikasi dan disetujui. Silakan datang ke <strong>Kantor Balai Desa Karanganyar</strong> pada jam kerja (Senin - Jumat, 07:00 - 16:00 WIB) dengan menunjukkan <strong>Kode Tiket</strong> dan <strong>KTP Asli</strong> kepada petugas loket untuk pengambilan dokumen bertanda tangan resmi.
                                    </p>
                                  </div>
                                )}

                                {isPending && (
                                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-1.5">
                                    <p className="font-bold flex items-center gap-1.5 text-amber-800">
                                      <Clock className="w-4 h-4 text-amber-600" />
                                      Sedang Dalam Antrean Verifikasi
                                    </p>
                                    <p className="leading-relaxed">
                                      Petugas Admin Desa sedang memeriksa keabsahan berkas KTP/KK dan data yang Anda kirimkan. Harap pantau berkala halaman pelacakan ini.
                                    </p>
                                  </div>
                                )}

                                {isRejected && (
                                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-900 space-y-1.5">
                                    <p className="font-bold flex items-center gap-1.5 text-rose-800">
                                      <XCircle className="w-4 h-4 text-rose-600" />
                                      Permohonan Ditolak / Dibatalkan
                                    </p>
                                    <p className="leading-relaxed">
                                      {sub.notes 
                                        ? `Catatan Admin: "${sub.notes}"`
                                        : 'Data atau berkas persyaratan yang dilampirkan belum sesuai. Silakan hubungi Kantor Balai Desa Karanganyar atau lakukan pengajuan ulang dengan data yang benar.'}
                                    </p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                        <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
                        <h4 className="font-bold text-slate-700 text-sm">
                          Data Pengajuan Tidak Ditemukan
                        </h4>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                          Tidak ditemukan permohonan surat dengan kata kunci <strong>"{searchQuery}"</strong>. Pastikan NIK atau Kode Tiket sudah tepat.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Card Navigation */}
          <div className="border-t border-slate-100 bg-slate-50/60 p-4 text-center">
            <Link
              href="/suratonline/"
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-primary transition-colors py-1"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali ke Portal Layanan Mandiri
            </Link>
          </div>
        </div>
      </main>

      {/* ── Footer Publik ───────────────────────────────────────────── */}
      <footer className="bg-white border-t border-slate-200 py-8 px-4 text-center text-xs text-slate-500 space-y-2 mt-auto">
        <p className="font-bold text-slate-800">
          Pemerintah Desa Karanganyar &copy; {new Date().getFullYear()}
        </p>
        <p className="text-[11px] text-slate-400 max-w-md mx-auto">
          Kecamatan Gandrungmangu, Kabupaten Cilacap, Jawa Tengah. Melayani permohonan surat masyarakat dengan cepat, transparan, dan akuntabel.
        </p>
      </footer>
    </div>
  );
}

export default function PengajuanSuratPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <PengajuanSuratContent />
    </Suspense>
  );
}
