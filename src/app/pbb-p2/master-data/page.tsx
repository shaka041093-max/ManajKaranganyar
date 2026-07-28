"use client"

import { useState, useRef, useMemo, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  Upload,
  Download,
  Plus,
  Trash2,
  Edit,
  Search,
  Loader2,
  FileSpreadsheet,
  Users,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  Building,
  UserCheck,
  CloudUpload,
} from "lucide-react"
import Link from "next/link"
import * as XLSX from "xlsx"
import { useUser, useFirestore } from "@/firebase"
import { collection, query, where, orderBy, doc, getDocs, writeBatch } from "firebase/firestore"
import {
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from "@/firebase/non-blocking-updates"
import { DhkpRecord, Kolektor, Wilayah, getOfficialDusun } from "@/types/pbb"
import { cn } from "@/lib/utils"
import { usePbbContext } from "@/context/PbbContext"

export default function PbbMasterDataPage() {
  const { user } = useUser()
  const db = useFirestore()
  const { toast } = useToast()

  const {
    selectedYear,
    setSelectedYear,
    dhkpList,
    kolektorList,
    wilayahList,
    loadingDhkp,
    loadingKolektor,
    loadingWilayah,
  } = usePbbContext()

  const [activeTab, setActiveTab] = useState<string>("dhkp")
  const [searchDhkp, setSearchDhkp] = useState("")
  const [filterDusun, setFilterDusun] = useState("all")
  const [filterStatusBayar, setFilterStatusBayar] = useState("all")
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Real-time Firestore Import Progress State
  const [importProgress, setImportProgress] = useState<{
    show: boolean
    current: number
    total: number
    percent: number
    currentNop?: string
  }>({
    show: false,
    current: 0,
    total: 0,
    percent: 0,
    currentNop: "",
  })

  // Dialog States for DHKP
  const [openDhkpModal, setOpenDhkpModal] = useState(false)
  const [editingDhkp, setEditingDhkp] = useState<DhkpRecord | null>(null)
  const [dhkpForm, setDhkpForm] = useState<Partial<DhkpRecord>>({
    nop: "",
    namaWp: "",
    alamatWp: "",
    alamatOp: "",
    rt: "001",
    rw: "001",
    dusun: "Dusun Rungkang",
    luasBumi: 0,
    luasBangunan: 0,
    ketetapanNominal: 0,
    statusBangunan: "Ada Bangunan",
    statusBayar: "Belum Lunas",
  })

  // Dialog States for Kolektor
  const [openKolektorModal, setOpenKolektorModal] = useState(false)
  const [editingKolektor, setEditingKolektor] = useState<Kolektor | null>(null)
  const [kolektorForm, setKolektorForm] = useState<Partial<Kolektor>>({
    nama: "",
    noTelp: "",
    jabatan: "Perangkat Desa",
    status: "Aktif",
  })

  // Dialog States for Wilayah
  const [openWilayahModal, setOpenWilayahModal] = useState(false)
  const [wilayahForm, setWilayahForm] = useState<Partial<Wilayah>>({
    dusun: "Dusun Rungkang",
    rw: "001",
    rt: "001",
  })

  // State for Pembagian Petugas Tab
  const [assignBlok, setAssignBlok] = useState<string>("all")
  const [assignDusun, setAssignDusun] = useState<string>("all")
  const [assignRw, setAssignRw] = useState<string>("all")
  const [assignRt, setAssignRt] = useState<string>("all")
  const [assignKolektorId, setAssignKolektorId] = useState<string>("")
  const [isAssigning, setIsAssigning] = useState<boolean>(false)

  const [showDeleteDhkpConfirm, setShowDeleteDhkpConfirm] = useState(false)

  const formatIDR = (val: number) =>
    `Rp ${new Intl.NumberFormat("id-ID").format(val)}`

  // Filtered DHKP List using getOfficialDusun
  const filteredDhkp = useMemo(() => {
    return (dhkpList || []).filter((item) => {
      // Flexible year match (handles "2026", 2026, "2026.0", or missing tahun)
      const itemYear = String(item.tahun || "").replace(/\.0$/, "").trim()
      const selYear = String(selectedYear).trim()
      const matchYear = !itemYear || !selYear || itemYear === selYear

      const matchSearch =
        item.nop?.toLowerCase().includes(searchDhkp.toLowerCase()) ||
        item.namaWp?.toLowerCase().includes(searchDhkp.toLowerCase()) ||
        item.alamatOp?.toLowerCase().includes(searchDhkp.toLowerCase()) ||
        item.rt?.includes(searchDhkp) ||
        item.rw?.includes(searchDhkp)

      const officialD = getOfficialDusun(item.dusun, item.rw, item.rt, `${item.alamatWp || ""} ${item.alamatOp || ""}`)
      const matchDusun = filterDusun === "all" || officialD === filterDusun
      const matchStatus =
        filterStatusBayar === "all" || item.statusBayar === filterStatusBayar

      return matchYear && matchSearch && matchDusun && matchStatus
    })
  }, [dhkpList, selectedYear, searchDhkp, filterDusun, filterStatusBayar])

  // Statistics for DHKP
  const dhkpStats = useMemo(() => {
    const data = (dhkpList || []).filter((item) => {
      const itemYear = String(item.tahun || "").replace(/\.0$/, "").trim()
      const selYear = String(selectedYear).trim()
      return !itemYear || !selYear || itemYear === selYear
    })
    const totalNop = data.length
    const totalKetetapan = data.reduce((acc, curr) => acc + (curr.ketetapanNominal || 0), 0)
    const lunasCount = data.filter((d) => d.statusBayar === "Lunas").length
    const lunasNominal = data
      .filter((d) => d.statusBayar === "Lunas")
      .reduce((acc, curr) => acc + (curr.ketetapanNominal || 0), 0)

    return { totalNop, totalKetetapan, lunasCount, lunasNominal }
  }, [dhkpList, selectedYear])

  // Helper to extract Blok from DhkpRecord
  const getRecordBlok = (item: DhkpRecord) => {
    if (item.blok && item.blok.trim() !== "") return item.blok.trim()
    const nopParts = (item.nop || "").split(/[\.-]/)
    if (nopParts.length >= 5 && /^\d{3}$/.test(nopParts[4].trim())) {
      return `Blok ${nopParts[4].trim()}`
    }
    const match = (item.alamatOp || "").match(/BLOK\s*[:\.]?\s*([A-Za-z0-9]+)/i)
    if (match) return `Blok ${match[1].padStart(3, "0")}`
    return "Blok 001"
  }

  // Available Blok options from DHKP
  const availableBloks = useMemo(() => {
    const setBlok = new Set<string>()
    ;(dhkpList || []).forEach((item) => {
      setBlok.add(getRecordBlok(item))
    })
    return Array.from(setBlok).sort()
  }, [dhkpList])

  // Available Dusun options
  const availableDusuns = useMemo(() => {
    return ["Dusun Rungkang", "Dusun Margasari"]
  }, [])

  // Available RW options
  const availableRws = useMemo(() => {
    const setR = new Set<string>()
    ;(dhkpList || []).forEach((i) => { if (i.rw) setR.add(i.rw) })
    ;(wilayahList || []).forEach((w) => { if (w.rw) setR.add(w.rw) })
    if (setR.size === 0) return ["001", "002", "003"]
    return Array.from(setR).sort()
  }, [dhkpList, wilayahList])

  // Available RT options
  const availableRts = useMemo(() => {
    const setR = new Set<string>()
    ;(dhkpList || []).forEach((i) => { if (i.rt) setR.add(i.rt) })
    ;(wilayahList || []).forEach((w) => { if (w.rt) setR.add(w.rt) })
    if (setR.size === 0) return ["001", "002", "003", "004", "005", "006", "007", "008", "009"]
    return Array.from(setR).sort()
  }, [dhkpList, wilayahList])

  // DHKP filtered for Pembagian Petugas tab
  const dhkpForAssignment = useMemo(() => {
    return (filteredDhkp || []).filter((item) => {
      const itemBlok = getRecordBlok(item)
      const officialD = getOfficialDusun(item.dusun, item.rw, item.rt, `${item.alamatWp || ""} ${item.alamatOp || ""}`)
      const matchBlok = assignBlok === "all" || itemBlok === assignBlok
      const matchDusun = assignDusun === "all" || officialD === assignDusun
      const matchRw = assignRw === "all" || item.rw === assignRw
      const matchRt = assignRt === "all" || item.rt === assignRt

      return matchBlok && matchDusun && matchRw && matchRt
    })
  }, [filteredDhkp, assignBlok, assignDusun, assignRw, assignRt])

  // One-click batch fix for existing Firestore records
  const handleFixAllDusunsInFirestore = async () => {
    if (!db || !dhkpList || dhkpList.length === 0) return
    setIsProcessing(true)
    try {
      const BATCH_SIZE = 400
      let updatedCount = 0

      for (let i = 0; i < dhkpList.length; i += BATCH_SIZE) {
        const chunk = dhkpList.slice(i, i + BATCH_SIZE)
        const batch = writeBatch(db)

        chunk.forEach((item) => {
          if (item.id) {
            const officialD = getOfficialDusun(
              item.dusun,
              item.rw,
              item.rt,
              `${item.alamatWp || ""} ${item.alamatOp || ""}`
            )
            if (item.dusun !== officialD) {
              const docRef = doc(db, "pbb_dhkp", item.id)
              batch.update(docRef, { dusun: officialD })
              updatedCount++
            }
          }
        })

        await batch.commit()
      }

      toast({
        title: "Perbaikan Dusun Berhasil!",
        description: `Berhasil menyesuaikan ${updatedCount} data Dusun di Firestore berdasarkan plot RT/RW resmi.`,
      })
    } catch (e: any) {
      console.error(e)
      toast({
        variant: "destructive",
        title: "Gagal Memperbarui",
        description: e.message || "Gagal memperbarui data Dusun.",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // BULK ASSIGN PETUGAS HANDLER
  const handleBulkAssignKolektor = async () => {
    if (!db || !assignKolektorId) {
      toast({
        variant: "destructive",
        title: "Pilih Penarik",
        description: "Silakan pilih petugas penarik (Kolektor) terlebih dahulu.",
      })
      return
    }

    const targetKolektor = (kolektorList || []).find(
      (k) => k.id === assignKolektorId
    )
    if (!targetKolektor) return

    if (dhkpForAssignment.length === 0) {
      toast({
        variant: "destructive",
        title: "Tidak Ada Data",
        description: "Tidak ditemukan data NOP DHKP yang sesuai dengan kriteria filter.",
      })
      return
    }

    setIsAssigning(true)
    try {
      const BATCH_SIZE = 400
      for (let i = 0; i < dhkpForAssignment.length; i += BATCH_SIZE) {
        const chunk = dhkpForAssignment.slice(i, i + BATCH_SIZE)
        const batch = writeBatch(db)
        chunk.forEach((item) => {
          if (item.id) {
            const docRef = doc(db, "pbb_dhkp", item.id)
            batch.update(docRef, {
              penarikId: targetKolektor.id,
              penarikNama: targetKolektor.nama,
            })
          }
        })
        await batch.commit()
      }

      toast({
        title: "Penugasan Berhasil!",
        description: `Berhasil menugaskan ${dhkpForAssignment.length} NOP DHKP kepada petugas ${targetKolektor.nama}.`,
      })
    } catch (e: any) {
      console.error(e)
      toast({
        variant: "destructive",
        title: "Penugasan Gagal",
        description: e.message || "Gagal memperbarui penugasan.",
      })
    } finally {
      setIsAssigning(false)
    }
  }

  // EXCEL TEMPLATE DOWNLOAD (BAPENDA 15 COLUMNS FORMAT)
  const handleDownloadTemplateBapenda = () => {
    const templateHeader = [
      {
        NO: 1,
        KECAMATAN: "RUNGKANG",
        KELURAHAN: "RUNGKANG",
        NOP: "33.04.120.005.001-0001.0",
        TAHUN: selectedYear,
        "NAMA WP": "BUDI SANTOSO",
        "ALAMAT WP": "RT 001 RW 001 DUSUN I DESA RUNGKANG",
        "LETAK OP": "RT 001 RW 001 DUSUN I",
        "LUAS BUMI": 250,
        "LUAS BANGUNAN": 80,
        "NJOP BUMI": 150000000,
        "NJOP BANGUNAN": 120000000,
        "NJOP SPPT": 270000000,
        "POKOK PAJAK": 125000,
        "TGL BAYAR": "",
      },
    ]

    const ws = XLSX.utils.json_to_sheet(templateHeader)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "FORMAT_IMPOR_BAPENDA")
    XLSX.writeFile(wb, `Format_Impor_PBB_Bapenda_${selectedYear}.xlsx`)

    toast({
      title: "Format Excel Diunduh",
      description: "Gunakan template ini untuk mengisi data PBB dari Bapenda/Kabupaten.",
    })
  }

  // EXCEL IMPORT HANDLER FOR DHKP (BAPENDA 15 COLUMNS FORMAT)
  const handleImportDhkp = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !db) return

    setIsProcessing(true)
    const reader = new FileReader()

    reader.onload = async (event) => {
      try {
        const bstr = event.target?.result
        const wb = XLSX.read(bstr, { type: "binary" })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]

        // 1. Read sheet as 2D array of rows
        const grid: any[][] = XLSX.utils.sheet_to_json(ws, {
          header: 1,
          defval: "",
          blankrows: false,
        })

        if (!grid || grid.length === 0) {
          throw new Error("File Excel/CSV kosong atau tidak memiliki data.")
        }

        // Helper to normalize cell header text
        const norm = (str: any) =>
          String(str || "")
            .replace(/[\r\n\t]+/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase()

        // 2. Find header row in grid
        let headerRowIdx = -1
        for (let r = 0; r < Math.min(grid.length, 15); r++) {
          const rowStr = grid[r].map(norm).join(" ")
          if (rowStr.includes("nop") || rowStr.includes("nama wp") || rowStr.includes("pokok pajak")) {
            headerRowIdx = r
            break
          }
        }

        const colIdxMap: Record<string, number> = {}

        if (headerRowIdx !== -1) {
          const headerRow = grid[headerRowIdx].map(norm)
          headerRow.forEach((cellText, cIdx) => {
            if (cellText.includes("nop") && colIdxMap["nop"] === undefined) colIdxMap["nop"] = cIdx
            else if ((cellText.includes("nama wp") || cellText.includes("nama_wp") || cellText === "nama") && colIdxMap["namaWp"] === undefined) colIdxMap["namaWp"] = cIdx
            else if ((cellText.includes("alamat wp") || cellText.includes("alamat_wp")) && colIdxMap["alamatWp"] === undefined) colIdxMap["alamatWp"] = cIdx
            else if ((cellText.includes("letak op") || cellText.includes("letak_op") || cellText.includes("alamat op")) && colIdxMap["alamatOp"] === undefined) colIdxMap["alamatOp"] = cIdx
            else if (cellText.includes("luas bumi") && colIdxMap["luasBumi"] === undefined) colIdxMap["luasBumi"] = cIdx
            else if (cellText.includes("luas bangunan") && colIdxMap["luasBangunan"] === undefined) colIdxMap["luasBangunan"] = cIdx
            else if (cellText.includes("njop bumi") && colIdxMap["njopBumi"] === undefined) colIdxMap["njopBumi"] = cIdx
            else if (cellText.includes("njop bangunan") && colIdxMap["njopBangunan"] === undefined) colIdxMap["njopBangunan"] = cIdx
            else if (cellText.includes("njop sppt") && colIdxMap["njopSppt"] === undefined) colIdxMap["njopSppt"] = cIdx
            else if ((cellText.includes("pokok pajak") || cellText.includes("pokok") || cellText.includes("ketetapan")) && colIdxMap["pokokPajak"] === undefined) colIdxMap["pokokPajak"] = cIdx
            else if ((cellText.includes("tgl bayar") || cellText.includes("tgl_bayar") || cellText.includes("tanggal bayar")) && colIdxMap["tglBayar"] === undefined) colIdxMap["tglBayar"] = cIdx
            else if (cellText.includes("kecamatan") && colIdxMap["kecamatan"] === undefined) colIdxMap["kecamatan"] = cIdx
            else if ((cellText.includes("kelurahan") || cellText.includes("desa")) && colIdxMap["kelurahan"] === undefined) colIdxMap["kelurahan"] = cIdx
            else if (cellText.includes("tahun") && colIdxMap["tahun"] === undefined) colIdxMap["tahun"] = cIdx
          })
        }

        // Fallback default index positions if header search didn't locate exact keys
        const getColVal = (row: any[], key: string, fallbackIdx: number) => {
          if (colIdxMap[key] !== undefined && row[colIdxMap[key]] !== undefined) return row[colIdxMap[key]]
          if (row.length > fallbackIdx) return row[fallbackIdx]
          return ""
        }

        const dataStartIdx = headerRowIdx !== -1 ? headerRowIdx + 1 : 1

        const parseIndonesianNum = (val: any): number => {
          if (typeof val === "number") return val
          if (!val) return 0
          const str = String(val).trim()
          if (!str) return 0
          let cleaned = str.replace(/\s+/g, "")
          if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
            cleaned = cleaned.replace(/\./g, "")
          } else if (/^\d+\.\d{3}$/.test(cleaned)) {
            cleaned = cleaned.replace(/\./g, "")
          } else {
            cleaned = cleaned.replace(/,/g, ".")
          }
          const num = parseFloat(cleaned)
          return isNaN(num) ? 0 : num
        }

        const rows: DhkpRecord[] = []

        for (let i = dataStartIdx; i < grid.length; i++) {
          const row = grid[i]
          if (!row || row.length === 0) continue

          const nop = String(getColVal(row, "nop", 3) || "").trim()
          const namaWp = String(getColVal(row, "namaWp", 5) || "").trim()

          // Skip empty or header-repetition rows
          if (!nop || !namaWp || norm(nop) === "nop" || norm(namaWp) === "nama wp") {
            continue
          }

          const kecamatan = String(getColVal(row, "kecamatan", 1) || "GANDRUNGMANGU").trim()
          const kelurahan = String(getColVal(row, "kelurahan", 2) || "RUNGKANG").trim()
          const tahunRow = String(getColVal(row, "tahun", 4) || selectedYear).trim()
          const alamatWp = String(getColVal(row, "alamatWp", 6) || "-").trim()
          const letakOp = String(getColVal(row, "alamatOp", 7) || "-").trim()

          const luasBumi = parseIndonesianNum(getColVal(row, "luasBumi", 8))
          const luasBangunan = parseIndonesianNum(getColVal(row, "luasBangunan", 9))
          const njopBumi = parseIndonesianNum(getColVal(row, "njopBumi", 10))
          const njopBangunan = parseIndonesianNum(getColVal(row, "njopBangunan", 11))
          const njopSppt = parseIndonesianNum(getColVal(row, "njopSppt", 12))
          const pokokPajak = parseIndonesianNum(getColVal(row, "pokokPajak", 13))
          const tglBayarRaw = getColVal(row, "tglBayar", 14)

          // Intelligent RT / RW / Dusun Parsing from address strings
          let rt = "001"
          let rw = "001"

          const combinedAddr = `${alamatWp} ${letakOp}`

          const rtMatch = combinedAddr.match(/RT\s*[:\.]?\s*(\d+)/i)
          if (rtMatch) {
            rt = String(rtMatch[1]).padStart(3, "0")
          }

          const rwMatch = combinedAddr.match(/RW\s*[:\.]?\s*(\d+)/i)
          if (rwMatch) {
            rw = String(rwMatch[1]).padStart(3, "0")
          }

          const slashMatch = combinedAddr.match(/(\d{2,3})\s*\/\s*(\d{2,3})/)
          if (slashMatch && (!rtMatch || !rwMatch)) {
            rt = String(slashMatch[1]).padStart(3, "0")
            rw = String(slashMatch[2]).padStart(3, "0")
          }

          // Official Desa Rungkang Administrative Division:
          // RW 02 (RT 01 s/d RT 09) or MARGASARI -> Dusun Margasari
          // RW 01 (RT 01 s/d RT 07) & RW 03 (RT 01 s/d RT 04) -> Dusun Rungkang
          let dusun = "Dusun Rungkang"
          const numRw = parseInt(rw, 10)
          if (numRw === 2 || /MARGASARI/i.test(combinedAddr)) {
            dusun = "Dusun Margasari"
          } else {
            dusun = "Dusun Rungkang"
          }

          // Format Date & Status Bayar
          let tglBayarStr = ""
          let statusBayar: "Lunas" | "Belum Lunas" = "Belum Lunas"

          if (tglBayarRaw) {
            if (typeof tglBayarRaw === "number") {
              const parsedDate = new Date(Math.round((tglBayarRaw - (25567 + 2)) * 86400 * 1000))
              if (!isNaN(parsedDate.getTime())) {
                tglBayarStr = parsedDate.toISOString().split("T")[0]
              }
            } else if (String(tglBayarRaw).trim() !== "" && String(tglBayarRaw).trim() !== "-") {
              tglBayarStr = String(tglBayarRaw).trim()
            }
          }

          if (tglBayarStr !== "") {
            statusBayar = "Lunas"
          }

          rows.push({
            nop,
            namaWp,
            alamatWp,
            alamatOp: letakOp,
            rt,
            rw,
            dusun,
            luasBumi,
            luasBangunan,
            ketetapanNominal: pokokPajak,
            statusBangunan: luasBangunan > 0 ? "Ada Bangunan" : "Kosong",
            statusBayar,
            tahun: tahunRow || selectedYear,
            kecamatan,
            kelurahan,
            njopBumi,
            njopBangunan,
            njopSppt,
            tglBayar: tglBayarStr,
          })
        }

        if (rows.length === 0) {
          throw new Error("Tidak ada data DHKP yang valid dalam file Excel/CSV ini. Pastikan kolom NOP dan NAMA WP terisi.")
        }

        // Show real-time progress modal
        setImportProgress({
          show: true,
          current: 0,
          total: rows.length,
          percent: 0,
          currentNop: rows[0]?.nop || "",
        })

        const colRef = collection(db, "pbb_dhkp")
        const BATCH_SIZE = 250
        let processed = 0

        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
          const chunk = rows.slice(i, i + BATCH_SIZE)
          const batch = writeBatch(db)

          chunk.forEach((row) => {
            const newDocRef = doc(colRef)
            batch.set(newDocRef, row)
          })

          await batch.commit()

          processed += chunk.length
          const percent = Math.min(100, Math.round((processed / rows.length) * 100))

          setImportProgress({
            show: true,
            current: processed,
            total: rows.length,
            percent,
            currentNop: chunk[chunk.length - 1]?.nop || "",
          })

          await new Promise((res) => setTimeout(res, 50))
        }

        toast({
          title: "Impor DHKP Berhasil!",
          description: `Berhasil mengunggah ${rows.length} NOP DHKP PBB TA ${selectedYear} ke Cloud Firestore.`,
        })
      } catch (error: any) {
        console.error("Import error:", error)
        toast({
          variant: "destructive",
          title: "Impor Gagal",
          description: error.message || "Gagal membaca format file Excel Bapenda.",
        })
      } finally {
        setIsProcessing(false)
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    }

    reader.readAsBinaryString(file)
  }

  // EXCEL EXPORT HANDLER (BAPENDA 15 COLUMNS FORMAT)
  const handleExportDhkp = () => {
    if (!filteredDhkp || filteredDhkp.length === 0) return
    const exportData = filteredDhkp.map((item, idx) => ({
      NO: idx + 1,
      KECAMATAN: item.kecamatan || "RUNGKANG",
      KELURAHAN: item.kelurahan || "RUNGKANG",
      NOP: item.nop,
      TAHUN: item.tahun || selectedYear,
      "NAMA WP": item.namaWp,
      "ALAMAT WP": item.alamatWp,
      "LETAK OP": item.alamatOp,
      "LUAS BUMI": item.luasBumi,
      "LUAS BANGUNAN": item.luasBangunan,
      "NJOP BUMI": item.njopBumi || 0,
      "NJOP BANGUNAN": item.njopBangunan || 0,
      "NJOP SPPT": item.njopSppt || 0,
      "POKOK PAJAK": item.ketetapanNominal,
      "TGL BAYAR": item.tglBayar || (item.statusBayar === "Lunas" ? "Lunas" : ""),
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `DHKP_${selectedYear}`)
    XLSX.writeFile(wb, `Data_DHKP_PBB_Bapenda_${selectedYear}.xlsx`)

    toast({
      title: "Ekspor Berhasil",
      description: `Data DHKP PBB TA ${selectedYear} (Format Bapenda) berhasil diunduh.`,
    })
  }

  // DHKP SAVE HANDLER
  const handleSaveDhkp = () => {
    if (!db || !dhkpForm.nop || !dhkpForm.namaWp) {
      toast({
        variant: "destructive",
        title: "Gagal",
        description: "NOP dan Nama Wajib Pajak wajib diisi.",
      })
      return
    }

    const dataToSave = {
      ...dhkpForm,
      tahun: selectedYear,
      ketetapanNominal: Number(dhkpForm.ketetapanNominal || 0),
      luasBumi: Number(dhkpForm.luasBumi || 0),
      luasBangunan: Number(dhkpForm.luasBangunan || 0),
    }

    if (editingDhkp?.id) {
      const docRef = doc(db, "pbb_dhkp", editingDhkp.id)
      updateDocumentNonBlocking(docRef, dataToSave)
      toast({ title: "Diperbarui", description: "Data DHKP berhasil diubah." })
    } else {
      const colRef = collection(db, "pbb_dhkp")
      addDocumentNonBlocking(colRef, dataToSave)
      toast({ title: "Ditambahkan", description: "Data DHKP baru tersimpan." })
    }

    setOpenDhkpModal(false)
    setEditingDhkp(null)
  }

  // DELETE DHKP
  const handleDeleteDhkp = (id?: string) => {
    if (!db || !id) return
    deleteDocumentNonBlocking(doc(db, "pbb_dhkp", id))
    toast({ variant: "destructive", title: "Dihapus", description: "Data DHKP telah dihapus." })
  }

  // BATCH DELETE DHKP
  const handleDeleteAllDhkp = async () => {
    if (!db) return
    setIsProcessing(true)
    try {
      const q = query(
        collection(db, "pbb_dhkp"),
        where("tahun", "==", selectedYear)
      )
      const snapshot = await getDocs(q)
      snapshot.docs.forEach((docSnap) => {
        deleteDocumentNonBlocking(docSnap.ref)
      })
      toast({
        variant: "destructive",
        title: "Seluruh DHKP Dihapus",
        description: `Data DHKP TA ${selectedYear} telah dibersihkan.`,
      })
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Gagal",
        description: "Kesalahan saat menghapus data.",
      })
    } finally {
      setIsProcessing(false)
      setShowDeleteDhkpConfirm(false)
    }
  }

  // KOLEKTOR SAVE HANDLER
  const handleSaveKolektor = () => {
    if (!db || !kolektorForm.nama) return

    if (editingKolektor?.id) {
      const docRef = doc(db, "pbb_kolektor", editingKolektor.id)
      updateDocumentNonBlocking(docRef, kolektorForm)
      toast({ title: "Berhasil", description: "Data penarik berhasil diperbarui." })
    } else {
      const colRef = collection(db, "pbb_kolektor")
      addDocumentNonBlocking(colRef, kolektorForm)
      toast({ title: "Berhasil", description: "Penarik PBB baru ditambahkan." })
    }

    setOpenKolektorModal(false)
    setEditingKolektor(null)
  }

  // WILAYAH SAVE HANDLER
  const handleSaveWilayah = () => {
    if (!db || !wilayahForm.dusun) return
    const colRef = collection(db, "pbb_wilayah")
    addDocumentNonBlocking(colRef, wilayahForm)
    toast({ title: "Berhasil", description: "Master Wilayah baru ditambahkan." })
    setOpenWilayahModal(false)
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      {/* Header Section */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-6 w-6" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black text-primary uppercase tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6 text-primary" />
              Master Data PBB-P2
            </h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
              Database Objek Pajak (DHKP), Penarik (Kolektor), & Master Wilayah
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center w-full sm:w-auto">
          <div className="flex items-center gap-2 mr-2">
            <Calendar className="h-4 w-4 text-primary" />
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-9 w-[100px] rounded-xl font-black bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["2024", "2025", "2026", "2027", "2028", "2029", "2030"].map(
                  (y) => (
                    <SelectItem key={y} value={y} className="font-bold">
                      {y}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportDhkp}
            className="hidden"
            accept=".xlsx, .xls, .csv"
          />

          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-xl gap-2 font-bold text-[10px] uppercase bg-white shadow-sm border-dashed border-primary/40 text-primary hover:bg-primary/5"
            onClick={handleDownloadTemplateBapenda}
          >
            <Download className="h-3.5 w-3.5" />
            Format Excel Bapenda
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-xl gap-2 font-bold text-[10px] uppercase bg-white shadow-sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5 text-primary" />
            )}
            Impor DHKP Excel
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-xl gap-2 font-bold text-[10px] uppercase bg-white shadow-sm"
            onClick={handleExportDhkp}
          >
            <Download className="h-3.5 w-3.5 text-emerald-600" />
            Ekspor Excel
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-xl gap-2 font-bold text-[10px] uppercase bg-white shadow-sm border-blue-200 text-blue-700 hover:bg-blue-50"
            onClick={handleFixAllDusunsInFirestore}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <MapPin className="h-3.5 w-3.5 text-blue-600" />
            )}
            Sesuaikan Dusun RT/RW
          </Button>

          <Button
            variant="destructive"
            size="sm"
            className="h-9 rounded-xl gap-2 font-bold text-[10px] uppercase shadow-lg shadow-destructive/20"
            onClick={() => setShowDeleteDhkpConfirm(true)}
            disabled={isProcessing}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Bersihkan TA {selectedYear}
          </Button>
        </div>
      </header>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 lg:grid-cols-4 h-auto p-1.5 rounded-2xl bg-slate-100/80 mb-6 gap-1">
          <TabsTrigger
            value="dhkp"
            className="rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-wider gap-2 data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm py-3"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Data DHKP (Objek Pajak)
          </TabsTrigger>
          <TabsTrigger
            value="kolektor"
            className="rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-wider gap-2 data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm py-3"
          >
            <Users className="h-4 w-4" />
            Data Penarik (Kolektor)
          </TabsTrigger>
          <TabsTrigger
            value="pembagian"
            className="rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-wider gap-2 data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm py-3"
          >
            <UserCheck className="h-4 w-4" />
            Pembagian Petugas
          </TabsTrigger>
          <TabsTrigger
            value="wilayah"
            className="rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-wider gap-2 data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm py-3"
          >
            <MapPin className="h-4 w-4" />
            Master Wilayah (Dusun/RW/RT)
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: DATA DHKP / OBJEK PAJAK */}
        <TabsContent value="dhkp" className="space-y-6">
          {/* DHKP Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-none shadow-md rounded-2xl bg-white p-5">
              <div className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                Total Objek Pajak (NOP)
              </div>
              <div className="text-2xl font-black text-slate-800 mt-1">
                {dhkpStats.totalNop} <span className="text-xs font-normal">NOP</span>
              </div>
            </Card>

            <Card className="border-none shadow-md rounded-2xl bg-primary text-white p-5">
              <div className="text-[10px] font-black uppercase tracking-wider opacity-80">
                Total Ketetapan PBB {selectedYear}
              </div>
              <div className="text-2xl font-black mt-1">
                {formatIDR(dhkpStats.totalKetetapan)}
              </div>
            </Card>

            <Card className="border-none shadow-md rounded-2xl bg-emerald-600 text-white p-5">
              <div className="text-[10px] font-black uppercase tracking-wider opacity-80">
                Realisasi Lunas
              </div>
              <div className="text-2xl font-black mt-1">
                {formatIDR(dhkpStats.lunasNominal)}
                <span className="text-xs font-bold ml-2 opacity-90">
                  ({dhkpStats.lunasCount} NOP)
                </span>
              </div>
            </Card>

            <Card className="border-none shadow-md rounded-2xl bg-rose-600 text-white p-5">
              <div className="text-[10px] font-black uppercase tracking-wider opacity-80">
                Sisa Tagihan
              </div>
              <div className="text-2xl font-black mt-1">
                {formatIDR(dhkpStats.totalKetetapan - dhkpStats.lunasNominal)}
              </div>
            </Card>
          </div>

          {/* DHKP Table Card */}
          <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
            <CardHeader className="p-6 bg-slate-50/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100">
              <div>
                <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-800">
                  Daftar Objek & Wajib Pajak (DHKP) TA {selectedYear}
                </CardTitle>
                <CardDescription className="text-xs font-medium">
                  Manajemen rincian NOP, Wajib Pajak, Alamat, Luas, dan Nominal Ketetapan
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari NOP, WP, Alamat, RT..."
                    className="pl-9 h-10 w-full sm:w-[220px] bg-white rounded-xl text-xs"
                    value={searchDhkp}
                    onChange={(e) => setSearchDhkp(e.target.value)}
                  />
                </div>

                <Select value={filterDusun} onValueChange={setFilterDusun}>
                  <SelectTrigger className="h-10 w-[120px] rounded-xl text-xs font-bold bg-white">
                    <SelectValue placeholder="Dusun" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Dusun</SelectItem>
                    <SelectItem value="Dusun Rungkang">Dusun Rungkang</SelectItem>
                    <SelectItem value="Dusun Margasari">Dusun Margasari</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filterStatusBayar}
                  onValueChange={setFilterStatusBayar}
                >
                  <SelectTrigger className="h-10 w-[130px] rounded-xl text-xs font-bold bg-white">
                    <SelectValue placeholder="Status Bayar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="Belum Lunas">Belum Lunas</SelectItem>
                    <SelectItem value="Lunas">Lunas</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  onClick={() => {
                    setEditingDhkp(null)
                    setDhkpForm({
                      nop: "",
                      namaWp: "",
                      alamatWp: "",
                      alamatOp: "",
                      rt: "001",
                      rw: "001",
                      dusun: "Dusun I",
                      luasBumi: 0,
                      luasBangunan: 0,
                      ketetapanNominal: 0,
                      statusBangunan: "Ada Bangunan",
                      statusBayar: "Belum Lunas",
                    })
                    setOpenDhkpModal(true)
                  }}
                  className="h-10 rounded-xl font-bold text-xs gap-2 bg-primary text-white shadow-lg shadow-primary/20"
                >
                  <Plus className="h-4 w-4" /> Tambah NOP
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <ScrollArea className="h-[520px] w-full">
                <Table>
                  <TableHeader className="bg-slate-100/80 sticky top-0 z-10 backdrop-blur-md">
                    <TableRow>
                      <TableHead className="text-[10px] font-black uppercase px-6 h-11">
                        NOP (18 Digit)
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase h-11">
                        Nama & Alamat WP
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase h-11">
                        Lokasi OP & Wilayah
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-center h-11">
                        Luas (Bumi/Bgn)
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-right h-11">
                        Ketetapan PBB
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-center h-11">
                        Status
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-center px-6 h-11">
                        Aksi
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingDhkp ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-40 text-center">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary/40" />
                        </TableCell>
                      </TableRow>
                    ) : filteredDhkp.length > 0 ? (
                      filteredDhkp.map((item) => (
                        <TableRow
                          key={item.id}
                          className="hover:bg-slate-50 border-slate-100"
                        >
                          <TableCell className="font-mono text-xs font-bold text-slate-900 px-6">
                            {item.nop}
                          </TableCell>
                          <TableCell className="py-3">
                            <p className="text-xs font-bold text-slate-800">
                              {item.namaWp}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                              {item.alamatWp}
                            </p>
                          </TableCell>
                          <TableCell className="py-3">
                            <p className="text-xs font-semibold text-slate-700">
                              {item.alamatOp}
                            </p>
                            <div className="flex gap-1 mt-0.5">
                              <Badge
                                variant="outline"
                                className="text-[9px] font-bold px-1.5 py-0 bg-slate-50"
                              >
                                RT {item.rt} / RW {item.rw}
                              </Badge>
                              <Badge
                                variant="outline"
                                className="text-[9px] font-bold px-1.5 py-0 bg-slate-50"
                              >
                                {getOfficialDusun(item.dusun, item.rw, item.rt, `${item.alamatWp || ""} ${item.alamatOp || ""}`)}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-xs">
                            <span className="font-bold">{item.luasBumi}</span> m² /{" "}
                            <span className="font-bold">{item.luasBangunan}</span> m²
                          </TableCell>
                          <TableCell className="text-right font-black text-xs text-primary">
                            {formatIDR(item.ketetapanNominal)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={cn(
                                "text-[10px] font-black px-2.5 py-1 border-none",
                                item.statusBayar === "Lunas"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-rose-100 text-rose-700"
                              )}
                            >
                              {item.statusBayar === "Lunas" ? (
                                <CheckCircle2 className="h-3 w-3 mr-1 inline" />
                              ) : (
                                <XCircle className="h-3 w-3 mr-1 inline" />
                              )}
                              {item.statusBayar}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center px-6">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-600 hover:text-primary hover:bg-primary/10 rounded-lg"
                                onClick={() => {
                                  setEditingDhkp(item)
                                  setDhkpForm(item)
                                  setOpenDhkpModal(true)
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                onClick={() => handleDeleteDhkp(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-44 text-center">
                          <div className="flex flex-col items-center justify-center text-slate-400">
                            <FileSpreadsheet className="h-10 w-10 opacity-30 mb-2" />
                            <p className="text-sm font-bold uppercase tracking-wider">
                              Belum Ada Data DHKP TA {selectedYear}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Gunakan tombol "Impor DHKP Excel" untuk mengunggah data dari Bapenda.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: DATA PENARIK PBB (KOLEKTOR) */}
        <TabsContent value="kolektor" className="space-y-6">
          <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
            <CardHeader className="p-6 bg-slate-50/60 flex flex-row items-center justify-between border-b border-slate-100">
              <div>
                <CardTitle className="text-lg font-black uppercase text-slate-800 flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  Data Petugas Penarik PBB (Kolektor)
                </CardTitle>
                <CardDescription className="text-xs font-medium">
                  Kelola profil petugas penagih pajak lapangan dan wilayah kerjanya
                </CardDescription>
              </div>

              <Button
                onClick={() => {
                  setEditingKolektor(null)
                  setKolektorForm({
                    nama: "",
                    noTelp: "",
                    jabatan: "Perangkat Desa",
                    wilayahTugas: "Dusun I",
                    status: "Aktif",
                  })
                  setOpenKolektorModal(true)
                }}
                className="h-10 rounded-xl font-bold text-xs gap-2 bg-primary text-white shadow-lg shadow-primary/20"
              >
                <Plus className="h-4 w-4" /> Tambah Penarik
              </Button>
            </CardHeader>

            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {loadingKolektor ? (
                  <div className="col-span-3 text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary/40" />
                  </div>
                ) : kolektorList && kolektorList.length > 0 ? (
                  kolektorList.map((kol) => (
                    <Card
                      key={kol.id}
                      className="border border-slate-200/80 shadow-sm rounded-2xl p-5 hover:shadow-md transition-all bg-white"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm uppercase">
                            {kol.nama.substring(0, 2)}
                          </div>
                          <div>
                            <h3 className="font-black text-sm text-slate-800">
                              {kol.nama}
                            </h3>
                            <p className="text-[11px] text-muted-foreground font-semibold">
                              {kol.jabatan}
                            </p>
                          </div>
                        </div>

                        <Badge
                          className={cn(
                            "text-[9px] font-black px-2 py-0.5 border-none",
                            kol.status === "Aktif"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          )}
                        >
                          {kol.status}
                        </Badge>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">No. WhatsApp/HP:</span>
                          <span className="font-bold text-slate-800">{kol.noTelp || "-"}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-2 flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg text-xs font-bold"
                          onClick={() => {
                            setEditingKolektor(kol)
                            setKolektorForm(kol)
                            setOpenKolektorModal(true)
                          }}
                        >
                          <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-lg text-xs text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (kol.id && db) {
                              deleteDocumentNonBlocking(doc(db, "pbb_kolektor", kol.id))
                              toast({ variant: "destructive", title: "Dihapus", description: "Penarik dihapus." })
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-3 text-center py-12 text-slate-400">
                    <Users className="h-10 w-10 mx-auto opacity-30 mb-2" />
                    <p className="text-sm font-bold uppercase">Belum ada data penarik PBB</p>
                    <p className="text-xs">Klik "Tambah Penarik" untuk mendaftarkan petugas.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: PEMBAGIAN PETUGAS (PLOT MASSAL) */}
        <TabsContent value="pembagian" className="space-y-6">
          <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
            <CardHeader className="p-6 bg-slate-50/60 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-black uppercase text-slate-800 flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  Pembagian Petugas Penarik PBB (Plotting Massal)
                </CardTitle>
                <CardDescription className="text-xs font-medium">
                  Filter DHKP berdasarkan Blok, Dusun, RW, dan RT untuk penugasan kolektor secara sekaligus.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold px-3 py-1 text-xs">
                  {dhkpForAssignment.length} NOP Terpilih
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Filter Bar Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                {/* 1. Filter Blok */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Pilih Blok</label>
                  <Select value={assignBlok} onValueChange={setAssignBlok}>
                    <SelectTrigger className="h-10 rounded-xl font-bold bg-white text-xs">
                      <SelectValue placeholder="Semua Blok" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="font-bold">Semua Blok</SelectItem>
                      {availableBloks.map((b) => (
                        <SelectItem key={b} value={b} className="font-bold">
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 2. Filter Dusun */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Pilih Dusun</label>
                  <Select value={assignDusun} onValueChange={setAssignDusun}>
                    <SelectTrigger className="h-10 rounded-xl font-bold bg-white text-xs">
                      <SelectValue placeholder="Semua Dusun" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="font-bold">Semua Dusun</SelectItem>
                      {availableDusuns.map((d) => (
                        <SelectItem key={d} value={d} className="font-bold">
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 3. Filter RW */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Pilih RW</label>
                  <Select value={assignRw} onValueChange={setAssignRw}>
                    <SelectTrigger className="h-10 rounded-xl font-bold bg-white text-xs">
                      <SelectValue placeholder="Semua RW" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="font-bold">Semua RW</SelectItem>
                      {availableRws.map((rw) => (
                        <SelectItem key={rw} value={rw} className="font-bold">
                          RW {rw}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 4. Filter RT */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Pilih RT</label>
                  <Select value={assignRt} onValueChange={setAssignRt}>
                    <SelectTrigger className="h-10 rounded-xl font-bold bg-white text-xs">
                      <SelectValue placeholder="Semua RT" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="font-bold">Semua RT</SelectItem>
                      {availableRts.map((rt) => (
                        <SelectItem key={rt} value={rt} className="font-bold">
                          RT {rt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 5. Select Kolektor */}
                <div className="space-y-1 sm:col-span-2 md:col-span-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Petugas Penarik</label>
                  <Select value={assignKolektorId} onValueChange={setAssignKolektorId}>
                    <SelectTrigger className="h-10 rounded-xl font-black bg-primary/10 text-primary border-primary/30 text-xs">
                      <SelectValue placeholder="Pilih Petugas..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(kolektorList || []).map((kol) => (
                        <SelectItem key={kol.id} value={kol.id!} className="font-bold">
                          {kol.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Action Button & Summary Header */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-primary/5 rounded-2xl border border-primary/20">
                <div className="text-xs font-semibold text-slate-700 space-y-0.5">
                  <div className="font-black text-primary uppercase">
                    Kriteria: {assignBlok === "all" ? "Semua Blok" : assignBlok} • {assignDusun === "all" ? "Semua Dusun" : assignDusun} • {assignRw === "all" ? "Semua RW" : `RW ${assignRw}`} • {assignRt === "all" ? "Semua RT" : `RT ${assignRt}`}
                  </div>
                  <div>
                    Ditemukan <span className="font-black text-slate-900">{dhkpForAssignment.length} NOP</span> dengan total ketetapan{" "}
                    <span className="font-black text-emerald-700">
                      {formatIDR(dhkpForAssignment.reduce((acc, curr) => acc + (curr.ketetapanNominal || 0), 0))}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleBulkAssignKolektor}
                  disabled={isAssigning || dhkpForAssignment.length === 0}
                  className="h-11 px-6 rounded-xl font-black text-xs uppercase gap-2 bg-primary text-white shadow-lg shadow-primary/20 w-full sm:w-auto shrink-0"
                >
                  {isAssigning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserCheck className="h-4 w-4" />
                  )}
                  Terapkan Penugasan Massal ({dhkpForAssignment.length} NOP)
                </Button>
              </div>

              {/* Table Pratinjau Pembagian */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <ScrollArea className="h-[450px] w-full">
                  <Table>
                    <TableHeader className="bg-slate-100/90 sticky top-0 z-10 backdrop-blur-md">
                      <TableRow>
                        <TableHead className="font-black text-[10px] uppercase px-6">NOP (18 Digit)</TableHead>
                        <TableHead className="font-black text-[10px] uppercase">Wajib Pajak</TableHead>
                        <TableHead className="font-black text-[10px] uppercase">Lokasi OP & Blok</TableHead>
                        <TableHead className="font-black text-[10px] uppercase">Wilayah (RT/RW/Dusun)</TableHead>
                        <TableHead className="font-black text-[10px] uppercase text-right">Ketetapan</TableHead>
                        <TableHead className="font-black text-[10px] uppercase text-center px-6">Petugas Penarik</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingDhkp ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-32 text-center">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary/40" />
                          </TableCell>
                        </TableRow>
                      ) : dhkpForAssignment.length > 0 ? (
                        dhkpForAssignment.map((item) => (
                          <TableRow key={item.id} className="hover:bg-slate-50">
                            <TableCell className="font-mono text-xs font-bold px-6">{item.nop}</TableCell>
                            <TableCell className="font-bold text-xs">{item.namaWp}</TableCell>
                            <TableCell className="text-xs text-slate-600 font-medium">
                              <div>{item.alamatOp || "-"}</div>
                              <Badge variant="outline" className="text-[10px] font-bold bg-slate-100 border-slate-200 mt-0.5">
                                {getRecordBlok(item)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-slate-600">
                              RT {item.rt} / RW {item.rw} • {getOfficialDusun(item.dusun, item.rw, item.rt, `${item.alamatWp || ""} ${item.alamatOp || ""}`)}
                            </TableCell>
                            <TableCell className="text-right font-black text-xs text-primary">
                              {formatIDR(item.ketetapanNominal)}
                            </TableCell>
                            <TableCell className="text-center px-6">
                              {item.penarikNama ? (
                                <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 font-bold border-none text-[10px]">
                                  {item.penarikNama}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-amber-600 bg-amber-50 border-amber-200 font-medium text-[10px]">
                                  Belum Ditugaskan
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-40 text-center text-slate-400">
                            <UserCheck className="h-8 w-8 mx-auto opacity-30 mb-2" />
                            <p className="text-xs font-bold uppercase">Tidak Ada Data DHKP Sesuai Filter</p>
                            <p className="text-[11px]">Silakan sesuaikan pilihan Blok, Dusun, RW, atau RT di atas.</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: MASTER WILAYAH (DUSUN / RW / RT) */}
        <TabsContent value="wilayah" className="space-y-6">
          <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
            <CardHeader className="p-6 bg-slate-50/60 flex flex-row items-center justify-between border-b border-slate-100">
              <div>
                <CardTitle className="text-lg font-black uppercase text-slate-800 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Master Data Wilayah (Dusun / RW / RT)
                </CardTitle>
                <CardDescription className="text-xs font-medium">
                  Pengelompokan wilayah administratif desa untuk pembagian beban kerja PBB
                </CardDescription>
              </div>

              <Button
                onClick={() => setOpenWilayahModal(true)}
                className="h-10 rounded-xl font-bold text-xs gap-2 bg-primary text-white shadow-lg shadow-primary/20"
              >
                <Plus className="h-4 w-4" /> Tambah Wilayah
              </Button>
            </CardHeader>

            <CardContent className="p-6">
              <Table>
                <TableHeader className="bg-slate-100/80">
                  <TableRow>
                    <TableHead className="font-black text-xs uppercase px-6">Dusun</TableHead>
                    <TableHead className="font-black text-xs uppercase text-center">RW</TableHead>
                    <TableHead className="font-black text-xs uppercase text-center">RT</TableHead>
                    <TableHead className="font-black text-xs uppercase text-center px-6">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingWilayah ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-28 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary/40" />
                      </TableCell>
                    </TableRow>
                  ) : wilayahList && wilayahList.length > 0 ? (
                    wilayahList.map((wil) => (
                      <TableRow key={wil.id} className="hover:bg-slate-50">
                        <TableCell className="font-bold text-xs px-6">{wil.dusun}</TableCell>
                        <TableCell className="text-center font-bold text-xs">RW {wil.rw}</TableCell>
                        <TableCell className="text-center font-bold text-xs">RT {wil.rt}</TableCell>
                        <TableCell className="text-center px-6">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg"
                            onClick={() => {
                              if (wil.id && db) {
                                deleteDocumentNonBlocking(doc(db, "pbb_wilayah", wil.id))
                                toast({ variant: "destructive", title: "Dihapus", description: "Wilayah dihapus." })
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-slate-400 font-bold uppercase text-xs">
                        Belum ada wilayah terdaftar. Silakan klik "Tambah Wilayah".
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL EDIT / TAMBAH DHKP */}
      <Dialog open={openDhkpModal} onOpenChange={setOpenDhkpModal}>
        <DialogContent className="sm:max-w-[600px] rounded-[2rem] p-6 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase text-primary">
              {editingDhkp ? "Edit Data Objek Pajak (DHKP)" : "Tambah Objek Pajak Baru (DHKP)"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2 text-xs">
            <div className="space-y-1 col-span-2">
              <label className="font-bold text-slate-700">NOP (18 Digit)</label>
              <Input
                placeholder="Contoh: 33.04.120.005.001-0001.0"
                value={dhkpForm.nop}
                onChange={(e) => setDhkpForm({ ...dhkpForm, nop: e.target.value })}
                className="h-10 rounded-xl font-mono"
              />
            </div>

            <div className="space-y-1 col-span-2">
              <label className="font-bold text-slate-700">Nama Wajib Pajak (WP)</label>
              <Input
                placeholder="Nama lengkap pemilik..."
                value={dhkpForm.namaWp}
                onChange={(e) => setDhkpForm({ ...dhkpForm, namaWp: e.target.value })}
                className="h-10 rounded-xl font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Alamat Wajib Pajak</label>
              <Input
                placeholder="Alamat domisili WP..."
                value={dhkpForm.alamatWp}
                onChange={(e) => setDhkpForm({ ...dhkpForm, alamatWp: e.target.value })}
                className="h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Alamat Objek Pajak (OP)</label>
              <Input
                placeholder="Lokasi tanah/bangunan..."
                value={dhkpForm.alamatOp}
                onChange={(e) => setDhkpForm({ ...dhkpForm, alamatOp: e.target.value })}
                className="h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Dusun</label>
              <Select
                value={dhkpForm.dusun}
                onValueChange={(val) => setDhkpForm({ ...dhkpForm, dusun: val })}
              >
                <SelectTrigger className="h-10 rounded-xl font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dusun Rungkang">Dusun Rungkang</SelectItem>
                  <SelectItem value="Dusun Margasari">Dusun Margasari</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">RT</label>
                <Input
                  placeholder="001"
                  value={dhkpForm.rt}
                  onChange={(e) => setDhkpForm({ ...dhkpForm, rt: e.target.value })}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-700">RW</label>
                <Input
                  placeholder="001"
                  value={dhkpForm.rw}
                  onChange={(e) => setDhkpForm({ ...dhkpForm, rw: e.target.value })}
                  className="h-10 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Luas Bumi (m²)</label>
              <Input
                type="number"
                value={dhkpForm.luasBumi || 0}
                onChange={(e) => setDhkpForm({ ...dhkpForm, luasBumi: Number(e.target.value) })}
                className="h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Luas Bangunan (m²)</label>
              <Input
                type="number"
                value={dhkpForm.luasBangunan || 0}
                onChange={(e) => setDhkpForm({ ...dhkpForm, luasBangunan: Number(e.target.value) })}
                className="h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1 col-span-2">
              <label className="font-bold text-slate-700">Ketetapan PBB Nominal (Rp)</label>
              <Input
                type="number"
                placeholder="50000"
                value={dhkpForm.ketetapanNominal || 0}
                onChange={(e) => setDhkpForm({ ...dhkpForm, ketetapanNominal: Number(e.target.value) })}
                className="h-10 rounded-xl font-black text-primary text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Status Bangunan</label>
              <Select
                value={dhkpForm.statusBangunan}
                onValueChange={(val: any) => setDhkpForm({ ...dhkpForm, statusBangunan: val })}
              >
                <SelectTrigger className="h-10 rounded-xl font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Kosong font-bold">Kosong</SelectItem>
                  <SelectItem value="Ada Bangunan">Ada Bangunan</SelectItem>
                  <SelectItem value="Alih Kepemilikan">Alih Kepemilikan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Status Bayar</label>
              <Select
                value={dhkpForm.statusBayar}
                onValueChange={(val: any) => setDhkpForm({ ...dhkpForm, statusBayar: val })}
              >
                <SelectTrigger className="h-10 rounded-xl font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Belum Lunas">Belum Lunas</SelectItem>
                  <SelectItem value="Lunas">Lunas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setOpenDhkpModal(false)}
              className="rounded-xl h-10 font-bold"
            >
              Batal
            </Button>
            <Button
              onClick={handleSaveDhkp}
              className="rounded-xl h-10 font-black bg-primary text-white"
            >
              Simpan Data DHKP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL EDIT / TAMBAH KOLEKTOR */}
      <Dialog open={openKolektorModal} onOpenChange={setOpenKolektorModal}>
        <DialogContent className="sm:max-w-[480px] rounded-[2rem] p-6 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase text-primary">
              {editingKolektor ? "Edit Profil Penarik PBB" : "Tambah Penarik PBB Baru"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 my-2 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Nama Petugas Penarik</label>
              <Input
                placeholder="Nama lengkap petugas..."
                value={kolektorForm.nama}
                onChange={(e) => setKolektorForm({ ...kolektorForm, nama: e.target.value })}
                className="h-10 rounded-xl font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">No. WhatsApp / HP</label>
              <Input
                placeholder="08123456789"
                value={kolektorForm.noTelp}
                onChange={(e) => setKolektorForm({ ...kolektorForm, noTelp: e.target.value })}
                className="h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Jabatan</label>
              <Input
                placeholder="Perangkat Desa / Ketua RT / Kadus"
                value={kolektorForm.jabatan}
                onChange={(e) => setKolektorForm({ ...kolektorForm, jabatan: e.target.value })}
                className="h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Status Petugas</label>
              <Select
                value={kolektorForm.status}
                onValueChange={(val: any) => setKolektorForm({ ...kolektorForm, status: val })}
              >
                <SelectTrigger className="h-10 rounded-xl font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aktif">Aktif</SelectItem>
                  <SelectItem value="Non-Aktif">Non-Aktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setOpenKolektorModal(false)}
              className="rounded-xl h-10 font-bold"
            >
              Batal
            </Button>
            <Button
              onClick={handleSaveKolektor}
              className="rounded-xl h-10 font-black bg-primary text-white"
            >
              Simpan Penarik
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL TAMBAH WILAYAH */}
      <Dialog open={openWilayahModal} onOpenChange={setOpenWilayahModal}>
        <DialogContent className="sm:max-w-[400px] rounded-[2rem] p-6 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase text-primary">
              Tambah Wilayah Baru
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 my-2 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Dusun</label>
              <Select
                value={wilayahForm.dusun}
                onValueChange={(val) => setWilayahForm({ ...wilayahForm, dusun: val })}
              >
                <SelectTrigger className="h-10 rounded-xl font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dusun Rungkang">Dusun Rungkang</SelectItem>
                  <SelectItem value="Dusun Margasari">Dusun Margasari</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Nomor RW</label>
              <Input
                placeholder="001"
                value={wilayahForm.rw}
                onChange={(e) => setWilayahForm({ ...wilayahForm, rw: e.target.value })}
                className="h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Nomor RT</label>
              <Input
                placeholder="001"
                value={wilayahForm.rt}
                onChange={(e) => setWilayahForm({ ...wilayahForm, rt: e.target.value })}
                className="h-10 rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setOpenWilayahModal(false)}
              className="rounded-xl h-10 font-bold"
            >
              Batal
            </Button>
            <Button
              onClick={handleSaveWilayah}
              className="rounded-xl h-10 font-black bg-primary text-white"
            >
              Simpan Wilayah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ALERT BATCH DELETE */}
      <AlertDialog
        open={showDeleteDhkpConfirm}
        onOpenChange={setShowDeleteDhkpConfirm}
      >
        <AlertDialogContent className="rounded-[2.5rem] p-8 border-none shadow-2xl">
          <AlertDialogHeader className="items-center text-center">
            <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <Trash2 className="h-10 w-10 text-destructive" />
            </div>
            <AlertDialogTitle className="text-xl font-black uppercase text-destructive">
              Hapus Seluruh Data DHKP TA {selectedYear}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-bold uppercase text-slate-500 leading-relaxed">
              Tindakan ini akan menghapus permanen seluruh objek pajak (NOP) DHKP untuk Tahun Tagihan {selectedYear}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-3 pt-6">
            <AlertDialogCancel className="h-12 rounded-2xl font-bold uppercase w-full">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllDhkp}
              className={cn(
                buttonVariants({ variant: "destructive" }),
                "h-12 rounded-2xl font-black uppercase shadow-lg shadow-destructive/20 w-full"
              )}
            >
              Ya, Hapus {selectedYear}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DIALOG PROGRESS IMPOR FIRESTORE */}
      <Dialog
        open={importProgress.show}
        onOpenChange={(val) => {
          if (!isProcessing) {
            setImportProgress({ ...importProgress, show: val })
          }
        }}
      >
        <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] p-8 border-none shadow-2xl bg-white text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center relative">
              {importProgress.percent < 100 ? (
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              ) : (
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              )}
            </div>

            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-800">
                {importProgress.percent < 100
                  ? "Mengunggah Data ke Firestore..."
                  : "Impor Firestore Selesai!"}
              </DialogTitle>
              <p className="text-xs text-muted-foreground font-semibold mt-1">
                {importProgress.percent < 100
                  ? `Sedang memproses dan menyimpan NOP DHKP ke Cloud Firestore...`
                  : `Seluruh data (${importProgress.total.toLocaleString("id-ID")} NOP) berhasil tersimpan ke sistem.`}
              </p>
            </div>

            <div className="w-full space-y-2 my-2">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-slate-600 font-mono text-[11px] truncate max-w-[220px]">
                  {importProgress.currentNop}
                </span>
                <span className="text-primary font-black text-sm">
                  {importProgress.percent}%
                </span>
              </div>
              <Progress value={importProgress.percent} className="h-3 rounded-full bg-slate-100" />
              <p className="text-[11px] font-bold text-slate-500 text-right">
                {importProgress.current.toLocaleString("id-ID")} / {importProgress.total.toLocaleString("id-ID")} NOP Terbaca
              </p>
            </div>

            {importProgress.percent >= 100 && (
              <Button
                onClick={() => setImportProgress({ ...importProgress, show: false })}
                className="w-full h-11 rounded-2xl font-black uppercase bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 mt-2"
              >
                Selesai & Lihat Data
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
