// Tipe data dari API backend (lihat backend/README.md). Tidak ada kunci soal di sini kecuali hasil periksa latihan.

export type JenisTes = 'TIU5' | 'TIU6' | 'KORAN';

export const DAFTAR_TES: JenisTes[] = ['TIU5', 'TIU6', 'KORAN'];

/** Nama tes untuk dashboard HC (monitoring dan penilaian). Jangan dipakai di halaman peserta. */
export const LABEL_TES: Record<JenisTes, string> = {
  TIU5: 'TIU 5',
  TIU6: 'TIU 6',
  KORAN: 'Tes Koran / Kraepelin',
};

/**
 * Revisi HC 10 November 2026: di portal peserta nama tes diganti Tes 1, Tes 2, Tes 3, dan Tes Koran
 * tampil paling kiri (cenderung dikerjakan lebih awal). Dashboard HC tetap memakai LABEL_TES.
 */
export const DAFTAR_TES_PESERTA: JenisTes[] = ['KORAN', 'TIU5', 'TIU6'];

export const LABEL_TES_PESERTA: Record<JenisTes, string> = {
  KORAN: 'Tes 1',
  TIU5: 'Tes 2',
  TIU6: 'Tes 3',
};

export const BUTIR_PER_SOAL_TIU6 = 5;

/** GET /api/peserta/saya */
export interface InfoUjian {
  jenis_tes: JenisTes;
  nama: string;
  nama_sesi: string;
  status: string;
  waktu_tutup: string;
  mulai_pada: string | null;
  batas_selesai: string | null;
  sisa_detik: number | null;
  berjalan_ms: number | null;
  durasi_detik: number;
  /** TIU 5: 30, TIU 6: 8 Soal, Koran: 988. */
  jumlah_soal: number;
  /** TIU 5: 30, TIU 6: 40 butir, Koran: 988. */
  jumlah_nomor: number;
  /** Hanya Koran: jumlah halaman (13). */
  jumlah_halaman: number | null;
}

export interface ItemLatihan {
  nomor: number;
  gambar: string;
  jumlah_butir?: number;
}

/** GET /api/peserta/latihan (tanpa kunci) */
export interface DataLatihan {
  instruksi: string | null;
  latihan: ItemLatihan[];
}

/** POST /api/peserta/latihan/periksa */
export type HasilPeriksa =
  | { benar: boolean; kunci: string; penjelasan?: string }
  | { butir: { butir: number; benar: boolean; kunci: string }[] };

/** GET /api/peserta/soal (TIU, tanpa kunci) */
export interface SoalPublik {
  nomor: number;
  gambar: string;
  jumlah_butir?: number;
}

export interface JawabanTersimpan {
  nomor: number;
  jawaban: string | null;
}
