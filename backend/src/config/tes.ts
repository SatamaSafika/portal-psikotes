import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FOLDER_CONFIG } from './jalur.js';

export interface KonfigurasiTes {
  versi: string;
  tes: {
    TIU5: { jumlah_soal: number; jumlah_latihan: number; jumlah_pilihan: number };
    TIU6: { jumlah_soal: number; butir_per_soal: number; jumlah_latihan: number };
    KORAN: { halaman: number; lajur_per_halaman: number; angka_per_lajur: number; jumlah_latihan: number };
  };
}

const KOLOM: { [T in keyof KonfigurasiTes['tes']]: (keyof KonfigurasiTes['tes'][T])[] } = {
  TIU5: ['jumlah_soal', 'jumlah_latihan', 'jumlah_pilihan'],
  TIU6: ['jumlah_soal', 'butir_per_soal', 'jumlah_latihan'],
  KORAN: ['halaman', 'lajur_per_halaman', 'angka_per_lajur', 'jumlah_latihan'],
};

/** Mengembalikan daftar galat. Kosong berarti valid. */
export function validasiTes(data: unknown): string[] {
  const galat: string[] = [];
  const d = data as Partial<KonfigurasiTes> | null;
  if (typeof d?.versi !== 'string' || d.versi === '') galat.push('tes.json: versi wajib diisi');
  for (const [tes, kolom] of Object.entries(KOLOM)) {
    const bagian = (d?.tes as Record<string, Record<string, unknown>> | undefined)?.[tes];
    for (const k of kolom as string[]) {
      const nilai = bagian?.[k];
      if (!Number.isInteger(nilai) || (nilai as number) < 1) {
        galat.push(`tes.json: ${tes}.${k} harus bilangan bulat positif`);
      }
    }
  }
  return galat;
}

let tersimpan: KonfigurasiTes | null = null;

export function muatTes(): KonfigurasiTes {
  if (tersimpan) return tersimpan;
  const data: unknown = JSON.parse(readFileSync(join(FOLDER_CONFIG, 'tes.json'), 'utf8'));
  const galat = validasiTes(data);
  if (galat.length > 0) throw new Error(galat.join('\n'));
  tersimpan = data as KonfigurasiTes;
  return tersimpan;
}
