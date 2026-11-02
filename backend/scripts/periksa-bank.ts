// Memeriksa bank yang sudah terimpor lewat pembaca bank yang sama dengan server.
// Hanya mencetak jumlah dan sidik jari, tidak pernah kunci atau angka.
// Jalankan dari folder backend: npm run bank:periksa  (atau: npm run bank:periksa -- --versi v2)
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { muatSkoring } from '../src/config/skoring.js';
import { muatTes } from '../src/config/tes.js';
import { angkaKoran, muatBank, soalPublik } from '../src/modules/tes/bank.js';

async function main(): Promise<void> {
  const i = process.argv.indexOf('--versi');
  const versi = i === -1 ? 'v1' : (process.argv[i + 1] ?? '');

  const skoring = muatSkoring();
  console.log(`skoring.json valid (versi ${skoring.versi}).`);

  const bank = await muatBank(versi);
  const k = muatTes().tes;
  const tiu6 = soalPublik(bank, 'TIU6');
  const lajur = angkaKoran(bank);
  const sidikSoal = createHash('sha256')
    .update(await readFile(join(bank.folder, 'soal.json')))
    .digest('hex');

  console.log(`Bank ${versi} valid dan terbaca.`);
  console.log(`TIU5  : ${soalPublik(bank, 'TIU5').length} soal, ${bank.soal.TIU5.latihan.length} latihan`);
  console.log(
    `TIU6  : ${tiu6.length} Soal, ${tiu6.reduce((n, s) => n + (s.jumlah_butir ?? 0), 0)} butir, ` +
      `${bank.soal.TIU6.latihan.length} latihan`,
  );
  console.log(
    `KORAN : ${lajur.length} lajur (${k.KORAN.halaman} halaman x ${k.KORAN.lajur_per_halaman}), ` +
      `${lajur.reduce((n, l) => n + l.length, 0)} angka, sidik jari ${bank.koran.sidik_jari_sha256.slice(0, 12)}`,
  );
  console.log(`Gambar: ${bank.gambar.size} berkas`);
  console.log(`Sidik jari soal.json (12 awal): ${sidikSoal.slice(0, 12)}`);
}

main().catch((galat: unknown) => {
  console.error('Gagal:', galat instanceof Error ? galat.message : 'galat tidak dikenal');
  process.exitCode = 1;
});
