"use client"

import { useState, useMemo } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  Users,
  Target,
  UserCheck,
  MapPin,
  CheckCircle2,
  Calendar,
  Loader2,
  ShieldCheck,
} from "lucide-react"
import Link from "next/link"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, doc, getDocs, writeBatch } from "firebase/firestore"
import { DhkpRecord, Kolektor, getOfficialDusun } from "@/types/pbb"

import { usePbbContext } from "@/context/PbbContext"

export default function PbbPenarikPlottingPage() {
  const { user } = useUser()
  const db = useFirestore()
  const { toast } = useToast()

  const {
    selectedYear,
    setSelectedYear,
    dhkpList,
    kolektorList,
    loadingDhkp,
    loadingKolektor,
  } = usePbbContext()

  const [activeTab, setActiveTab] = useState<string>("plotting")
  const [isAssigning, setIsAssigning] = useState(false)

  // Plotting selection controls
  const [targetDusun, setTargetDusun] = useState<string>("all")
  const [targetRw, setTargetRw] = useState<string>("all")
  const [targetRt, setTargetRt] = useState<string>("all")
  const [selectedKolektorId, setSelectedKolektorId] = useState<string>("")

  const formatIDR = (val: number) =>
    `Rp ${new Intl.NumberFormat("id-ID").format(val)}`

  // Available RW options
  const availableRws = useMemo(() => {
    const setR = new Set<string>()
    ;(dhkpList || []).forEach((i) => { if (i.rw) setR.add(i.rw) })
    if (setR.size === 0) return ["001", "002", "003"]
    return Array.from(setR).sort()
  }, [dhkpList])

  // Available RT options
  const availableRts = useMemo(() => {
    const setR = new Set<string>()
    ;(dhkpList || []).forEach((i) => { if (i.rt) setR.add(i.rt) })
    if (setR.size === 0) return ["001", "002", "003", "004", "005", "006", "007", "008", "009"]
    return Array.from(setR).sort()
  }, [dhkpList])

  // Filtered Dhkp for selected year
  const dhkpFiltered = useMemo(() => {
    return (dhkpList || []).filter((d) => {
      const itemYear = String(d.tahun || "").replace(/\.0$/, "").trim()
      const selYear = String(selectedYear).trim()
      return !itemYear || !selYear || itemYear === selYear
    })
  }, [dhkpList, selectedYear])

  // Statistics per Kolektor
  const kolektorStats = useMemo(() => {
    const dhkp = dhkpFiltered
    const collectors = kolektorList || []

    return collectors.map((kol) => {
      const assignedNops = dhkp.filter((d) => d.penarikId === kol.id)
      const totalNop = assignedNops.length
      const totalTarget = assignedNops.reduce(
        (acc, curr) => acc + (curr.ketetapanNominal || 0),
        0
      )
      const lunasNops = assignedNops.filter((d) => d.statusBayar === "Lunas")
      const totalRealisasi = lunasNops.reduce(
        (acc, curr) => acc + (curr.ketetapanNominal || 0),
        0
      )
      const persentase = totalTarget > 0 ? (totalRealisasi / totalTarget) * 100 : 0

      return {
        ...kol,
        totalNop,
        totalTarget,
        totalRealisasi,
        persentase: Math.round(persentase),
        sisaTagihan: totalTarget - totalRealisasi,
      }
    })
  }, [dhkpFiltered, kolektorList])

  // Count Unassigned DHKP
  const unassignedNopCount = useMemo(() => {
    return dhkpFiltered.filter((d) => !d.penarikId).length
  }, [dhkpFiltered])

  // BATCH ASSIGN HANDLER
  const handleAssignPlotting = async () => {
    if (!db || !selectedKolektorId) {
      toast({
        variant: "destructive",
        title: "Pilih Penarik",
        description: "Silakan pilih petugas penarik (Kolektor) terlebih dahulu.",
      })
      return
    }

    const targetKolektor = (kolektorList || []).find(
      (k) => k.id === selectedKolektorId
    )
    if (!targetKolektor) return

    setIsAssigning(true)

    try {
      // Find matching DHKP records
      const matchingDhkp = dhkpFiltered.filter((item) => {
        const officialD = getOfficialDusun(
          item.dusun,
          item.rw,
          item.rt,
          `${item.alamatWp || ""} ${item.alamatOp || ""}`
        )
        const matchDusun = targetDusun === "all" || officialD === targetDusun
        const matchRw = targetRw === "all" || item.rw === targetRw
        const matchRt = targetRt === "all" || item.rt === targetRt
        return matchDusun && matchRw && matchRt
      })

      if (matchingDhkp.length === 0) {
        toast({
          variant: "destructive",
          title: "Tidak Ada Data",
          description: "Tidak ditemukan NOP yang sesuai dengan kriteria wilayah.",
        })
        setIsAssigning(false)
        return
      }

      const batch = writeBatch(db)
      matchingDhkp.forEach((d) => {
        if (d.id) {
          const docRef = doc(db, "pbb_dhkp", d.id)
          batch.update(docRef, {
            penarikId: targetKolektor.id,
            penarikNama: targetKolektor.nama,
          })
        }
      })

      await batch.commit()

      toast({
        title: "Plotting Berhasil",
        description: `${matchingDhkp.length} NOP berhasil ditugaskan kepada ${targetKolektor.nama}.`,
      })
    } catch (error: any) {
      console.error("Plotting error:", error)
      toast({
        variant: "destructive",
        title: "Plotting Gagal",
        description: error.message || "Gagal memperbarui penugasan.",
      })
    } finally {
      setIsAssigning(false)
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-6 pb-16 max-w-7xl mx-auto">

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
              <Users className="h-6 w-6 text-primary" />
              Penarik & Wilayah Kerja PBB
            </h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
              Plotting NOP per Kolektor & Monitoring Target Setoran Lapangan
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
              {["2024", "2025", "2026", "2027", "2028"].map((y) => (
                <SelectItem key={y} value={y} className="font-bold">
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-1 sm:grid-cols-2 h-auto p-1 rounded-2xl bg-slate-100/80 mb-6 gap-1">
          <TabsTrigger
            value="plotting"
            className="rounded-xl font-black text-xs uppercase tracking-wider gap-2 data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm py-3"
          >
            <UserCheck className="h-4 w-4" />
            Plotting Kolektor (Pembagian NOP)
          </TabsTrigger>
          <TabsTrigger
            value="beban"
            className="rounded-xl font-black text-xs uppercase tracking-wider gap-2 data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm"
          >
            <Target className="h-4 w-4" />
            Target & Beban Setoran Kolektor
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: PLOTTING KOLEKTOR */}
        <TabsContent value="plotting" className="space-y-6">
          {/* Plotting Tool Panel */}
          <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
            <CardHeader className="p-6 bg-slate-50/60 border-b border-slate-100">
              <CardTitle className="text-lg font-black uppercase text-slate-800 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Penugasan Massal NOP ke Penarik PBB
              </CardTitle>
              <CardDescription className="text-xs font-medium">
                Pilih wilayah (Dusun/RT) dan tetapkan ke Petugas Penarik PBB yang bertugas
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
                {/* 1. Pilih Dusun */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Pilih Dusun</label>
                  <Select value={targetDusun} onValueChange={setTargetDusun}>
                    <SelectTrigger className="h-11 rounded-xl font-bold bg-slate-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Dusun</SelectItem>
                      <SelectItem value="Dusun Rungkang">Dusun Rungkang</SelectItem>
                      <SelectItem value="Dusun Margasari">Dusun Margasari</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 2. Pilih RW */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Pilih RW</label>
                  <Select value={targetRw} onValueChange={setTargetRw}>
                    <SelectTrigger className="h-11 rounded-xl font-bold bg-slate-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua RW</SelectItem>
                      {availableRws.map((rw) => (
                        <SelectItem key={rw} value={rw}>
                          RW {rw}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 3. Pilih RT */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Pilih RT</label>
                  <Select value={targetRt} onValueChange={setTargetRt}>
                    <SelectTrigger className="h-11 rounded-xl font-bold bg-slate-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua RT</SelectItem>
                      {availableRts.map((rt) => (
                        <SelectItem key={rt} value={rt}>
                          RT {rt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 4. Tetapkan ke Kolektor */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Tetapkan ke Kolektor</label>
                  <Select
                    value={selectedKolektorId}
                    onValueChange={setSelectedKolektorId}
                  >
                    <SelectTrigger className="h-11 rounded-xl font-bold bg-slate-50 text-primary">
                      <SelectValue placeholder="Pilih Petugas Penarik..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(kolektorList || []).map((kol) => (
                        <SelectItem key={kol.id} value={kol.id!} className="font-bold">
                          {kol.nama} ({kol.wilayahTugas || "Umum"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleAssignPlotting}
                  disabled={isAssigning}
                  className="h-11 rounded-xl font-black text-xs gap-2 bg-primary text-white shadow-lg shadow-primary/20"
                >
                  {isAssigning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  Terapkan Penugasan NOP
                </Button>
              </div>

              {unassignedNopCount > 0 && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-bold flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                  Terdapat {unassignedNopCount} NOP yang belum ditugaskan ke penarik PBB.
                </div>
              )}
            </CardContent>
          </Card>

          {/* DHKP Assignment Preview Table */}
          <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
            <CardHeader className="p-6 bg-slate-50/60 border-b border-slate-100">
              <CardTitle className="text-base font-black uppercase text-slate-800">
                Status Plotting NOP DHKP TA {selectedYear}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* MOBILE VIEW: RINGKAS PER KARTU PLOTTING */}
              <div className="block md:hidden divide-y divide-slate-100">
                {loadingDhkp ? (
                  <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary/40" /></div>
                ) : dhkpFiltered.length > 0 ? (
                  dhkpFiltered.map((item) => (
                    <div key={item.id} className="p-4 space-y-2 bg-white hover:bg-slate-50">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-black text-sm text-slate-900 leading-tight">{item.namaWp}</p>
                          <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{item.nop}</p>
                        </div>
                        {item.penarikNama ? (
                          <Badge className="bg-primary/10 text-primary font-bold text-[9px] border-none shrink-0">
                            {item.penarikNama}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-400 font-bold text-[9px] shrink-0">
                            Belum Diplotting
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-500">
                          RT {item.rt} / RW {item.rw} - {getOfficialDusun(item.dusun, item.rw, item.rt, `${item.alamatWp || ""} ${item.alamatOp || ""}`)}
                        </span>
                        <span className="font-black text-xs text-primary">{formatIDR(item.ketetapanNominal)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center font-bold text-slate-400 uppercase text-xs">Belum ada data DHKP.</div>
                )}
              </div>

              {/* DESKTOP VIEW: STANDARD TABLE */}
              <div className="hidden md:block">
                <ScrollArea className="h-[400px] w-full">
                  <Table>
                    <TableHeader className="bg-slate-100/80 sticky top-0 z-10 backdrop-blur-md">
                      <TableRow>
                        <TableHead className="font-black text-[10px] uppercase px-6">NOP</TableHead>
                        <TableHead className="font-black text-[10px] uppercase">Wajib Pajak</TableHead>
                        <TableHead className="font-black text-[10px] uppercase">Wilayah</TableHead>
                        <TableHead className="font-black text-[10px] uppercase text-right">Ketetapan</TableHead>
                        <TableHead className="font-black text-[10px] uppercase text-center px-6">Petugas Penarik</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingDhkp ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-32 text-center">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary/40" />
                          </TableCell>
                        </TableRow>
                      ) : dhkpFiltered.length > 0 ? (
                        dhkpFiltered.map((item) => (
                          <TableRow key={item.id} className="hover:bg-slate-50">
                            <TableCell className="font-mono text-xs font-bold px-6">{item.nop}</TableCell>
                            <TableCell className="font-bold text-xs">{item.namaWp}</TableCell>
                            <TableCell className="text-xs text-slate-600">
                              RT {item.rt} / RW {item.rw} - {getOfficialDusun(item.dusun, item.rw, item.rt, `${item.alamatWp || ""} ${item.alamatOp || ""}`)}
                            </TableCell>
                            <TableCell className="text-right font-black text-xs text-primary">
                              {formatIDR(item.ketetapanNominal)}
                            </TableCell>
                            <TableCell className="text-center px-6">
                              {item.penarikNama ? (
                                <Badge className="bg-primary/10 text-primary font-bold text-[10px]">
                                  {item.penarikNama}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-slate-400 font-bold text-[10px]">
                                  Belum Diplotting
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-32 text-center font-bold text-slate-400 uppercase text-xs">
                            Belum ada data DHKP. Silakan impor data di Master Data.
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

        {/* TAB 2: TARGET & BEBAN SETORAN */}
        <TabsContent value="beban" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {loadingKolektor || loadingDhkp ? (
              <div className="col-span-2 py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary/40" />
              </div>
            ) : kolektorStats.length > 0 ? (
              kolektorStats.map((kol) => (
                <Card
                  key={kol.id}
                  className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden p-6"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-black text-lg text-slate-800">{kol.nama}</h3>
                      <p className="text-xs text-muted-foreground font-semibold">
                        Wilayah: {kol.wilayahTugas}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-2xl font-black text-primary">
                        {kol.persentase}%
                      </span>
                      <p className="text-[10px] font-black uppercase text-muted-foreground">
                        Capaian Setoran
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Progress value={kol.persentase} className="h-3 rounded-full bg-slate-100" />
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-slate-100 text-center">
                    <div className="bg-slate-50 p-3 rounded-2xl">
                      <p className="text-[9px] font-black uppercase text-muted-foreground">Beban NOP</p>
                      <p className="text-base font-black text-slate-800">{kol.totalNop} NOP</p>
                    </div>
                    <div className="bg-primary/5 p-3 rounded-2xl">
                      <p className="text-[9px] font-black uppercase text-primary">Target Dana</p>
                      <p className="text-xs font-black text-primary">{formatIDR(kol.totalTarget)}</p>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-2xl">
                      <p className="text-[9px] font-black uppercase text-emerald-700">Terkumpul</p>
                      <p className="text-xs font-black text-emerald-700">{formatIDR(kol.totalRealisasi)}</p>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="col-span-2 text-center py-12 text-slate-400 font-bold uppercase text-xs">
                Belum ada data penarik PBB terdaftar.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
