
'use client';

import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { Button } from "@/components/ui/button"
import { Home, LogIn, ChevronRight, Shield, Clock, MapPin, ExternalLink, Globe, UserCheck, ShieldCheck, Menu, FileText } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { doc, onSnapshot } from "firebase/firestore"
import { useEffect, useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export default function LandingPage() {
  const { user } = useUser()
  const db = useFirestore()
  const [mounted, setMounted] = useState(false)
  const [configData, setConfigData] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('village_profile_cache')
        if (cached) return JSON.parse(cached)
      } catch (e) {}
    }
    return null
  })

  useEffect(() => {
    setMounted(true)
    // Tarik data profil desa publik (termasuk foto utama & logo) via API route
    fetch('/api/village-profile/?t=' + Date.now(), { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setConfigData((prev: any) => ({ ...prev, ...data }))
          try {
            localStorage.setItem('village_profile_cache', JSON.stringify(data))
          } catch (e) {}
        }
      })
      .catch(err => console.warn('Could not fetch village profile API:', err))
  }, [])

  // Jika user sedang login, aktifkan listener onSnapshot Firestore untuk update real-time
  useEffect(() => {
    if (!db || !user) return
    const unsub = onSnapshot(doc(db, "settings", "village"), (snap) => {
      if (snap.exists()) {
        const d = snap.data()
        setConfigData((prev: any) => ({ ...prev, ...d }))
      }
    })
    return () => unsub()
  }, [db, user])

  if (!mounted) return null

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
    <div className="flex min-h-screen flex-col bg-transparent">
      <header className="px-4 lg:px-10 h-20 flex items-center justify-between border-b border-border/70 bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden relative">
            {logoImage ? (
              <Image
                src={logoImage}
                alt="Logo Desa"
                fill
                className="object-contain p-1.5"
                unoptimized
              />
            ) : (
              <Home className="h-6 w-6 text-white" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tighter uppercase text-primary leading-none">KARANGANYAR</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sistem Manajemen Desa</span>
          </div>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex gap-2">
          <Button asChild variant="outline" className="rounded-full font-bold border-amber-400/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-all">
            <Link href="/suratonline/">
              <FileText className="w-4 h-4 mr-1.5 text-amber-500" />
              Surat Online Warga
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full font-bold border-primary/40 text-primary bg-card/80 backdrop-blur-md hover:bg-primary/10 transition-all">
            <Link href="/absensi/login/">Absensi</Link>
          </Button>
          <Button asChild variant="default" className="rounded-full font-bold bg-blue-900 hover:bg-blue-800 text-white shadow-md shadow-blue-950/20 hover:scale-105 transition-all">
            <Link href="/absensi-admin/login/">Admin Absensi</Link>
          </Button>
        </div>

        {/* Mobile Nav (Hamburger) */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/5">
                <Menu className="h-6 w-6 text-primary" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] border-none rounded-l-[2rem] shadow-2xl bg-background">
              <SheetHeader className="text-left pb-6 border-b border-border">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                    {configData?.logoBase64 ? (
                      <Image src={configData.logoBase64} alt="Logo" width={24} height={24} className="object-contain" unoptimized />
                    ) : (
                      <Home className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <SheetTitle className="text-primary font-black uppercase tracking-tighter">Menu Utama</SheetTitle>
                </div>
                <SheetDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Digitalisasi Desa Karanganyar</SheetDescription>
              </SheetHeader>

              <div className="py-8 space-y-3">
                <Button asChild variant="ghost" className="w-full h-14 justify-start gap-4 rounded-2xl text-sm font-black uppercase tracking-tight bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 transition-all">
                  <Link href="/suratonline/">
                    <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
                      <FileText className="h-5 w-5" />
                    </div>
                    Surat Online Warga
                  </Link>
                </Button>

                <Button asChild variant="ghost" className="w-full h-14 justify-start gap-4 rounded-2xl text-sm font-black uppercase tracking-tight hover:bg-primary/5 hover:text-primary transition-all">
                  <Link href="/login/">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <LogIn className="h-5 w-5 text-primary" />
                    </div>
                    Masuk Sistem
                  </Link>
                </Button>

                <Button asChild variant="ghost" className="w-full h-14 justify-start gap-4 rounded-2xl text-sm font-black uppercase tracking-tight hover:bg-primary/5 hover:text-primary transition-all">
                  <Link href="/absensi/login/">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <UserCheck className="h-5 w-5 text-primary" />
                    </div>
                    Absensi Perangkat
                  </Link>
                </Button>

                <Button asChild variant="ghost" className="w-full h-14 justify-start gap-4 rounded-2xl text-sm font-black uppercase tracking-tight hover:bg-blue-50 transition-all">
                  <Link href="/absensi-admin/login/">
                    <div className="h-10 w-10 rounded-xl bg-blue-900 flex items-center justify-center shrink-0">
                      <ShieldCheck className="h-5 w-5 text-white" />
                    </div>
                    Admin Absensi
                  </Link>
                </Button>
              </div>

              <div className="absolute bottom-10 left-6 right-6 border-t border-border pt-6">
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Pemerintah Desa Karanganyar</p>
                  <p className="text-[9px] text-muted-foreground/60 font-medium">Kabupaten Cilacap, Jawa Tengah</p>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative w-full min-h-[calc(100vh-5rem)] flex items-center justify-center overflow-hidden py-16 md:py-24">
          {/* Foto Halaman Utama dari Pengaturan /settings */}
          <div className="absolute inset-0 z-0">
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
                <div className="w-full h-full bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
              </div>
            )}
          </div>

          <div className="container relative z-10 mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-sky-400/25 text-sky-300 text-[11px] font-bold uppercase tracking-widest mb-4 md:mb-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <span className="h-2 w-2 rounded-full bg-sky-400 animate-ping" />
              Sistem Informasi Desa Mandiri
            </div>

            <div className="max-w-4xl mx-auto space-y-3.5 mb-7 md:mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700 relative">
              {/* Luminous ambient glow behind title */}
              <div className="absolute -inset-x-12 -inset-y-6 bg-gradient-to-r from-blue-500/0 via-sky-400/20 to-amber-500/0 blur-3xl -z-10 rounded-full pointer-events-none" />

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.14] uppercase select-none hero-title-aura">
                {(() => {
                  const raw = configData?.headline || "Membangun Desa Digital, Melayani dengan Presisi";
                  if (raw.includes(",")) {
                    const [first, ...rest] = raw.split(",");
                    return (
                      <>
                        <span className="block hero-title-white">
                          {first.trim()},
                        </span>
                        <span className="block mt-1 sm:mt-2 hero-title-accent">
                          {rest.join(",").trim()}
                        </span>
                      </>
                    );
                  }
                  return (
                    <span className="block hero-title-accent">
                      {raw}
                    </span>
                  );
                })()}
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-sky-100/90 max-w-2xl mx-auto leading-relaxed font-normal">
                {configData?.subheadline || "Platform terintegrasi pengelolaan administrasi, absensi perangkat desa, dokumentasi kegiatan, dan informasi anggaran transparan."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-5 max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-bottom-10 duration-1000">
              {/* Tombol 1: Masuk Sistem (White Card with Royal Navy Blue Text) */}
              <Link
                href="/login/"
                className="w-full sm:w-auto min-w-[240px] md:min-w-[280px] h-16 md:h-18 px-8 md:px-10 rounded-2xl bg-white hover:bg-slate-50 active:bg-slate-100 text-blue-700 hover:text-blue-800 font-black text-base md:text-lg tracking-wide uppercase shadow-xl shadow-black/25 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3 border border-white"
              >
                <LogIn className="h-5 w-5 md:h-6 md:w-6 text-blue-700 shrink-0" />
                <span>MASUK SISTEM</span>
              </Link>

              {/* Tombol 2: Absensi Perangkat (Glass Sapphire Tint Card) */}
              <Link
                href="/absensi/login/"
                className="w-full sm:w-auto min-w-[240px] md:min-w-[280px] h-16 md:h-18 px-8 md:px-10 rounded-2xl bg-blue-950/50 hover:bg-blue-950/70 backdrop-blur-md border border-white/20 hover:border-sky-400/40 text-white font-bold text-base md:text-lg tracking-normal shadow-xl shadow-blue-950/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3"
              >
                <UserCheck className="h-5 w-5 md:h-6 md:w-6 text-white shrink-0" />
                <span>Absensi Perangkat</span>
              </Link>
            </div>

            {/* Banner Tombol Pelayanan Surat Warga Mandiri */}
            <div className="pt-5 animate-in fade-in slide-in-from-bottom-12 duration-1000">
              <Link
                href="/suratonline/"
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-gradient-to-r from-amber-500/20 via-amber-500/30 to-amber-500/20 hover:from-amber-500/30 hover:to-amber-500/40 border border-amber-400/50 text-amber-300 hover:text-white text-xs sm:text-sm font-black uppercase tracking-wider backdrop-blur-md shadow-lg shadow-amber-500/10 hover:scale-105 transition-all"
              >
                <FileText className="h-4 w-4 text-amber-400" />
                <span>Pelayanan Mandiri Warga: Ajukan Surat Online &rarr;</span>
              </Link>
            </div>
          </div>
        </section>

        <section id="features" className="py-24 bg-transparent relative z-10">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16 space-y-2">
              <h2 className="text-3xl font-black uppercase tracking-tight">
                <span className="text-gradient-desa">Layanan Kami</span>
              </h2>
              <div className="h-1.5 w-24 bg-gradient-to-r from-blue-700 via-amber-500 to-blue-700 mx-auto rounded-full" />
            </div>

            <div className="grid md:grid-cols-4 gap-8">
              {[
                { title: "Database Terpadu", icon: Shield, desc: "Satu database untuk seluruh perangkat desa, data tersimpan aman dan sinkron." },
                { title: "Dokumentasi Kegiatan", icon: ExternalLink, desc: "Digitalisasi setiap pembangunan dan kegiatan desa secara real-time." },
                { title: "Absensi GPS", icon: MapPin, desc: "Absensi aman berbasis radius lokasi kantor untuk perangkat desa." },
                { title: "Arsip Digital", icon: Clock, desc: "Penyimpanan dokumen penting, SPJ, dan produk hukum desa dalam satu wadah aman." }
              ].map((f, i) => (
                <div key={i} className="p-8 rounded-3xl border border-border/70 bg-card/85 backdrop-blur-md shadow-sm shadow-blue-950/5 hover:border-primary/40 hover:shadow-xl hover:shadow-blue-950/10 hover:-translate-y-1.5 transition-all duration-300 group relative overflow-hidden">
                  <div className="h-14 w-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-primary shadow-sm flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all duration-300">
                    <f.icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{f.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-950 text-sky-200/70 py-16 border-t border-slate-900">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-2 space-y-6">
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
                Pemerintah Desa Karanganyar berkomitmen untuk terus berinovasi dalam memberikan pelayanan terbaik melalui pemanfaatan teknologi informasi yang modern.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="text-amber-400 font-bold text-sm uppercase tracking-widest">Akses Cepat</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="/suratonline/" className="text-amber-400 font-bold hover:text-amber-300 transition-colors">Surat Online Warga</Link></li>
                <li><Link href="/absensi/login/" className="hover:text-amber-300 transition-colors">Absensi Perangkat</Link></li>
                <li><Link href="/absensi-admin/login/" className="hover:text-amber-300 transition-colors">Monitoring Absensi</Link></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="text-amber-400 font-bold text-sm uppercase tracking-widest">Pemerintahan</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="/login/" className="hover:text-amber-300 transition-colors">Panel Manajemen Desa</Link></li>
                <li><Link href="/apbdes/" className="hover:text-amber-300 transition-colors">Informasi Anggaran</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-6 text-sky-200/60">
            <p className="text-xs font-bold uppercase tracking-widest">
              &copy; 2026 Pemerintah Desa Karanganyar. Seluruh Hak Cipta Dilindungi.
            </p>
            <div className="flex gap-6 text-[10px] font-black uppercase tracking-tighter text-sky-200">
              <span>Kecamatan Gandrungmangu</span>
              <span>Kabupaten Cilacap</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
