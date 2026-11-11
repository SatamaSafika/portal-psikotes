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

/** Jadwal satu tes dalam sesi. Sama untuk semua peserta sesi itu. */
export interface JadwalTes {
  tes: JenisTes;
  /** YYYY-MM-DD */
  tanggal: string;
  /** HH:MM */
  waktu_buka: string;
  waktu_tutup: string;
}

export interface SesiMasukan {
  nama_sesi: string;
  /** Urut baku TIU5, TIU6, KORAN. */
  jadwal: JadwalTes[];
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

export interface MasukanMasuk {
  email: string;
  /** Token yang sudah dinormalisasi. */
  token: string;
  /** Tes yang dipilih peserta di halaman awal. Null = tidak dicek (kompatibel dengan klien lama). */
  jenis_tes: JenisTes | null;
  /** Nama yang diketik peserta. Disimpan hanya bila HC belum mengisi nama. */
  nama: string | null;
}

/**
 * Masukan halaman verifikasi. Null bila bentuknya pasti salah; pemanggil membalas pesan gagal yang seragam.
 * normalisasi: fungsi penyeragam token (disuntikkan supaya modul ini tetap tanpa ketergantungan).
 */
export function validasiMasuk(data: unknown, normalisasi: (t: string) => string | null): MasukanMasuk | null {
  const d = (data ?? {}) as Record<string, unknown>;
  const email = validasiPeserta([{ email: d.email }]).peserta[0]?.email;
  const token = typeof d.token === 'string' && d.token.length <= 64 ? normalisasi(d.token) : null;
  if (!email || !token) return null;

  let jenis: JenisTes | null = null;
  if (d.jenis_tes !== undefined && d.jenis_tes !== null) {
    if (!DAFTAR_TES.includes(d.jenis_tes as JenisTes)) return null;
    jenis = d.jenis_tes as JenisTes;
  }
  let nama: string | null = null;
  if (typeof d.nama === 'string' && d.nama.trim() !== '') {
    if (d.nama.trim().length > 100) return null;
    nama = d.nama.trim();
  }
  return { email, token, jenis_tes: jenis, nama };
}

// ---------- sesi serentak / kelompok (Part 8b) ----------

export const KUOTA_MAKS = 1000;
export const NAMA_MIN = 2;
export const NAMA_MAKS = 100;

/** Nama peserta kelompok: spasi dirapikan, 2 sampai 100 karakter. Null bila tidak sah. */
export function validasiNama(x: unknown): string | null {
  if (typeof x !== 'string') return null;
  const nama = x.trim().replace(/\s+/g, ' ');
  return nama.length >= NAMA_MIN && nama.length <= NAMA_MAKS ? nama : null;
}

export interface SesiKelompokMasukan {
  nama_sesi: string;
  kuota: number;
  email_penerima: string;
  /** 1 sampai 3 tes, urut baku. */
  jadwal: JadwalTes[];
}

export function validasiSesiKelompok(data: unknown): { sesi: SesiKelompokMasukan | null; galat: string[] } {
  const galat: string[] = [];
  const d = (data ?? {}) as Record<string, unknown>;

  const nama = typeof d.nama_sesi === 'string' ? d.nama_sesi.trim() : '';
  if (nama === '' || nama.length > 100) galat.push('nama_sesi wajib diisi, maksimal 100 karakter');

  const kuota = d.kuota;
  if (!Number.isInteger(kuota) || (kuota as number) < 1 || (kuota as number) > KUOTA_MAKS) {
    galat.push(`kuota harus bilangan bulat 1 sampai ${KUOTA_MAKS}`);
  }

  const email = validasiPeserta([{ email: d.email_penerima }]).peserta[0]?.email;
  if (!email) galat.push('email_penerima tidak valid');

  const j = validasiJadwal(d.jadwal);
  galat.push(...j.galat);

  if (galat.length > 0) return { sesi: null, galat };
  return { sesi: { nama_sesi: nama, kuota: kuota as number, email_penerima: email!, jadwal: j.jadwal }, galat };
}

/** Langkah 1 verifikasi: token apa saja (individu atau kelompok) dan tes yang dipilih. */
export function validasiCekToken(
  data: unknown,
  normalisasi: (t: string) => { jenis: 'INDIVIDU' | 'KELOMPOK'; token: string } | null,
): { jenis: 'INDIVIDU' | 'KELOMPOK'; token: string; jenis_tes: JenisTes } | null {
  const d = (data ?? {}) as Record<string, unknown>;
  if (!DAFTAR_TES.includes(d.jenis_tes as JenisTes) || typeof d.token !== 'string') return null;
  const t = normalisasi(d.token);
  return t ? { ...t, jenis_tes: d.jenis_tes as JenisTes } : null;
}

/** Langkah 2 mode kelompok: token kelompok, tes yang dipilih, dan nama. */
export function validasiMasukKelompok(
  data: unknown,
  normalisasi: (t: string) => { jenis: 'INDIVIDU' | 'KELOMPOK'; token: string } | null,
): { token: string; jenis_tes: JenisTes; nama: string } | null {
  const t = validasiCekToken(data, normalisasi);
  const nama = validasiNama((data as Record<string, unknown> | null)?.nama);
  if (!t || t.jenis !== 'KELOMPOK' || !nama) return null;
  return { token: t.token, jenis_tes: t.jenis_tes, nama };
}

export function validasiJadwal(data: unknown): { jadwal: JadwalTes[]; galat: string[] } {
  const galat: string[] = [];
  if (!Array.isArray(data) || data.length === 0) {
    return { jadwal: [], galat: [`jadwal wajib berisi satu atau lebih tes (${DAFTAR_TES.join(', ')})`] };
  }
  const jadwal: JadwalTes[] = [];
  const terlihat = new Set<string>();
  data.forEach((j: Record<string, unknown> | null, i) => {
    const label = `jadwal ke-${i + 1}`;
    const tes = j?.tes as JenisTes;
    if (!DAFTAR_TES.includes(tes)) {
      galat.push(`${label}: tes harus salah satu dari ${DAFTAR_TES.join(', ')}`);
      return;
    }
    if (terlihat.has(tes)) {
      galat.push(`${label}: tes ${tes} ganda`);
      return;
    }
    terlihat.add(tes);
    const tanggal = typeof j?.tanggal === 'string' ? j.tanggal : '';
    const buka = typeof j?.waktu_buka === 'string' ? j.waktu_buka : '';
    const tutup = typeof j?.waktu_tutup === 'string' ? j.waktu_tutup : '';
    if (!tanggalSah(tanggal)) galat.push(`${label} (${tes}): tanggal harus berbentuk YYYY-MM-DD`);
    else if (!POLA_JAM.test(buka) || !POLA_JAM.test(tutup)) galat.push(`${label} (${tes}): waktu_buka dan waktu_tutup harus berbentuk HH:MM`);
    else if (tutup <= buka) galat.push(`${label} (${tes}): waktu_tutup harus setelah waktu_buka`);
    else jadwal.push({ tes, tanggal, waktu_buka: buka, waktu_tutup: tutup });
  });
  // Urutan mengikuti urutan baku, bukan urutan kiriman.
  jadwal.sort((a, b) => DAFTAR_TES.indexOf(a.tes) - DAFTAR_TES.indexOf(b.tes));
  return { jadwal, galat };
}

/**
 * Ringkasan untuk kolom wajib di tabel sesi: hari pertama dan rentang jam tes di hari itu.
 * Jadwal sebenarnya tersimpan per token di tabel ujian.
 */
export function ringkasJadwal(jadwal: JadwalTes[]): { tanggal: string; waktu_buka: string; waktu_tutup: string } {
  const tanggal = jadwal.map((j) => j.tanggal).sort()[0];
  const hariPertama = jadwal.filter((j) => j.tanggal === tanggal);
  return {
    tanggal,
    waktu_buka: hariPertama.map((j) => j.waktu_buka).sort()[0],
    waktu_tutup: hariPertama.map((j) => j.waktu_tutup).sort().at(-1)!,
  };
}

export function validasiSesi(data: unknown): { sesi: SesiMasukan | null; galat: string[] } {
  const galat: string[] = [];
  const d = (data ?? {}) as Record<string, unknown>;

  const nama = typeof d.nama_sesi === 'string' ? d.nama_sesi.trim() : '';
  if (nama === '' || nama.length > 100) galat.push('nama_sesi wajib diisi, maksimal 100 karakter');

  const j = validasiJadwal(d.jadwal);
  galat.push(...j.galat);
  const p = validasiPeserta(d.peserta);
  galat.push(...p.galat);

  if (galat.length > 0) return { sesi: null, galat };
  return { sesi: { nama_sesi: nama, jadwal: j.jadwal, peserta: p.peserta }, galat };
}
