// Koreksi dan skor. Fungsi murni, terpisah dari rute dan database (CLAUDE.md: skoring terpisah dari rute).
// Tanpa penalti: skor mentah = jumlah benar; salah dan kosong tidak mengurangi.
import type { KategoriSkor, KonfigurasiSkoring } from '../../config/skoring.js';
import type { KonfigurasiTes } from '../../config/tes.js';
import type { BankSoal, LajurKoran } from '../tes/bank.types.js';
import { nomorDatarTiu6 } from '../tes/pengerjaan.validasi.js';
import type { JenisTes } from '../token/undangan.js';

export interface BarisJawaban {
  nomor: number;
  jawaban: string | null;
  /** Hanya Koran. */
  waktu_ms: number | null;
}

export interface Interval {
  dikerjakan: number;
  benar: number;
  salah: number;
}

export interface HasilUjian {
  jumlah_benar: number;
  jumlah_salah: number;
  /** TIU: jawaban tidak kosong. Koran: kotak terisi. */
  jumlah_dijawab: number;
  skor_mentah: number;
  kategori: string;
  skor_akhir: number;
  /** Hanya Koran. */
  n_koran: number | null;
  /** Hanya Koran: tepat sejumlah interval (22). */
  ringkasan_interval: Interval[] | null;
}

// ---------- kunci ----------

/** Kunci per nomor (indeks 0 = nomor 1). */
export function kunciTiu5(bank: BankSoal): string[] {
  return [...bank.TIU5.soal].sort((a, b) => a.nomor - b.nomor).map((s) => String(s.kunci));
}

/** Kunci TIU 6 per nomor datar (soal - 1) x butir_per_soal + butir. */
export function kunciTiu6(bank: BankSoal, butirPerSoal: number): string[] {
  const kunci: string[] = [];
  for (const s of bank.TIU6.soal) for (const b of s.butir) kunci[nomorDatarTiu6(s.nomor, b.butir, butirPerSoal) - 1] = b.kunci;
  return kunci;
}

/** Koran: kotak k di lajur = digit terakhir dari angka k + angka k+1. Urut nomor datar. */
export function kunciKoran(lajur: Pick<LajurKoran, 'lajur' | 'angka'>[]): string[] {
  const kunci: string[] = [];
  for (const l of [...lajur].sort((a, b) => a.lajur - b.lajur)) {
    for (let k = 1; k < l.angka.length; k++) kunci.push(String((l.angka[k - 1] + l.angka[k]) % 10));
  }
  return kunci;
}

/** Kunci per nomor untuk satu jenis tes (indeks 0 = nomor 1). Hanya untuk server. */
export function kunciUntuk(jenis: JenisTes, bank: { soal: BankSoal; koran: { lajur: LajurKoran[] } }, tes: KonfigurasiTes): string[] {
  if (jenis === 'TIU5') return kunciTiu5(bank.soal);
  if (jenis === 'TIU6') return kunciTiu6(bank.soal, tes.tes.TIU6.butir_per_soal);
  return kunciKoran(bank.koran.lajur);
}

/**
 * Jawaban per nomor dengan tanda benar/salah, TANPA kunci (untuk "Lihat jawaban" admin).
 * Kosong: benar = null. Nomor 1 sampai jumlah kunci, berurutan.
 */
export function tandaiJawaban(
  jawaban: BarisJawaban[],
  kunci: string[],
): { nomor: number; jawaban: string | null; benar: boolean | null; waktu_ms: number | null }[] {
  const per = new Map(jawaban.map((j) => [j.nomor, j]));
  return kunci.map((k, i) => {
    const j = per.get(i + 1);
    const isi = j?.jawaban ?? null;
    return { nomor: i + 1, jawaban: isi, benar: isi === null || isi === '' ? null : isi === k, waktu_ms: j?.waktu_ms ?? null };
  });
}

// ---------- nilai ----------

/**
 * N Koran = benar / pembagi, dibulatkan ke bilangan bulat terdekat, setengah ke atas.
 * Bilangan bulat saja: floor((2 x benar + pembagi) / (2 x pembagi)). Untuk pembagi 22 sama dengan floor((benar + 11) / 22).
 */
export function nKoran(benar: number, pembagi: number): number {
  return Math.floor((2 * benar + pembagi) / (2 * pembagi));
}

