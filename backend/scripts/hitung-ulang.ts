// Hitung ulang hasil dari jawaban mentah dengan aturan skoring.json terbaru.
// Hanya mencetak jumlah ujian, tanpa nama, email, jawaban, atau kunci.
// Jawaban mentah dihapus 3 bulan setelah tes; ujian yang jawabannya sudah terhapus dilewati (hasil lama tetap).
// Jalankan dari folder backend:
//   npm run hasil:hitung-ulang                 (semua ujian selesai)
//   npm run hasil:hitung-ulang -- --sesi 12    (satu sesi)
import 'dotenv/config';
import { muatSkoring } from '../src/config/skoring.js';
import { tutupPool } from '../src/db/pool.js';
import { hitungUlang } from '../src/modules/hasil/hasil.service.js';

async function main(): Promise<void> {
  const i = process.argv.indexOf('--sesi');
  let sesiId: number | null = null;
  if (i !== -1) {
    const nilai = process.argv[i + 1] ?? '';
    if (!/^[1-9]\d*$/.test(nilai)) throw new Error('--sesi harus id sesi (bilangan bulat positif)');
    sesiId = Number(nilai);
  }
  const versi = muatSkoring().versi;
  console.log(`Hitung ulang ${sesiId === null ? 'semua ujian selesai' : `sesi ${sesiId}`} dengan aturan ${versi}...`);
  const r = await hitungUlang(sesiId);
  console.log(`Dihitung: ${r.dihitung}. Dilewati (jawaban mentah sudah terhapus): ${r.dilewati}. Gagal: ${r.gagal}.`);
  if (r.gagal > 0) process.exitCode = 1;
}

main()
  .catch((galat: unknown) => {
    const nomor = (galat as { number?: unknown })?.number;
    console.error('Gagal:', typeof nomor === 'number' ? `galat database nomor ${nomor}` : galat instanceof Error ? galat.message : 'galat tidak dikenal');
    process.exitCode = 1;
  })
  .finally(() => tutupPool());
