// Tipe data API admin (lihat backend/README.md). Tanpa kunci soal.
import type { JenisTes } from '../core/model';

export interface Interval {
  dikerjakan: number;
  benar: number;
  salah: number;
}

/** INDIVIDU = token per peserta; KELOMPOK = sesi serentak, satu token per tes dengan kuota. */
export type ModeSesi = 'INDIVIDU' | 'KELOMPOK';

export interface SesiRingkas {
  id: number;
  nama_sesi: string;
  mode: ModeSesi;
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
  /** null untuk peserta sesi serentak (masuk dengan nama saja). */
  email: string | null;
  kelompok_id: number | null;
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
  /** Hanya sesi serentak: penerima email token (PIC). */
  email_penerima: string | null;
  jadwal: JadwalTes[];
  ujian: UjianAdmin[];
  /** Hanya sesi serentak: satu token per tes. */
  kelompok: KelompokAdmin[];
}

export type StatusKelompok = 'BELUM_MULAI' | 'AKTIF' | 'PENUH' | 'SELESAI' | 'DICABUT';

export interface KelompokAdmin extends JadwalTes {
  kelompok_id: number;
  kuota: number;
  terpakai: number;
  status: StatusKelompok;
  email_dikirim_pada: string | null;
}

export const LABEL_STATUS_KELOMPOK: Record<StatusKelompok, string> = {
  BELUM_MULAI: 'Belum buka',
  AKTIF: 'Aktif',
  PENUH: 'Kuota penuh',
  SELESAI: 'Jadwal selesai',
  DICABUT: 'Dicabut',
};

export interface TokenKelompokBaru extends JadwalTes {
  kelompok_id: number;
  /** Token mentah: hanya ada di respons pembuatan, tidak pernah dari GET. */
  token: string;
}

/** Email token kelompok untuk penerima (PIC). */
export interface EmailKelompok {
  email: string;
  subjek: string;
  isi: string;
  mailto: string;
  mailtoTerlaluPanjang: boolean;
}

export interface PesertaKelompok {
  ujian_id: number;
  nama: string;
  masuk_pada: string;
  status: string;
  /** Ada peserta lain di token ini dengan nama sama (tidak ditolak, hanya ditandai). */
  nama_kembar: boolean;
  /** Waktu peserta memilih "Saya Setuju" dan versi teksnya. */
  persetujuan_pada: string | null;
  persetujuan_versi: string | null;
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
    mode: ModeSesi;
    /** Individu: jumlah token. Serentak: jumlah peserta yang sudah masuk (n dari kuota). */
    jumlah_peserta: number;
    kuota: number | null;
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
  mode: ModeSesi;
  email: string | null;
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
  /** Bukti persetujuan; null untuk ujian sebelum fitur persetujuan. */
  persetujuan_pada: string | null;
  persetujuan_versi: string | null;
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
