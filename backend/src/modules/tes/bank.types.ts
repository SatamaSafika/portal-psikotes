// Tipe bank soal. Berkas bank (backend/bank/<versi>/) memuat kunci, jadi hanya dibaca di server.

export type TesGambar = 'TIU5' | 'TIU6';
export type JenisItem = 'latihan' | 'soal';

export interface ItemTiu5 {
  nomor: number;
  gambar: string;
  kunci: number;
  /** Hanya untuk latihan. Penjelasan hanya dipakai di latihan TIU 5. */
  penjelasan?: string;
}

/** TIU 6 tidak memakai penjelasan, baik latihan maupun soal. */
export interface ButirTiu6 {
  butir: number;
  kunci: 'B' | 'S';
}

export interface ItemTiu6 {
  nomor: number;
  gambar: string;
  butir: ButirTiu6[];
}

export interface BagianTiu5 {
  instruksi: string;
  latihan: ItemTiu5[];
  soal: ItemTiu5[];
}

export interface BagianTiu6 {
  instruksi: string;
  latihan: ItemTiu6[];
  soal: ItemTiu6[];
}

/** Isi bank/<versi>/soal.json. */
export interface BankSoal {
  versi: string;
  dibuat_pada: string;
  sidik_jari_koran: string;
  TIU5: BagianTiu5;
  TIU6: BagianTiu6;
}

export interface LajurKoran {
  lajur: number;
  halaman: number;
  posisi: number;
  angka: number[];
}

/** Isi bank/<versi>/koran.json, dibuat sekali oleh skrip buat-koran. */
export interface BerkasKoran {
  versi: string;
  dibuat_pada: string;
  halaman: number;
  lajur_per_halaman: number;
  angka_per_lajur: number;
  catatan?: string;
  sidik_jari_sha256: string;
  lajur: LajurKoran[];
}

/**
 * Soal yang boleh dikirim ke peserta. Sengaja tipe terpisah tanpa kolom kunci,
 * supaya kunci tidak ikut terkirim karena salah salin objek.
 */
export interface SoalPublik {
  nomor: number;
  gambar: string;
  /** Hanya TIU 6: jumlah butir B/S pada gambar ini. */
  jumlah_butir?: number;
}
