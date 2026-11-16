// Template undangan email: validasi, pengisian penanda, dan tautan mailto.
// Template bawaan (config/undangan.json) netral tanpa nama perusahaan. Suntingan HC tidak dibatasi isinya,
// kecuali wajib memuat {daftar_token} dan hanya memakai penanda yang dikenal.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FOLDER_CONFIG } from '../../config/jalur.js';

export type JenisTes = 'TIU5' | 'TIU6' | 'KORAN';

/** Nama tes untuk HC (dashboard, laporan). Tidak dipakai di email yang dibaca peserta atau PIC. */
export const LABEL_TES: Record<JenisTes, string> = {
  TIU5: 'TIU 5',
  TIU6: 'TIU 6',
  KORAN: 'Tes Koran',
};

/**
 * Nama tes di email undangan peserta dan email token kelompok (revisi HC 10 November 2026): jenis tes
 * dirahasiakan dari peserta, sama dengan kartu di portal peserta (frontend LABEL_TES_PESERTA).
 */
export const LABEL_TES_PESERTA: Record<JenisTes, string> = {
  KORAN: 'Tes 1',
  TIU5: 'Tes 2',
  TIU6: 'Tes 3',
};

/** Urutan blok token di email, sama dengan urutan kartu di portal peserta. */
const URUTAN_PESERTA: JenisTes[] = ['KORAN', 'TIU5', 'TIU6'];

/** Jadwal tiap tes berbeda, jadi tanggal dan jam ada di dalam {daftar_token}, bukan penanda sendiri. */
export const PENANDA = ['nama', 'tautan', 'daftar_token'] as const;
/** Email token kelompok dikirim ke penerima (PIC), bukan ke peserta, jadi tanpa {nama}. */
export const PENANDA_KELOMPOK = ['nama_sesi', 'kuota', 'tautan', 'daftar_token'] as const;

export type ModeSesi = 'INDIVIDU' | 'KELOMPOK';
const PENANDA_MODE: Record<ModeSesi, readonly string[]> = { INDIVIDU: PENANDA, KELOMPOK: PENANDA_KELOMPOK };
export const SUBJEK_MAKS = 200;
export const ISI_MAKS = 4000;
/** Sebagian aplikasi email memotong tautan mailto yang lebih panjang dari ini. */
export const MAILTO_MAKS = 2000;

export interface Template {
  subjek: string;
  isi: string;
}

/**
 * Mengembalikan daftar galat. Kosong berarti template boleh dipakai.
 * Setiap mode punya daftar penanda sendiri: {nama} hanya individu, {nama_sesi} dan {kuota} hanya kelompok.
 */
export function validasiTemplate(t: Partial<Template> | null | undefined, mode: ModeSesi = 'INDIVIDU'): string[] {
  const galat: string[] = [];
  if (typeof t?.subjek !== 'string' || t.subjek.trim() === '') galat.push('Subjek wajib diisi');
  else if (t.subjek.length > SUBJEK_MAKS) galat.push(`Subjek maksimal ${SUBJEK_MAKS} karakter`);
  else if (/[\r\n]/.test(t.subjek)) galat.push('Subjek tidak boleh berisi baris baru');

  if (typeof t?.isi !== 'string' || t.isi.trim() === '') galat.push('Isi wajib diisi');
  else if (t.isi.length > ISI_MAKS) galat.push(`Isi maksimal ${ISI_MAKS} karakter`);
  else if (!t.isi.includes('{daftar_token}')) galat.push('Isi wajib memuat {daftar_token}');

  // Penanda yang salah ketik (misalnya {nma}) akan terkirim apa adanya, jadi ditolak.
  const teks = `${t?.subjek ?? ''}\n${t?.isi ?? ''}`;
  const asing = [...new Set([...teks.matchAll(/\{([^{}\s]+)\}/g)].map((m) => m[1]))].filter(
    (p) => !PENANDA_MODE[mode].includes(p),
  );
  if (asing.length > 0) galat.push(`Penanda tidak dikenal: ${asing.map((p) => `{${p}}`).join(', ')}`);
  return galat;
}

const BERKAS_BAWAAN: Record<ModeSesi, string> = { INDIVIDU: 'undangan.json', KELOMPOK: 'undangan-kelompok.json' };
const bawaan: Partial<Record<ModeSesi, Template>> = {};

