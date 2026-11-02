// Pembuat angka Tes Koran. Dijalankan SEKALI per versi bank oleh pemilik proyek.
// Angka dibuat dengan generator acak yang aman (crypto.randomInt). Susunan diambil dari config/tes.json.
// Skrip TIDAK mencetak angkanya dan TIDAK menimpa berkas yang sudah ada, karena mengganti angka berarti mengganti kunci.
// Hasilnya lalu masuk ke backend/bank/<versi>/ lewat npm run bank:impor.
//
// Jalankan dari folder backend:
//   npm run buat-koran                                   (ke materi_rahasia/mentah/koran.json)
//   npm run buat-koran -- --versi koran-v2 --keluar <berkas>
import { randomInt } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { FOLDER_MENTAH } from '../src/config/jalur.js';
import { muatTes } from '../src/config/tes.js';
import type { BerkasKoran, LajurKoran } from '../src/modules/tes/bank.types.js';
import { sidikJariKoran } from '../src/modules/tes/bank.validasi.js';

const argumen = process.argv.slice(2);
const ambil = (nama: string, bawaan: string): string => {
  const i = argumen.indexOf(`--${nama}`);
  return i === -1 ? bawaan : (argumen[i + 1] ?? '');
};

function main(): void {
  const { halaman, lajur_per_halaman: lajurPerHalaman, angka_per_lajur: angkaPerLajur } = muatTes().tes.KORAN;
  const versi = ambil('versi', 'koran-v1');
  const keluar = resolve(ambil('keluar', join(FOLDER_MENTAH, 'koran.json')));

  if (existsSync(keluar)) {
    throw new Error(
      `Berkas sudah ada, tidak ditimpa: ${keluar}\n` +
        'Mengganti angka berarti mengganti kunci. Hapus berkas itu secara sengaja bila memang ingin membuat ulang.',
    );
  }

  const lajur: LajurKoran[] = [];
  const frekuensi = Array<number>(10).fill(0);
  let nomor = 0;
  for (let h = 1; h <= halaman; h++) {
    for (let p = 1; p <= lajurPerHalaman; p++) {
      nomor++;
      const angka = Array.from({ length: angkaPerLajur }, () => randomInt(0, 10));
      angka.forEach((a) => frekuensi[a]++);
      lajur.push({ lajur: nomor, halaman: h, posisi: p, angka });
    }
  }

  const isi: BerkasKoran = {
    versi,
    dibuat_pada: new Date().toISOString().slice(0, 10),
    halaman,
    lajur_per_halaman: lajurPerHalaman,
    angka_per_lajur: angkaPerLajur,
    catatan:
      'Kunci tiap jawaban = digit terakhir dari jumlah dua angka bersebelahan di lajur yang sama. Dihitung di server, jangan disimpan di sini.',
    sidik_jari_sha256: sidikJariKoran(lajur),
    lajur,
  };

  mkdirSync(dirname(keluar), { recursive: true });
  writeFileSync(keluar, JSON.stringify(isi), { flag: 'wx', mode: 0o600 });

  const total = halaman * lajurPerHalaman * angkaPerLajur;
  const jumlahLajur = halaman * lajurPerHalaman;
  console.log('Selesai. Angka tidak ditampilkan.');
  console.log('Berkas              :', keluar);
  console.log('Halaman x lajur     :', `${halaman} x ${lajurPerHalaman} = ${jumlahLajur} lajur`);
  console.log('Angka per lajur     :', angkaPerLajur);
  console.log('Total angka         :', total);
  console.log('Jawaban per lajur   :', `${angkaPerLajur - 1} (angka - 1), total ${(angkaPerLajur - 1) * jumlahLajur}`);
  console.log('Sebaran digit 0..9  :', frekuensi.join(' '), `(harapan sekitar ${Math.round(total / 10)} per digit)`);
  console.log('Sidik jari (12 awal):', isi.sidik_jari_sha256.slice(0, 12), '(catat di luar repo)');
}

try {
  main();
} catch (galat: unknown) {
  console.error('Gagal:', galat instanceof Error ? galat.message : 'galat tidak dikenal');
  process.exitCode = 1;
}
