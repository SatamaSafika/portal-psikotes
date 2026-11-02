// Pemeriksaan bank soal, dipakai bersama oleh skrip impor dan pembaca bank di server.
// Pesan galat dan peringatan tidak pernah memuat kunci, penjelasan, instruksi, atau angka Koran:
// cukup nama berkas, nomor baris, nomor soal, dan jumlah.
import { createHash } from 'node:crypto';
import type { KonfigurasiTes } from '../../config/tes.js';
import { uraiCsv } from '../../lib/csv.js';
import type {
  BagianTiu5,
  BagianTiu6,
  BerkasKoran,
  ButirTiu6,
  ItemTiu5,
  ItemTiu6,
  JenisItem,
  LajurKoran,
  TesGambar,
} from './bank.types.js';

const HEADER_KUNCI = ['tes', 'jenis', 'soal', 'butir', 'kunci', 'penjelasan'];
const DAFTAR_TES: TesGambar[] = ['TIU5', 'TIU6'];
const DAFTAR_JENIS: JenisItem[] = ['latihan', 'soal'];
const POLA_GAMBAR = /^(latihan-)?tiu([56])-(\d{2})\.png$/;
const POLA_NOMOR = /^[1-9]\d*$/;

/** Satu baris kunci, semua kolom masih teks. `asal` dipakai di pesan galat. */
export interface BarisKunci {
  asal: string;
  tes: string;
  jenis: string;
  soal: string;
  butir: string;
  kunci: string;
  penjelasan: string;
}

export interface Instruksi {
  TIU5: string | null;
  TIU6: string | null;
}

const kunciKelompok = (tes: string, jenis: string, nomor: number): string => `${tes}|${jenis}|${nomor}`;

// ---------- kunci.csv ----------

export function barisDariCsv(teks: string): { baris: BarisKunci[]; galat: string[] } {
  const galat: string[] = [];
  let csv;
  try {
    csv = uraiCsv(teks);
  } catch (e) {
    return { baris: [], galat: [`kunci.csv: ${e instanceof Error ? e.message : 'tidak bisa dibaca'}`] };
  }
  if (csv.length === 0) return { baris: [], galat: ['kunci.csv kosong'] };

  const [header, ...isi] = csv;
  if (header.kolom.join(',') !== HEADER_KUNCI.join(',')) {
    galat.push(`kunci.csv baris 1: header harus persis "${HEADER_KUNCI.join(',')}"`);
    return { baris: [], galat };
  }

  const baris: BarisKunci[] = [];
  for (const { nomor, kolom } of isi) {
    const asal = `kunci.csv baris ${nomor}`;
    // Kolom penjelasan boleh tidak ditulis sama sekali (tanpa koma terakhir).
    if (kolom.length !== 6 && kolom.length !== 5) {
      galat.push(`${asal}: harus 6 kolom, ada ${kolom.length}`);
      continue;
    }
    const [tes, jenis, soal, butir, kunci, penjelasan = ''] = kolom;
    baris.push({ asal, tes, jenis, soal, butir, kunci, penjelasan });
  }
  return { baris, galat };
}

// ---------- gambar ----------

export interface PetaGambar {
  /** kunciKelompok(tes, jenis, nomor) -> nama berkas */
  dikenal: Map<string, string>;
  /** Berkas yang namanya tidak cocok dengan pola gambar. */
  tidakDikenal: string[];
}

export function petakanGambar(namaBerkas: string[]): PetaGambar {
  const dikenal = new Map<string, string>();
  const tidakDikenal: string[] = [];
  for (const nama of namaBerkas) {
    const cocok = POLA_GAMBAR.exec(nama);
    const nomor = cocok ? Number(cocok[3]) : 0;
    if (!cocok || nomor < 1) {
      tidakDikenal.push(nama);
      continue;
    }
    dikenal.set(kunciKelompok(`TIU${cocok[2]}`, cocok[1] ? 'latihan' : 'soal', nomor), nama);
  }
  return { dikenal, tidakDikenal };
}

// ---------- TIU 5 dan TIU 6 ----------

interface BarisSah {
  nomor: number;
  butir: number;
  kunci: string;
  penjelasan: string;
}

export interface HasilSusun {
  TIU5: BagianTiu5 | null;
  TIU6: BagianTiu6 | null;
  galat: string[];
  peringatan: string[];
  /** Nama berkas gambar yang dirujuk bank. */
  gambarDipakai: string[];
}

