"use client"

import { useState, useMemo } from "react"
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase"
import { collection, query, orderBy, doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Printer, 
  FileSpreadsheet, 
  Loader2,
  FileText,
  ChevronRight,
  Download
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format, getDate, getDaysInMonth } from "date-fns"
import { id as localeID } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { generateAttendancePDF } from "@/lib/pdf-attendance-report"
import * as XLSX from "xlsx"

export default function CetakDokumenAbsensi() {
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const [filterMonth, setFilterMonth] = useState(format(new Date(), "MM"))
  const [filterYear, setFilterYear] = useState(format(new Date(), "yyyy"))
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  // Guard: Hanya izinkan query jika user adalah admin resmi
  const isAuthorized = user?.email === "admin@karanganyar.id" || user?.email === "karanganyar@gmail.id";

  // 1. Ambil Data User (untuk Logo)
  const userDocRef = useMemoFirebase(() => (db && user && isAuthorized) ? doc(db, "users", user.uid) : null, [db, user, isAuthorized])
  const { data: userData } = useDoc(userDocRef)

  // 2. Ambil Master Personel
  const personnelRef = useMemoFirebase(() => (db && user && isAuthorized) ? collection(db, "personnel") : null, [db, user, isAuthorized])
  const { data: personnelList } = useCollection(personnelRef)

  // 3. Ambil Seluruh Data Absensi
  const absensiRef = useMemoFirebase(() => 
    (db && user && isAuthorized) ? query(collection(db, "absensi"), orderBy("tanggal", "asc")) : null, 
  [db, user, isAuthorized])
  const { data: attendanceData } = useCollection(absensiRef)

  // 4. Ambil Kredensial (Untuk pemetaan UID)
  const credsRef = useMemoFirebase(() => (db && user && isAuthorized) ? collection(db, "personel") : null, [db, user, isAuthorized])
  const { data: credentialsList } = useCollection(credsRef)

  // 5. Ambil Pengaturan Global (Untuk hari libur)
  const settingsRef = useMemoFirebase(() => 
    (db && user && isAuthorized) ? doc(db, "absensi_settings", "global") : null, 
  [db, user, isAuthorized])
  const { data: settings } = useDoc(settingsRef)

  // 6. Merekap Data untuk Laporan
  const reportData = useMemo(() => {
    if (!personnelList || !attendanceData) return []

    return personnelList
      .filter(p => p.category === 'Pemerintah Desa')
      .map(p => {
        const userMonthData: Record<number, any> = {}
        let s = 0, tk = 0, ct = 0, dl = 0, h = 0, t = 0

        // Mapping UID
        const cred = credentialsList?.find(c => c.nama === p.name.toUpperCase());
        const uid = cred?.id || cred?.uid || p.uid;

        const filteredAbsen = attendanceData.filter(a => {
            if (!uid) return false;
            const matchesUid = a.personel_id === uid || a.id.startsWith(uid);
            const matchesMonth = a.tanggal?.startsWith(`${filterYear}-${filterMonth}`);
            return matchesUid && matchesMonth;
        })

        filteredAbsen.forEach(a => {
          const d = getDate(new Date(a.tanggal))
          userMonthData[d] = a
          if (a.status === 'hadir') h++
          if (a.status === 'telat') t++
          if (a.status === 'izin') s++
          if (a.status === 'alpha') tk++
          if (a.status === 'dinas_luar') dl++
        })

        return {
          ...p,
          attendance: userMonthData,
          stats: { h, t, s, tk, ct, dl }
        }
      })
  }, [personnelList, attendanceData, credentialsList, filterMonth, filterYear])

  const handleDownloadExcel = () => {
    if (reportData.length === 0) return

    const daysInMonth = getDaysInMonth(new Date(parseInt(filterYear), parseInt(filterMonth) - 1))
    const monthName = format(new Date(2024, parseInt(filterMonth) - 1, 1), "MMMM", { locale: localeID }).toUpperCase()
    
    const excelRows = reportData.map((row, idx) => {
      const data: any = {
        "NO": idx + 1,
        "NAMA LENGKAP": row.name,
        "JABATAN": row.jabatan
      }

      for (let d = 1; d <= 31; d++) {
        if (d <= daysInMonth) {
          const record = row.attendance[d]
          data[d.toString()] = record ? record.status.toUpperCase() : ""
        } else {
          data[d.toString()] = "-"
        }
      }

      data["H"] = row.stats.h
      data["T"] = row.stats.t
      data["S"] = row.stats.s
      data["TK"] = row.stats.tk
      data["DL"] = row.stats.dl

      return data
    })

    const ws = XLSX.utils.json_to_sheet(excelRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Absensi")
    XLSX.writeFile(wb, `REKAP_ABSENSI_${monthName}_${filterYear}.xlsx`)
    toast({ title: "Berhasil", description: "Laporan Excel telah diunduh." })
  }

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true)
    try {
      const pdfBlob = await generateAttendancePDF({
        month: filterMonth,
        year: filterYear,
        data: reportData,
        logoBase64: userData?.logoBase64,
        settings: settings // Kirim settings untuk deteksi hari libur
      })
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `ABSENSI_DESA_SIDAURIP_${filterMonth}_${filterYear}.pdf`
      link.click()
      toast({ title: "Berhasil", description: "Dokumen PDF siap dicetak." })
    } catch (e) {
      console.error(e)
      toast({ variant: "destructive", title: "Gagal", description: "Terjadi kesalahan saat membuat PDF." })
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  if (!isAuthorized) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <header>
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Cetak Dokumen Absensi</h1>
        <p className="text-xs text-muted-foreground font-bold uppercase mt-1">Hasilkan laporan kehadiran resmi untuk arsip desa</p>
      </header>

      <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] rounded-[3rem] bg-white overflow-hidden border-t-8 border-primary">
        <CardHeader className="p-10 pb-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Printer className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-black uppercase tracking-tight">Konfigurasi Laporan</CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pilih periode rekapitulasi</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-10 pt-4 space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Pilih Bulan</label>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="h-16 rounded-2xl bg-slate-50 border-none font-black text-lg px-6">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <SelectItem key={i+1} value={(i+1).toString().padStart(2, '0')} className="font-bold">
                      {format(new Date(2024, i, 1), "MMMM", { locale: localeID })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Pilih Tahun</label>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="h-16 rounded-2xl bg-slate-50 border-none font-black text-lg px-6">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027].map(y => (
                    <SelectItem key={y} value={y.toString()} className="font-bold">{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
               <FileText className="h-10 w-10 text-slate-300" />
               <div>
                  <p className="text-xs font-black uppercase text-slate-900">Preview Dokumen</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    {reportData.length} Personel terdeteksi untuk periode ini
                  </p>
               </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-200" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button 
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF || reportData.length === 0}
              className="h-20 rounded-[1.5rem] bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 text-white font-black uppercase text-sm gap-4 transition-all active:scale-95"
            >
              {isGeneratingPDF ? <Loader2 className="h-6 w-6 animate-spin" /> : <Printer className="h-6 w-6" />}
              Unduh Laporan PDF
            </Button>
            <Button 
              onClick={handleDownloadExcel}
              disabled={reportData.length === 0}
              variant="outline"
              className="h-20 rounded-[1.5rem] border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-slate-600 font-black uppercase text-sm gap-4 transition-all active:scale-95"
            >
              <FileSpreadsheet className="h-6 w-6" />
              Unduh Format Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="bg-blue-50 border border-blue-100 p-6 rounded-[2rem] flex items-start gap-4">
        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
          <Download className="h-4 w-4 text-blue-600" />
        </div>
        <p className="text-[11px] font-bold text-blue-800 leading-relaxed uppercase mt-1">
          Laporan yang dihasilkan menggunakan format Landscape A4 standar pemerintah dengan penandaan otomatis untuk hari libur.
        </p>
      </div>
    </div>
  )
}