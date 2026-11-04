// Validasi filter halaman hasil admin. Fungsi murni.
import type { JenisTes } from '../token/undangan.js';

const DAFTAR: JenisTes[] = ['TIU5', 'TIU6', 'KORAN'];

export interface FilterHasil {
  jenis: JenisTes | null;
  sesiId: number | null;
  /** YYYY-MM-DD, tanggal tes. */
  tanggal: string | null;
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