function rapikanInstruksi(teks: string | null): string {
  if (teks === null) return '';
  return (teks.charCodeAt(0) === 0xfeff ? teks.slice(1) : teks).replace(/\r\n/g, '\n').trim();
}

/** Memeriksa baris kunci terhadap gambar dan tes.json, lalu menyusun bagian TIU 5 dan TIU 6. */
export function susunTiu(
  baris: BarisKunci[],
  gambar: Map<string, string>,
  instruksi: Instruksi,
  konfig: KonfigurasiTes,
): HasilSusun {
  const galat: string[] = [];
  const peringatan: string[] = [];
  const kelompok = new Map<string, BarisSah[]>();
  const sudahAda = new Set<string>();

  for (const b of baris) {
    if (!DAFTAR_TES.includes(b.tes as TesGambar)) {
      galat.push(`${b.asal}: kolom tes harus TIU5 atau TIU6`);
      continue;
    }
    if (!DAFTAR_JENIS.includes(b.jenis as JenisItem)) {
      galat.push(`${b.asal}: kolom jenis harus latihan atau soal`);
      continue;
    }
    if (!POLA_NOMOR.test(b.soal)) {
      galat.push(`${b.asal}: kolom soal harus bilangan bulat positif`);
      continue;
    }

    let butir = 0;
    if (b.tes === 'TIU5') {
      if (b.butir !== '') {
        galat.push(`${b.asal}: kolom butir harus kosong untuk TIU5`);
        continue;
      }
      const maks = konfig.tes.TIU5.jumlah_pilihan;
      if (!POLA_NOMOR.test(b.kunci) || Number(b.kunci) > maks) {
        galat.push(`${b.asal}: kunci tidak valid (TIU5 harus 1 sampai ${maks})`);
        continue;
      }
    } else {
      const maks = konfig.tes.TIU6.butir_per_soal;
      if (!POLA_NOMOR.test(b.butir) || Number(b.butir) > maks) {
        galat.push(`${b.asal}: kolom butir harus 1 sampai ${maks} untuk TIU6`);
        continue;
      }
      if (b.kunci !== 'B' && b.kunci !== 'S') {
        galat.push(`${b.asal}: kunci tidak valid (TIU6 harus B atau S)`);
        continue;
      }
      butir = Number(b.butir);
    }

    const nomor = Number(b.soal);
    const identitas = `${b.tes}|${b.jenis}|${nomor}|${butir}`;
    if (sudahAda.has(identitas)) {
      galat.push(`${b.asal}: baris ganda (${b.tes} ${b.jenis} ${nomor}${butir ? ` butir ${butir}` : ''})`);
      continue;
    }
    sudahAda.add(identitas);

    // Penjelasan hanya dipakai di latihan TIU 5 (keputusan pemilik proyek).
    const penjelasan = b.penjelasan.trim();
    const pakaiPenjelasan = b.tes === 'TIU5' && b.jenis === 'latihan';
    if (pakaiPenjelasan && penjelasan === '') {
      galat.push(`${b.asal}: latihan TIU5 wajib punya penjelasan`);
      continue;
    }
    if (!pakaiPenjelasan && penjelasan !== '') {
      peringatan.push(`${b.asal}: penjelasan diabaikan, hanya latihan TIU5 yang memakai penjelasan`);
    }

    const k = `${b.tes}|${b.jenis}`;
    if (!kelompok.has(k)) kelompok.set(k, []);
    kelompok.get(k)!.push({ nomor, butir, kunci: b.kunci, penjelasan: pakaiPenjelasan ? penjelasan : '' });
  }

  const gambarDipakai: string[] = [];

  // Memeriksa satu kelompok (mis. TIU5 soal) dan mengembalikan baris per nomor, urut 1..jumlah.
  const periksaKelompok = (tes: TesGambar, jenis: JenisItem, jumlah: number): Map<number, BarisSah[]> => {
    const perNomor = new Map<number, BarisSah[]>();
    for (const b of kelompok.get(`${tes}|${jenis}`) ?? []) {
      if (b.nomor > jumlah) {
        galat.push(`${tes} ${jenis} nomor ${b.nomor}: melebihi jumlah di tes.json (${jumlah})`);
        continue;
      }
      if (!perNomor.has(b.nomor)) perNomor.set(b.nomor, []);
      perNomor.get(b.nomor)!.push(b);
    }
    for (let n = 1; n <= jumlah; n++) {
      const namaGambar = gambar.get(kunciKelompok(tes, jenis, n));
      if (!perNomor.has(n)) {
        galat.push(
          namaGambar
            ? `${tes} ${jenis} nomor ${n}: gambar ${namaGambar} tidak punya kunci`
            : `${tes} ${jenis} nomor ${n}: kunci dan gambar tidak ada`,
        );
      } else if (!namaGambar) {
        galat.push(`${tes} ${jenis} nomor ${n}: gambar tidak ada`);
      } else {
        gambarDipakai.push(namaGambar);
      }
    }
    // Gambar bernomor di luar jumlah juga tidak punya pasangan kunci.
    for (const [k, nama] of gambar) {
      const [t, j, n] = k.split('|');
      if (t === tes && j === jenis && Number(n) > jumlah) {
        galat.push(`${tes} ${jenis}: gambar ${nama} melebihi jumlah di tes.json (${jumlah})`);
      }
    }
    return perNomor;
  };

  // TIU 5
  const instruksi5 = rapikanInstruksi(instruksi.TIU5);
  if (instruksi5 === '') galat.push('TIU5: instruksi tidak ada atau kosong');
  const susun5 = (jenis: JenisItem, jumlah: number): ItemTiu5[] => {
    const perNomor = periksaKelompok('TIU5', jenis, jumlah);
    const hasil: ItemTiu5[] = [];
    for (let n = 1; n <= jumlah; n++) {
      const b = perNomor.get(n)?.[0];
      const namaGambar = gambar.get(kunciKelompok('TIU5', jenis, n));
      if (!b || !namaGambar) continue;
      hasil.push({ nomor: n, gambar: namaGambar, kunci: Number(b.kunci), ...(jenis === 'latihan' ? { penjelasan: b.penjelasan } : {}) });
    }
    return hasil;
  };
  const tiu5: BagianTiu5 = {
    instruksi: instruksi5,
    latihan: susun5('latihan', konfig.tes.TIU5.jumlah_latihan),
    soal: susun5('soal', konfig.tes.TIU5.jumlah_soal),
  };

  // TIU 6
  const instruksi6 = rapikanInstruksi(instruksi.TIU6);
  if (instruksi6 === '') galat.push('TIU6: instruksi tidak ada atau kosong');
  const bps = konfig.tes.TIU6.butir_per_soal;
  const susun6 = (jenis: JenisItem, jumlah: number): ItemTiu6[] => {
    const totalBaris = (kelompok.get(`TIU6|${jenis}`) ?? []).length;
    if (totalBaris !== jumlah * bps) {
      galat.push(`TIU6 ${jenis}: ada ${totalBaris} baris kunci, harusnya ${jumlah} x ${bps} = ${jumlah * bps}`);
    }
    const perNomor = periksaKelompok('TIU6', jenis, jumlah);
    const hasil: ItemTiu6[] = [];
    for (let n = 1; n <= jumlah; n++) {
      const daftar = perNomor.get(n);
      const namaGambar = gambar.get(kunciKelompok('TIU6', jenis, n));
      if (!daftar || !namaGambar) continue;
      const butir: ButirTiu6[] = [];
      for (let u = 1; u <= bps; u++) {
        const b = daftar.find((x) => x.butir === u);
        if (!b) {
          galat.push(`TIU6 ${jenis} nomor ${n}: butir ${u} tidak ada`);
          continue;
        }
        butir.push({ butir: u, kunci: b.kunci as 'B' | 'S' });
      }
      hasil.push({ nomor: n, gambar: namaGambar, butir });
    }
    return hasil;
  };
  const tiu6: BagianTiu6 = {
    instruksi: instruksi6,
    latihan: susun6('latihan', konfig.tes.TIU6.jumlah_latihan),
    soal: susun6('soal', konfig.tes.TIU6.jumlah_soal),
  };

  const sah = galat.length === 0;
  return { TIU5: sah ? tiu5 : null, TIU6: sah ? tiu6 : null, galat, peringatan, gambarDipakai };
}

