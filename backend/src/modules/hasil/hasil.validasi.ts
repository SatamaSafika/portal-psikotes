// Validasi filter halaman hasil admin. Fungsi murni.
import type { JenisTes } from '../token/undangan.js';

const DAFTAR: JenisTes[] = ['TIU5', 'TIU6', 'KORAN'];

export interface FilterHasil {
  jenis: JenisTes | null;
  sesiId: number | null;
  /** YYYY-MM-DD, tanggal tes. */
  tanggal: string | null;
}

/** Batas catatan HC, sama dengan kolom CatatanHc NVARCHAR(2000) (db/13). */
export const CATATAN_MAKS = 2000;
/** Satu laporan memuat paling banyak tiga tes (TIU 5, TIU 6, Koran). */
const UJIAN_PER_CATATAN_MAKS = 3;

export interface MasukanCatatan {
  /** Baris tes milik satu peserta dalam satu sesi (satu Laporan Peserta). */
  ujianId: number[];
  /** Null = catatan dikosongkan. */
  catatan: string | null;
}

/**
 * Catatan / komentar HC dari halaman Review (revisi HC 19 November 2026). Spasi di awal dan akhir dibuang,
 * baris baru dipertahankan. Null bila bentuknya salah.
 */
export function validasiCatatan(data: unknown): MasukanCatatan | null {
  const d = (data ?? {}) as Record<string, unknown>;
  if (!Array.isArray(d.ujian_id) || d.ujian_id.length === 0 || d.ujian_id.length > UJIAN_PER_CATATAN_MAKS) return null;
  if (!d.ujian_id.every((x) => Number.isInteger(x) && (x as number) > 0 && (x as number) < 2 ** 31)) return null;
  if (typeof d.catatan !== 'string') return null;
  const catatan = d.catatan.trim();
  if (catatan.length > CATATAN_MAKS) return null;
  return { ujianId: [...new Set(d.ujian_id as number[])], catatan: catatan || null };
}

/** Null bila ada filter yang bentuknya salah. Filter kosong berarti tidak disaring. */
export function validasiFilterHasil(q: Record<string, unknown>): FilterHasil | null {
  const teks = (x: unknown): string => (typeof x === 'string' ? x.trim() : '');
  const jenis = teks(q.jenis);
  const sesi = teks(q.sesi);
  const tanggal = teks(q.tanggal);
  if (jenis && !DAFTAR.includes(jenis as JenisTes)) return null;
  if (sesi && !/^[1-9]\d{0,9}$/.test(sesi)) return null;
  if (tanggal && !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return null;
  return {
    jenis: jenis ? (jenis as JenisTes) : null,
    sesiId: sesi ? Number(sesi) : null,
    tanggal: tanggal || null,
  };
}
