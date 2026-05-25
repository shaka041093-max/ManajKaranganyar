
import { jsPDF } from "jspdf";
import { format, lastDayOfMonth } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { loadImage } from "./pdf-utils";

interface AttendanceReportData {
  month: string;
  year: string;
  data: any[];
  logoBase64?: string | null;
  settings?: any; // Ditambahkan untuk deteksi hari libur
}

const DAYS_MAP = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];

export const generateAttendancePDF = async (report: AttendanceReportData): Promise<Blob> => {
  const { month, year, data, logoBase64, settings } = report;
  
  // Create landscape document
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - (margin * 2);
  const monthIdx = parseInt(month) - 1;
  const dateObj = new Date(parseInt(year), monthIdx, 1);
  const monthName = format(dateObj, "MMMM", { locale: localeID }).toUpperCase();
  const daysInMonth = new Date(parseInt(year), monthIdx + 1, 0).getDate();

  // Load Logo
  const logoSource = (logoBase64 && logoBase64.length > 50) ? logoBase64 : "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Lambang_Kabupaten_Cilacap.png/120px-Lambang_Kabupaten_Cilacap.png";
  const logoImg = await loadImage(logoSource);

  // Helper for Kop Surat in Landscape
  const addLandscapeKop = () => {
    if (logoImg) {
      doc.addImage(logoImg, 'PNG', margin + 10, 10, 15, 18);
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("PEMERINTAH KABUPATEN CILACAP", pageWidth / 2, 14, { align: "center" });
    doc.text("KECAMATAN GANDRUNGMANGU", pageWidth / 2, 19, { align: "center" });
    doc.setFontSize(14);
    doc.text("DESA KARANGANYAR", pageWidth / 2, 25, { align: "center" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Jl. Slamet Riyadi No. 60, Desa Karanganyar, Kec. Gandrungmangu, Cilacap, Jawa Tengah,", pageWidth / 2, 29, { align: "center" });
    doc.text("Tlp. 0877-0524-5801, Laman : www.karanganyar-cilacap.desa.id, Pos-el : desakaranganyar2020@gmail.com", pageWidth / 2, 33, { align: "center" });
    doc.setLineWidth(0.5);
    doc.line(margin, 35, pageWidth - margin, 35);
    doc.setLineWidth(0.1);
    doc.line(margin, 35.8, pageWidth - margin, 35.8);
  };

  addLandscapeKop();

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  const title = `ABSENSI PERANGKAT DESA KARANGANYAR BULAN ${monthName} ${year}`;
  doc.text(title, pageWidth / 2, 48, { align: "center" });

  // Table Configuration
  let currentY = 54;
  const colNoW = 8;
  const colNameW = 45;
  const colDayW = (contentWidth - colNoW - colNameW - 25) / 31;
  const colStatW = 5; // S, TK, DL

  const drawHeader = (y: number) => {
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    let x = margin;
    
    // NO
    doc.rect(x, y, colNoW, 8);
    doc.text("NO", x + colNoW / 2, y + 5, { align: "center" });
    x += colNoW;

    // NAME
    doc.rect(x, y, colNameW, 8);
    doc.text("NAMA / JABATAN", x + colNameW / 2, y + 5, { align: "center" });
    x += colNameW;

    // DAYS
    for (let i = 1; i <= 31; i++) {
      // Deteksi Hari Libur untuk Header
      if (i <= daysInMonth) {
        const checkDate = new Date(parseInt(year), monthIdx, i);
        const dayName = DAYS_MAP[checkDate.getDay()];
        const dateStr = format(checkDate, "yyyy-MM-dd");
        const isWeekend = settings?.hari_kerja ? !settings.hari_kerja.includes(dayName) : false;
        const isManualHoliday = settings?.hari_libur ? settings.hari_libur.includes(dateStr) : false;
        
        if (isWeekend || isManualHoliday) {
            doc.setFillColor(255, 200, 200); // Merah muda lebih gelap untuk header
            doc.rect(x, y, colDayW, 8, 'F');
        }
      }
      doc.rect(x, y, colDayW, 8);
      doc.text(i.toString(), x + colDayW / 2, y + 5, { align: "center" });
      x += colDayW;
    }

    // STATS
    const stats = ["S", "TK", "DL"];
    stats.forEach(s => {
      doc.rect(x, y, colStatW, 8);
      doc.text(s, x + colStatW / 2, y + 5, { align: "center" });
      x += colStatW;
    });

    return y + 8;
  };

  currentY = drawHeader(currentY);

  // Rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);

  data.forEach((row, i) => {
    const rowH = 7;
    if (currentY + rowH > pageHeight - 50) {
      doc.addPage();
      addLandscapeKop();
      currentY = drawHeader(40);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
    }

    let x = margin;
    
    // NO
    doc.rect(x, currentY, colNoW, rowH);
    doc.text((i + 1).toString(), x + colNoW / 2, currentY + 4.5, { align: "center" });
    x += colNoW;

    // NAME & JABATAN
    doc.rect(x, currentY, colNameW, rowH);
    doc.setFont("helvetica", "bold");
    const cleanName = row.name.length > 25 ? row.name.substring(0, 22) + "..." : row.name;
    doc.text(cleanName, x + 1, currentY + 3);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    const cleanJabatan = row.jabatan.length > 35 ? row.jabatan.substring(0, 32) + "..." : row.jabatan;
    doc.text(cleanJabatan, x + 1, currentY + 5.5);
    doc.setFontSize(6);
    x += colNameW;

    // DAYS
    for (let d = 1; d <= 31; d++) {
      // Cek Hari Libur
      if (d <= daysInMonth) {
        const checkDate = new Date(parseInt(year), monthIdx, d);
        const dayName = DAYS_MAP[checkDate.getDay()];
        const dateStr = format(checkDate, "yyyy-MM-dd");
        const isWeekend = settings?.hari_kerja ? !settings.hari_kerja.includes(dayName) : false;
        const isManualHoliday = settings?.hari_libur ? settings.hari_libur.includes(dateStr) : false;
        
        if (isWeekend || isManualHoliday) {
            doc.setFillColor(255, 235, 235); // Merah muda terang untuk isi sel
            doc.rect(x, currentY, colDayW, rowH, 'F');
        }
      }

      doc.rect(x, currentY, colDayW, rowH);
      
      if (d <= daysInMonth) {
        const record = row.attendance[d];
        if (record) {
          let mark = "";
          if (record.status === 'hadir') mark = "H";
          else if (record.status === 'telat') mark = "T";
          else if (record.status === 'izin') mark = "S";
          else if (record.status === 'alpha') mark = "A";
          else if (record.status === 'dinas_luar') mark = "DL";
          
          if (mark === "H") doc.setTextColor(0, 150, 0);
          else if (mark === "T") doc.setTextColor(255, 100, 0);
          else if (mark === "A") doc.setTextColor(200, 0, 0);
          else doc.setTextColor(0, 0, 255);
          
          doc.text(mark, x + colDayW / 2, currentY + 4.5, { align: "center" });
          doc.setTextColor(0, 0, 0);
        }
      } else {
        doc.setFillColor(240, 240, 240);
        doc.rect(x, currentY, colDayW, rowH, 'F');
        doc.rect(x, currentY, colDayW, rowH);
      }
      x += colDayW;
    }

    // STATS
    doc.rect(x, currentY, colStatW, rowH);
    doc.text(row.stats.s.toString(), x + colStatW / 2, currentY + 4.5, { align: "center" });
    x += colStatW;

    doc.rect(x, currentY, colStatW, rowH);
    doc.text(row.stats.tk.toString(), x + colStatW / 2, currentY + 4.5, { align: "center" });
    x += colStatW;

    doc.rect(x, currentY, colStatW, rowH);
    doc.text(row.stats.dl.toString(), x + colStatW / 2, currentY + 4.5, { align: "center" });
    
    currentY += rowH;
  });

  // Footer / Signature
  const lastDay = lastDayOfMonth(dateObj);
  const footerDate = format(lastDay, "d MMMM yyyy", { locale: localeID });
  
  if (currentY > pageHeight - 50) {
    doc.addPage();
    addLandscapeKop();
    currentY = 40;
  }

  currentY += 15;
  const sigX = pageWidth - margin - 60;
  doc.setFontSize(9);
  doc.text(`Karanganyar, ${footerDate}`, sigX, currentY);
  doc.setFont("helvetica", "bold");
  doc.text("Kepala Desa Karanganyar,", sigX, currentY + 5);
  currentY += 22;
  doc.text("RISKIANASARI, SE.", sigX, currentY);
  const nW = doc.getTextWidth("RISKIANASARI, SE.");
  doc.line(sigX, currentY + 1, sigX + nW, currentY + 1);

  return doc.output("blob");
};
