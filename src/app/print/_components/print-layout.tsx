'use client';

import { Button } from '@/components/ui/button';
import { LetterSubmission, KopSuratInfo } from '@/lib/types';
import { Loader2, Printer, FileDown } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';

interface PrintLayoutProps {
  submission: LetterSubmission;
  children: React.ReactNode;
  requesterLabel?: string;
  requesterNameOverride?: string;
  additionalFooter?: React.ReactNode;
  hideRequesterSignature?: boolean;
  reverseSignatures?: boolean;
}

const fallbackKopInfo: KopSuratInfo = {
  letterheadImageUrl: "https://placehold.co/1200x240/f0f0f0/333333?text=Kop+Surat+Belum+Diatur"
};

const parseDateInput = (dateInput: any): Date | null => {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'object' && 'toDate' in dateInput) return dateInput.toDate();

  if (typeof dateInput === 'string') {
    const separators = /[-/]/;
    const parts = dateInput.split(separators);

    if (parts.length === 3) {
      let d, m, y;
      if (parts[0].length === 4) {
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10) - 1;
        d = parseInt(parts[2], 10);
      } else {
        const p0 = parseInt(parts[0], 10);
        const p1 = parseInt(parts[1], 10);
        let p2 = parseInt(parts[2], 10);

        if (p2 < 100) {
          const currentYearShort = new Date().getFullYear() % 100;
          p2 += (p2 > currentYearShort + 2) ? 1900 : 2000;
        }

        if (p0 > 12) { d = p0; m = p1 - 1; y = p2; }
        else if (p1 > 12) { m = p0 - 1; d = p1; y = p2; }
        else { d = p0; m = p1 - 1; y = p2; }
      }
      const date = new Date(y, m, d);
      return isNaN(date.getTime()) ? null : date;
    }
    const parsed = new Date(dateInput);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

