
"use client"

import { useState, useEffect, useCallback } from "react"
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection, useAuth } from "@/firebase"
import { doc, collection, query, where, orderBy, setDoc, limit } from "firebase/firestore"
import { signOut } from "firebase/auth"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  LogOut, 
  Calendar as CalendarIcon,
  Navigation,
  Timer,
  RefreshCw,
  Clock,
  Filter,
  UserCheck,
  Home
} from "lucide-react"
import { format, startOfMonth, endOfMonth } from "date-fns"
import { id as localeID } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { calculateDistance, isHoliday, isWorkDay, parseTime } from "@/lib/attendance-utils"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

const DAYS_MAP = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];

export default function AbsensiDashboard() {
  const { user, isUserLoading } = useUser()
  const db = useFirestore()
  const auth = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  
  const [currentTime, setCurrentTime] = useState(new Date())
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null)
  const [isLocLoading, setIsLocLoading] = useState(false)
  const [isAbsenLoading, setIsAbsenLoading] = useState(false)
  const [distance, setDistance] = useState<number | null>(null)

  const [filterStart, setFilterStart] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"))
  const [filterEnd, setFilterEnd] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"))

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      router.replace("/absensi/login/")
    }
  }, [user, isUserLoading, router])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // PROFIL: Selalu sinkron dengan data yang dikelola Admin di Manajemen Akun
  const profileQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "personel"), where("uid", "==", user.uid), limit(1))
  }, [db, user])
  const { data: profileDocs, isLoading: isProfileLoading } = useCollection(profileQuery)
  const personelData = profileDocs && profileDocs.length > 0 ? profileDocs[0] : null

  const settingsRef = useMemoFirebase(() => 
    (db && user) ? doc(db, "absensi_settings", "global") : null, 
  [db, user])
  const { data: settings } = useDoc(settingsRef)

  const todayStr = format(new Date(), "yyyy-MM-dd")
  const absenId = user ? `${user.uid}_${todayStr}` : ""
  
  // REAL-TIME: Pantau data absensi hari ini (bisa dari input Admin atau HP)
  const todayAbsenRef = useMemoFirebase(() => 
    (db && user && absenId) ? doc(db, "absensi", absenId) : null, 
  [db, user, absenId])
  const { data: todayAbsen } = useDoc(todayAbsenRef)

  const historyQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(
      collection(db, "absensi"),
      where("personel_id", "==", user.uid),
      where("tanggal", ">=", filterStart),
      where("tanggal", "<=", filterEnd),
      orderBy("tanggal", "desc")
    )
  }, [db, user, filterStart, filterEnd])

  const { data: history, isLoading: isHistoryLoading } = useCollection(historyQuery)

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Sign out error", error);
    }
  }

  const getGeolocation = useCallback(() => {
    setIsLocLoading(true)
    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: "GPS Error", description: "Browser tidak mendukung lokasi." })
      setIsLocLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setLocation(coords)
        if (settings?.lokasi_kantor) {
          const d = calculateDistance(coords.lat, coords.lng, settings.lokasi_kantor.lat, settings.lokasi_kantor.lng)
          setDistance(d)
        }
        setIsLocLoading(false)
      },
      (err) => {
        toast({ variant: "destructive", title: "GPS Gagal", description: "Izinkan akses lokasi." })
        setIsLocLoading(false)
      },
      { enableHighAccuracy: true }
    )
  }, [settings, toast])

  useEffect(() => {
    if (settings && !location) getGeolocation()
  }, [settings, location, getGeolocation])

  const handleAbsenMasuk = async () => {
    if (!user || !settings || !location || !db || !personelData) return
    
    if (personelData.aktif === false) {
        toast({ variant: "destructive", title: "Akun Dinonaktifkan" });
        return;
    }

    if (distance !== null && distance > (settings.radius_lokasi || 100)) {
      toast({ variant: "destructive", title: "Luar Jangkauan", description: "Anda berada di luar radius kantor." })
      return
    }

    setIsAbsenLoading(true)
    const todayDayName = DAYS_MAP[currentTime.getDay()];
    const todaySchedule = settings.jadwal?.[todayDayName] || { masuk: settings.jam_masuk, pulang: settings.jam_pulang };
    const jamMasukSetting = parseTime(todaySchedule.masuk || "08:00")
    const limitMasuk = new Date(jamMasukSetting.getTime() + ((settings.toleransi_telat || 0) * 60000))
    const status = currentTime > limitMasuk ? "telat" : "hadir"

    try {
      await setDoc(doc(db, "absensi", absenId), {
        id: absenId,
        personel_id: user.uid,
        nama: personelData.nama || "Perangkat Desa",
        tanggal: todayStr,
        jam_masuk: format(currentTime, "HH:mm:ss"),
        status: status,
        lokasi_masuk: location,
        created_at: new Date().toISOString()
      }, { merge: true })
      toast({ title: "Absen Berhasil", description: status.toUpperCase() })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal Simpan" })
    } finally {
      setIsAbsenLoading(false)
    }
  }

  const handleAbsenPulang = async () => {
    if (!user || !todayAbsen || !location || !db) return
    setIsAbsenLoading(true)
    try {
      await setDoc(doc(db, "absensi", absenId), {
        jam_pulang: format(currentTime, "HH:mm:ss"),
        lokasi_pulang: location,
      }, { merge: true })
      toast({ title: "Absen Pulang Berhasil" })
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal Simpan" })
    } finally {
      setIsAbsenLoading(false)
    }
  }

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary/20 mx-auto" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sinkronisasi Sesi...</p>
        </div>
      </div>
    )
  }

  if (!user) return null
  const inRadius = distance !== null && distance <= (settings?.radius_lokasi || 100)
  const todayDayName = DAYS_MAP[currentTime.getDay()];
  const displaySchedule = settings?.jadwal?.[todayDayName] || { masuk: settings?.jam_masuk, pulang: settings?.jam_pulang };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-2xl mx-auto pb-24 animate-fade-in-up">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-sm">
            <UserCheck className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight">
              <span className="text-gradient-desa">Portal Absensi</span>
            </h1>
            <div className="mt-0.5">
              <p className="text-xs font-black text-foreground uppercase leading-tight">{personelData?.nama || "PENGGUNA"}</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">{personelData?.jabatan || "PERANGKAT DESA"}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => router.push("/")} className="h-12 w-12 rounded-2xl bg-card/80 backdrop-blur-md border border-border/70 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 hover:scale-105 transition-all shadow-sm"><Home className="h-5 w-5" /></button>
          <button onClick={handleLogout} className="h-12 w-12 rounded-2xl bg-card/80 backdrop-blur-md border border-border/70 flex items-center justify-center text-muted-foreground hover:text-red-500 hover:border-red-300 hover:scale-105 transition-all shadow-sm"><LogOut className="h-5 w-5" /></button>
        </div>
      </header>

      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 text-white p-8 rounded-[2.5rem] shadow-2xl shadow-blue-950/25 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none group-hover:scale-110 transition-transform duration-700" />
        <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none"><Timer className="h-32 w-32" /></div>
        <div className="relative z-10 space-y-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-200">{format(currentTime, "EEEE, d MMMM yyyy", { locale: localeID })}</p>
          <h2 className="text-6xl font-black tracking-tighter">{format(currentTime, "HH:mm")}<span className="text-xl ml-2 opacity-60">{format(currentTime, "ss")}</span></h2>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <div className="flex items-center gap-2 bg-white/15 px-3.5 py-1.5 rounded-xl backdrop-blur-md border border-white/10">
              <MapPin className="h-3.5 w-3.5 text-sky-300" />
              <p className="text-[9px] font-bold uppercase">{location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : "GPS OFF"}</p>
            </div>
            <div className="flex items-center gap-2 bg-white/15 px-3.5 py-1.5 rounded-xl backdrop-blur-md border border-white/10">
              <Clock className="h-3.5 w-3.5 text-sky-300" />
              <p className="text-[9px] font-bold uppercase">JADWAL: {displaySchedule?.masuk || '--'} - {displaySchedule?.pulang || '--'}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border border-border/70 shadow-md shadow-blue-950/5 rounded-3xl bg-card/85 backdrop-blur-md overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="p-5 space-y-1">
            <p className="text-[10px] font-black uppercase text-muted-foreground">Masuk</p>
            <p className="text-2xl font-black text-primary font-mono">{todayAbsen?.jam_masuk || "--:--"}</p>
            {todayAbsen?.status && (
              <Badge variant="outline" className={cn(
                "text-[8px] font-black uppercase mt-1 rounded-lg", 
                todayAbsen.status === 'telat' ? 'text-red-500 border-red-200 bg-red-500/10' : 
                todayAbsen.status === 'hadir' ? 'text-emerald-600 border-emerald-200 bg-emerald-500/10' :
                todayAbsen.status === 'izin' || todayAbsen.status === 'dinas_luar' ? 'text-blue-500 border-blue-200 bg-blue-500/10' :
                'text-slate-500 border-slate-200'
              )}>
                {todayAbsen.status}
              </Badge>
            )}
          </div>
        </Card>
        <Card className="border border-border/70 shadow-md shadow-blue-950/5 rounded-3xl bg-card/85 backdrop-blur-md overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="p-5 space-y-1">
            <p className="text-[10px] font-black uppercase text-muted-foreground">Pulang</p>
            <p className="text-2xl font-black text-primary font-mono">{todayAbsen?.jam_pulang || "--:--"}</p>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        {!todayAbsen?.jam_masuk ? (
          <Button 
            onClick={handleAbsenMasuk} 
            disabled={isAbsenLoading || isLocLoading || !inRadius || personelData?.aktif === false}
            className="w-full h-20 rounded-3xl text-lg font-black uppercase shadow-xl shadow-blue-950/20 gap-3 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white hover:scale-[1.01] transition-all"
          >
            {isAbsenLoading ? <Loader2 className="animate-spin" /> : <Navigation className="h-6 w-6" />}
            {personelData?.aktif === false ? 'AKUN NONAKTIF' : 'Absen Masuk'}
          </Button>
        ) : !todayAbsen?.jam_pulang ? (
          <Button 
            onClick={handleAbsenPulang} 
            disabled={isAbsenLoading || isLocLoading}
            variant="outline"
            className="w-full h-20 rounded-3xl text-lg font-black uppercase border-2 border-primary/30 text-primary bg-card/80 backdrop-blur-md hover:bg-primary/10 gap-3 hover:scale-[1.01] transition-all shadow-md"
          >
            {isAbsenLoading ? <Loader2 className="animate-spin" /> : <Navigation className="h-6 w-6 rotate-180" />}
            Absen Pulang
          </Button>
        ) : (
          <div className="bg-card/85 backdrop-blur-md border border-emerald-500/30 p-6 rounded-3xl text-center space-y-2 shadow-md">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
            <p className="text-sm font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Sudah Absen Hari Ini</p>
          </div>
        )}

        <div className={cn("p-4 rounded-2xl flex items-center gap-3 border transition-colors backdrop-blur-md", inRadius ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20")}>
          {inRadius ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase text-foreground">{inRadius ? "Dalam Radius Kantor" : "Luar Radius Kantor"}</p>
            <p className="text-[9px] text-muted-foreground font-bold uppercase">{distance ? `${Math.round(distance)} meter dari kantor` : "Mengecek jangkauan..."}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={getGeolocation} disabled={isLocLoading} className="h-8 w-8 rounded-xl"><RefreshCw className={cn("h-4 w-4", isLocLoading && "animate-spin")} /></Button>
        </div>
      </div>

      <section className="space-y-4">
        <h3 className="text-sm font-black text-primary uppercase tracking-widest flex items-center gap-2 px-1"><CalendarIcon className="h-4 w-4" /> Riwayat Kehadiran</h3>
        <div className="grid gap-3">
          {isHistoryLoading ? (
            <div className="py-10 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary/30 mx-auto" /></div>
          ) : (history || []).map((h) => (
            <div key={h.id} className="p-4 bg-card/85 backdrop-blur-md border border-border/70 rounded-2xl shadow-sm flex items-center justify-between group hover:border-primary/40 hover:shadow-md transition-all">
              <div>
                <p className="text-xs font-bold text-foreground">{format(new Date(h.tanggal), "EEEE, d MMM", { locale: localeID })}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold font-mono">{h.jam_masuk} - {h.jam_pulang || "---"}</p>
              </div>
              <Badge className={cn(
                "text-[9px] font-black uppercase shadow-none rounded-lg", 
                h.status === 'hadir' ? 'bg-emerald-500 text-white' : 
                h.status === 'telat' ? 'bg-amber-500 text-white' :
                h.status === 'izin' || h.status === 'dinas_luar' ? 'bg-blue-500 text-white' :
                'bg-red-500 text-white'
              )}>{h.status}</Badge>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
