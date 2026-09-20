"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useUser, useDoc, useFirestore, useMemoFirebase, useAuth } from "@/firebase"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { doc, getDoc } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ImagePlus, CheckCircle, Loader2, Save, Trash2, ArrowLeft, AlertCircle, LogOut, FolderOpen, ExternalLink, Zap, LayoutPanelTop, FileStack, UploadCloud, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CLOUDINARY_CONFIG, getOptimizedCloudinaryUrl } from "@/lib/cloudinary-config"

export default function SettingsPage() {
  const { user, isUserLoading: isAuthLoading } = useUser()
  const auth = useAuth()
  const router = useRouter()
  const db = useFirestore()
  const { toast } = useToast()
  
  const [isUploading, setIsUploading] = useState(false)
  const [isUploadingHero, setIsUploadingHero] = useState(false)
  const [isUploadingKop, setIsUploadingKop] = useState(false)
  const [isSavingFolders, setIsSavingFolders] = useState(false)
  const [isSavingIntegrations, setIsSavingIntegrations] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [heroPreview, setHeroPreview] = useState<string | null>(null)
  const [kopPreview, setKopPreview] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const heroInputRef = useRef<HTMLInputElement>(null)
  const kopInputRef = useRef<HTMLInputElement>(null)

  const [kegiatanId, setKegiatanId] = useState("")
  const [spjId, setSpjId] = useState("")
  const [phId, setPhId] = useState("")
  const [physicalDocId, setPhysicalDocId] = useState("")
  const [agendaFolderId, setAgendaFolderId] = useState("")
  const [googleCalendarId, setGoogleCalendarId] = useState("")

  // GLOBAL SETTINGS: Use shared village settings instead of user-specific
  const villageSettingsRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "settings", "village")
  }, [db, user])
  
  const { data: userData, isLoading: isDataLoading } = useDoc(villageSettingsRef)

  useEffect(() => {
    if (userData) {
      if (userData.logoBase64) setLocalPreview(userData.logoBase64)
      if (userData.heroPhotoUrl) setHeroPreview(userData.heroPhotoUrl)
      else if (userData.heroPhotoBase64) setHeroPreview(userData.heroPhotoBase64)
      if (userData.kopSuratUrl) setKopPreview(userData.kopSuratUrl)
      else if (userData.letterheadImageUrl) setKopPreview(userData.letterheadImageUrl)
      if (userData.kegiatanFolderId) setKegiatanId(userData.kegiatanFolderId)
      if (userData.spjFolderId) setSpjId(userData.spjFolderId)
      if (userData.produkHukumFolderId) setPhId(userData.produkHukumFolderId)
      if (userData.physicalDocFolderId) setPhysicalDocId(userData.physicalDocFolderId)
      if (userData.agendaFolderId) setAgendaFolderId(userData.agendaFolderId)
      if (userData.googleCalendarId) setGoogleCalendarId(userData.googleCalendarId)
    }
  }, [userData])

  // Fallback membaca kopSurat/default jika di settings/village belum ada
  useEffect(() => {
    if (!kopPreview && db) {
      getDoc(doc(db, "kopSurat", "default")).then((snap) => {
        if (snap.exists()) {
          const d = snap.data()
          if (d?.letterheadImageUrl) setKopPreview(d.letterheadImageUrl)
        }
      }).catch(() => {})
    }
  }, [db, kopPreview])

  const savePreference = useCallback((key: string, value: any, setLoading: (v: boolean) => void) => {
    if (!villageSettingsRef || !user) return
    setLoading(true)
    
    setDocumentNonBlocking(villageSettingsRef, {
      [key]: value,
      updatedBy: user.uid,
      updatedAt: new Date().toISOString()
    }, { merge: true })

    setTimeout(() => {
      setLoading(false)
      toast({ title: "Perubahan Disimpan", description: `Pengaturan ${key} telah diperbarui secara global.` })
    }, 1000)
  }, [villageSettingsRef, user, toast]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 700 * 1024) {
      toast({ variant: "destructive", title: "File Terlalu Besar", description: "Maksimal ukuran logo adalah 700KB." })
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      setLocalPreview(base64)
      savePreference('logoBase64', base64, setIsUploading)
    }
    reader.readAsDataURL(file)
  }

  const handleHeroChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: "Format Tidak Valid", description: "Pilih file gambar untuk foto utama (PNG, JPG, atau WEBP)." })
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File Terlalu Besar", description: "Maksimal ukuran foto utama adalah 10MB." })
      return
    }

    setIsUploadingHero(true)

    // Coba upload ke Cloudinary terlebih dahulu agar resolusi tinggi tanpa terbentur batas 1MB Firestore
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("upload_preset", CLOUDINARY_CONFIG.uploadPreset)

      const response = await fetch(CLOUDINARY_CONFIG.baseUrl, {
        method: "POST",
        body: formData,
      })

      const data = await response.json()
      if (response.ok && data.secure_url) {
        const secureUrl = getOptimizedCloudinaryUrl(data.secure_url)
        setHeroPreview(secureUrl)

        if (villageSettingsRef && user) {
          setDocumentNonBlocking(villageSettingsRef, {
            heroPhotoUrl: secureUrl,
            heroPhotoBase64: secureUrl,
            updatedBy: user.uid,
            updatedAt: new Date().toISOString()
          }, { merge: true })
        }

        toast({
          title: "Foto Utama Tersimpan",
          description: "Foto halaman utama berhasil diunggah dan otomatis diterapkan sebagai background beranda."
        })
        return
      }
      throw new Error(data.error?.message || "Gagal mengunggah ke Cloudinary")
    } catch (uploadErr) {
      console.warn("Cloudinary upload failed, falling back to local base64:", uploadErr)
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        setHeroPreview(base64)
        if (villageSettingsRef && user) {
          setDocumentNonBlocking(villageSettingsRef, {
            heroPhotoBase64: base64,
            heroPhotoUrl: base64,
            updatedBy: user.uid,
            updatedAt: new Date().toISOString()
          }, { merge: true })
        }
        toast({
          title: "Foto Utama Tersimpan",
          description: "Foto halaman utama tersimpan dan aktif di halaman depan."
        })
      }
      reader.readAsDataURL(file)
    } finally {
      setIsUploadingHero(false)
      if (heroInputRef.current) {
        heroInputRef.current.value = ""
      }
    }
  }

  const removeLogo = () => {
    if (!villageSettingsRef) return
    setLocalPreview(null)
    setDocumentNonBlocking(villageSettingsRef, { logoBase64: null }, { merge: true })
    toast({ title: "Logo Dihapus", description: "Sistem akan kembali menggunakan logo default." })
  }

  const removeHero = () => {
    if (!villageSettingsRef) return
    setHeroPreview(null)
    setDocumentNonBlocking(villageSettingsRef, { 
      heroPhotoBase64: null,
      heroPhotoUrl: null,
      updatedAt: new Date().toISOString()
    }, { merge: true })
    toast({ title: "Foto Dihapus", description: "Halaman utama akan kembali menggunakan latar belakang default." })
  }

  const handleKopChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: "Format Tidak Valid", description: "Pilih file gambar kop surat (PNG, JPG, atau WEBP)." })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File Terlalu Besar", description: "Maksimal ukuran kop surat adalah 5MB." })
      return
    }

    setIsUploadingKop(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("upload_preset", CLOUDINARY_CONFIG.uploadPreset)

      const response = await fetch(CLOUDINARY_CONFIG.baseUrl, {
        method: "POST",
        body: formData,
      })

      const data = await response.json()
      if (!response.ok || !data.secure_url) {
        throw new Error(data.error?.message || "Gagal mengunggah gambar ke Cloudinary.")
      }

      const secureUrl = getOptimizedCloudinaryUrl(data.secure_url)
      setKopPreview(secureUrl)

      // 1. Simpan ke settings/village
      if (villageSettingsRef && user) {
        setDocumentNonBlocking(villageSettingsRef, {
          kopSuratUrl: secureUrl,
          letterheadImageUrl: secureUrl,
          updatedBy: user.uid,
          updatedAt: new Date().toISOString()
        }, { merge: true })
      }

      // 2. Simpan juga ke kopSurat/default (backward compatibility)
      if (db && user) {
        const kopDocRef = doc(db, "kopSurat", "default")
        setDocumentNonBlocking(kopDocRef, {
          letterheadImageUrl: secureUrl,
          updatedBy: user.uid,
          updatedAt: new Date().toISOString()
        }, { merge: true })
      }

      toast({
        title: "Kop Surat Tersimpan",
        description: "Kop surat berhasil diunggah ke Cloudinary dan otomatis diterapkan ke seluruh hasil cetak surat pelayanan.",
      })
    } catch (err: any) {
      console.error("Cloudinary upload error:", err)
      toast({
        variant: "destructive",
        title: "Gagal Mengunggah",
        description: err.message || "Terjadi kesalahan saat mengunggah ke Cloudinary."
      })
    } finally {
      setIsUploadingKop(false)
      if (kopInputRef.current) {
        kopInputRef.current.value = ""
      }
    }
  }

  const removeKop = () => {
    setKopPreview(null)
    if (villageSettingsRef) {
      setDocumentNonBlocking(villageSettingsRef, {
        kopSuratUrl: null,
        letterheadImageUrl: null,
        updatedAt: new Date().toISOString()
      }, { merge: true })
    }
    if (db) {
      const kopDocRef = doc(db, "kopSurat", "default")
      setDocumentNonBlocking(kopDocRef, {
        letterheadImageUrl: null,
        updatedAt: new Date().toISOString()
      }, { merge: true })
    }
    toast({
      title: "Kop Surat Dihapus",
      description: "Kop surat telah dinonaktifkan dari pengaturan global pelayanan."
    })
  }

  const extractFolderId = (input: string) => {
    if (!input) return ""
    const match = input.match(/folders\/([a-zA-Z0-9_-]{25,})/)
    return match ? match[1] : input.trim()
  }

  const handleSaveFolders = () => {
    if (!villageSettingsRef || !user) return
    setIsSavingFolders(true)

    const finalKegiatan = extractFolderId(kegiatanId)
    const finalSpj = extractFolderId(spjId)
    const finalPh = extractFolderId(phId)
    const finalPhysical = extractFolderId(physicalDocId)

    setDocumentNonBlocking(villageSettingsRef, {
      kegiatanFolderId: finalKegiatan,
      spjFolderId: finalSpj,
      produkHukumFolderId: finalPh,
      physicalDocFolderId: finalPhysical,
      updatedBy: user.uid,
      updatedAt: new Date().toISOString()
    }, { merge: true })

    setTimeout(() => {
      setIsSavingFolders(false)
      setKegiatanId(finalKegiatan)
      setSpjId(finalSpj)
      setPhId(finalPh)
      setPhysicalDocId(finalPhysical)
      toast({ title: "Folder Tersimpan", description: "Penyimpanan Drive telah diperbarui secara global." })
    }, 1000)
  }

  const handleSaveIntegrations = () => {
    if (!villageSettingsRef || !user) return
    setIsSavingIntegrations(true)
    const finalAgendaFolderId = extractFolderId(agendaFolderId)
    setDocumentNonBlocking(villageSettingsRef, {
      agendaFolderId: finalAgendaFolderId,
      googleCalendarId: googleCalendarId.trim(),
      updatedBy: user.uid,
      updatedAt: new Date().toISOString()
    }, { merge: true })

    setTimeout(() => {
      setIsSavingIntegrations(false)
      setAgendaFolderId(finalAgendaFolderId)
      setGoogleCalendarId(googleCalendarId.trim())
      toast({ title: "Integrasi Disimpan", description: "Pengaturan sinkronisasi telah diperbarui secara global." })
    }, 1000)
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await auth.signOut()
      router.push("/")
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (isAuthLoading || isDataLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-4xl mx-auto pb-32">
      <header className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/">
            <ArrowLeft className="h-6 w-6" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold text-primary">Pengaturan Sistem (Global)</h1>
      </header>

      <div className="grid gap-6">
        <Card className="border-none shadow-md overflow-hidden">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-lg flex items-center gap-2">
              <ImagePlus className="h-5 w-5 text-primary" />
              Logo Pemerintah Desa
            </CardTitle>
            <CardDescription>Logo ini akan muncul pada Kop Surat semua dokumen PDF secara global.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-4">
              <div 
                className="relative h-32 w-32 rounded-2xl border-2 border-dashed flex items-center justify-center bg-muted/30 hover:bg-primary/5 cursor-pointer overflow-hidden border-primary/20"
                onClick={() => fileInputRef.current?.click()}
              >
                {localPreview ? (
                  <Image src={localPreview} alt="Logo" fill className="object-contain p-2" unoptimized />
                ) : (
                  <span className="text-[10px] font-bold text-muted-foreground uppercase text-center p-2">Unggah Logo</span>
                )}
                {isUploading && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              {localPreview && <Button variant="ghost" size="sm" className="text-destructive text-xs" onClick={removeLogo}>Hapus Logo</Button>}
            </div>
          </CardContent>
        </Card>

        {/* KOP SURAT RESMI (CLOUDINARY) */}
        <Card className="border-none shadow-md overflow-hidden card-desa">
          <CardHeader className="bg-primary/5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle className="text-lg flex items-center gap-2 text-primary font-black uppercase">
                <FileText className="h-5 w-5 text-primary" />
                Kop Surat Resmi Desa (Cloudinary)
              </CardTitle>
              {kopPreview ? (
                <span className="badge-padi flex items-center gap-1 text-[10px] w-fit">
                  <CheckCircle className="h-3.5 w-3.5 text-amber-600" />
                  Aktif di Seluruh Surat Pelayanan
                </span>
              ) : (
                <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full w-fit">
                  Belum Diatur (Default)
                </span>
              )}
            </div>
            <CardDescription>
              Kop surat ini otomatis digunakan pada seluruh hasil cetak surat di menu <strong>Layanan Surat / Pelayanan Warga</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-4">
              <div 
                className="relative w-full max-w-2xl min-h-[120px] aspect-[5/1] rounded-2xl border-2 border-dashed flex items-center justify-center bg-muted/20 hover:bg-primary/5 cursor-pointer overflow-hidden border-primary/25 transition-all shadow-inner"
                onClick={() => kopInputRef.current?.click()}
              >
                {kopPreview ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img 
                    src={kopPreview} 
                    alt="Kop Surat" 
                    className="w-full h-full object-contain p-2" 
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1.5 p-6 text-center">
                    <UploadCloud className="h-9 w-9 text-primary/70 animate-bounce" />
                    <span className="text-xs font-black uppercase tracking-wider text-primary">Klik untuk Unggah Kop Surat</span>
                    <span className="text-[10px] text-muted-foreground font-medium">Format PNG transparan / JPG resolusi tinggi (maks. 5MB)</span>
                  </div>
                )}
                {isUploadingKop && (
                  <div className="absolute inset-0 bg-white/80 dark:bg-black/75 flex flex-col items-center justify-center gap-2 backdrop-blur-sm z-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-xs font-black uppercase tracking-wider text-primary">Mengunggah ke Cloudinary...</span>
                  </div>
                )}
              </div>

              <input 
                type="file" 
                ref={kopInputRef} 
                className="hidden" 
                accept="image/png,image/jpeg,image/webp,image/jpg" 
                onChange={handleKopChange} 
              />

              <div className="flex items-center gap-3">
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm" 
                  className="rounded-xl text-xs font-bold gap-2 border-primary/20 hover:bg-primary/10"
                  onClick={() => kopInputRef.current?.click()}
                  disabled={isUploadingKop}
                >
                  <UploadCloud className="h-4 w-4" />
                  {kopPreview ? "Ganti Kop Surat" : "Unggah Kop Surat"}
                </Button>

                {kopPreview && (
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive hover:bg-destructive/10 rounded-xl text-xs font-bold gap-1.5" 
                    onClick={removeKop}
                    disabled={isUploadingKop}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Hapus Kop Surat
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md overflow-hidden">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-lg flex items-center gap-2">
              <LayoutPanelTop className="h-5 w-5 text-primary" />
              Foto Halaman Utama
            </CardTitle>
            <CardDescription>Unggah foto desa untuk latar belakang halaman depan aplikasi.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-4">
              <div 
                className="relative w-full aspect-[21/9] rounded-2xl border-2 border-dashed flex items-center justify-center bg-muted/30 hover:bg-primary/5 cursor-pointer overflow-hidden border-primary/20"
                onClick={() => heroInputRef.current?.click()}
              >
                {heroPreview ? (
                  <Image src={heroPreview} alt="Hero" fill className="object-cover" unoptimized />
                ) : (
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Klik untuk Unggah Foto Desa</span>
                )}
                {isUploadingHero && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}
              </div>
              <input type="file" ref={heroInputRef} className="hidden" accept="image/*" onChange={handleHeroChange} />
              {heroPreview && <Button variant="ghost" size="sm" className="text-destructive text-xs" onClick={removeHero}>Hapus Foto Utama</Button>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md overflow-hidden">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-lg flex items-center gap-2"><FolderOpen className="h-5 w-5 text-primary" /> Folder Google Drive (Global)</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">ID Folder Upload Kegiatan</Label>
                  <Input placeholder="ID Folder Drive..." value={kegiatanId} onChange={(e) => setKegiatanId(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">ID Folder Dokumen Fisik</Label>
                  <Input placeholder="ID Folder Drive..." value={physicalDocId} onChange={(e) => setPhysicalDocId(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">ID Folder SPJ</Label>
                  <Input placeholder="ID Folder..." value={spjId} onChange={(e) => setSpjId(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">ID Folder Produk Hukum</Label>
                  <Input placeholder="ID Folder..." value={phId} onChange={(e) => setPhId(e.target.value)} />
                </div>
              </div>
            </div>
            <Button className="w-full h-12 font-black uppercase" onClick={handleSaveFolders} disabled={isSavingFolders}>
              {isSavingFolders ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} Simpan Konfigurasi Folder
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md overflow-hidden">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-lg flex items-center gap-2"><Zap className="h-5 w-5 text-primary" /> Integrasi Google (Global)</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">ID Folder Agenda & Undangan</Label>
                <Input placeholder="ID Folder..." value={agendaFolderId} onChange={(e) => setAgendaFolderId(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">ID Google Kalender</Label>
                <Input placeholder="Email kalender desa..." value={googleCalendarId} onChange={(e) => setGoogleCalendarId(e.target.value)} />
              </div>
            </div>
            <Button className="w-full h-12 font-black uppercase" onClick={handleSaveIntegrations} disabled={isSavingIntegrations}>
              {isSavingIntegrations ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} Simpan Integrasi
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md overflow-hidden border-t-4 border-t-destructive">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              <div className="p-4 bg-muted/50 rounded-xl">
                <p className="text-xs font-medium text-muted-foreground mb-1">Akun Login:</p>
                <p className="text-sm font-bold">{user?.email}</p>
              </div>
              <Button variant="destructive" className="w-full h-12 gap-2 font-bold" onClick={handleLogout} disabled={isLoggingOut}>
                {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Keluar Sistem
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
