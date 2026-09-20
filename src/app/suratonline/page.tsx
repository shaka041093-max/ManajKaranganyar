'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  FileText, 
  Search, 
  CheckCircle2, 
  Home,
  ShieldCheck, 
  FilePlus2,
  Sparkles,
  ArrowRight
} from 'lucide-react';

import { useFirebase } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function SuratOnlinePortalPage() {
  const { firestore } = useFirebase();
  const [configData, setConfigData] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('village_profile_cache');
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return null;
  });

  useEffect(() => {
    fetch('/api/village-profile/?t=' + Date.now(), { cache: 'no-store' })
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

  // Sinkronisasi realtime langsung dari Firestore document settings/village
  useEffect(() => {
    if (!firestore) return;
    const unsub = onSnapshot(doc(firestore, "settings", "village"), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setConfigData((prev: any) => ({ ...prev, ...d }));
      }
    }, () => {});
    return () => unsub();
  }, [firestore]);

  const getFormattedHeroImage = (data: any) => {
    const raw = data?.heroPhotoUrl || data?.heroPhotoBase64 || data?.heroImageUrl || data?.heroImageBase64;
    if (!raw || typeof raw !== 'string') return '/hero-desa.jpg';
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:') || raw.startsWith('/')) {
      return raw;
    }
    return `data:image/jpeg;base64,${raw}`;
  };

  const getFormattedLogo = (data: any) => {
    const raw = data?.logoBase64 || data?.logoUrl;
    if (!raw || typeof raw !== 'string') return '';
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:')) {
      return raw;
    }
    return `data:image/png;base64,${raw}`;
  };

  const heroImage = getFormattedHeroImage(configData);
  const logoImage = getFormattedLogo(configData);

  return (
    <div className="min-h-screen bg-slate-950 text-foreground flex flex-col font-sans selection:bg-primary/30 selection:text-primary-foreground">
      {/* ── Navbar Publik (Identik dengan Landing Page) ────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-card/80 backdrop-blur-md px-4 md:px-8 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3.5 hover:opacity-90 transition-opacity">
          <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center overflow-hidden relative shadow-md shadow-primary/20 shrink-0">
            {logoImage ? (
              <Image src={logoImage} alt="Logo" fill className="object-contain p-1" unoptimized />
            ) : (
              <Home className="h-5 w-5 text-white" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-lg md:text-xl font-black tracking-tighter uppercase text-primary leading-none">
              KARANGANYAR
            </span>
            <span className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
              Portal Layanan Mandiri Warga
            </span>
          </div>
        </Link>
      </header>

      {/* ── Hero Section Bersih (Sesuai Gaya Landing Page) ─────────────────── */}
      <section className="relative w-full overflow-hidden pt-16 pb-20 md:py-28">
        {/* Background Foto Desa atau Radial Grid Ambient */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          {heroImage ? (
            <>
              <Image
                src={heroImage}
                alt="Foto Utama Desa"
                fill
                priority
                className="object-cover object-center scale-105 transition-transform duration-1000 brightness-90"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-blue-950/60 to-slate-950/35" />
              <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[0.5px]" />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950">
              <div className="w-full h-full bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-20" />
            </div>
          )}
        </div>

        <div className="container relative z-10 mx-auto px-4 text-center">
          {/* Luminous Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-amber-400/40 text-amber-300 text-xs font-bold uppercase tracking-widest mb-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <ShieldCheck className="h-4 w-4 text-amber-400" />
            <span>Portal Resmi Pelayanan Surat Desa Online</span>
          </div>

          {/* Headline Typography (hero-title-aura & hero-title-accent) */}
          <div className="max-w-4xl mx-auto space-y-4 mb-9 md:mb-12 animate-in fade-in slide-in-from-bottom-6 duration-700 relative">
            <div className="absolute -inset-x-12 -inset-y-6 bg-gradient-to-r from-blue-500/0 via-sky-400/20 to-amber-500/0 blur-3xl -z-10 rounded-full pointer-events-none" />

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.14] uppercase select-none hero-title-aura">
              <span className="block hero-title-white">
                LAYANAN SURAT MANDIRI,
              </span>
              <span className="block mt-1 sm:mt-2 hero-title-accent">
                CEPAT, RESMI & TRANSPARAN
              </span>
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-sky-100/90 max-w-2xl mx-auto leading-relaxed font-normal">
              Ajukan permohonan administrasi kependudukan dan surat keterangan resmi Pemerintah Desa Karanganyar langsung dari smartphone Anda tanpa perlu antre di balai desa.
            </p>
          </div>

          {/* ── Tombol Pengajuan Surat Utama (Mengarahkan ke /pengajuan-surat/) ── */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-5 max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-bottom-10 duration-1000">
            {/* Tombol 1: Masuk ke Halaman Baru /pengajuan-surat/ */}
            <Link
              href="/pengajuan-surat/"
              className="w-full sm:w-auto min-w-[240px] md:min-w-[290px] h-16 md:h-18 px-8 md:px-10 rounded-2xl bg-white hover:bg-slate-50 active:bg-slate-100 text-blue-700 hover:text-blue-800 font-black text-base md:text-lg tracking-wide uppercase shadow-2xl shadow-black/30 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3 border border-white group"
            >
              <FilePlus2 className="h-6 w-6 text-blue-700 shrink-0 group-hover:rotate-6 transition-transform" />
              <span>AJUKAN SURAT SEKARANG</span>
            </Link>

            {/* Tombol 2: Lacak Status Permohonan */}
            <Link
              href="/pengajuan-surat/?tab=lacak"
              className="w-full sm:w-auto min-w-[240px] md:min-w-[290px] h-16 md:h-18 px-8 md:px-10 rounded-2xl bg-blue-950/60 hover:bg-blue-950/80 backdrop-blur-md border border-white/20 hover:border-amber-400/50 text-white font-bold text-base md:text-lg tracking-normal shadow-xl shadow-blue-950/40 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3"
            >
              <Search className="h-5 w-5 md:h-6 md:w-6 text-amber-400 shrink-0" />
              <span>Lacak Status Surat</span>
            </Link>
          </div>

          {/* Highlights 3 Poin */}
          <div className="pt-10 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm font-semibold text-sky-200/80">
            <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-white/10">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              15 Jenis Surat Resmi
            </div>
            <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-white/10">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              Verifikasi Langsung Admin Desa
            </div>
            <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-white/10">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              100% Bebas Biaya (Gratis)
            </div>
          </div>
        </div>
      </section>

      {/* ── Section Alur 3 Langkah (Menjaga Halaman Utama Sangat Bersih) ──── */}
      <section className="container mx-auto px-4 pb-24 max-w-5xl">
        <div className="text-center mb-10 space-y-2">
          <div className="inline-flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-widest mb-1">
            <Sparkles className="w-4 h-4" />
            Mudah, Cepat & Terdata
          </div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
            Alur Pelayanan <span className="text-gradient-desa">Surat Mandiri</span>
          </h2>
          <p className="text-xs sm:text-sm text-sky-200/70 max-w-md mx-auto">
            Hanya butuh 3 langkah praktis dari smartphone Anda tanpa perlu menunggu antrean di kantor desa.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link 
            href="/pengajuan-surat/"
            className="p-7 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md hover:border-amber-400/40 hover:bg-white/10 transition-all duration-300 space-y-4 group block"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-black text-lg group-hover:scale-105 transition-transform">
              1
            </div>
            <h3 className="text-base font-black text-white uppercase tracking-tight group-hover:text-amber-300 transition-colors">
              Pilih Jenis Surat
            </h3>
            <p className="text-xs text-sky-200/70 leading-relaxed">
              Tersedia 15 jenis surat administrasi kependudukan (SKTM, SKCK, Domisili, Usaha, Kelahiran, Kematian, dsb).
            </p>
            <span className="inline-flex items-center text-[11px] font-bold text-amber-400 group-hover:underline pt-1">
              Buka Katalog Surat <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </span>
          </Link>

          <Link 
            href="/pengajuan-surat/"
            className="p-7 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md hover:border-sky-400/40 hover:bg-white/10 transition-all duration-300 space-y-4 group block"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-sky-400 flex items-center justify-center font-black text-lg group-hover:scale-105 transition-transform">
              2
            </div>
            <h3 className="text-base font-black text-white uppercase tracking-tight group-hover:text-sky-300 transition-colors">
              Isi Data & Unggah Berkas
            </h3>
            <p className="text-xs text-sky-200/70 leading-relaxed">
              Lengkapi formulir dengan NIK pemohon dan unggah foto/scan KTP serta Kartu Keluarga (KK) yang jelas.
            </p>
            <span className="inline-flex items-center text-[11px] font-bold text-sky-400 group-hover:underline pt-1">
              Isi Formulir Sekarang <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </span>
          </Link>

          <Link 
            href="/pengajuan-surat/?tab=lacak"
            className="p-7 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md hover:border-emerald-400/40 hover:bg-white/10 transition-all duration-300 space-y-4 group block"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-black text-lg group-hover:scale-105 transition-transform">
              3
            </div>
            <h3 className="text-base font-black text-white uppercase tracking-tight group-hover:text-emerald-300 transition-colors">
              Verifikasi & Pengambilan
            </h3>
            <p className="text-xs text-sky-200/70 leading-relaxed">
              Admin desa memverifikasi permohonan. Pantau status realtime dan ambil berkas bermeterai di Balai Desa.
            </p>
            <span className="inline-flex items-center text-[11px] font-bold text-emerald-400 group-hover:underline pt-1">
              Cek Status Tiket <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </span>
          </Link>
        </div>
      </section>

      {/* ── Footer Publik (Sesuai Gaya Landing Page) ────────────────────── */}
      <footer className="bg-slate-950 text-sky-200/70 py-12 border-t border-slate-900 mt-auto">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center overflow-hidden relative">
                  {configData?.logoBase64 ? (
                    <Image src={configData.logoBase64} alt="Logo" fill className="object-contain p-1" unoptimized />
                  ) : (
                    <Home className="h-4 w-4 text-white" />
                  )}
                </div>
                <span className="text-xl font-black tracking-tighter text-white">KARANGANYAR.ID</span>
              </div>
              <p className="max-w-md leading-relaxed text-sm text-slate-300">
                Pemerintah Desa Karanganyar berkomitmen menghadirkan transformasi pelayanan publik yang transparan, mudah, dan bebas pungli bagi seluruh warga masyarakat.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-amber-400 font-bold text-sm uppercase tracking-widest">Akses Mandiri</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/pengajuan-surat/" className="hover:text-amber-300 transition-colors">
                    Ajukan Surat Baru
                  </Link>
                </li>
                <li>
                  <Link href="/pengajuan-surat/?tab=lacak" className="hover:text-amber-300 transition-colors">
                    Lacak Status Surat
                  </Link>
                </li>
                <li><Link href="/" className="hover:text-amber-300 transition-colors">Halaman Utama Desa</Link></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-amber-400 font-bold text-sm uppercase tracking-widest">Kantor Pelayanan</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Balai Desa Karanganyar<br />
                Kecamatan Gandrungmangu, Kabupaten Cilacap<br />
                Jawa Tengah - 53254
              </p>
              <p className="text-xs text-amber-300/80 font-semibold pt-1">
                Jam Layanan: Senin - Jumat (07:00 - 16:00 WIB)
              </p>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-900 text-center text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Pemerintah Desa Karanganyar. Seluruh hak cipta dilindungi.
          </div>
        </div>
      </footer>
    </div>
  );
}
