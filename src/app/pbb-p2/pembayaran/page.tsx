"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  Receipt,
  Search,
  CheckCircle2,
  XCircle,
  Printer,
  Calendar,
  Loader2,
  Building2,
  Send,
  CreditCard,
  History,
  FileCheck2,
  Plus,
  Trash2,
  ShoppingBag,
  PlusCircle,
  UserCheck,
  Check,
  Eye,
} from "lucide-react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import Link from "next/link"
import { useUser, useFirestore } from "@/firebase"
import { collection, doc, writeBatch } from "firebase/firestore"
import {
  updateDocumentNonBlocking,
} from "@/firebase/non-blocking-updates"
import { DhkpRecord, Kolektor, TransaksiPbb, getOfficialDusun } from "@/types/pbb"
import { ThermalReceiptModal, BatchReceiptData } from "@/components/pbb/ThermalReceiptModal"

import { usePbbContext } from "@/context/PbbContext"

export default function PbbPembayaranPage() {
  const { user } = useUser()
  const db = useFirestore()
  const { toast } = useToast()

  const {
    selectedYear,
    setSelectedYear,
    dhkpList,
    kolektorList,
    transaksiList,
    loadingDhkp,
    loadingTx,
  } = usePbbContext()

  const [activeTab, setActiveTab] = useState<string>("entry")
  const [searchQuery, setSearchQuery] = useState("")

  // Header Entry Controls State
  const [entryTanggal, setEntryTanggal] = useState<string>(
    new Date().toISOString().split("T")[0]
  )
  const [entryKolektorId, setEntryKolektorId] = useState<string>("all")

  // Selected Kolektor helper
  const selectedCollectorInfo = useMemo(() => {
    if (!entryKolektorId || entryKolektorId === "all") return null
    return (kolektorList || []).find((k) => k.id === entryKolektorId)
  }, [kolektorList, entryKolektorId])

  // Cart / Multi-WP Selection State
  const [cartItems, setCartItems] = useState<
    { dhkp: DhkpRecord; denda: number }[]
  >([])

  // Modal Print Thermal & Official Receipt State
  const [openReceiptModal, setOpenReceiptModal] = useState(false)
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<TransaksiPbb | null>(null)
  const [batchReceiptData, setBatchReceiptData] = useState<BatchReceiptData | null>(null)

  const formatIDR = (val: number) =>
    `Rp ${new Intl.NumberFormat("id-ID").format(val)}`

  // Filtered Tax Bills for Entry Bayar matching selected Kolektor workload (Strict Max 20 for Firestore Quota Efficiency)
  const searchedBills = useMemo(() => {
    const list = dhkpList || []

    return list
      .filter((b) => {
        // 0. Filter by Tax Year
        const itemYear = String(b.tahun || "").replace(/\.0$/, "").trim()
        const selYear = String(selectedYear).trim()
        const matchYear = !itemYear || !selYear || itemYear === selYear

        // 1. Filter by selected Kolektor if specific collector chosen
        const matchKolektor =
          !entryKolektorId ||
          entryKolektorId === "all" ||
          b.penarikId === entryKolektorId ||
          (selectedCollectorInfo && b.penarikNama === selectedCollectorInfo.nama)

        // 2. Filter by search query (NOP, Nama WP, RT, RW, Dusun)
        const officialD = getOfficialDusun(
          b.dusun,
          b.rw,
          b.rt,
          `${b.alamatWp || ""} ${b.alamatOp || ""}`
        )
        const q = searchQuery.trim().toLowerCase()
        const matchSearch =
          !q ||
          b.nop?.toLowerCase().includes(q) ||
          b.namaWp?.toLowerCase().includes(q) ||
          b.rt?.includes(q) ||
          b.rw?.includes(q) ||
          officialD.toLowerCase().includes(q)

        return matchYear && matchKolektor && matchSearch
      })
      .slice(0, 20) // Strictly limit results to max 20 for extreme query quota efficiency
  }, [dhkpList, selectedYear, entryKolektorId, selectedCollectorInfo, searchQuery])

  // Cart Handlers
  const handleAddToCart = (dhkp: DhkpRecord) => {
    if (dhkp.statusBayar === "Lunas") {
      toast({
        variant: "destructive",
        title: "Sudah Lunas",
        description: `NOP ${dhkp.nop} (${dhkp.namaWp}) sudah dinyatakan LUNAS.`,
      })
      return
    }
    const exists = cartItems.some((ci) => ci.dhkp.nop === dhkp.nop)
    if (exists) {
      toast({
        title: "Sudah Ada di Keranjang",
        description: `NOP ${dhkp.nop} (${dhkp.namaWp}) sudah ada di keranjang.`,
      })
      return
    }
    setCartItems((prev) => [...prev, { dhkp, denda: 0 }])
    toast({
      title: "Ditambahkan ke Keranjang",
      description: `Wajib Pajak ${dhkp.namaWp} dimasukkan ke daftar tagihan bayar.`,
    })
  }

  const handleRemoveFromCart = (nop: string) => {
    setCartItems((prev) => prev.filter((ci) => ci.dhkp.nop !== nop))
  }

  const handleUpdateCartDenda = (nop: string, dendaVal: number) => {
    setCartItems((prev) =>
      prev.map((ci) =>
        ci.dhkp.nop === nop ? { ...ci, denda: Math.max(0, dendaVal) } : ci
      )
    )
  }

  // Cart Totals
  const cartSummary = useMemo(() => {
    const totalPokok = cartItems.reduce(
      (acc, curr) => acc + (curr.dhkp.ketetapanNominal || 0),
      0
    )
    const totalDenda = cartItems.reduce(
      (acc, curr) => acc + (curr.denda || 0),
      0
    )
    return {
      count: cartItems.length,
      totalPokok,
      totalDenda,
      grandTotal: totalPokok + totalDenda,
    }
  }, [cartItems])

  // SUBMIT CART BATCH PAYMENT HANDLER (PROSES BENDAHARA DESA)
  const handleProcessCartPayment = async () => {
    if (!db || cartItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Keranjang Kosong",
        description: "Silakan pilih minimal 1 Wajib Pajak menggunakan tombol (+).",
      })
      return
    }

    const selectedCollector = (kolektorList || []).find(
      (k) => k.id === entryKolektorId
    )
    const collectorName = selectedCollector?.nama || "Kolektor Desa"
    const batchId = `SETOR-${Date.now()}`

    try {
      let totalPokok = 0
      let totalDenda = 0
      const receiptItemList: BatchReceiptData["items"] = []

      const batch = writeBatch(db)

      for (const item of cartItems) {
        const dhkp = item.dhkp
        if (!dhkp.id) continue

        const ketetapan = dhkp.ketetapanNominal || 0
        const denda = item.denda || 0
        const subtotal = ketetapan + denda
        const officialD = getOfficialDusun(
          dhkp.dusun,
          dhkp.rw,
          dhkp.rt,
          `${dhkp.alamatWp || ""} ${dhkp.alamatOp || ""}`
        )

        totalPokok += ketetapan
        totalDenda += denda

        const txData: TransaksiPbb = {
          nop: dhkp.nop,
          namaWp: dhkp.namaWp,
          alamatOp: dhkp.alamatOp,
          rt: dhkp.rt,
          rw: dhkp.rw,
          dusun: officialD,
          tanggalBayar: entryTanggal,
          ketetapanNominal: ketetapan,
          denda: denda,
          totalBayar: subtotal,
          penarikId: entryKolektorId,
          penarikNama: collectorName,
          statusVerifikasi: "Diterima Kolektor",
          tahun: selectedYear,
          batchId: batchId,
          createdAt: new Date().toISOString(),
        }

        // 1. Add transaksi doc in batch
        const txRef = doc(collection(db, "pbb_transaksi"))
        batch.set(txRef, txData)

        // 2. Update DHKP status to Lunas
        const dhkpRef = doc(db, "pbb_dhkp", dhkp.id)
        batch.update(dhkpRef, { statusBayar: "Lunas" })

        receiptItemList.push({
          nop: dhkp.nop,
          namaWp: dhkp.namaWp,
          rt: dhkp.rt,
          rw: dhkp.rw,
          dusun: officialD,
          ketetapanNominal: ketetapan,
          denda: denda,
          totalBayar: subtotal,
        })
      }

      await batch.commit()

      // Build batch receipt object for printing
      const batchReceipt: BatchReceiptData = {
        tanggalBayar: entryTanggal,
        penarikNama: collectorName,
        noTelpPemungut: selectedCollector?.noTelp || "",
        bendaharaNama: user?.displayName || "Bendahara Desa",
        tahun: selectedYear,
        items: receiptItemList,
        totalPokok,
        totalDenda,
        grandTotal: totalPokok + totalDenda,
      }

      setBatchReceiptData(batchReceipt)
      setSelectedTxForReceipt(null)
      setCartItems([])

      toast({
        title: "Pembayaran Berhasil Diproses!",
        description: `Berhasil memproses pembayaran untuk ${receiptItemList.length} Wajib Pajak. Bukti Bayar siap dicetak.`,
      })

      setOpenReceiptModal(true)
    } catch (e: any) {
      console.error(e)
      toast({
        variant: "destructive",
        title: "Gagal Memproses Pembayaran",
        description: e.message || "Terjadi kesalahan saat memproses pembayaran.",
      })
    }
  }

  // Format Date & Time for Transaction History
  const formatTxDateTime = (tx: TransaksiPbb) => {
    if (tx.createdAt) {
      try {
        const d =
          typeof tx.createdAt === "string"
            ? new Date(tx.createdAt)
            : tx.createdAt.toDate
            ? tx.createdAt.toDate()
            : new Date(tx.createdAt)
        if (!isNaN(d.getTime())) {
          return format(d, "dd/MM/yyyy HH:mm", { locale: id })
        }
      } catch (e) {}
    }
    if (tx.tanggalBayar) {
      try {
        const d = new Date(tx.tanggalBayar)
        if (!isNaN(d.getTime())) {
          return format(d, "dd/MM/yyyy", { locale: id })
        }
      } catch (e) {}
      return tx.tanggalBayar
    }
    return "-"
  }

  // Group transactions per batch/session for History Table
  const groupedSetoranList = useMemo(() => {
    if (!transaksiList || transaksiList.length === 0) return []

    const map = new Map<
      string,
      {
        id: string
        batchId?: string
        tanggalBayar: string
        createdAt?: any
        penarikId?: string
        penarikNama: string
        items: TransaksiPbb[]
        totalJumlahWp: number
        totalKetetapan: number
        totalDenda: number
        grandTotal: number
      }
    >()

    transaksiList.forEach((tx) => {
      let groupKey = tx.batchId
      if (!groupKey) {
        let timeKey = tx.tanggalBayar
        if (tx.createdAt) {
          try {
            const d =
              typeof tx.createdAt === "string"
                ? new Date(tx.createdAt)
                : tx.createdAt.toDate
                ? tx.createdAt.toDate()
                : new Date(tx.createdAt)
            if (!isNaN(d.getTime())) {
              timeKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}_${d.getHours()}:${d.getMinutes()}`
            }
          } catch (e) {}
        }
        groupKey = `${tx.penarikNama || tx.penarikId}_${timeKey}`
      }

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          id: groupKey,
          batchId: tx.batchId,
          tanggalBayar: tx.tanggalBayar,
          createdAt: tx.createdAt,
          penarikId: tx.penarikId,
          penarikNama: tx.penarikNama || "Kolektor Desa",
          items: [tx],
          totalJumlahWp: 1,
          totalKetetapan: tx.ketetapanNominal || 0,
          totalDenda: tx.denda || 0,
          grandTotal: tx.totalBayar || 0,
        })
      } else {
        const group = map.get(groupKey)!
        group.items.push(tx)
        group.totalJumlahWp += 1
        group.totalKetetapan += tx.ketetapanNominal || 0
        group.totalDenda += tx.denda || 0
        group.grandTotal += tx.totalBayar || 0
      }
    })

    return Array.from(map.values())
  }, [transaksiList])

  // Open Grouped Setoran Details / Receipt Modal
  const handleViewGroupedDetails = (group: typeof groupedSetoranList[0]) => {
    const selectedCollector = (kolektorList || []).find(
      (k) => k.id === group.penarikId || k.nama === group.penarikNama
    )

    const batchReceipt: BatchReceiptData = {
      tanggalBayar: group.tanggalBayar,
      penarikNama: group.penarikNama,
      noTelpPemungut: selectedCollector?.noTelp || "",
      bendaharaNama: user?.displayName || "Bendahara Desa",
      tahun: selectedYear,
      items: group.items.map((it) => ({
        nop: it.nop,
        namaWp: it.namaWp,
        rt: it.rt,
        rw: it.rw,
        dusun: it.dusun,
        ketetapanNominal: it.ketetapanNominal,
        denda: it.denda,
        totalBayar: it.totalBayar,
      })),
      totalPokok: group.totalKetetapan,
      totalDenda: group.totalDenda,
      grandTotal: group.grandTotal,
    }

    setBatchReceiptData(batchReceipt)
    setSelectedTxForReceipt(null)
    setOpenReceiptModal(true)
  }

  // Deletion State for Grouped Transactions
  const [deletingGroup, setDeletingGroup] = useState<any>(null)
  const [isDeletingTx, setIsDeletingTx] = useState(false)

  // DELETE GROUPED SETORAN HANDLER (Hapus Transaksi & Otomatis Kembalikan Status DHKP)
  const handleDeleteGroupedTx = async () => {
    if (!db || !deletingGroup) return
    setIsDeletingTx(true)

    try {
      const batch = writeBatch(db)

      for (const tx of deletingGroup.items) {
        // 1. Delete pbb_transaksi doc
        if (tx.id) {
          const txRef = doc(db, "pbb_transaksi", tx.id)
          batch.delete(txRef)
        }

        // 2. Update status pbb_dhkp back to "Belum Lunas"
        const matchingDhkp = (dhkpList || []).find((d) => d.nop === tx.nop)
        if (matchingDhkp && matchingDhkp.id) {
          const dhkpRef = doc(db, "pbb_dhkp", matchingDhkp.id)
          batch.update(dhkpRef, { statusBayar: "Belum Lunas" })
        }
      }

      await batch.commit()

      toast({
        title: "Setoran Pembayaran Dihapus!",
        description: `Berhasil membatalkan setoran untuk ${deletingGroup.totalJumlahWp} Wajib Pajak. Status NOP dikembalikan menjadi Belum Lunas.`,
      })

      setDeletingGroup(null)
    } catch (e: any) {
      console.error(e)
      toast({
        variant: "destructive",
        title: "Gagal Menghapus Setoran",
        description: e.message || "Terjadi kesalahan saat membatalkan setoran.",
      })
    } finally {
      setIsDeletingTx(false)
    }
  }

  // VERIFICATION HANDLER: Handover from Kolektor to Desa or Desa to Bank
  const handleVerifyStatus = (
    tx: TransaksiPbb,
    nextStatus: "Disetorkan ke Desa" | "Disetorkan ke Bank/Bapenda"
  ) => {
    if (!db || !tx.id) return
    const docRef = doc(db, "pbb_transaksi", tx.id)
    updateDocumentNonBlocking(docRef, { statusVerifikasi: nextStatus })
    toast({
      title: "Status Setoran Diperbarui",
      description: `Status transaksi NOP ${tx.nop} kini '${nextStatus}'.`,
    })
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-6 w-6" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black text-primary uppercase tracking-tight flex items-center gap-2">
              <Receipt className="h-6 w-6 text-primary" />
              Pembayaran & Transaksi PBB-P2
            </h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
              Konsep Entri Bayar Bendahara: Multi-Input (+), Pencarian Hemat Quota, & Bukti Bayar Sah
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Calendar className="h-4 w-4 text-primary" />
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="h-9 w-[100px] rounded-xl font-black bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-1 sm:grid-cols-3 h-auto p-1.5 rounded-2xl bg-slate-100/80 mb-6 gap-1">
          <TabsTrigger
            value="entry"
            className="rounded-xl font-black text-xs uppercase tracking-wider gap-2 data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm py-3"
          >
            <CreditCard className="h-4 w-4" />
            Input Pembayaran (Entry Transaksi)
          </TabsTrigger>
          <TabsTrigger
            value="verifikasi"
            className="rounded-xl font-black text-xs uppercase tracking-wider gap-2 data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm py-3"
          >
            <FileCheck2 className="h-4 w-4" />
            Verifikasi & Setoran ke Desa
          </TabsTrigger>
          <TabsTrigger
            value="riwayat"
            className="rounded-xl font-black text-xs uppercase tracking-wider gap-2 data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm py-3"
          >
            <History className="h-4 w-4" />
            Riwayat & Cetak Bukti Bayar
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: INPUT PEMBAYARAN (MULTI-WP CART BENDAHARA) */}
        <TabsContent value="entry" className="space-y-6">
          {/* Top Control Bar: Tanggal Pembayaran & Pemungut */}
          <Card className="rounded-[2rem] border-none shadow-xl bg-gradient-to-r from-primary/5 via-white to-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-black uppercase text-primary flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Pengaturan Sesi Pembayaran Bendahara / Kasir
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                {/* 1. Pilih Tahun Pajak (TA) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    Pilih Tahun Pajak (TA)
                  </label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="h-11 rounded-xl bg-white font-black text-xs text-primary border-primary/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["2024", "2025", "2026", "2027", "2028"].map((y) => (
                        <SelectItem key={y} value={y} className="font-bold">
                          Tahun Pajak {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 2. Pilih Tanggal Pembayaran */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Pilih Tanggal Pembayaran</label>
                  <Input
                    type="date"
                    value={entryTanggal}
                    onChange={(e) => setEntryTanggal(e.target.value)}
                    className="h-11 rounded-xl bg-white font-bold text-xs"
                  />
                </div>

                {/* 3. Pilih Nama Pemungut */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Pilih Nama Pemungut (Kolektor)</label>
                  <Select value={entryKolektorId} onValueChange={setEntryKolektorId}>
                    <SelectTrigger className="h-11 rounded-xl bg-white font-bold text-xs">
                      <SelectValue placeholder="Pilih Kolektor Penarik PBB" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="font-bold text-blue-700">
                        -- Semua Pemungut (Semua NOP) --
                      </SelectItem>
                      {(kolektorList || []).map((k) => (
                        <SelectItem key={k.id} value={k.id || ""}>
                          {k.nama} ({k.jabatan || "Perangkat Desa"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 4. Pencarian By Name / NOP / RT & RW / Dusun */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Cari Wajib Pajak (By Name / NOP)</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Contoh: Budi, 002/001..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-11 rounded-xl bg-white font-medium text-xs"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Two Column Section: Left (Pencarian 20 Data) & Right (Keranjang Tagihan) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: Pencarian & Daftar Wajib Pajak (Max 20 NOP) */}
            <div className="lg:col-span-7 space-y-4">
              <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden">
                <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-black uppercase tracking-tight">
                      Daftar Objek Pajak {selectedCollectorInfo ? `• ${selectedCollectorInfo.nama}` : "(Semua Pemungut)"}
                    </CardTitle>
                    <CardDescription className="text-[11px] font-bold text-blue-600">
                      {selectedCollectorInfo
                        ? `Menampilkan tagihan PBB beban ${selectedCollectorInfo.nama} (Max 20 NOP)`
                        : `Menampilkan tagihan PBB seluruh pemungut (Max 20 NOP)`}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="font-bold text-[10px] bg-slate-50">
                    {searchedBills.length} Ditemukan
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[480px]">
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="font-black text-[10px] uppercase px-4">NOP & Wajib Pajak</TableHead>
                          <TableHead className="font-black text-[10px] uppercase">Wilayah / RT-RW</TableHead>
                          <TableHead className="font-black text-[10px] uppercase text-right">Tagihan PBB</TableHead>
                          <TableHead className="font-black text-[10px] uppercase text-center w-[80px]">Tambah</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingDhkp ? (
                          <TableRow>
                            <TableCell colSpan={4} className="h-36 text-center">
                              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary/40" />
                            </TableCell>
                          </TableRow>
                        ) : searchedBills.length > 0 ? (
                          searchedBills.map((item) => {
                            const isAdded = cartItems.some((ci) => ci.dhkp.nop === item.nop)
                            const isLunas = item.statusBayar === "Lunas"
                            const officialD = getOfficialDusun(
                              item.dusun,
                              item.rw,
                              item.rt,
                              `${item.alamatWp || ""} ${item.alamatOp || ""}`
                            )

                            return (
                              <TableRow key={item.id} className="hover:bg-slate-50/80">
                                <TableCell className="py-3 px-4">
                                  <p className="font-black text-xs text-slate-800">{item.namaWp}</p>
                                  <p className="font-mono text-[10px] text-muted-foreground">{item.nop}</p>
                                </TableCell>
                                <TableCell className="py-3">
                                  <p className="text-xs font-semibold text-slate-700">
                                    RT {item.rt} / RW {item.rw}
                                  </p>
                                  <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0 bg-slate-50 border-slate-200">
                                    {officialD}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-black text-xs text-primary py-3">
                                  {formatIDR(item.ketetapanNominal)}
                                </TableCell>
                                <TableCell className="text-center py-3">
                                  {isLunas ? (
                                    <Badge className="bg-emerald-100 text-emerald-700 border-none font-bold text-[10px]">
                                      Lunas
                                    </Badge>
                                  ) : isAdded ? (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                      onClick={() => handleRemoveFromCart(item.nop)}
                                      title="Sudah ditambahkan (Klik untuk hapus)"
                                    >
                                      <Check className="h-4 w-4 stroke-[3]" />
                                    </Button>
                                  ) : (
                                    <Button
                                      size="icon"
                                      variant="default"
                                      className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90 text-white shadow-md transition-transform active:scale-95"
                                      onClick={() => handleAddToCart(item)}
                                      title="Tambah ke keranjang bayar (+)"
                                    >
                                      <Plus className="h-5 w-5 stroke-[3]" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            )
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="h-36 text-center text-muted-foreground text-xs">
                              Tidak ada data Wajib Pajak yang cocok dengan kata kunci pencarian.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN: Keranjang Tagihan Bayar (Multi-WP Cart) */}
            <div className="lg:col-span-5 space-y-4">
              <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white">
                <CardHeader className="bg-slate-900 text-white p-5 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <ShoppingBag className="h-5 w-5 text-emerald-400" />
                    <div>
                      <CardTitle className="text-sm font-black uppercase tracking-wide">
                        Keranjang Tagihan Bayar
                      </CardTitle>
                      <CardDescription className="text-[10px] text-slate-300 font-bold">
                        Input Massal Multi-Wajib Pajak
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500 text-white font-black text-xs px-2.5 py-1">
                    {cartSummary.count} WP
                  </Badge>
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                  {cartItems.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 space-y-2">
                      <PlusCircle className="h-10 w-10 mx-auto text-slate-300 stroke-[1.5]" />
                      <p className="text-xs font-bold text-slate-600">Keranjang Tagihan Masih Kosong</p>
                      <p className="text-[11px] max-w-[240px] mx-auto text-slate-400">
                        Klik tombol tanda <b>(+)</b> pada daftar Wajib Pajak di sebelah kiri untuk memasukkan data tagihan.
                      </p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[280px] pr-2">
                      <div className="space-y-3">
                        {cartItems.map((item, idx) => (
                          <div
                            key={item.dhkp.nop}
                            className="p-3 rounded-2xl bg-slate-50 border border-slate-100 relative group transition-all"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-xs font-black text-slate-800">
                                  {idx + 1}. {item.dhkp.namaWp}
                                </p>
                                <p className="font-mono text-[10px] text-slate-500">
                                  {item.dhkp.nop} • RT {item.dhkp.rt}/RW {item.dhkp.rw}
                                </p>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                onClick={() => handleRemoveFromCart(item.dhkp.nop)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200/60 items-center">
                              <div>
                                <span className="text-[10px] font-bold text-slate-500 block">Pokok PBB</span>
                                <span className="text-xs font-black text-slate-800">
                                  {formatIDR(item.dhkp.ketetapanNominal)}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-slate-500 block">Denda (Rp)</span>
                                <Input
                                  type="number"
                                  min="0"
                                  value={item.denda || ""}
                                  placeholder="0"
                                  onChange={(e) =>
                                    handleUpdateCartDenda(
                                      item.dhkp.nop,
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="h-8 rounded-lg text-xs font-bold bg-white text-right"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}

                  {/* Summary Box */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-slate-600">
                      <span>Total Pokok ({cartSummary.count} WP):</span>
                      <span className="font-bold text-slate-800">{formatIDR(cartSummary.totalPokok)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold text-slate-600">
                      <span>Total Denda Keterlambatan:</span>
                      <span className="font-bold text-rose-600">{formatIDR(cartSummary.totalDenda)}</span>
                    </div>
                    <div className="border-t border-slate-300 pt-2 flex justify-between items-center">
                      <span className="text-xs font-black uppercase text-slate-900">Total Setoran:</span>
                      <span className="text-base font-black text-primary">
                        {formatIDR(cartSummary.grandTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Action Button: Proses Pembayaran & Cetak Bukti Bayar */}
                  <Button
                    onClick={handleProcessCartPayment}
                    disabled={cartItems.length === 0}
                    className="w-full h-12 rounded-2xl font-black text-xs uppercase tracking-wider gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-600/20 active:scale-[0.99] transition-transform"
                  >
                    <Printer className="h-4 w-4" />
                    Proses Pembayaran & Cetak Bukti Bayar
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* BOTTOM CARD: HISTORI SETORAN PEMBAYARAN BENDAHARA */}
          <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden mt-6">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 bg-white">
              <div>
                <CardTitle className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Histori Setoran Pembayaran (Input Bendahara)
                </CardTitle>
                <CardDescription className="text-xs">
                  Riwayat transaksi setoran PBB terurut lengkap dengan Waktu & Tanggal Input oleh Bendahara
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-bold text-[10px] bg-slate-50">
                {groupedSetoranList.length} Setoran Transaksi
              </Badge>
            </CardHeader>
            <CardContent className="p-0 bg-white">
              <ScrollArea className="h-[360px]">
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="font-black text-[10px] uppercase px-6">Tanggal & Waktu Setor</TableHead>
                      <TableHead className="font-black text-[10px] uppercase">Pemungut (Kolektor)</TableHead>
                      <TableHead className="font-black text-[10px] uppercase">Rincian Wajib Pajak</TableHead>
                      <TableHead className="font-black text-[10px] uppercase text-right">Total Setoran</TableHead>
                      <TableHead className="font-black text-[10px] uppercase text-center w-[130px]">Rincian & Struk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingTx ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-36 text-center">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary/40" />
                        </TableCell>
                      </TableRow>
                    ) : groupedSetoranList.length > 0 ? (
                      groupedSetoranList.map((group) => (
                        <TableRow key={group.id} className="hover:bg-slate-50">
                          <TableCell className="font-mono text-xs font-bold px-6 text-slate-700">
                            {formatTxDateTime(group.items[0])}
                          </TableCell>
                          <TableCell className="text-xs font-bold text-slate-800">
                            {group.penarikNama}
                          </TableCell>
                          <TableCell>
                            <p className="font-black text-xs text-slate-900">
                              {group.totalJumlahWp} Wajib Pajak
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[240px]">
                              {group.items[0].namaWp}
                              {group.totalJumlahWp > 1
                                ? ` (+${group.totalJumlahWp - 1} WP lainnya)`
                                : ""}
                            </p>
                          </TableCell>
                          <TableCell className="text-right font-black text-xs text-primary">
                            {formatIDR(group.grandTotal)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8 rounded-xl border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100"
                                onClick={() => handleViewGroupedDetails(group)}
                                title="Lihat Rincian Setoran (Semua WP) & Kirim WA"
                              >
                                <Eye className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8 rounded-xl border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100"
                                onClick={() => handleViewGroupedDetails(group)}
                                title="Cetak Struk Thermal / Official (Semua WP)"
                              >
                                <Printer className="h-4 w-4 text-emerald-600" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8 rounded-xl border-rose-200 bg-rose-50/50 text-rose-700 hover:bg-rose-100"
                                onClick={() => setDeletingGroup(group)}
                                title="Hapus / Batalkan Setoran Transaksi Ini"
                              >
                                <Trash2 className="h-4 w-4 text-rose-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-36 text-center text-muted-foreground text-xs">
                          Belum ada riwayat setoran PBB yang diinput oleh Bendahara Desa.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: VERIFIKASI & SETORAN KASIR DESA */}
        <TabsContent value="verifikasi" className="space-y-6">
          <Card className="rounded-[2.5rem] border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                <FileCheck2 className="h-5 w-5 text-primary" />
                Verifikasi Pipeline Setoran ke Desa
              </CardTitle>
              <CardDescription className="text-xs">
                Monitoring alur setoran uang PBB: Kolektor &rarr; Kasir Desa &rarr; Bank Jateng/Bapenda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-black text-xs uppercase px-6">NOP & WP</TableHead>
                    <TableHead className="font-black text-xs uppercase">Pemungut (Kolektor)</TableHead>
                    <TableHead className="font-black text-xs uppercase text-right">Total Setor</TableHead>
                    <TableHead className="font-black text-xs uppercase text-center">Status Verifikasi</TableHead>
                    <TableHead className="font-black text-xs uppercase text-center">Aksi Verifikasi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingTx ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-36 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary/40" />
                      </TableCell>
                    </TableRow>
                  ) : (transaksiList || []).length > 0 ? (
                    (transaksiList || []).map((tx) => (
                      <TableRow key={tx.id} className="hover:bg-slate-50">
                        <TableCell className="px-6">
                          <p className="font-black text-xs text-slate-800">{tx.namaWp}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">{tx.nop}</p>
                        </TableCell>
                        <TableCell className="text-xs font-bold text-slate-700">
                          {tx.penarikNama || "Kolektor Desa"}
                        </TableCell>
                        <TableCell className="text-right font-black text-xs text-primary">
                          {formatIDR(tx.totalBayar)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={
                              tx.statusVerifikasi === "Disetorkan ke Bank/Bapenda"
                                ? "bg-emerald-100 text-emerald-700 border-none font-bold text-[10px]"
                                : tx.statusVerifikasi === "Disetorkan ke Desa"
                                ? "bg-blue-100 text-blue-700 border-none font-bold text-[10px]"
                                : "bg-amber-100 text-amber-800 border-none font-bold text-[10px]"
                            }
                          >
                            {tx.statusVerifikasi}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {tx.statusVerifikasi === "Diterima Kolektor" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleVerifyStatus(tx, "Disetorkan ke Desa")}
                              className="h-8 text-[10px] font-bold gap-1 rounded-xl text-blue-700 border-blue-200 hover:bg-blue-50"
                            >
                              <Building2 className="h-3 w-3" />
                              Terima di Desa
                            </Button>
                          )}
                          {tx.statusVerifikasi === "Disetorkan ke Desa" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleVerifyStatus(tx, "Disetorkan ke Bank/Bapenda")}
                              className="h-8 text-[10px] font-bold gap-1 rounded-xl text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                            >
                              <Send className="h-3 w-3" />
                              Setor ke Bank
                            </Button>
                          )}
                          {tx.statusVerifikasi === "Disetorkan ke Bank/Bapenda" && (
                            <span className="text-[10px] font-bold text-emerald-600 flex items-center justify-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Selesai
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-36 text-center text-muted-foreground text-xs">
                        Belum ada data verifikasi transaksi PBB.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: RIWAYAT TRANSAKSI & CETAK BUKTI BAYAR */}
        <TabsContent value="riwayat" className="space-y-6">
          <Card className="rounded-[2.5rem] border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Riwayat Transaksi PBB-P2 TA {selectedYear}
              </CardTitle>
              <CardDescription className="text-xs">
                Daftar transaksi pembayaran PBB yang telah sukses diproses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-black text-xs uppercase px-6">Tanggal</TableHead>
                    <TableHead className="font-black text-xs uppercase">NOP & WP</TableHead>
                    <TableHead className="font-black text-xs uppercase text-right">Pokok PBB</TableHead>
                    <TableHead className="font-black text-xs uppercase text-right">Denda</TableHead>
                    <TableHead className="font-black text-xs uppercase text-right">Total Bayar</TableHead>
                    <TableHead className="font-black text-xs uppercase text-center w-[120px]">Cetak Struk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingTx ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-36 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary/40" />
                      </TableCell>
                    </TableRow>
                  ) : (transaksiList || []).length > 0 ? (
                    (transaksiList || []).map((tx) => (
                      <TableRow key={tx.id} className="hover:bg-slate-50">
                        <TableCell className="font-mono text-xs px-6">
                          {tx.tanggalBayar || "-"}
                        </TableCell>
                        <TableCell>
                          <p className="font-black text-xs text-slate-800">{tx.namaWp}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">{tx.nop}</p>
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium">
                          {formatIDR(tx.ketetapanNominal)}
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium text-rose-600">
                          {formatIDR(tx.denda)}
                        </TableCell>
                        <TableCell className="text-right font-black text-xs text-primary">
                          {formatIDR(tx.totalBayar)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedTxForReceipt(tx)
                              setBatchReceiptData(null)
                              setOpenReceiptModal(true)
                            }}
                            className="h-8 text-[10px] font-bold gap-1.5 rounded-xl border-slate-300"
                          >
                            <Printer className="h-3.5 w-3.5 text-emerald-600" />
                            Struk
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-36 text-center text-muted-foreground text-xs">
                        Belum ada riwayat transaksi PBB pada tahun {selectedYear}.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL PRINT BUKTI BAYAR (THERMAL & BUKTI RESMI BENDAHARA) */}
      <ThermalReceiptModal
        open={openReceiptModal}
        onOpenChange={setOpenReceiptModal}
        transaksi={selectedTxForReceipt}
        batchData={batchReceiptData}
        noTelpPemungut={selectedCollectorInfo?.noTelp || batchReceiptData?.noTelpPemungut || ""}
        namaDesa="Rungkang"
      />

      {/* MODAL CONFIRMATION HAPUS SETORAN */}
      <AlertDialog
        open={!!deletingGroup}
        onOpenChange={(open) => !open && setDeletingGroup(null)}
      >
        <AlertDialogContent className="rounded-[2rem] p-6 max-w-md bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-black text-rose-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Batalkan / Hapus Setoran Transaksi?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600 space-y-2 pt-2">
              <span>
                Anda akan menghapus data setoran dari Pemungut{" "}
                <strong className="text-slate-800">{deletingGroup?.penarikNama}</strong> sejumlah{" "}
                <strong className="text-slate-800">{deletingGroup?.totalJumlahWp} Wajib Pajak</strong> (
                {formatIDR(deletingGroup?.grandTotal || 0)}).
              </span>
              <span className="block font-bold text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-100 text-left mt-2">
                ⚠️ Database Otomatis Menyesuaikan: Status NOP Wajib Pajak yang bersangkutan di database otomatis dikembalikan menjadi <u>Belum Lunas</u>!
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-4">
            <AlertDialogCancel className="rounded-xl font-bold text-xs h-11">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroupedTx}
              disabled={isDeletingTx}
              className="rounded-xl font-black text-xs h-11 bg-rose-600 hover:bg-rose-700 text-white gap-2"
            >
              {isDeletingTx ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Ya, Hapus & Batalkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
