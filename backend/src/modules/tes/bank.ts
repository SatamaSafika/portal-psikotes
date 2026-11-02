// Pembaca bank soal di server. Bank dimuat saat pertama dipakai, diperiksa, lalu disimpan di memori.
// Kunci hanya untuk modul skoring. Yang dikirim ke peserta lewat soalPublik(), tanpa kunci.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { FOLDER_BANK } from '../../config/jalur.js';
import { muatTes } from '../../config/tes.js';
import type { BankSoal, BerkasKoran, SoalPublik, TesGambar } from './bank.types.js';
import { periksaKoran, petakanGambar, ratakanBank, susunTiu } from './bank.validasi.js';

export const POLA_VERSI_BANK = /^v[1-9]\d*$/;

export interface BankTermuat {
  versi: string;
  soal: BankSoal;
  koran: BerkasKoran;
  folder: string;
  /** Nama berkas gambar yang dirujuk bank. Hanya nama ini yang boleh dilayani. */
  gambar: ReadonlySet<string>;
}

const tersimpan = new Map<string, Promise<BankTermuat>>();

async function bacaJson(jalur: string, nama: string): Promise<unknown> {
  let teks: string;
  try {
    teks = await readFile(jalur, 'utf8');
  } catch {
    throw new Error(`${nama} tidak ditemukan`);
  }
  try {
    return JSON.parse(teks);
  } catch {
    // Pesan bawaan JSON.parse bisa memuat potongan isi berkas, jadi tidak diteruskan.
    throw new Error(`${nama} bukan JSON yang valid`);
  }
}

async function bacaBank(versi: string): Promise<BankTermuat> {
  if (!POLA_VERSI_BANK.test(versi)) throw new Error('Versi bank tidak valid');
  const folder = join(FOLDER_BANK, versi);
  const label = `bank/${versi}`;

  const soalMentah = await bacaJson(join(folder, 'soal.json'), `${label}/soal.json`);
  const koranMentah = await bacaJson(join(folder, 'koran.json'), `${label}/koran.json`);
  let berkasGambar: string[];
  try {
    berkasGambar = await readdir(join(folder, 'gambar'));
  } catch {
    throw new Error(`${label}/gambar tidak ditemukan`);
  }

  const konfig = muatTes();
  const rata = ratakanBank(soalMentah);
  const tiu = susunTiu(rata.baris, petakanGambar(berkasGambar).dikenal, rata.instruksi, konfig);
  const koran = periksaKoran(koranMentah, konfig);
  const galat = [...rata.galat, ...tiu.galat, ...koran.galat];

  const s = soalMentah as Partial<BankSoal>;
  if (koran.koran && s.sidik_jari_koran !== koran.koran.sidik_jari_sha256) {
    galat.push('soal.json: sidik_jari_koran tidak cocok dengan koran.json');
  }
  if (galat.length > 0 || !tiu.TIU5 || !tiu.TIU6 || !koran.koran) {
    throw new Error(`Bank ${versi} tidak valid:\n- ${galat.join('\n- ')}`);
  }

  return {
    versi,
    soal: {
      versi: String(s.versi ?? versi),
      dibuat_pada: String(s.dibuat_pada ?? ''),
      sidik_jari_koran: koran.koran.sidik_jari_sha256,
      TIU5: tiu.TIU5,
      TIU6: tiu.TIU6,
    },
    koran: koran.koran,
    folder,
    gambar: new Set(tiu.gambarDipakai),
  };
}

/** Memuat bank versi tertentu (contoh "v1"). Hasil disimpan di memori. Melempar galat bila tidak valid. */
export function muatBank(versi: string): Promise<BankTermuat> {
  let janji = tersimpan.get(versi);
  if (!janji) {
    janji = bacaBank(versi);
    // Gagal: jangan disimpan, supaya bisa dicoba lagi setelah bank diperbaiki.
    janji.catch(() => tersimpan.delete(versi));
    tersimpan.set(versi, janji);
  }
  return janji;
}

/** Daftar soal untuk peserta, tanpa kunci. */
export function soalPublik(bank: BankTermuat, tes: TesGambar): SoalPublik[] {
  if (tes === 'TIU5') return bank.soal.TIU5.soal.map(({ nomor, gambar }) => ({ nomor, gambar }));
  return bank.soal.TIU6.soal.map(({ nomor, gambar, butir }) => ({ nomor, gambar, jumlah_butir: butir.length }));
}

/** Angka Koran per lajur. Angka memang ditampilkan ke peserta; kuncinya dihitung di server. */
export function angkaKoran(bank: BankTermuat): number[][] {
  return bank.koran.lajur.map((l) => [...l.angka]);
}

/**
 * Jalur berkas gambar di disk, atau null bila nama tidak dirujuk bank.
 * Hanya nama persis dari bank yang diterima, jadi "../" dan sejenisnya selalu ditolak.
 */
export function jalurGambar(bank: BankTermuat, nama: string): string | null {
  return bank.gambar.has(nama) ? join(bank.folder, 'gambar', nama) : null;
}
