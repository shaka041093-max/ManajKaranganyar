
"use client"

import { useState } from "react"
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase"
import { collection, doc, setDoc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus, Loader2, Save, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"

export default function InputAbsensiManual() {
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)

  // Guard: Hanya izinkan query jika user adalah admin resmi
  const isAuthorized = user?.email === "admin@karanganyar.id" || user?.email === "karanganyar@gmail.id";

  // 1. Ambil Master Personel (Sumber Nama dari Profil)
  const personnelRef = useMemoFirebase(() => (db && user && isAuthorized) ? collection(db, "personnel") : null, [db, user, isAuthorized])
  const { data: personnelList } = useCollection(personnelRef)

  // 2. Ambil Daftar Kredensial (Wajib berisi UID asli dari Firebase Auth)
  const credsRef = useMemoFirebase(() => (db && user && isAuthorized) ? collection(db, "personel") : null, [db, user, isAuthorized])
  const { data: credentialsList } = useCollection(credsRef)

  const [formData, setFormData] = useState({
    master_id: "",
    tanggal: format(new Date(), "yyyy-MM-dd"),
    jam_masuk: "08:00",
    jam_pulang: "16:00",
    status: "hadir"
  })

  const handleSubmit = async () => {
    if (!db || !formData.master_id) {
        toast({ variant: "destructive", title: "Data Tidak Lengkap", description: "Pilih nama personel terlebih dahulu." })
        return
    }

    setIsSaving(true)
    try {
      const pDesa = personnelList?.filter(p => p.category === 'Pemerintah Desa') || [];
      
      // Tentukan target yang akan diabsen
      const targets = formData.master_id === "all" 
        ? pDesa 
        : pDesa.filter(p => p.id === formData.master_id);

      if (targets.length === 0) {
        throw new Error("Tidak ada data personel ditemukan.");
      }

      let successCount = 0;
      let failCount = 0;

      // Iterasi untuk menyimpan absensi
      for (const person of targets) {
        // Cari kredensial yang cocok berdasarkan nama
        // Penting: Gunakan 'uid' (Firebase Auth UID) agar bisa dibaca oleh user di dashboardnya
        const cred = credentialsList?.find(c => c.nama?.toUpperCase() === person.name.toUpperCase());
        const targetUid = cred?.uid; // Menggunakan UID asli hasil sinkronisasi kredensial

        if (!targetUid) {
          failCount++;
          continue;
        }

        const absenId = `${targetUid}_${formData.tanggal}`;
        await setDoc(doc(db, "absensi", absenId), {
          id: absenId,
          personel_id: targetUid, // UID ini yang dicocokkan di rules
          nama: person.name.toUpperCase(),
          tanggal: formData.tanggal,
          jam_masuk: formData.jam_masuk,
          jam_pulang: formData.jam_pulang,
          status: formData.status,
          created_at: new Date().toISOString()
        }, { merge: true });
        
        successCount++;
      }

      if (formData.master_id === "all") {
        toast({ 
          title: "Absensi Massal Berhasil", 
          description: `${successCount} Perangkat diabsen. ${failCount} Perangkat dilewati (Belum sinkron kredensial).` 
        });
      } else {
        if (successCount > 0) {
          toast({ title: "Tersimpan", description: `Absensi manual untuk ${targets[0].name} telah dicatat.` });
        } else {
          toast({ variant: "destructive", title: "Gagal", description: "Personel belum melakukan sinkronisasi kredensial (UID Kosong)." });
        }
      }

    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal", description: e.message || "Terjadi kesalahan sistem." });
    } finally {
      setIsSaving(false);
    }
  }

  if (!isAuthorized) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
       <header>
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Input Absensi Manual</h1>
        <p className="text-xs text-muted-foreground font-bold uppercase">Tambahkan atau koreksi kehadiran personel</p>
      </header>

      <Card className="border-none shadow-2xl rounded-3xl overflow-hidden">
        <CardHeader className="bg-primary/5">
            <CardTitle className="text-lg flex items-center gap-3 text-primary">
                <UserPlus className="h-6 w-6" /> Formulir Absensi
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase">Entri data absensi resmi pemerintah desa</CardDescription>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500">Pilih Personel</Label>
                <Select value={formData.master_id} onValueChange={v => setFormData(p => ({ ...p, master_id: v }))}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50/50">
                        <SelectValue placeholder="Pilih Nama..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all" className="font-black text-primary uppercase text-xs bg-primary/5">
                           --- SEMUA PERANGKAT (MASSAL) ---
                        </SelectItem>
                        {personnelList?.filter(p => p.category === 'Pemerintah Desa').map(p => (
                            <SelectItem key={p.id} value={p.id} className="font-bold uppercase text-xs">
                                {p.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500">Tanggal</Label>
                    <Input 
                        type="date" 
                        value={formData.tanggal} 
                        onChange={e => setFormData(p => ({ ...p, tanggal: e.target.value }))}
                        className="h-12 rounded-xl"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500">Status Kehadiran</Label>
                    <Select value={formData.status} onValueChange={v => setFormData(p => ({ ...p, status: v }))}>
                        <SelectTrigger className="h-12 rounded-xl border-slate-200">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="hadir" className="text-green-600 font-bold">HADIR</SelectItem>
                            <SelectItem value="telat" className="text-orange-600 font-bold">TELAT</SelectItem>
                            <SelectItem value="izin" className="text-blue-600 font-bold">IZIN / SAKIT / CT</SelectItem>
                            <SelectItem value="dinas_luar" className="text-indigo-600 font-bold">DINAS LUAR (DL)</SelectItem>
                            <SelectItem value="alpha" className="text-red-600 font-bold">ALPHA / TK</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500">Jam Masuk</Label>
                    <Input 
                        type="time" 
                        value={formData.jam_masuk} 
                        onChange={e => setFormData(p => ({ ...p, jam_masuk: e.target.value }))}
                        className="h-12 rounded-xl"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500">Jam Pulang</Label>
                    <Input 
                        type="time" 
                        value={formData.jam_pulang} 
                        onChange={e => setFormData(p => ({ ...p, jam_pulang: e.target.value }))}
                        className="h-12 rounded-xl"
                    />
                </div>
            </div>

            <div className="pt-4">
                <Button 
                    onClick={handleSubmit} 
                    disabled={isSaving} 
                    className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase shadow-xl gap-3 transition-all active:scale-[0.98]"
                >
                    {isSaving ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />}
                    {formData.master_id === "all" ? "Simpan Untuk Semua Perangkat" : "Simpan Ke Database"}
                </Button>
            </div>
        </CardContent>
      </Card>

      <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl flex items-start gap-4">
        <AlertCircle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs font-bold text-amber-800 leading-relaxed uppercase">
            Penting: Pastikan Anda telah menjalankan "Sinkron Kredensial" di menu Pengaturan Akun agar setiap personel memiliki UID yang sah untuk mencatat absensi.
        </p>
      </div>
    </div>
  )
}
