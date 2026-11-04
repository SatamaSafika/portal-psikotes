// Logika murni dashboard HC: daftar peserta dari teks, skala grafik 22 interval, dan CSV untuk Excel.
import type { Interval } from './admin-model';

// ---------- daftar peserta ----------

// Sama sempitnya dengan backend (aman untuk mailto).
const POLA_EMAIL = /^[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;

/**
 * Satu peserta per baris: "email" atau "email, nama" (pemisah koma, titik koma, atau tab).
 * Baris kosong dilewati. Galat menyebut nomor baris.
 */
export function uraiPeserta(teks: string): { peserta: { email: string; nama: string | null }[]; galat: string[] } {
  const peserta: { email: string; nama: string | null }[] = [];
  const galat: string[] = [];
  const terlihat = new Set<string>();
  teks.split(/\r?\n/).forEach((baris, i) => {
    const b = baris.trim();
    if (!b) return;
    const [emailMentah, ...sisa] = b.split(/[,;\t]/);
    const email = emailMentah.trim().toLowerCase();
    const nama = sisa.join(' ').trim() || null;
    if (!POLA_EMAIL.test(email) || email.length > 150) {
      galat.push(`Baris ${i + 1}: email tidak valid`);
    } else if (terlihat.has(email)) {
      galat.push(`Baris ${i + 1}: email ganda`);
    } else if (nama && nama.length > 100) {
      galat.push(`Baris ${i + 1}: nama maksimal 100 karakter`);
    } else {
      terlihat.add(email);
      peserta.push({ email, nama });
    }
  });
  return { peserta, galat };
}

// ---------- sesi serentak ----------

/** Sama dengan batas backend (keputusan pemilik proyek, 4 November 2026). */
export const KUOTA_MAKS = 1000;

/** Kuota dari isian teks: bilangan bulat 1 sampai KUOTA_MAKS, selain itu null. */
export function uraiKuota(teks: string): number | null {
  const t = teks.trim();
  if (!/^\d{1,4}$/.test(t)) return null;
  const n = Number(t);
  return n >= 1 && n <= KUOTA_MAKS ? n : null;
}

/** Satu email penerima (huruf kecil), atau null bila tidak valid. */
export function uraiEmail(teks: string): string | null {
  const e = teks.trim().toLowerCase();
  return POLA_EMAIL.test(e) && e.length <= 150 ? e : null;
}

/** Lebar batang "n dari X" dalam persen, 0 sampai 100. */
export function persenKuota(terpakai: number, kuota: number): number {
  if (kuota <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((terpakai / kuota) * 100)));
}

// ---------- grafik ----------

export interface UkuranGrafik {
  lebar: number;
  tinggi: number;
  kiri: number;
  kanan: number;
  atas: number;
  bawah: number;
}

export const UKURAN_GRAFIK: UkuranGrafik = { lebar: 760, tinggi: 260, kiri: 44, kanan: 16, atas: 16, bawah: 40 };

export interface SkalaGrafik {
  maks: number;
  x: number[];
  garis: Record<keyof Interval, string>;
  titik: Record<keyof Interval, { x: number; y: number }[]>;
  gridY: { y: number; label: number }[];
  dasarY: number;
}

/** Batas atas sumbu y: kelipatan 4 terdekat ke atas (minimal 4), supaya 4 garis bantu berlabel bilangan bulat. */
export function batasAtas(nilaiMaks: number): number {
  return Math.max(4, Math.ceil(nilaiMaks / 4) * 4);
}

/** Posisi titik dan garis untuk grafik garis tiga seri (dikerjakan, benar, salah). */
export function skalaGrafik(interval: Interval[], u: UkuranGrafik = UKURAN_GRAFIK): SkalaGrafik {
  const maks = batasAtas(Math.max(0, ...interval.map((x) => x.dikerjakan)));
  const lebarIsi = u.lebar - u.kiri - u.kanan;
  const dasarY = u.tinggi - u.bawah;
  const tinggiIsi = dasarY - u.atas;
  const langkah = interval.length > 1 ? lebarIsi / (interval.length - 1) : 0;
  const x = interval.map((_, i) => +(u.kiri + i * langkah).toFixed(1));
  const y = (v: number): number => +(dasarY - (v / maks) * tinggiIsi).toFixed(1);

  const seri = (k: keyof Interval) => interval.map((iv, i) => ({ x: x[i], y: y(iv[k]) }));
  const titik = { dikerjakan: seri('dikerjakan'), benar: seri('benar'), salah: seri('salah') };
  const garis = {
    dikerjakan: titik.dikerjakan.map((t) => `${t.x},${t.y}`).join(' '),
    benar: titik.benar.map((t) => `${t.x},${t.y}`).join(' '),
    salah: titik.salah.map((t) => `${t.x},${t.y}`).join(' '),
  };
  const gridY = [0, 1, 2, 3, 4].map((k) => ({ y: y((maks / 4) * k), label: (maks / 4) * k }));
  return { maks, x, garis, titik, gridY, dasarY };
}

// ---------- CSV ----------

/**
 * CSV untuk Excel: BOM UTF-8, pemisah titik koma (Excel dengan pengaturan Indonesia), CRLF.
 * Nilai yang diawali = + - @ diberi tanda kutip tunggal supaya tidak dijalankan sebagai rumus.
 */
export function buatCsv(kepala: string[], baris: (string | number | null | undefined)[][], pemisah = ';'): string {
  const sel = (v: string | number | null | undefined): string => {
    let s = v === null || v === undefined ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /["\r\n;,]/.test(s) || s.includes(pemisah) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [kepala, ...baris].map((b) => b.map(sel).join(pemisah)).join('\r\n') + '\r\n';
}

/** Unduh teks sebagai berkas di browser. */
export function unduh(namaBerkas: string, isi: string, tipe = 'text/csv;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([isi], { type: tipe }));
  const a = document.createElement('a');
  a.href = url;
  a.download = namaBerkas;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
