"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Printer, FileText, CheckCircle2, Send, MessageCircle } from "lucide-react"
import { TransaksiPbb } from "@/types/pbb"
import { format } from "date-fns"
import { id } from "date-fns/locale"

export interface BatchReceiptData {
  tanggalBayar: string
  penarikNama: string
  noTelpPemungut?: string
  bendaharaNama?: string
  tahun: string
  items: {
    nop: string
    namaWp: string
    rt: string
    rw: string
    dusun: string
    ketetapanNominal: number
    denda: number
    totalBayar: number
  }[]
  totalPokok: number
  totalDenda: number
  grandTotal: number
}

interface ThermalReceiptModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaksi?: TransaksiPbb | null
  batchData?: BatchReceiptData | null
  noTelpPemungut?: string
  namaDesa?: string
}

export function ThermalReceiptModal({
  open,
  onOpenChange,
  transaksi,
  batchData,
  noTelpPemungut,
  namaDesa = "Rungkang",
}: ThermalReceiptModalProps) {
  const [paperWidth, setPaperWidth] = useState<"58mm" | "80mm">("58mm")

  if (!transaksi && !batchData) return null

  const formatIDR = (val: number) =>
    `Rp ${new Intl.NumberFormat("id-ID").format(val)}`

  // Normalize single tx or batch data into unified receipt items
  const receiptItems = batchData
    ? batchData.items
    : transaksi
    ? [
        {
          nop: transaksi.nop,
          namaWp: transaksi.namaWp,
          rt: transaksi.rt,
          rw: transaksi.rw,
          dusun: transaksi.dusun,
          ketetapanNominal: transaksi.ketetapanNominal,
          denda: transaksi.denda,
          totalBayar: transaksi.totalBayar,
        },
      ]
    : []

  const tglBayar = batchData?.tanggalBayar || transaksi?.tanggalBayar || ""
  const kolektorNama = batchData?.penarikNama || transaksi?.penarikNama || "Kolektor Desa"
  const tahunTagihan = batchData?.tahun || transaksi?.tahun || new Date().getFullYear().toString()
  const grandTotal = batchData
    ? batchData.grandTotal
    : transaksi
    ? transaksi.totalBayar
    : 0

  const formattedDate = tglBayar
    ? format(new Date(tglBayar), "dd MMMM yyyy", { locale: id })
    : "-"

  // Handle Thermal Bluetooth Print (58mm/80mm)
  const handlePrintThermal = () => {
    const printWindow = window.open("", "_blank", "width=400,height=600")
    if (!printWindow) return

    const styleWidth = paperWidth === "58mm" ? "48mm" : "72mm"
    const fontSize = paperWidth === "58mm" ? "10px" : "11px"

    const itemsHtml = receiptItems
      .map(
        (it, idx) => `
        <div style="margin-bottom: 4px;">
          <div><b>${idx + 1}. ${it.namaWp}</b> (RT ${it.rt}/RW ${it.rw})</div>
          <div>NOP: ${it.nop}</div>
          <div class="flex-between">
            <span>Pokok: ${formatIDR(it.ketetapanNominal)}</span>
            ${it.denda > 0 ? `<span>Denda: ${formatIDR(it.denda)}</span>` : ""}
          </div>
        </div>
      `
      )
      .join('<div class="line"></div>')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Struk PBB Desa ${namaDesa}</title>
          <style>
            @page { margin: 0; }
            body {
              font-family: 'Courier New', Courier, monospace;
              width: ${styleWidth};
              margin: 0 auto;
              padding: 6px;
              font-size: ${fontSize};
              line-height: 1.2;
              color: #000;
              background: #fff;
            }
            .text-center { text-align: center; }
            .bold { font-weight: bold; }
            .line { border-bottom: 1px dashed #000; margin: 4px 0; }
            .double-line { border-bottom: 2px double #000; margin: 4px 0; }
            .flex-between { display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="text-center bold">PEMERINTAH DESA ${namaDesa.toUpperCase()}</div>
          <div class="text-center bold">TANDA BUKTI SETORAN PBB-P2 TA ${tahunTagihan}</div>
          <div class="line"></div>
          <div>Tanggal  : ${formattedDate}</div>
          <div>Pemungut : ${kolektorNama}</div>
          <div>Item     : ${receiptItems.length} WP</div>
          <div class="line"></div>
          <div class="bold">RINCIAN PEMBAYARAN:</div>
          <div class="line"></div>
          ${itemsHtml}
          <div class="double-line"></div>
          <div class="flex-between bold" style="font-size: 12px;">
            <span>TOTAL SETORAN:</span>
            <span>${formatIDR(grandTotal)}</span>
          </div>
          <div class="double-line"></div>
          <div class="text-center bold">STATUS: LUNAS</div>
          <div class="text-center" style="font-size: 8px; margin-top: 6px;">
            Bukti pembayaran PBB-P2 yang sah oleh Bendahara Desa ${namaDesa}.
          </div>
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  // Handle Official Print Receipt (A4 / Official Document Window with Signatures)
  const handlePrintOfficialReceipt = () => {
    const printWindow = window.open("", "_blank", "width=800,height=900")
    if (!printWindow) return

    const rowsHtml = receiptItems
      .map(
        (it, idx) => `
        <tr>
          <td style="border: 1px solid #333; padding: 6px; text-align: center;">${idx + 1}</td>
          <td style="border: 1px solid #333; padding: 6px; font-family: monospace;">${it.nop}</td>
          <td style="border: 1px solid #333; padding: 6px; font-weight: bold;">${it.namaWp}</td>
          <td style="border: 1px solid #333; padding: 6px;">RT ${it.rt} / RW ${it.rw} (${it.dusun})</td>
          <td style="border: 1px solid #333; padding: 6px; text-align: right;">${formatIDR(it.ketetapanNominal)}</td>
          <td style="border: 1px solid #333; padding: 6px; text-align: right;">${formatIDR(it.denda)}</td>
          <td style="border: 1px solid #333; padding: 6px; text-align: right; font-weight: bold;">${formatIDR(it.totalBayar)}</td>
        </tr>
      `
      )
      .join("")

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bukti Pembayaran PBB Desa ${namaDesa}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 30px;
              color: #111;
            }
            .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 15px; }
            .header h3 { margin: 0; text-transform: uppercase; font-size: 16px; }
            .header h2 { margin: 4px 0; text-transform: uppercase; font-size: 18px; font-weight: 900; }
            .meta { margin-bottom: 15px; font-size: 13px; line-height: 1.6; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
            th { border: 1px solid #333; background: #f0f0f0; padding: 8px; text-transform: uppercase; }
            .signatures { margin-top: 40px; display: flex; justify-content: space-between; font-size: 13px; }
            .sig-box { text-align: center; width: 200px; }
            .sig-space { height: 60px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h3>PEMERINTAH KABUPATEN CILACAP • KECAMATAN GANDRUNGMANGU</h3>
            <h2>PEMERINTAH DESA ${namaDesa.toUpperCase()}</h2>
            <div style="font-size: 12px; font-weight: bold;">SURAT TANDA BUKTI PEMBAYARAN PBB-P2 TA ${tahunTagihan}</div>
          </div>

          <div class="meta">
            <table style="border: none; margin-bottom: 10px;">
              <tr style="background: none;">
                <td style="border: none; width: 150px;"><b>Tanggal Setor</b></td>
                <td style="border: none;">: ${formattedDate}</td>
                <td style="border: none; width: 150px;"><b>Total Wajib Pajak</b></td>
                <td style="border: none;">: ${receiptItems.length} WP</td>
              </tr>
              <tr style="background: none;">
                <td style="border: none;"><b>Nama Pemungut/Kolektor</b></td>
                <td style="border: none;">: ${kolektorNama}</td>
                <td style="border: none;"><b>Status Setoran</b></td>
                <td style="border: none;">: <b style="color: green;">LUNAS (SAH)</b></td>
              </tr>
            </table>
          </div>

          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>NOP (18 Digit)</th>
                <th>Nama Wajib Pajak</th>
                <th>Wilayah OP</th>
                <th style="text-align: right;">Pokok PBB</th>
                <th style="text-align: right;">Denda</th>
                <th style="text-align: right;">Total Bayar</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4" style="border: 1px solid #333; font-weight: bold; text-align: right; padding: 8px;">TOTAL SETORAN PEMBAYARAN:</td>
                <td colspan="3" style="border: 1px solid #333; font-weight: 900; text-align: right; padding: 8px; font-size: 14px; color: #000;">${formatIDR(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>

          <div class="signatures">
            <div class="sig-box">
              <div>Penyetor / Kolektor</div>
              <div class="sig-space"></div>
              <div><b>(${kolektorNama})</b></div>
            </div>

            <div class="sig-box">
              <div>Desa ${namaDesa}, ${formattedDate}</div>
              <div>Bendahara Desa ${namaDesa}</div>
              <div class="sig-space"></div>
              <div><b>(_______________________)</b></div>
            </div>
          </div>
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 300)
  }

  // Handle WhatsApp Message Sending directly to Collector
  const handleSendWhatsApp = () => {
    const rincianWp = receiptItems
      .map(
        (it, idx) =>
          `${idx + 1}. *${it.namaWp.toUpperCase()}* (NOP: ${it.nop})\n   - Pokok PBB: ${formatIDR(it.ketetapanNominal)}${it.denda > 0 ? `\n   - Denda: ${formatIDR(it.denda)}` : ""}`
      )
      .join("\n")

    const messageText =
      `*PEMERINTAH DESA ${namaDesa.toUpperCase()}*\n` +
      `*SURAT TANDA BUKTI SETORAN PBB-P2 TA ${tahunTagihan}*\n` +
      `-----------------------------------------\n` +
      `📅 *Tanggal Setor* : ${formattedDate}\n` +
      `👤 *Pemungut/Kolektor* : ${kolektorNama}\n` +
      `📊 *Jumlah Tagihan* : ${receiptItems.length} Wajib Pajak\n` +
      `-----------------------------------------\n` +
      `*RINCIAN SETORAN:* \n\n` +
      `${rincianWp}\n` +
      `-----------------------------------------\n` +
      `💰 *TOTAL SETORAN : ${formatIDR(grandTotal)}*\n` +
      `✅ *STATUS : LUNAS (BENDAHARA DESA)*\n` +
      `-----------------------------------------\n` +
      `_Tanda bukti setoran PBB-P2 yang sah dari Pemdes ${namaDesa}._`

    let phone = (noTelpPemungut || batchData?.noTelpPemungut || "").replace(/\D/g, "")
    if (phone.startsWith("0")) {
      phone = "62" + phone.substring(1)
    }

    const encodedText = encodeURIComponent(messageText)
    const waUrl = phone.length >= 9
      ? `https://wa.me/${phone}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`

    window.open(waUrl, "_blank")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] rounded-[2.5rem] p-6 border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-black uppercase text-primary flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Bukti Setoran & Pembayaran PBB
          </DialogTitle>
        </DialogHeader>

        {/* Paper Size selector for Thermal */}
        <div className="flex items-center justify-between bg-slate-100 p-2 rounded-2xl text-xs font-bold my-2">
          <span className="text-slate-600 pl-2">Ukuran Kertas Thermal:</span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={paperWidth === "58mm" ? "default" : "outline"}
              className="h-8 rounded-xl text-xs font-black"
              onClick={() => setPaperWidth("58mm")}
            >
              58 mm
            </Button>
            <Button
              size="sm"
              variant={paperWidth === "80mm" ? "default" : "outline"}
              className="h-8 rounded-lg text-xs font-black"
              onClick={() => setPaperWidth("80mm")}
            >
              80 mm
            </Button>
          </div>
        </div>

        {/* Live Receipt Preview Card */}
        <div className="my-2 p-4 bg-amber-50/50 border-2 border-dashed border-amber-300 rounded-2xl font-mono text-xs text-slate-900 shadow-inner max-h-[300px] overflow-y-auto">
          <div className="text-center font-black uppercase tracking-tight">
            PEMERINTAH DESA {namaDesa.toUpperCase()}
          </div>
          <div className="text-center font-bold text-[10px] text-slate-700">
            TANDA BUKTI SETORAN PBB-P2 TA {tahunTagihan}
          </div>
          <div className="border-b border-dashed border-slate-400 my-2"></div>
          <div>Tanggal  : {formattedDate}</div>
          <div>Pemungut : {kolektorNama}</div>
          <div>Jumlah WP: {receiptItems.length} Wajib Pajak</div>
          <div className="border-b border-dashed border-slate-400 my-2"></div>
          
          <div className="space-y-2">
            {receiptItems.slice(0, 5).map((it, idx) => (
              <div key={idx} className="text-[11px]">
                <div className="font-bold">{idx + 1}. {it.namaWp}</div>
                <div className="text-[10px] text-slate-600">NOP: {it.nop}</div>
                <div className="flex justify-between">
                  <span>Pokok: {formatIDR(it.ketetapanNominal)}</span>
                  {it.denda > 0 && <span className="text-red-600">+Denda: {formatIDR(it.denda)}</span>}
                </div>
              </div>
            ))}
            {receiptItems.length > 5 && (
              <div className="text-[10px] text-slate-500 italic text-center">
                ...dan {receiptItems.length - 5} Wajib Pajak lainnya...
              </div>
            )}
          </div>

          <div className="border-b-2 border-double border-slate-500 my-2"></div>
          <div className="flex justify-between font-black text-sm">
            <span>TOTAL SETORAN:</span>
            <span className="text-emerald-700">{formatIDR(grandTotal)}</span>
          </div>
          <div className="border-b-2 border-double border-slate-500 my-2"></div>
          <div className="flex items-center justify-center gap-1 font-black text-emerald-600 uppercase text-xs">
            <CheckCircle2 className="h-4 w-4" /> STATUS: LUNAS (BENDAHARA)
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row flex-wrap gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl h-11 font-bold text-xs"
          >
            Tutup
          </Button>

          <Button
            variant="outline"
            onClick={handleSendWhatsApp}
            className="rounded-xl h-11 font-bold text-xs gap-1.5 bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
          >
            <MessageCircle className="h-4 w-4 text-emerald-600 fill-emerald-600/20" />
            Kirim WA Pemungut
          </Button>

          <Button
            variant="outline"
            onClick={handlePrintOfficialReceipt}
            className="rounded-xl h-11 font-bold text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
          >
            <FileText className="h-4 w-4" />
            Cetak Bukti Resmi (A4)
          </Button>

          <Button
            onClick={handlePrintThermal}
            className="rounded-xl h-11 font-black text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 flex-1"
          >
            <Printer className="h-4 w-4" />
            Cetak Thermal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
