// Latihan: soal latihan dikirim tanpa kunci. Kunci (dan penjelasan, khusus TIU 5) baru dikirim
// setelah peserta menjawab latihan itu (keputusan pemilik proyek, 3 November 2026).
import type { JenisTes } from '../token/undangan.js';
import type { BankTermuat } from './bank.js';

export interface LatihanPublik {
  instruksi: string | null;
  latihan: { nomor: number; gambar: string; jumlah_butir?: number }[];
}

export function latihanPublik(bank: BankTermuat, jenis: JenisTes): LatihanPublik {
  if (jenis === 'TIU5') {
    const b = bank.soal.TIU5;
    return { instruksi: b.instruksi, latihan: b.latihan.map(({ nomor, gambar }) => ({ nomor, gambar })) };
  }
  if (jenis === 'TIU6') {
    const b = bank.soal.TIU6;
    return {
      instruksi: b.instruksi,
      latihan: b.latihan.map(({ nomor, gambar, butir }) => ({ nomor, gambar, jumlah_butir: butir.length })),
    };
  }
  // Latihan Koran belum punya bahan (Part 7).
  return { instruksi: null, latihan: [] };
}

export type HasilPeriksa =
  | { benar: boolean; kunci: string; penjelasan?: string }
  | { butir: { butir: number; benar: boolean; kunci: string }[] };

/**
 * Memeriksa jawaban latihan. Null bila nomor atau bentuk jawaban tidak sah
 * (jawaban kosong tidak diperiksa, supaya kunci tidak bisa diintip tanpa menjawab).
 */
export function periksaLatihan(bank: BankTermuat, jenis: JenisTes, nomor: unknown, jawaban: unknown): HasilPeriksa | null {
  if (jenis === 'TIU5') {
    const item = bank.soal.TIU5.latihan.find((l) => l.nomor === nomor);
    if (!item || typeof jawaban !== 'string' || !/^[1-9]$/.test(jawaban)) return null;
    const kunci = String(item.kunci);
    return { benar: jawaban === kunci, kunci, ...(item.penjelasan ? { penjelasan: item.penjelasan } : {}) };
  }
  if (jenis === 'TIU6') {
    const item = bank.soal.TIU6.latihan.find((l) => l.nomor === nomor);
    if (!item || !Array.isArray(jawaban) || jawaban.length !== item.butir.length) return null;
    if (!jawaban.every((j) => j === 'B' || j === 'S')) return null;
    return { butir: item.butir.map((b, i) => ({ butir: b.butir, benar: jawaban[i] === b.kunci, kunci: b.kunci })) };
  }
  return null;
}
