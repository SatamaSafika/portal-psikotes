// Membuat akun admin HC. Kata sandi diminta lewat input tersembunyi, tidak pernah lewat argumen.
// Tidak menimpa akun yang sudah ada. Hanya menulis ke dbo.HCIS_Psikotes_Admin (INSERT berparameter).
// Jalankan: npm run admin:buat
import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import argon2 from 'argon2';
import { tutupPool } from '../src/db/pool.js';
import { cariPerUsername, tambahAdmin } from '../src/modules/admin/admin.repo.js';
import { OPSI_ARGON2, PASSWORD_MAKS, PASSWORD_MIN, POLA_USERNAME } from '../src/modules/admin/admin.service.js';

async function tanyaTerlihat(pertanyaan: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(pertanyaan)).trim();
  } finally {
    rl.close();
  }
}

/** Membaca satu baris tanpa menampilkan karakter yang diketik. */
function tanyaTersembunyi(pertanyaan: string): Promise<string> {
  return new Promise((selesai, gagal) => {
    const stdin = process.stdin;
    let isi = '';
    process.stdout.write(pertanyaan);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    const akhiri = (): void => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', saatData);
      process.stdout.write('\n');
    };

    const saatData = (data: string): void => {
      // Tombol panah, Home, dan sejenisnya dikirim sebagai urutan escape. Abaikan seluruhnya.
      if (data.startsWith('\u001b')) return;
      for (const ch of data) {
        if (ch === '\r' || ch === '\n') {
          akhiri();
          selesai(isi);
          return;
        }
        if (ch === '\u0003') {
          // Ctrl+C
          akhiri();
          gagal(new Error('Dibatalkan'));
          return;
        }
        if (ch === '\u0008' || ch === '\u007f') {
          isi = isi.slice(0, -1);
        } else if (ch >= ' ') {
          isi += ch;
        }
      }
    };
    stdin.on('data', saatData);
  });
}

async function main(): Promise<void> {
  if (!process.stdin.isTTY) {
    throw new Error('Jalankan langsung di terminal. Kata sandi tidak boleh dikirim lewat pipe atau argumen.');
  }

  const username = await tanyaTerlihat('Username admin: ');
  if (!POLA_USERNAME.test(username)) {
    throw new Error('Username 3 sampai 50 karakter: huruf, angka, titik, garis bawah, atau tanda hubung.');
  }
  if (await cariPerUsername(username)) {
    throw new Error('Username sudah ada. Akun yang ada tidak ditimpa.');
  }

  const password = await tanyaTersembunyi(`Kata sandi (min. ${PASSWORD_MIN} karakter): `);
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAKS) {
    throw new Error(`Kata sandi harus ${PASSWORD_MIN} sampai ${PASSWORD_MAKS} karakter.`);
  }
  const ulang = await tanyaTersembunyi('Ulangi kata sandi: ');
  if (ulang !== password) {
    throw new Error('Kata sandi tidak sama.');
  }

  await tambahAdmin(username, await argon2.hash(password, OPSI_ARGON2));
  console.log(`Akun admin "${username}" dibuat.`);
}

main()
  .catch((galat: unknown) => {
    // Pesan saja, bukan objek galat lengkap, supaya konfigurasi tidak ikut tercetak.
    console.error('Gagal:', galat instanceof Error ? galat.message : 'galat tidak dikenal');
    process.exitCode = 1;
  })
  .finally(() => tutupPool());
