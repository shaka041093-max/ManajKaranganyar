/**
 * @fileOverview Definisi tipe data APBDes. Data statis telah dihapus untuk migrasi Firestore.
 */

export interface ApbItem {
  id: string;
  bidang: number;
  kode: string;
  uraian: string;
  volume: string;
  satuan: string;
  nominal: number;
  sumber: string;
  tahun: string;
}

export const BIDANG_NAMES: Record<number, string> = {
  1: "Penyelenggaraan Pemerintahan",
  2: "Pelaksanaan Pembangunan",
  3: "Pembinaan Kemasyarakatan",
  4: "Pemberdayaan Masyarakat",
  5: "Penanggulangan Bencana",
};

// Data statis dikosongkan karena sistem beralih ke database Firestore (Cloud)
export const APB_DATA: ApbItem[] = [];