export const toProperCase = (str: string): string => {
  if (!str) return '';
  let cleaned = str.replace(/`/g, '');

  return cleaned.replace(/\b[a-zA-Z]+\b/g, (word) => {
    const upperWord = word.toUpperCase();
    if (['RT', 'RW', 'WNI', 'KK', 'NIK', 'HP', 'WA', 'BPJS', 'SKCK', 'SKTM', 'KUR', 'UMKM'].includes(upperWord)) {
      return upperWord;
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
};

export const formatTTL = (place?: string, dateInput?: any) => {
  const dateObj = parseDateInput(dateInput);
  const city = place ? toProperCase(place) : '';

  if (!dateObj) return city || '-';

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  return `${city}, ${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
};

export const formatFullDate = (dateInput: any) => {
  const dateObj = parseDateInput(dateInput);
  if (!dateObj) return dateInput || '-';

  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const dayName = days[dateObj.getDay()];
  const dayNum = String(dateObj.getDate()).padStart(2, '0');
  const monthName = months[dateObj.getMonth()];
  const year = dateObj.getFullYear();

  return `${dayName}, ${dayNum} ${monthName} ${year}`;
};

export const addKopSuratSync = (doc: jsPDF, img: HTMLImageElement | null, margin: number, pageWidth: number) => {
  if (img) {
    try {
      doc.addImage(img, 'PNG', margin, 10, 18, 22);
    } catch (e) {
      console.error("PDF Logo Error:", e);
    }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("PEMERINTAH KABUPATEN CILACAP", pageWidth / 2 + 10, 15, { align: "center" });
  doc.text("KECAMATAN GANDRUNGMANGU", pageWidth / 2 + 10, 20, { align: "center" });
  doc.setFontSize(16);
  doc.text("DESA RUNGKANG", pageWidth / 2 + 10, 27, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Jalan Raya Pelita KM 5 Rungkang, Kec. Gandrungmangu, Cilacap, Jawa Tengah,", pageWidth / 2 + 10, 31, { align: "center" });
  doc.text("Tlp. 0852-2770-6666, Laman : www.rungkang-cilacap.desa.id, Pos-el : www.desarungkang014@gmail.com", pageWidth / 2 + 10, 35, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.text("Kode Pos 53254", pageWidth - margin, 38.5, { align: "right" });
  doc.setLineWidth(0.8);
  doc.line(margin, 40, pageWidth - margin, 40);
  doc.setLineWidth(0.2);
  doc.line(margin, 41, pageWidth - margin, 41);
}

export function PrintLayout({

  submission,
  children,
  requesterLabel = "Pemohon",
  requesterNameOverride,
  additionalFooter,
  hideRequesterSignature = false,
  reverseSignatures = false
}: PrintLayoutProps) {
  const [kopInfo, setKopInfo] = useState<KopSuratInfo | null>(null);
  const [villageLogoUrl, setVillageLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const printAreaRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  const signerType = searchParams.get('signer') || 'kades';

  useEffect(() => {
    const fetchKopInfo = async () => {
      if (!firestore) return;
      setIsLoading(true);
      try {
        const kopSuratRef = doc(firestore, 'kopSurat', 'default');
        const docSnap = await getDoc(kopSuratRef);
        if (docSnap.exists()) {
          setKopInfo(docSnap.data() as KopSuratInfo);
        } else {
          setKopInfo(fallbackKopInfo);
        }

        const villageRef = doc(firestore, 'settings', 'village');
        const vSnap = await getDoc(villageRef);
        if (vSnap.exists()) {
          const vData = vSnap.data();
          if (vData?.logoBase64) {
            setVillageLogoUrl(vData.logoBase64);
          }
        }
      } catch (error) {
        setKopInfo(fallbackKopInfo);
      } finally {
        setIsLoading(false);
      }
    };
    fetchKopInfo();
  }, [firestore]);

  const finalLogoSrc = villageLogoUrl || "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Lambang_Kabupaten_Cilacap.png/120px-Lambang_Kabupaten_Cilacap.png";


  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;

    setIsDownloading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const dataUrl = await toPng(printAreaRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          margin: '0',
          padding: '0'
        }
      });

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = 210;
      const pdfHeight = 297;

      const marginLeft = 20;   // 2 cm
      const marginRight = 15;  // 1.5 cm
      const marginTop = 3;     // 0.3 cm
      const marginBottom = 0;

      const contentWidth = pdfWidth - marginLeft - marginRight;

      const imgProps = pdf.getImageProperties(dataUrl);
      const imgHeight = (imgProps.height * contentWidth) / imgProps.width;

      pdf.addImage(
        dataUrl,
        'PNG',
        0,
        0,
        pdfWidth,
        pdfHeight
      );

      const reqName = submission.requesterName || submission.formData?.name || 'pemohon';
      const fileName = `${submission.letterType.replace(/\s+/g, '_')}_${reqName.replace(/\s+/g, '_')}.pdf`;
      pdf.save(fileName);

      toast({
        title: "Berhasil Mengunduh",
        description: "Dokumen PDF telah disimpan ke perangkat Anda.",
      });
    } catch (error) {
      console.error('PDF Generation Error:', error);
      toast({
        title: "Gagal Mengunduh",
        description: "Terjadi kesalahan saat membuat file PDF.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Memuat templat kop...</p>
      </div>
    )
  }

  const dateRaw = submission.date || submission.createdAt || new Date();
  const dateObj = typeof dateRaw === 'object' && 'toDate' in dateRaw ? dateRaw.toDate() : new Date(dateRaw);
  const formattedDate = isNaN(dateObj.getTime()) ? '-' : dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const displayRequesterName = requesterNameOverride || submission.requesterName || submission.formData?.name || '';

  return (
    <div className="bg-slate-200 text-black font-arial-print print:bg-white min-h-screen py-10 print:p-0">
      <div
        ref={printAreaRef}
        className="mx-auto bg-white shadow-2xl print:shadow-none print:border-none overflow-hidden flex flex-col"
        style={{
          width: '210mm',
          minHeight: '297mm',
          boxSizing: 'border-box'
        }}
      >
        <header
          className="pl-[2cm] pr-[2cm] pt-[10mm]"
          style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}
        >
          {kopInfo?.letterheadImageUrl && !kopInfo.letterheadImageUrl.includes('placehold.co') ? (
            <img
              src={kopInfo.letterheadImageUrl}
              alt="Kop Surat"
              className="w-full h-auto"
              crossOrigin="anonymous"
            />
          ) : (
            <div className="relative text-black mb-2">
              {/* Wrapper Utama Logo & Teks Redaksi */}
              <div className="relative flex items-start">
                {/* Logo di Kiri */}
                <div className="absolute left-0 top-0 w-[18mm] h-[23mm] shrink-0">
                  <img
                    src={finalLogoSrc}
                    alt="Logo Desa"
                    className="w-[18mm] h-[23mm] object-contain"
                    crossOrigin="anonymous"
                  />
                </div>

                {/* Container Teks Redaksi Rata Tengah */}
                <div className="w-full text-center pl-[10mm] pr-[0mm]">
                  <h3 className="text-[12pt] font-bold uppercase tracking-wide text-black m-0 p-0 leading-tight">
                    PEMERINTAH KABUPATEN CILACAP
                  </h3>
                  <h3 className="text-[12pt] font-bold uppercase tracking-wide text-black m-0 p-0 leading-tight mt-[0.2mm]">
                    KECAMATAN GANDRUNGMANGU
                  </h3>
                  <h2 className="text-[15pt] font-bold uppercase tracking-wide text-black m-0 p-0 leading-tight mt-[0.2mm]">
                    DESA RUNGKANG
                  </h2>
                  <p className="text-[8.5pt] font-normal text-black m-0 p-0 leading-tight mt-[0.5mm]">
                    Jalan Raya Pelita KM 5 Rungkang, Kec. Gandrungmangu, Cilacap, Jawa Tengah,
                  </p>
                  <p className="text-[8.5pt] font-normal text-black m-0 p-0 leading-tight mt-[0.5mm]">
                    Tlp. 0852-2770-6666, Laman : www.rungkang-cilacap.desa.id, Pos-el : www.desarungkang014@gmail.com
                  </p>
                </div>
              </div>

              {/* Kode Pos: Dibuat sebagai baris tersendiri (di bawah teks terakhir & rata kanan) */}
              <div className="text-right text-[8pt] font-bold text-black m-0 p-0 leading-none mt-[1mm]">
                Kode Pos 53254
              </div>

              {/* Garis Ganda Kop Surat (Tebal - Tipis) */}
              <div className="mt-[1.5mm]">
                <div className="border-b-[0.8mm] border-black w-full" />
                <div className="border-b-[0.2mm] border-black w-full mt-[0.8mm]" />
              </div>
            </div>
          )}
        </header>



        <main className="pl-[2cm] pr-[1.5cm] pt-[0.3cm] pb-[0cm] text-base">
          <div className="text-center mb-6">
            <p className="font-bold underline text-lg tracking-wider">{submission.letterType.toUpperCase()}</p>
            <p>Nomor : {submission.documentNumber}</p>
          </div>

          {children}
        </main>

        <footer className="px-[2cm] pb-[0cm] pt-4">
          <div className={cn("flex justify-between text-center items-start", reverseSignatures && "flex-row-reverse")}>
            <div className={cn("w-[40%]", hideRequesterSignature && "invisible")}>
              {reverseSignatures ? (
                <p className="mb-1">Rungkang, {formattedDate}</p>
              ) : (
                <p className="invisible mb-1">Rungkang, 00 Bulan 0000</p>
              )}
              <p>{requesterLabel}</p>
              <div className="h-16"></div>
              <p className="font-bold underline tracking-wider uppercase">
                {displayRequesterName}
              </p>
            </div>

            <div className="w-[45%]">
              {!reverseSignatures ? (
                <p className="mb-1">Rungkang, {formattedDate}</p>
              ) : (
                <p className="invisible mb-1">Rungkang, 00 Bulan 0000</p>
              )}

              {signerType === 'sekdes' ? (
                <>
                  <p>A.n. Kepala Desa Rungkang</p>
                  <p>Sekretaris Desa Rungkang</p>
                  <div className="h-16"></div>
                  <p className="font-bold underline tracking-wider uppercase">HERU WAHYONO</p>
                </>
              ) : (
                <>
                  <p>Kepala Desa Rungkang</p>
                  <div className="h-16"></div>
                  <p className="font-bold underline tracking-wider uppercase">SUSANTO</p>
                </>
              )}
            </div>
          </div>


          {additionalFooter && (
            <div className="mt-6">
              {additionalFooter}
            </div>
          )}
        </footer>
      </div>

      <div className="fixed bottom-6 right-6 flex flex-col sm:flex-row gap-3 print:hidden">
        <Button onClick={handleDownloadPdf} variant="secondary" size="lg" className="shadow-lg h-12" disabled={isDownloading}>
          {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-5 w-5" />}
          Unduh PDF
        </Button>
        <Button onClick={handlePrint} size="lg" className="shadow-lg h-12">
          <Printer className="mr-2 h-5 w-5" />
          Cetak Dokumen
        </Button>
      </div>

      <style jsx global>{`
        .font-arial-print {
            font-family: Arial, sans-serif;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          html, body {
            width: 210mm !important;
            height: auto !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          header.sticky, nav, footer.border-t, .fixed {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export const DataRow = ({ label, value }: { label: string; value: any }) => {
  let displayValue = value || '-';
  if (typeof displayValue === 'string') {
    const lowerLabel = label.toLowerCase();
    if (
      lowerLabel.includes('nama') ||
      lowerLabel.includes('alamat') ||
      lowerLabel.includes('tempat') ||
      lowerLabel.includes('tgl lahir') ||
      lowerLabel.includes('tanggal lahir') ||
      lowerLabel.includes('pekerjaan')
    ) {
      displayValue = toProperCase(displayValue);
    }
  }
  return (
    <tr>
      <td className="w-[30%] py-1 align-top">{label}</td>
      <td className="w-[2%] py-1 align-top text-center">:</td>
      <td className="py-1 align-top pl-1">{displayValue}</td>
    </tr>
  );
};
