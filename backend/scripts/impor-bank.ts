// Impor bank soal dari materi_rahasia/mentah ke backend/bank/<versi>/.
// Tidak pernah menimpa: bila folder versi sudah ada, skrip menolak.
// Tidak mencetak kunci, penjelasan, instruksi, atau angka Koran. Hanya nama berkas, nomor, dan jumlah.
//
// Jalankan dari folder backend:
//   npm run bank:impor -- --periksa     (hanya memeriksa, tidak menulis apa pun)
//   npm run bank:impor                  (memeriksa lalu menulis bank/v1)
//   npm run bank:impor -- --versi v2 --sumber <folder>
import { createHash, randomBytes } from 'node:crypto';
import { constants, existsSync } from 'node:fs';
import { copyFile, mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { FOLDER_BANK, FOLDER_MENTAH } from '../src/config/jalur.js';
import { muatTes } from '../src/config/tes.js';
import type { BankSoal } from '../src/modules/tes/bank.types.js';
import { POLA_VERSI_BANK } from '../src/modules/tes/bank.js';
import { barisDariCsv, periksaKoran, petakanGambar, susunTiu } from '../src/modules/tes/bank.validasi.js';

const BERKAS_TETAP = new Set(['kunci.csv', 'instruksi_tiu5.txt', 'instruksi_tiu6.txt', 'koran.json']);

const argumen = process.argv.slice(2);
const ambil = (nama: string, bawaan: string): string => {
  const i = argumen.indexOf(`--${nama}`);
  return i === -1 ? bawaan : (argumen[i + 1] ?? '');
};

async function bacaTeks(jalur: string): Promise<string | null> {
  try {
    return await readFile(jalur, 'utf8');
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const periksaSaja = argumen.includes('--periksa');
  const versi = ambil('versi', 'v1');
  const sumber = resolve(ambil('sumber', FOLDER_MENTAH));
  if (!POLA_VERSI_BANK.test(versi)) throw new Error('--versi harus berbentuk v1, v2, dan seterusnya');

  const tujuan = join(FOLDER_BANK, versi);
  if (!periksaSaja && existsSync(tujuan)) {
    throw new Error(`bank/${versi} sudah ada dan tidak ditimpa. Pakai versi baru, atau hapus folder itu secara sengaja.`);
  }

  let isiSumber: string[];
  try {
    isiSumber = (await readdir(sumber, { withFileTypes: true })).filter((e) => e.isFile()).map((e) => e.name);
  } catch {
    throw new Error('Folder sumber tidak ditemukan');
  }

  const konfig = muatTes();
  const galat: string[] = [];
  const peringatan: string[] = [];

  // kunci.csv
  const teksKunci = await bacaTeks(join(sumber, 'kunci.csv'));
  if (teksKunci === null) galat.push('kunci.csv tidak ditemukan');
  const csv = barisDariCsv(teksKunci ?? '');
  if (teksKunci !== null) galat.push(...csv.galat);

  // gambar dan berkas lain
  const peta = petakanGambar(isiSumber.filter((n) => !BERKAS_TETAP.has(n)));
  for (const nama of peta.tidakDikenal) peringatan.push(`berkas tidak terpakai: ${nama}`);

  // TIU 5 dan TIU 6
  const tiu = susunTiu(
    csv.baris,
    peta.dikenal,
    {
      TIU5: await bacaTeks(join(sumber, 'instruksi_tiu5.txt')),
      TIU6: await bacaTeks(join(sumber, 'instruksi_tiu6.txt')),
    },
    konfig,
  );
  galat.push(...tiu.galat);
  peringatan.push(...tiu.peringatan);

  // Koran
  let koranMentah: unknown = null;
  const teksKoran = await bacaTeks(join(sumber, 'koran.json'));
  if (teksKoran === null) {
    galat.push('koran.json tidak ditemukan');
  } else {
    try {
      koranMentah = JSON.parse(teksKoran);
    } catch {
      // Pesan bawaan JSON.parse bisa memuat potongan isi berkas, jadi tidak dicetak.
      galat.push('koran.json bukan JSON yang valid');
    }
  }
  const koran = koranMentah === null ? { koran: null, galat: [] } : periksaKoran(koranMentah, konfig);
  galat.push(...koran.galat);

  for (const p of peringatan) console.warn(`Peringatan: ${p}`);
  if (galat.length > 0 || !tiu.TIU5 || !tiu.TIU6 || !koran.koran) {
    console.error(`Bank TIDAK valid (${galat.length} galat):`);
    for (const g of galat) console.error(`- ${g}`);
    process.exitCode = 1;
    return;
  }

  const k = konfig.tes;
  console.log('Bank valid.');
  console.log(`TIU5  : ${tiu.TIU5.soal.length} soal, ${tiu.TIU5.latihan.length} latihan`);
  console.log(
    `TIU6  : ${tiu.TIU6.soal.length} Soal x ${k.TIU6.butir_per_soal} = ${tiu.TIU6.soal.length * k.TIU6.butir_per_soal} butir, ` +
      `${tiu.TIU6.latihan.length} latihan`,
  );
  console.log(
    `KORAN : ${koran.koran.lajur.length} lajur, ${koran.koran.lajur.length * k.KORAN.angka_per_lajur} angka, ` +
      `sidik jari ${koran.koran.sidik_jari_sha256.slice(0, 12)}`,
  );
  console.log(`Gambar: ${tiu.gambarDipakai.length} berkas`);

  if (periksaSaja) {
    console.log('Mode --periksa: tidak ada yang ditulis.');
    return;
  }

  const bank: BankSoal = {
    versi,
    dibuat_pada: new Date().toISOString().slice(0, 10),
    sidik_jari_koran: koran.koran.sidik_jari_sha256,
    TIU5: tiu.TIU5,
    TIU6: tiu.TIU6,
  };
  const isiSoal = JSON.stringify(bank, null, 2);

  // Tulis ke folder sementara dulu, lalu pindahkan sekaligus. Tidak ada bank setengah jadi.
  await mkdir(FOLDER_BANK, { recursive: true });
  const sementara = join(FOLDER_BANK, `.${versi}-sementara-${randomBytes(4).toString('hex')}`);
  try {
    await mkdir(join(sementara, 'gambar'), { recursive: true });
    await writeFile(join(sementara, 'soal.json'), isiSoal, { flag: 'wx' });
    await copyFile(join(sumber, 'koran.json'), join(sementara, 'koran.json'), constants.COPYFILE_EXCL);
    for (const nama of tiu.gambarDipakai) {
      await copyFile(join(sumber, nama), join(sementara, 'gambar', nama), constants.COPYFILE_EXCL);
    }
    if (existsSync(tujuan)) throw new Error(`bank/${versi} muncul saat impor berjalan, tidak ditimpa`);
    await rename(sementara, tujuan);
  } catch (e) {
    await rm(sementara, { recursive: true, force: true });
    throw e;
  }

  console.log(`Ditulis ke bank/${versi}/ (soal.json, koran.json, gambar/).`);
  console.log(`Sidik jari soal.json (12 awal): ${createHash('sha256').update(isiSoal).digest('hex').slice(0, 12)}`);
}

main().catch((galat: unknown) => {
  console.error('Gagal:', galat instanceof Error ? galat.message : 'galat tidak dikenal');
  process.exitCode = 1;
});