// ---------- Koran ----------

/** Sama dengan cara skrip buat-koran menghitung sidik jari. */
export function sidikJariKoran(lajur: Pick<LajurKoran, 'angka'>[]): string {
  return createHash('sha256').update(JSON.stringify(lajur.map((x) => x.angka))).digest('hex');
}

export function periksaKoran(data: unknown, konfig: KonfigurasiTes): { koran: BerkasKoran | null; galat: string[] } {
  const galat: string[] = [];
  const k = konfig.tes.KORAN;
  const d = data as Partial<BerkasKoran> | null;
  if (!d || typeof d !== 'object') return { koran: null, galat: ['koran.json tidak ada atau bukan objek JSON'] };

  if (typeof d.versi !== 'string' || d.versi === '') galat.push('koran.json: versi wajib diisi');
  if (typeof d.dibuat_pada !== 'string') galat.push('koran.json: dibuat_pada wajib diisi');
  for (const [nama, harapan] of [
    ['halaman', k.halaman],
    ['lajur_per_halaman', k.lajur_per_halaman],
    ['angka_per_lajur', k.angka_per_lajur],
  ] as const) {
    if (d[nama] !== harapan) galat.push(`koran.json: ${nama} = ${String(d[nama])}, harusnya ${harapan} sesuai tes.json`);
  }

  const jumlahLajur = k.halaman * k.lajur_per_halaman;
  if (!Array.isArray(d.lajur) || d.lajur.length !== jumlahLajur) {
    galat.push(`koran.json: harus ada ${jumlahLajur} lajur, ada ${Array.isArray(d.lajur) ? d.lajur.length : 0}`);
    return { koran: null, galat };
  }

  d.lajur.forEach((l: Partial<LajurKoran>, i) => {
    const label = `koran.json lajur ke-${i + 1}`;
    if (l.lajur !== i + 1) galat.push(`${label}: nomor lajur harus ${i + 1}`);
    if (l.halaman !== Math.floor(i / k.lajur_per_halaman) + 1 || l.posisi !== (i % k.lajur_per_halaman) + 1) {
      galat.push(`${label}: halaman atau posisi tidak berurutan`);
    }
    if (!Array.isArray(l.angka) || l.angka.length !== k.angka_per_lajur) {
      galat.push(`${label}: harus berisi ${k.angka_per_lajur} angka`);
    } else if (!l.angka.every((a) => Number.isInteger(a) && a >= 0 && a <= 9)) {
      galat.push(`${label}: semua angka harus digit 0 sampai 9`);
    }
  });

  if (galat.length === 0 && d.sidik_jari_sha256 !== sidikJariKoran(d.lajur as LajurKoran[])) {
    galat.push('koran.json: sidik jari tidak cocok dengan angka (berkas berubah setelah dibuat?)');
  }
  return { koran: galat.length === 0 ? (d as BerkasKoran) : null, galat };
}

