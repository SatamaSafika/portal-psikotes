// Template undangan email: validasi, pengisian penanda, dan tautan mailto.
// Template bawaan (config/undangan.json) netral tanpa nama perusahaan. Suntingan HC tidak dibatasi isinya,
// kecuali wajib memuat {daftar_token} dan hanya memakai penanda yang dikenal.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FOLDER_CONFIG } from '../../config/jalur.js';

export type JenisTes = 'TIU5' | 'TIU6' | 'KORAN';

export const LABEL_TES: Record<JenisTes, string> = {
  TIU5: 'TIU 5',
  TIU6: 'TIU 6',
  KORAN: 'Tes Koran',
};

export const PENANDA = ['nama', 'tanggal', 'jam_buka', 'jam_tutup', 'tautan', 'daftar_token'] as const;
export const SUBJEK_MAKS = 200;
export const ISI_MAKS = 4000;
/** Sebagian aplikasi email memotong tautan mailto yang lebih panjang dari ini. */
export const MAILTO_MAKS = 2000;

export interface Template {
  subjek: string;
  isi: string;
}

/** Mengembalikan daftar galat. Kosong berarti template boleh dipakai. */
export function validasiTemplate(t: Partial<Template> | null | undefined): string[] {
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
    (p) => !(PENANDA as readonly string[]).includes(p),
  );
  if (asing.length > 0) galat.push(`Penanda tidak dikenal: ${asing.map((p) => `{${p}}`).join(', ')}`);
  return galat;
}

let bawaan: Template | null = null;

export function templateBawaan(): Template {
  if (bawaan) return bawaan;
  const data = JSON.parse(readFileSync(join(FOLDER_CONFIG, 'undangan.json'), 'utf8')) as Partial<Template>;
  const galat = validasiTemplate(data);
  if (galat.length > 0) throw new Error(`undangan.json tidak valid: ${galat.join('; ')}`);
  bawaan = { subjek: data.subjek!, isi: data.isi! };
  return bawaan;
}

export interface DataUndangan {
  email: string;
  nama: string | null;
  /** YYYY-MM-DD */
  tanggal: string;
  /** HH:MM */
  jamBuka: string;
  jamTutup: string;
  portalUrl: string;
  token: { tes: JenisTes; token: string }[];
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

export function isiUndangan(template: Template, data: DataUndangan): Undangan {
  const lebar = Math.max(...data.token.map((x) => LABEL_TES[x.tes].length));
  const nilai: Record<(typeof PENANDA)[number], string> = {
    nama: data.nama?.trim() || 'Peserta',
    tanggal: formatTanggal(data.tanggal),
    jam_buka: data.jamBuka,
    jam_tutup: data.jamTutup,
    tautan: `${data.portalUrl}/masuk`,
    daftar_token: data.token.map((x) => `${LABEL_TES[x.tes].padEnd(lebar)} : ${x.token}`).join('\n'),
  };
  // Satu kali lewat, jadi nilai yang kebetulan berisi "{...}" tidak diganti lagi.
  const ganti = (teks: string): string =>
    teks.replace(/\{([^{}\s]+)\}/g, (asli, p: string) => (p in nilai ? nilai[p as keyof typeof nilai] : asli));

  const subjek = ganti(template.subjek);
  const isi = ganti(template.isi).replace(/\r?\n/g, '\r\n');
  const mailto = `mailto:${data.email}?subject=${encodeURIComponent(subjek)}&body=${encodeURIComponent(isi)}`;
  return { email: data.email, subjek, isi, mailto, mailtoTerlaluPanjang: mailto.length > MAILTO_MAKS };
}
