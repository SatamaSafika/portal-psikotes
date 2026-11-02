// Validasi masukan admin untuk sesi dan peserta. Fungsi murni, tanpa database.
import type { JenisTes } from './undangan.js';

export const DAFTAR_TES: JenisTes[] = ['TIU5', 'TIU6', 'KORAN'];
export const PESERTA_MAKS = 200;
// Sengaja sempit: aman dipakai langsung di tautan mailto tanpa encode.
const POLA_EMAIL = /^[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;
const POLA_JAM = /^([01]\d|2[0-3]):[0-5]\d$/;
const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

export interface PesertaMasukan {
  email: string;
  nama: string | null;
}

export interface SesiMasukan {
  nama_sesi: string;
  tanggal: string;
  waktu_buka: string;
  waktu_tutup: string;
  tes: JenisTes[];
  peserta: PesertaMasukan[];
}

function tanggalSah(t: string): boolean {
  if (!POLA_TANGGAL.test(t)) return false;
  const [y, m, d] = t.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Email diseragamkan ke huruf kecil. Galat menyebut urutan peserta, bukan alamatnya. */
export function validasiPeserta(data: unknown): { peserta: PesertaMasukan[]; galat: string[] } {
  const galat: string[] = [];
  const peserta: PesertaMasukan[] = [];
  if (!Array.isArray(data) || data.length === 0) return { peserta, galat: ['Daftar peserta wajib diisi'] };
  if (data.length > PESERTA_MAKS) return { peserta, galat: [`Maksimal ${PESERTA_MAKS} peserta per permintaan`] };

  const terlihat = new Set<string>();
  data.forEach((p: { email?: unknown; nama?: unknown } | null, i) => {
    const label = `Peserta ke-${i + 1}`;
    const email = typeof p?.email === 'string' ? p.email.trim().toLowerCase() : '';
    if (email.length > 150 || !POLA_EMAIL.test(email)) {
      galat.push(`${label}: email tidak valid`);
      return;
    }
    if (terlihat.has(email)) {
      galat.push(`${label}: email ganda dalam daftar`);
      return;
    }
    terlihat.add(email);
    let nama: string | null = null;
    if (p?.nama !== undefined && p.nama !== null && p.nama !== '') {
      if (typeof p.nama !== 'string' || p.nama.trim().length > 100) {
        galat.push(`${label}: nama maksimal 100 karakter`);
        return;
      }
      nama = p.nama.trim() || null;
    }
    peserta.push({ email, nama });
  });
  return { peserta, galat };
}

export function validasiSesi(data: unknown): { sesi: SesiMasukan | null; galat: string[] } {
  const galat: string[] = [];
  const d = (data ?? {}) as Record<string, unknown>;

  const nama = typeof d.nama_sesi === 'string' ? d.nama_sesi.trim() : '';
  if (nama === '' || nama.length > 100) galat.push('nama_sesi wajib diisi, maksimal 100 karakter');

  const tanggal = typeof d.tanggal === 'string' ? d.tanggal : '';
  if (!tanggalSah(tanggal)) galat.push('tanggal harus berbentuk YYYY-MM-DD');

  const buka = typeof d.waktu_buka === 'string' ? d.waktu_buka : '';
  const tutup = typeof d.waktu_tutup === 'string' ? d.waktu_tutup : '';
  if (!POLA_JAM.test(buka) || !POLA_JAM.test(tutup)) galat.push('waktu_buka dan waktu_tutup harus berbentuk HH:MM');
  else if (tutup <= buka) galat.push('waktu_tutup harus setelah waktu_buka');

  const tes = Array.isArray(d.tes) ? d.tes : [];
  if (tes.length === 0 || !tes.every((t) => DAFTAR_TES.includes(t as JenisTes)) || new Set(tes).size !== tes.length) {
    galat.push(`tes wajib berisi satu atau lebih dari ${DAFTAR_TES.join(', ')}, tanpa ganda`);
  }

  const p = validasiPeserta(d.peserta);
  galat.push(...p.galat);

  if (galat.length > 0) return { sesi: null, galat };
  return {
    // Urutan tes mengikuti urutan baku, bukan urutan kiriman.
    sesi: {
      nama_sesi: nama,
      tanggal,
      waktu_buka: buka,
      waktu_tutup: tutup,
      tes: DAFTAR_TES.filter((t) => tes.includes(t)),
      peserta: p.peserta,
    },
    galat,
  };
}