/** Template bawaan per mode (config/undangan.json dan config/undangan-kelompok.json), netral tanpa nama perusahaan. */
export function templateBawaan(mode: ModeSesi = 'INDIVIDU'): Template {
  const ada = bawaan[mode];
  if (ada) return ada;
  const berkas = BERKAS_BAWAAN[mode];
  const data = JSON.parse(readFileSync(join(FOLDER_CONFIG, berkas), 'utf8')) as Partial<Template>;
  const galat = validasiTemplate(data, mode);
  if (galat.length > 0) throw new Error(`${berkas} tidak valid: ${galat.join('; ')}`);
  const t = { subjek: data.subjek!, isi: data.isi! };
  bawaan[mode] = t;
  return t;
}

export interface TokenBerjadwal {
  tes: JenisTes;
  token: string;
  /** YYYY-MM-DD */
  tanggal: string;
  /** HH:MM */
  waktu_buka: string;
  waktu_tutup: string;
}

export interface DataUndangan {
  email: string;
  nama: string | null;
  portalUrl: string;
  token: TokenBerjadwal[];
}

export interface Undangan {
  email: string;
  subjek: string;
  isi: string;
  mailto: string;
  /** true bila tautan mailto mungkin terpotong di sebagian aplikasi email. */
  mailtoTerlaluPanjang: boolean;
}

/** "2026-11-10" menjadi "Selasa, 10 November 2026". */
export function formatTanggal(tanggal: string): string {
  const [t, b, h] = tanggal.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(t, b - 1, h)));
}

/**
 * Satu blok per tes: nama samaran (Tes 1-3) dan jadwal, lalu token di baris sendiri, urut Tes 1, 2, 3.
 * Tanpa perataan spasi, karena Outlook merapatkan spasi ganda.
 */
export function daftarToken(token: TokenBerjadwal[]): string {
  return [...token]
    .sort((a, b) => URUTAN_PESERTA.indexOf(a.tes) - URUTAN_PESERTA.indexOf(b.tes))
    .map((x) => `${LABEL_TES_PESERTA[x.tes]} - ${formatTanggal(x.tanggal)}, pukul ${x.waktu_buka}-${x.waktu_tutup}\nToken: ${x.token}`)
    .join('\n\n');
}

export function isiUndangan(template: Template, data: DataUndangan): Undangan {
  const nilai: Record<(typeof PENANDA)[number], string> = {
    nama: data.nama?.trim() || 'Peserta',
    tautan: `${data.portalUrl}/masuk`,
    daftar_token: daftarToken(data.token),
  };
  // Satu kali lewat, jadi nilai yang kebetulan berisi "{...}" tidak diganti lagi.
  const ganti = (teks: string): string =>
    teks.replace(/\{([^{}\s]+)\}/g, (asli, p: string) => (p in nilai ? nilai[p as keyof typeof nilai] : asli));

  return susunEmail(data.email, template, ganti);
}

function susunEmail(email: string, template: Template, ganti: (teks: string) => string): Undangan {
  const subjek = ganti(template.subjek);
  const isi = ganti(template.isi).replace(/\r?\n/g, '\r\n');
  const mailto = `mailto:${email}?subject=${encodeURIComponent(subjek)}&body=${encodeURIComponent(isi)}`;
  return { email, subjek, isi, mailto, mailtoTerlaluPanjang: mailto.length > MAILTO_MAKS };
}

export interface DataEmailKelompok {
  /** Penerima token (pengawas, guru, atau panitia). */
  email: string;
  namaSesi: string;
  kuota: number;
  portalUrl: string;
  token: TokenBerjadwal[];
}

/** Email token kelompok untuk penerima: satu email berisi token semua tes, jadwal, dan kuota. */
export function isiEmailKelompok(template: Template, data: DataEmailKelompok): Undangan {
  const nilai: Record<(typeof PENANDA_KELOMPOK)[number], string> = {
    nama_sesi: data.namaSesi,
    kuota: String(data.kuota),
    // Peserta memilih tes di halaman awal, lalu memasukkan token.
    tautan: data.portalUrl,
    daftar_token: daftarToken(data.token),
  };
  const ganti = (teks: string): string =>
    teks.replace(/\{([^{}\s]+)\}/g, (asli, p: string) => (p in nilai ? nilai[p as keyof typeof nilai] : asli));
  return susunEmail(data.email, template, ganti);
}
