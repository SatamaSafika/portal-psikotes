// Teks persetujuan peserta (config/persetujuan.json). Teks dari HC/legal, bukan dari kode; versi ikut disimpan
// di catatan ujian sebagai bukti teks mana yang disetujui. Ubah teks = naikkan "versi".
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FOLDER_CONFIG } from '../../config/jalur.js';

export interface Persetujuan {
  versi: string;
  judul: string;
  pembuka: string;
  butir: string[];
  penutup: string;
  label_setuju: string;
  label_tidak_setuju: string;
}

const teksSah = (t: unknown, maks: number): t is string => typeof t === 'string' && t.trim() !== '' && t.length <= maks;

/** Galat konfigurasi persetujuan. Kosong berarti sah. versi maksimal 20 karakter (kolom persetujuan_versi). */
export function validasiPersetujuan(data: unknown): string[] {
  const d = (data ?? {}) as Record<string, unknown>;
  const galat: string[] = [];
  if (typeof d.versi !== 'string' || !/^[A-Za-z0-9._-]{1,20}$/.test(d.versi)) galat.push('versi wajib, 1-20 karakter huruf, angka, titik, garis');
  for (const k of ['judul', 'pembuka', 'penutup', 'label_setuju', 'label_tidak_setuju'] as const) {
    if (!teksSah(d[k], 1000)) galat.push(`${k} wajib diisi`);
  }
  if (!Array.isArray(d.butir) || d.butir.length === 0 || d.butir.length > 20 || !d.butir.every((b) => teksSah(b, 1000))) {
    galat.push('butir wajib berisi 1 sampai 20 teks');
  }
  return galat;
}

let cache: Persetujuan | null = null;

export function muatPersetujuan(): Persetujuan {
  if (cache) return cache;
  const data: unknown = JSON.parse(readFileSync(join(FOLDER_CONFIG, 'persetujuan.json'), 'utf8'));
  const galat = validasiPersetujuan(data);
  if (galat.length > 0) throw new Error(`persetujuan.json tidak valid: ${galat.join('; ')}`);
  cache = data as Persetujuan;
  return cache;
}

/**
 * Hasil cek persetujuan pada permintaan masuk:
 * - 'SAH': setuju = true dan versi sama dengan teks yang berlaku.
 * - 'BEDA_VERSI': setuju, tetapi teks di layar peserta sudah usang (teks diubah saat halaman terbuka).
 * - 'TIDAK': tidak setuju atau tidak dikirim.
 */
export function cekPersetujuan(data: unknown, versiBerlaku: string): 'SAH' | 'BEDA_VERSI' | 'TIDAK' {
  const d = (data ?? {}) as Record<string, unknown>;
  if (d.setuju !== true) return 'TIDAK';
  return d.persetujuan_versi === versiBerlaku ? 'SAH' : 'BEDA_VERSI';
}
