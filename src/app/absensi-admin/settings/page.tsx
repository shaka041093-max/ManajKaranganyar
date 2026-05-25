"use client"

import { useState, useEffect, useMemo } from "react"
import { useFirestore, useDoc, useMemoFirebase, useUser, useCollection } from "@/firebase"
import { doc, setDoc, collection, query, orderBy, where } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Settings, 
  Save, 
  Loader2, 
  Clock, 
  MapPin, 
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Timer,
  Info,
  UserCheck,
  ShieldCheck,
  RefreshCw,
  UserPlus,
  AlertCircle,
  KeyRound,
  User as UserIcon
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"

const DAYS = [
  { id: 'senin', label: 'SENIN' },
  { id: 'selasa', label: 'SELASA' },
  { id: 'rabu', label: 'RABU' },
  { id: 'kamis', label: 'KAMIS' },
  { id: 'jumat', label: 'JUMAT' },
  { id: 'sabtu', label: 'SABTU' },
  { id: 'minggu', label: 'MINGGU' }
]

export default function AdminAbsensiSettings() {
  const db = useFirestore()
  const { user, isUserLoading } = useUser()
  const { toast } = useToast()
  
  const [isSaving, setIsSaving] = useState(false)
  const [newHoliday, setNewHoliday] = useState("")
  const [savingAccountId, setSavingAccountId] = useState<string | null>(null)

  // 1. Fetch Global Settings
  const settingsRef = useMemoFirebase(() => 
    (db && user) ? doc(db, "absensi_settings", "global") : null, 
  [db, user])
  const { data: initialSettings, isLoading: isSettingsLoading } = useDoc(settingsRef)

  // 2. Fetch Master Personnel (Sumber Nama dan Jabatan Utama)
  const masterPersonnelRef = useMemoFirebase(() => 
    (db && user) ? query(collection(db, "personnel"), where("category", "==", "Pemerintah Desa")) : null, 
  [db, user])
  const { data: masterList, isLoading: isMasterLoading } = useCollection(masterPersonnelRef)

  // 3. Fetch Account Credentials (Data Login)
  const accountsRef = useMemoFirebase(() => 
    (db && user) ? collection(db, "personel") : null, 
  [db, user])
  const { data: accountList, isLoading: isAccountsLoading } = useCollection(accountsRef)

  const [formData, setFormData] = useState({
    jam_masuk: "08:00",
    jam_pulang: "16:00",
    toleransi_telat: 15,
    hari_kerja: ["senin", "selasa", "rabu", "kamis", "jumat"],
    hari_libur: [] as string[],
    radius_lokasi: 100,
    lokasi_kantor: { lat: -7.457829, lng: 108.862069 },
    jadwal: {
      senin: { masuk: "08:00", pulang: "15:30" },
      selasa: { masuk: "08:00", pulang: "15:30" },
      rabu: { masuk: "08:00", pulang: "15:30" },
      kamis: { masuk: "08:00", pulang: "15:30" },
      jumat: { masuk: "08:00", pulang: "11:00" },
      sabtu: { masuk: "08:00", pulang: "12:00" },
      minggu: { masuk: "08:00", pulang: "12:00" },
    }
  })

  // State untuk menampung perubahan username & password di tabel
  const [accountEdits, setAccountEdits] = useState<Record<string, { username: string, password: string }>>({})

  useEffect(() => {
    if (initialSettings) {
      setFormData(prev => ({
        ...prev,
        ...initialSettings,
        jadwal: initialSettings.jadwal || prev.jadwal
      }))
    }
  }, [initialSettings])

  // Mapping Master Data ke Account Data
  const synchronizedAccounts = useMemo(() => {
    if (!masterList) return []
    return masterList
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(m => {
        const account = accountList?.find(acc => acc.nama?.toUpperCase() === m.name.toUpperCase())
        return {
          masterId: m.id,
          name: m.name,
          jabatan: m.jabatan, // Sumber jabatan dari master list
          docId: account?.id || null,
          authUid: account?.uid || null,
          username: account?.username || "",
          password: account?.password || "",
          email: account?.email || "",
          role: account?.role || "perangkat",
          aktif: account?.aktif ?? false,
          hasAccount: !!account
        }
      })
  }, [masterList, accountList])

  const handleAccountFieldChange = (masterId: string, field: 'username' | 'password', value: string) => {
    const account = synchronizedAccounts.find(a => a.masterId === masterId)
    const currentEdit = accountEdits[masterId] || { 
      username: account?.username || "", 
      password: account?.password || "" 
    }
    
    setAccountEdits(prev => ({
      ...prev,
      [masterId]: { ...currentEdit, [field]: value }
    }))
  }

  const handleSaveAccount = async (person: any) => {
    if (!db || !user) return
    const edits = accountEdits[person.masterId]
    
    // Gunakan nilai dari edit jika ada, jika tidak gunakan nilai yang sudah ada
    const username = (edits?.username || person.username).toLowerCase().trim()
    const password = edits?.password || person.password
    
    if (!username || !password) {
      toast({ variant: "destructive", title: "Gagal", description: "Username dan Password wajib diisi." })
      return
    }

    setIsSaving(true)
    setSavingAccountId(person.masterId)
    
    try {
      // Tentukan ID dokumen target (pakai yang sudah ada atau buat baru)
      const targetId = person.docId || doc(collection(db, "personel")).id
      
      const payload: any = {
        username: username,
        password: password,
        email: `${username}@karanganyar.id`,
        nama: person.name.toUpperCase(),
        jabatan: person.jabatan.toUpperCase(), // Pastikan jabatan tersimpan ke akun
        role: person.role || "perangkat",
        aktif: person.hasAccount ? person.aktif : true,
        updated_at: new Date().toISOString()
      }

      // RESET UID JIKA USERNAME BERUBAH
      // Karena UID lama terikat ke Email lama (username lama)
      if (person.authUid && username === person.username.toLowerCase()) {
        payload.uid = person.authUid;
      } else {
        payload.uid = null; // Memaksa munculnya label 'Belum Sinkron' agar admin menjalankan tool sync
      }

      await setDoc(doc(db, "personel", targetId), payload, { merge: true })
      
      toast({ 
        title: "Berhasil Diperbarui", 
        description: `Data ${person.name} disimpan. Silakan jalankan 'Sinkron Kredensial' jika username/password berubah.` 
      })
      
      const newEdits = { ...accountEdits }
      delete newEdits[person.masterId]
      setAccountEdits(newEdits)

    } catch (e) {
      toast({ variant: "destructive", title: "Gagal", description: "Terjadi kesalahan saat menyimpan akun." })
    } finally {
      setIsSaving(false)
      setSavingAccountId(null)
    }
  }

  const handleSaveGlobal = async () => {
    if (!db || !user) return
    setIsSaving(true)
    try {
      await setDoc(doc(db, "absensi_settings", "global"), formData)
      toast({ title: "Berhasil", description: "Seluruh pengaturan absensi telah diperbarui." })
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal", description: "Terjadi kesalahan saat menyimpan." })
    } finally {
      setIsSaving(false)
    }
  }

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      hari_kerja: prev.hari_kerja.includes(day) 
        ? prev.hari_kerja.filter(d => d !== day)
        : [...prev.hari_kerja, day]
    }))
  }

  const updateDailyTime = (day: string, field: 'masuk' | 'pulang', value: string) => {
    setFormData(prev => ({
      ...prev,
      jadwal: {
        ...prev.jadwal,
        [day]: {
          ...prev.jadwal[day as keyof typeof prev.jadwal],
          [field]: value
        }
      }
    }))
  }

  const addHoliday = () => {
    if (!newHoliday) return
    if (formData.hari_libur.includes(newHoliday)) return
    setFormData(prev => ({ ...prev, hari_libur: [...prev.hari_libur, newHoliday].sort() }))
    setNewHoliday("")
  }

  const removeHoliday = (date: string) => {
    setFormData(prev => ({ ...prev, hari_libur: prev.hari_libur.filter(d => d !== date) }))
  }

  const toggleStatusUser = async (person: any) => {
    if (!db || !person.docId) return;
    try {
        await setDoc(doc(db, "personel", person.docId), {
            aktif: !person.aktif,
            updated_at: new Date().toISOString()
        }, { merge: true });
        toast({ title: "Status Diperbarui", description: `${person.name} kini ${!person.aktif ? 'AKTIF' : 'NONAKTIF'}` });
    } catch (e) {
        toast({ variant: "destructive", title: "Gagal", description: "Gagal mengubah status." });
    }
  }

  if (isUserLoading || isSettingsLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-10 max-w-7xl mx-auto pb-24">
      <header>
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Konfigurasi Sistem</h1>
        <p className="text-xs text-muted-foreground font-bold uppercase mt-1">Aturan kehadiran dan manajemen hak akses</p>
      </header>

      <Tabs defaultValue="sistem" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-14 bg-muted/50 p-1.5 rounded-2xl mb-8">
            <TabsTrigger value="sistem" className="gap-2 text-[10px] font-black uppercase rounded-xl h-full">
                <Settings className="h-4 w-4" /> Sistem & Lokasi
            </TabsTrigger>
            <TabsTrigger value="akun" className="gap-2 text-[10px] font-black uppercase rounded-xl h-full">
                <ShieldCheck className="h-4 w-4" /> Manajemen Akun
            </TabsTrigger>
        </TabsList>

        <TabsContent value="sistem" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
            <div className="grid md:grid-cols-2 gap-8">
                {/* TITIK LOKASI */}
                <Card className="border-none shadow-[0_15px_50px_-15px_rgba(0,0,0,0.05)] rounded-[2.5rem] bg-white overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-lg font-black flex items-center gap-3 text-slate-800 uppercase tracking-tight">
                            <MapPin className="h-6 w-6 text-primary" /> Titik Lokasi Kantor
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-4 space-y-8">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em] ml-1">Latitude</Label>
                                <Input 
                                type="number" 
                                value={formData.lokasi_kantor.lat} 
                                onChange={e => setFormData(p => ({ ...p, lokasi_kantor: { ...p.lokasi_kantor, lat: parseFloat(e.target.value) } }))}
                                className="h-14 rounded-2xl bg-slate-50 border-none font-black text-base"
                                />
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em] ml-1">Longitude</Label>
                                <Input 
                                type="number" 
                                value={formData.lokasi_kantor.lng} 
                                onChange={e => setFormData(p => ({ ...p, lokasi_kantor: { ...p.lokasi_kantor, lng: parseFloat(e.target.value) } }))}
                                className="h-14 rounded-2xl bg-slate-50 border-none font-black text-base"
                                />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em] ml-1">Radius Absensi (Meter)</Label>
                            <Input 
                                type="number" 
                                value={formData.radius_lokasi} 
                                onChange={e => setFormData(p => ({ ...p, radius_lokasi: parseInt(e.target.value) || 0 }))}
                                className="h-14 rounded-2xl bg-slate-50 border-none font-black text-lg"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* TOLERANSI & UMUM */}
                <Card className="border-none shadow-[0_15px_50px_-15px_rgba(0,0,0,0.05)] rounded-[2.5rem] bg-white overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-lg font-black flex items-center gap-3 text-slate-800 uppercase tracking-tight">
                            <Timer className="h-6 w-6 text-primary" /> Pengaturan Umum
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-4 space-y-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em] ml-1">Toleransi Telat (Menit)</Label>
                            <Input 
                                type="number" 
                                value={formData.toleransi_telat} 
                                onChange={e => setFormData(p => ({ ...p, toleransi_telat: parseInt(e.target.value) || 0 }))}
                                className="h-14 rounded-2xl bg-slate-50 border-none font-black text-lg"
                            />
                        </div>
                        <div className="p-6 bg-blue-50 border border-blue-100 rounded-3xl flex items-start gap-4">
                            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                            <p className="text-[10px] font-bold text-blue-800 uppercase leading-relaxed">
                                Tip: Gunakan menu sinkronisasi kredensial jika ada penambahan personel baru atau perubahan password.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* DETAIL JADWAL HARIAN */}
                <Card className="border-none shadow-[0_15px_50px_-15px_rgba(0,0,0,0.05)] rounded-[3.5rem] bg-white md:col-span-2 overflow-hidden border-t-8 border-primary">
                    <CardHeader className="p-10 pb-4">
                        <CardTitle className="text-xl font-black flex items-center gap-4 text-slate-800 uppercase tracking-tight">
                        <Clock className="h-7 w-7 text-primary" /> Jadwal Kerja Harian
                        </CardTitle>
                        <CardDescription className="font-bold text-[10px] uppercase text-muted-foreground mt-2 tracking-widest">Waktu masuk dan pulang spesifik per hari</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 pt-6">
                        <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                            <TableRow className="hover:bg-transparent border-slate-100">
                                <TableHead className="px-10 h-14 font-black text-[11px] uppercase text-slate-400 tracking-widest">Hari</TableHead>
                                <TableHead className="h-14 font-black text-[11px] uppercase text-slate-400 tracking-widest">Jam Masuk</TableHead>
                                <TableHead className="h-14 font-black text-[11px] uppercase text-slate-400 tracking-widest">Jam Pulang</TableHead>
                                <TableHead className="px-10 h-14 text-center font-black text-[11px] uppercase text-slate-400 tracking-widest">Aktif</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {DAYS.map((day) => (
                                <TableRow key={day.id} className="hover:bg-slate-50/50 transition-colors border-slate-50">
                                <TableCell className="px-10 py-4">
                                    <span className="font-black text-slate-700 text-xs uppercase tracking-wider">{day.label}</span>
                                </TableCell>
                                <TableCell>
                                    <Input 
                                    type="time" 
                                    value={formData.jadwal[day.id as keyof typeof formData.jadwal]?.masuk || "08:00"}
                                    onChange={e => updateDailyTime(day.id, 'masuk', e.target.value)}
                                    className="h-10 w-32 rounded-xl bg-slate-100/50 border-none font-bold text-slate-700"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input 
                                    type="time" 
                                    value={formData.jadwal[day.id as keyof typeof formData.jadwal]?.pulang || "15:30"}
                                    onChange={e => updateDailyTime(day.id, 'pulang', e.target.value)}
                                    className="h-10 w-32 rounded-xl bg-slate-100/50 border-none font-bold text-slate-700"
                                    />
                                </TableCell>
                                <TableCell className="px-10 text-center">
                                    <Checkbox 
                                    checked={formData.hari_kerja.includes(day.id)} 
                                    onCheckedChange={() => toggleDay(day.id)}
                                    className="h-5 w-5 rounded-md border-slate-300 data-[state=checked]:bg-primary"
                                    />
                                </TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* HARI LIBUR */}
                <Card className="border-none shadow-[0_15px_50px_-15px_rgba(0,0,0,0.05)] rounded-[2.5rem] bg-white md:col-span-2 overflow-hidden">
                    <CardHeader className="p-10 pb-4">
                        <CardTitle className="text-xl font-black flex items-center gap-4 text-slate-800 uppercase tracking-tight">
                        <CalendarIcon className="h-7 w-7 text-primary" /> Daftar Hari Libur Nasional / Desa
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-10 pt-6 space-y-8">
                        <div className="flex flex-col sm:flex-row gap-4 max-w-xl">
                        <Input 
                            type="date" 
                            value={newHoliday} 
                            onChange={e => setNewHoliday(e.target.value)} 
                            className="h-14 rounded-2xl bg-slate-50 border-none font-bold text-slate-700"
                        />
                        <Button onClick={addHoliday} variant="outline" className="h-14 rounded-2xl gap-3 border-slate-200 px-8 font-black uppercase text-xs hover:bg-slate-50">
                            <Plus className="h-5 w-5" /> Tambah Libur
                        </Button>
                        </div>
                        
                        <div className="flex flex-wrap gap-4 mt-6">
                        {formData.hari_libur.map(date => (
                            <div key={date} className="flex items-center gap-3 bg-slate-100 pl-5 pr-2 py-2 rounded-2xl border border-slate-200">
                            <span className="text-[12px] font-black text-slate-700">{date}</span>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => removeHoliday(date)} 
                                className="h-8 w-8 rounded-xl hover:bg-red-50 text-red-500"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            </div>
                        ))}
                        {formData.hari_libur.length === 0 && (
                            <p className="text-xs text-slate-300 font-bold uppercase italic py-4">Belum ada hari libur khusus yang ditambahkan.</p>
                        )}
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="flex justify-center mt-6">
                <Button 
                onClick={handleSaveGlobal} 
                disabled={isSaving} 
                className="w-full max-md h-16 rounded-[2rem] bg-primary hover:bg-primary/90 text-white font-black text-lg uppercase tracking-tight shadow-xl shadow-primary/20 gap-4"
                >
                {isSaving ? <Loader2 className="animate-spin h-6 w-6" /> : <Save className="h-6 w-6" />}
                Simpan Konfigurasi
                </Button>
            </div>
        </TabsContent>

        <TabsContent value="akun" className="animate-in fade-in slide-in-from-bottom-2">
            <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden border-t-8 border-slate-900">
                <CardHeader className="p-10 pb-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                                <UserCheck className="h-6 w-6 text-slate-900" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-black uppercase">Manajemen Akun Perangkat</CardTitle>
                                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                    Sinkron dengan Database Pemerintah Desa
                                </CardDescription>
                            </div>
                        </div>
                        <Button asChild variant="outline" className="rounded-xl font-black text-[10px] uppercase gap-2 border-slate-200">
                            <Link href="/dev/create-user/">
                                <UserPlus className="h-3.5 w-3.5" /> 
                                Sinkron Kredensial (Wajib Setelah Edit)
                            </Link>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow className="border-slate-100">
                                    <TableHead className="px-10 h-14 font-black text-[10px] uppercase text-slate-400">Nama Personel (Profil)</TableHead>
                                    <TableHead className="h-14 font-black text-[10px] uppercase text-slate-400">Username / ID</TableHead>
                                    <TableHead className="h-14 font-black text-[10px] uppercase text-slate-400">Password</TableHead>
                                    <TableHead className="h-14 font-black text-[10px] uppercase text-slate-400">Status</TableHead>
                                    <TableHead className="px-10 h-14 text-center font-black text-[10px] uppercase text-slate-400">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isMasterLoading || isAccountsLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground/30"/></TableCell>
                                    </TableRow>
                                ) : synchronizedAccounts.map((person) => {
                                    const edits = accountEdits[person.masterId] || null
                                    const displayUsername = edits?.username ?? person.username
                                    const displayPassword = edits?.password ?? person.password
                                    const isRowSaving = savingAccountId === person.masterId

                                    return (
                                        <TableRow key={person.masterId} className="hover:bg-slate-50 transition-colors border-slate-50">
                                            <TableCell className="px-10 py-6">
                                                <p className="font-black text-slate-800 text-xs uppercase leading-tight">{person.name}</p>
                                                <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">{person.jabatan}</p>
                                            </TableCell>
                                            <TableCell>
                                                <div className="relative w-32">
                                                    <UserIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                                                    <Input 
                                                        value={displayUsername}
                                                        onChange={(e) => handleAccountFieldChange(person.masterId, 'username', e.target.value)}
                                                        className="h-9 pl-8 text-[11px] font-mono rounded-lg border-slate-200 bg-white"
                                                        placeholder="username..."
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="relative w-32">
                                                    <KeyRound className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                                                    <Input 
                                                        type="text"
                                                        value={displayPassword}
                                                        onChange={(e) => handleAccountFieldChange(person.masterId, 'password', e.target.value)}
                                                        className="h-9 pl-8 text-[11px] font-mono rounded-lg border-slate-200 bg-white"
                                                        placeholder="password..."
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <div className={cn("h-1.5 w-1.5 rounded-full", person.aktif ? "bg-green-500" : "bg-red-500")} />
                                                    <span className={cn("text-[9px] font-black uppercase", person.aktif ? "text-green-600" : "text-red-600")}>
                                                        {person.hasAccount ? (person.aktif ? 'AKTIF' : 'NONAKTIF') : 'BELUM AKTIF'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-10 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Button 
                                                        size="sm" 
                                                        variant="default"
                                                        onClick={() => handleSaveAccount(person)}
                                                        disabled={isRowSaving}
                                                        className={cn(
                                                            "h-9 px-4 rounded-xl font-black text-[9px] uppercase gap-2 transition-all bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
                                                        )}
                                                    >
                                                        {isRowSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                                        SIMPAN
                                                    </Button>
                                                    {person.hasAccount && (
                                                        <Button 
                                                            size="icon" 
                                                            variant="ghost"
                                                            onClick={() => toggleStatusUser(person)}
                                                            className={cn("h-9 w-9 rounded-xl", person.aktif ? "text-red-500 hover:bg-red-50" : "text-green-500 hover:bg-green-50")}
                                                        >
                                                            <RefreshCw className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                                {(!synchronizedAccounts || synchronizedAccounts.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-20 text-center text-muted-foreground italic text-xs">
                                            Tidak ada personel Pemerintah Desa yang ditemukan di Profil Master.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <div className="mt-8 p-6 bg-amber-50 border border-amber-100 rounded-3xl flex items-start gap-4">
                <AlertCircle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
                <div>
                    <p className="text-xs font-black text-amber-800 uppercase mb-1">PANDUAN MANAJEMEN AKUN:</p>
                    <p className="text-[10px] font-bold text-amber-700 leading-relaxed uppercase">
                        1. Edit **Username** dan **Password** pada baris personel tersebut.<br />
                        2. Klik tombol **SIMPAN** untuk mendaftarkan data profil (termasuk Jabatan) ke sistem login.<br />
                        3. Jalankan **SINKRON KREDENSIAL** jika akun baru saja dibuat atau butuh penyegaran UID.<br />
                        4. Setelah disimpan oleh Admin, Jabatan akan otomatis muncul di HP perangkat desa.
                    </p>
                </div>
            </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
