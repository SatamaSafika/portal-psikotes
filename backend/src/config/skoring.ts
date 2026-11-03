import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FOLDER_CONFIG } from './jalur.js';

export type TesSkoring = 'TIU5' | 'TIU6' | 'KORAN';
const DAFTAR_TES: TesSkoring[] = ['TIU5', 'TIU6', 'KORAN'];

export interface KategoriSkor {
  min: number;
  /** Batas atas tidak termasuk. null = tanpa batas atas (hanya kategori terakhir). */
  maks_eksklusif: number | null;
  kategori: string;
  skor_akhir: number;
}

export interface KonfigurasiSkoring {
  versi: string;
  durasi_detik: Record<TesSkoring, number>;
  TIU5: { masukan: 'total_benar'; kategori_dan_skor: KategoriSkor[] };
  TIU6: { masukan: 'total_benar'; kategori_dan_skor: KategoriSkor[] };
  KORAN: {
    masukan: 'total_benar';
    pembagi: number;
    /** Panjang interval tracking Koran (detik). Jumlah interval = durasi / interval. */
    interval_detik: number;
    arah_pembulatan: 'setengah_ke_atas';
    ambang_total_benar?: number[];
    kategori_dan_skor: KategoriSkor[];
  };
  retensi: { jawaban_bulan: number; ujian_bulan: number };
}

const bulatPositif = (x: unknown): x is number => Number.isInteger(x) && (x as number) > 0;

function validasiKategori(tes: string, daftar: unknown, galat: string[]): void {
  if (!Array.isArray(daftar) || daftar.length === 0) {
    galat.push(`${tes}: kategori_dan_skor wajib berisi minimal satu kategori`);
    return;
  }
  daftar.forEach((k: Partial<KategoriSkor>, i) => {
    const label = `${tes} kategori ke-${i + 1}`;
    const terakhir = i === daftar.length - 1;
    if (!Number.isInteger(k.min) || (k.min as number) < 0) galat.push(`${label}: min harus bilangan bulat >= 0`);
    if (i === 0 && k.min !== 0) galat.push(`${label}: kategori pertama harus mulai dari 0`);
    if (terakhir) {
      if (k.maks_eksklusif !== null) galat.push(`${label}: kategori terakhir harus maks_eksklusif null`);
    } else {
      if (!Number.isInteger(k.maks_eksklusif)) {
        galat.push(`${label}: maks_eksklusif harus bilangan bulat (null hanya untuk kategori terakhir)`);
      } else if ((k.maks_eksklusif as number) <= (k.min as number)) {
        galat.push(`${label}: maks_eksklusif harus lebih besar dari min`);
      }
      const berikut = daftar[i + 1] as Partial<KategoriSkor>;
      if (k.maks_eksklusif !== berikut.min) {
        galat.push(`${label}: maks_eksklusif harus sama dengan min kategori berikutnya (ada celah atau tumpang tindih)`);
      }
    }
    if (typeof k.kategori !== 'string' || k.kategori.trim() === '') galat.push(`${label}: nama kategori wajib diisi`);
    if (!Number.isInteger(k.skor_akhir)) galat.push(`${label}: skor_akhir harus bilangan bulat`);
    if (i > 0 && (k.skor_akhir as number) <= (daftar[i - 1] as KategoriSkor).skor_akhir) {
      galat.push(`${label}: skor_akhir harus naik`);
    }
  });
}

/** Mengembalikan daftar galat. Kosong berarti valid. */
export function validasiSkoring(data: unknown): string[] {
  const galat: string[] = [];
  const d = data as Partial<KonfigurasiSkoring> & Record<string, unknown>;
  if (typeof d?.versi !== 'string' || d.versi === '') galat.push('versi wajib diisi');

  for (const tes of DAFTAR_TES) {
    if (!bulatPositif(d?.durasi_detik?.[tes])) galat.push(`durasi_detik.${tes} harus bilangan bulat positif`);
    const bagian = d?.[tes] as { masukan?: unknown; kategori_dan_skor?: unknown } | undefined;
    if (bagian?.masukan !== 'total_benar') galat.push(`${tes}: masukan harus "total_benar"`);
    validasiKategori(tes, bagian?.kategori_dan_skor, galat);
  }

  const koran = d?.KORAN;
  if (koran) {
    if (!bulatPositif(koran.pembagi)) galat.push('KORAN: pembagi harus bilangan bulat positif');
    if (koran.arah_pembulatan !== 'setengah_ke_atas') galat.push('KORAN: arah_pembulatan harus "setengah_ke_atas"');
    if (!bulatPositif(koran.interval_detik)) {
      galat.push('KORAN: interval_detik harus bilangan bulat positif');
    } else if (bulatPositif(d?.durasi_detik?.KORAN) && d.durasi_detik!.KORAN % koran.interval_detik !== 0) {
      galat.push('KORAN: durasi_detik.KORAN harus habis dibagi interval_detik');
    }
    // Ambang total benar opsional, tapi bila ada harus cocok dengan pembagi dan batas kategori.
    // N >= m  <=>  total >= ceil(p*m - p/2), karena N dibulatkan setengah ke atas.
    if (koran.ambang_total_benar !== undefined && bulatPositif(koran.pembagi) && Array.isArray(koran.kategori_dan_skor)) {
      const p = koran.pembagi;
      const harapan = koran.kategori_dan_skor.slice(1).map((k) => Math.ceil((2 * p * k.min - p) / 2));
      if (JSON.stringify(koran.ambang_total_benar) !== JSON.stringify(harapan)) {
        galat.push(`KORAN: ambang_total_benar tidak cocok dengan pembagi dan kategori (harusnya ${harapan.join(', ')})`);
      }
    }
  }

  const r = d?.retensi;
  if (!bulatPositif(r?.jawaban_bulan) || !bulatPositif(r?.ujian_bulan)) {
    galat.push('retensi: jawaban_bulan dan ujian_bulan harus bilangan bulat positif');
  } else if (r.jawaban_bulan > r.ujian_bulan) {
    galat.push('retensi: jawaban_bulan tidak boleh lebih lama dari ujian_bulan');
  }
  return galat;
}

let tersimpan: KonfigurasiSkoring | null = null;

/** Memuat dan memvalidasi config/skoring.json. Melempar galat bila tidak valid. */
export function muatSkoring(): KonfigurasiSkoring {
  if (tersimpan) return tersimpan;
  const data: unknown = JSON.parse(readFileSync(join(FOLDER_CONFIG, 'skoring.json'), 'utf8'));
  const galat = validasiSkoring(data);
  if (galat.length > 0) throw new Error(`skoring.json tidak valid:\n- ${galat.join('\n- ')}`);
  tersimpan = data as KonfigurasiSkoring;
  return tersimpan;
}
