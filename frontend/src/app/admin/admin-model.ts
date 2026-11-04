// Tipe data API admin (lihat backend/README.md). Tanpa kunci soal.
import type { JenisTes } from '../core/model';

export interface Interval {
  dikerjakan: number;
  benar: number;
  salah: number;
}

export interface SesiRingkas {
  id: number;
  nama_sesi: string;
  tanggal: string;
  waktu_buka: string;
  waktu_tutup: string;
  daftar_tes: string;
  bank_versi: string;
  jumlah_peserta: number;
  jumlah_token: number;
  belum_dipakai: number;
  berjalan: number;
  selesai: number;
  dicabut: number;
}

export interface JadwalTes {
  tes: JenisTes;
  tanggal: string;
  waktu_buka: string;
  waktu_tutup: string;
}

export interface UjianAdmin {
  ujian_id: number;
  email: string;
  nama: string | null;
  jenis_tes: JenisTes;
  tanggal: string;
  waktu_buka: string;
  waktu_tutup: string;
  status: string;
  mulai_pada: string | null;
  selesai_pada: string | null;
  jumlah_benar: number | null;
  jumlah_salah: number | null;
  jumlah_dijawab: number | null;
  n_koran: number | null;
  kategori: string | null;
  skor_akhir: number | null;
  ringkasan_interval: Interval[] | null;
  aturan_versi: string | null;
  undangan_dikirim_pada: string | null;
}

export interface DetailSesi extends SesiRingkas {
  template_subjek: string;
  template_isi: string;
  jadwal: JadwalTes[];
  ujian: UjianAdmin[];
}

export interface TokenPeserta extends JadwalTes {
  ujian_id: number;
  /** Token mentah: hanya ada di respons pembuatan, tidak pernah dari GET. */
  token: string;
}

export interface Undangan {
  email: string;
  nama: string | null;
  subjek: string;
  isi: string;
  mailto: string;
  mailtoTerlaluPanjang: boolean;
  token: TokenPeserta[];
}

export interface Template {
  subjek: string;
  isi: string;
}

export interface Ringkasan {
  selesai_hari_ini: number;
  token_aktif: number;
  sesi_aktif: number;
  jadwal_hari_ini: {
    sesi_id: number;
    nama_sesi: string;
    jenis_tes: JenisTes;
    jumlah_peserta: number;
    waktu_buka: string;
    waktu_tutup: string;
    status: 'BELUM_MULAI' | 'BERJALAN' | 'SELESAI';
  }[];
}

export interface BarisHasil {
  ujian_id: number;
  sesi_id: number | null;
  nama_sesi: string;
  tanggal: string;
  jenis_tes: JenisTes;
  email: string;
  nama: string | null;
  status: string;
  selesai_pada: string | null;
  jumlah_benar: number | null;
  jumlah_salah: number | null;
  jumlah_dijawab: number | null;
  n_koran: number | null;
  kategori: string | null;
  skor_akhir: number | null;
  ringkasan_interval: Interval[] | null;
}

export interface JawabanNomor {
  nomor: number;
  jawaban: string | null;
  /** null = kosong. Kunci tidak pernah dikirim. */
  benar: boolean | null;
  waktu_ms: number | null;
}

export const LABEL_STATUS: Record<string, string> = {
  BELUM_DIPAKAI: 'Belum dipakai',
  BERJALAN: 'Sedang dikerjakan',
  DIKIRIM: 'Selesai',
  WAKTU_HABIS: 'Selesai (waktu habis)',
  DICABUT: 'Dicabut',
  KEDALUWARSA: 'Kedaluwarsa',
};
