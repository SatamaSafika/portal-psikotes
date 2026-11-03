import { muatSkoring, type TesSkoring } from './skoring.js';

/**
 * Durasi uji coba: DURASI_UJI_DETIK di .env memperpendek durasi semua tes, supaya waktu habis
 * bisa diuji tanpa menunggu 10 menit. Diabaikan bila NODE_ENV=production.
 */
export function durasiUji(): number | null {
  const nilai = process.env.DURASI_UJI_DETIK;
  if (!nilai || process.env.NODE_ENV === 'production') return null;
  const n = Number(nilai);
  if (!Number.isInteger(n) || n <= 0) throw new Error('DURASI_UJI_DETIK harus bilangan bulat positif');
  return n;
}

/** Durasi tes dalam detik: dari skoring.json, atau durasi uji coba di luar produksi. */
export function durasiDetik(jenis: TesSkoring): number {
  return durasiUji() ?? muatSkoring().durasi_detik[jenis];
}