// ---------- soal.json yang sudah jadi ----------

/**
 * Meratakan soal.json kembali menjadi baris kunci, supaya bank yang sudah terimpor
 * diperiksa dengan aturan yang persis sama dengan kunci.csv.
 */
export function ratakanBank(data: unknown): { baris: BarisKunci[]; instruksi: Instruksi; galat: string[] } {
  const galat: string[] = [];
  const baris: BarisKunci[] = [];
  const instruksi: Instruksi = { TIU5: null, TIU6: null };
  const d = data as Record<string, unknown> | null;
  if (!d || typeof d !== 'object') return { baris, instruksi, galat: ['soal.json bukan objek JSON'] };

  const teks = (x: unknown): string => (typeof x === 'string' ? x : x === undefined ? '' : String(x));

  for (const tes of DAFTAR_TES) {
    const bagian = d[tes] as Record<string, unknown> | undefined;
    if (!bagian || typeof bagian !== 'object') {
      galat.push(`soal.json: bagian ${tes} tidak ada`);
      continue;
    }
    instruksi[tes] = typeof bagian.instruksi === 'string' ? bagian.instruksi : null;
    for (const jenis of DAFTAR_JENIS) {
      const daftar = bagian[jenis];
      if (!Array.isArray(daftar)) {
        galat.push(`soal.json: ${tes}.${jenis} harus berupa daftar`);
        continue;
      }
      daftar.forEach((item: Record<string, unknown>, i) => {
        const asal = `soal.json ${tes} ${jenis} ke-${i + 1}`;
        if (tes === 'TIU5') {
          baris.push({ asal, tes, jenis, soal: teks(item?.nomor), butir: '', kunci: teks(item?.kunci), penjelasan: teks(item?.penjelasan) });
        } else if (!Array.isArray(item?.butir)) {
          galat.push(`${asal}: butir harus berupa daftar`);
        } else {
          for (const u of item.butir as Record<string, unknown>[]) {
            baris.push({ asal, tes, jenis, soal: teks(item.nomor), butir: teks(u?.butir), kunci: teks(u?.kunci), penjelasan: teks(u?.penjelasan) });
          }
        }
      });
    }
  }
  return { baris, instruksi, galat };
}