/** Kategori dan skor akhir dari batas min (inklusif) dan maks_eksklusif (null = tanpa batas atas). */
export function kategoriDari(nilai: number, daftar: KategoriSkor[]): { kategori: string; skor_akhir: number } {
  const k = daftar.find((x) => nilai >= x.min && (x.maks_eksklusif === null || nilai < x.maks_eksklusif));
  if (!k) throw new Error('Nilai di luar semua kategori skoring');
  return { kategori: k.kategori, skor_akhir: k.skor_akhir };
}

// ---------- koreksi ----------

/** TIU 5 dan TIU 6: benar bila sama dengan kunci nomor itu. Kosong tidak dihitung. */
export function koreksiPilihan(jawaban: BarisJawaban[], kunci: string[]): { benar: number; salah: number; dijawab: number } {
  let benar = 0;
  let dijawab = 0;
  for (const j of jawaban) {
    if (j.jawaban === null || j.jawaban === '' || j.nomor < 1 || j.nomor > kunci.length) continue;
    dijawab++;
    if (j.jawaban === kunci[j.nomor - 1]) benar++;
  }
  return { benar, salah: dijawab - benar, dijawab };
}

/**
 * Koran: skor dan 22 interval dari jawaban yang sama, sehingga totalnya selalu cocok.
 * Interval ke-k = waktu_ms dalam [intervalMs x (k-1), intervalMs x k).
 * Jawaban tanpa waktu, waktu negatif, atau waktu >= durasi tidak dihitung (server sudah menolaknya saat simpan).
 */
export function koreksiKoran(
  jawaban: BarisJawaban[],
  kunci: string[],
  durasiMs: number,
  intervalMs: number,
): { benar: number; salah: number; dikerjakan: number; interval: Interval[] } {
  const jumlahInterval = durasiMs / intervalMs;
  if (!Number.isInteger(jumlahInterval)) throw new Error('Durasi Koran harus habis dibagi interval');
  const interval: Interval[] = Array.from({ length: jumlahInterval }, () => ({ dikerjakan: 0, benar: 0, salah: 0 }));

  for (const j of jawaban) {
    const w = j.waktu_ms;
    if (w === null || w < 0 || w >= durasiMs) continue;
    if (j.jawaban === null || j.jawaban === '' || j.nomor < 1 || j.nomor > kunci.length) continue;
    const kotak = interval[Math.floor(w / intervalMs)];
    kotak.dikerjakan++;
    if (j.jawaban === kunci[j.nomor - 1]) kotak.benar++;
    else kotak.salah++;
  }
  const jumlah = (f: keyof Interval): number => interval.reduce((n, x) => n + x[f], 0);
  return { benar: jumlah('benar'), salah: jumlah('salah'), dikerjakan: jumlah('dikerjakan'), interval };
}

/**
 * Hasil lengkap satu ujian dari jawaban mentah, bank, dan aturan skoring.
 * Durasi Koran selalu dari skoring.json (bukan durasi uji coba), supaya ringkasan selalu tepat 22 interval.
 */
export function hitungHasil(
  jenis: JenisTes,
  jawaban: BarisJawaban[],
  bank: { soal: BankSoal; koran: { lajur: LajurKoran[] } },
  skoring: KonfigurasiSkoring,
  tes: KonfigurasiTes,
): HasilUjian {
  if (jenis === 'KORAN') {
    const k = skoring.KORAN;
    const r = koreksiKoran(jawaban, kunciKoran(bank.koran.lajur), skoring.durasi_detik.KORAN * 1000, k.interval_detik * 1000);
    const n = nKoran(r.benar, k.pembagi);
    return {
      jumlah_benar: r.benar,
      jumlah_salah: r.salah,
      jumlah_dijawab: r.dikerjakan,
      skor_mentah: r.benar,
      ...kategoriDari(n, k.kategori_dan_skor),
      n_koran: n,
      ringkasan_interval: r.interval,
    };
  }
  const kunci = jenis === 'TIU5' ? kunciTiu5(bank.soal) : kunciTiu6(bank.soal, tes.tes.TIU6.butir_per_soal);
  const r = koreksiPilihan(jawaban, kunci);
  return {
    jumlah_benar: r.benar,
    jumlah_salah: r.salah,
    jumlah_dijawab: r.dijawab,
    skor_mentah: r.benar,
    ...kategoriDari(r.benar, skoring[jenis].kategori_dan_skor),
    n_koran: null,
    ringkasan_interval: null,
  };
}
