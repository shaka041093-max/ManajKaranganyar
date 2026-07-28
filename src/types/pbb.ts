export interface DhkpRecord {
  id?: string;
  nop: string;
  namaWp: string;
  alamatWp: string;
  alamatOp: string;
  rt: string;
  rw: string;
  dusun: string;
  luasBumi: number;
  luasBangunan: number;
  ketetapanNominal: number; // Tagihan PBB Pokok
  statusBangunan: 'Kosong' | 'Ada Bangunan' | 'Alih Kepemilikan';
  statusBayar: 'Belum Lunas' | 'Lunas';
  penarikId?: string;
  penarikNama?: string;
  tahun: string; // e.g., "2026"
  kecamatan?: string;
  kelurahan?: string;
  blok?: string;
  njopBumi?: number;
  njopBangunan?: number;
  njopSppt?: number;
  tglBayar?: string;
  createdAt?: any;
  updatedAt?: any;
}

export const getOfficialDusun = (
  dusun?: string,
  rw?: string,
  rt?: string,
  alamat?: string
): string => {
  const combined = `${alamat || ""} ${dusun || ""}`
  if (/MARGASARI/i.test(combined)) {
    return "Dusun Margasari"
  }

  const cleanRw = String(rw || "").replace(/\D/g, "")
  const numRw = parseInt(cleanRw, 10)

  if (numRw === 2) {
    return "Dusun Margasari"
  }

  if (numRw === 1 || numRw === 3) {
    return "Dusun Rungkang"
  }

  if (dusun === "Dusun Margasari" || dusun === "MARGASARI") {
    return "Dusun Margasari"
  }
  return "Dusun Rungkang"
}

export interface Kolektor {
  id?: string;
  nama: string;
  noTelp: string;
  jabatan: string;
  wilayahTugas?: string;
  status: 'Aktif' | 'Non-Aktif';
  createdAt?: any;
}

export interface Wilayah {
  id?: string;
  dusun: string;
  rw: string;
  rt: string;
  createdAt?: any;
}

export interface TransaksiPbb {
  id?: string;
  nop: string;
  namaWp: string;
  alamatOp: string;
  rt: string;
  rw: string;
  dusun: string;
  tanggalBayar: string; // YYYY-MM-DD
  ketetapanNominal: number;
  denda: number;
  totalBayar: number;
  penarikId: string;
  penarikNama: string;
  statusVerifikasi: 'Diterima Kolektor' | 'Disetorkan ke Desa' | 'Disetorkan ke Bank/Bapenda';
  catatan?: string;
  setoranId?: string;
  batchId?: string;
  tahun: string;
  createdAt?: any;
}

export interface SetoranPbb {
  id?: string;
  kodeSetoran: string; // e.g. "STR-20260728-001"
  tanggalSetor: string;
  kolektorId: string;
  kolektorNama: string;
  totalNominal: number;
  jumlahNop: number;
  statusVerifikasi: 'Disetorkan ke Desa' | 'Disetorkan ke Bank/Bapenda';
  verifiedBy?: string;
  bankTujuan?: string;
  noReferensiBank?: string;
  catatan?: string;
  tahun: string;
  createdAt?: any;
}
