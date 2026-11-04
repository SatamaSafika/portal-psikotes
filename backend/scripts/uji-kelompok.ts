// Uji sesi serentak (Part 8b) dengan database, memakai DATA DUMMY ("Uji Kuota ...", "Peserta Uji n").
// Membuat satu sesi uji baru setiap dijalankan. Akun aplikasi tidak punya hak DELETE, jadi baris uji tetap ada
// (mudah dikenali dari namanya). Hanya mencetak hasil uji dan jumlah, tanpa token.
//
// Jalankan dari folder backend, dengan server API berjalan (npm run dev) untuk uji salah ketik lewat HTTP:
//   npm run uji:kelompok
//   npm run uji:kelompok -- --api http://localhost:3000
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { muatTes } from '../src/config/tes.js';
import { tutupPool } from '../src/db/pool.js';
import * as repo from '../src/modules/token/kelompok.repo.js';
import { buatTokenKelompok, hashTokenPeserta, normalisasiTokenApaSaja } from '../src/modules/token/token.js';
import { templateBawaan } from '../src/modules/token/undangan.js';

const i = process.argv.indexOf('--api');
const API = (i === -1 ? 'http://localhost:3000' : process.argv[i + 1]).replace(/\/+$/, '');

let gagal = 0;
function periksa(nama: string, lolos: boolean, rincian = ''): void {
  if (!lolos) gagal++;
  console.log(`${lolos ? 'LOLOS' : 'GAGAL'}  ${nama}${rincian ? ` (${rincian})` : ''}`);
}

const jam = (d: Date): string => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const tgl = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hashDari = (t: string): string => hashTokenPeserta(normalisasiTokenApaSaja(t)!.token);
const klaim = (token: string, jenis: 'TIU5' | 'TIU6', nama: string) =>
  repo.klaimKelompok(hashDari(token), jenis, nama, randomBytes(32));

async function postToken(token: string): Promise<number> {
  const r = await fetch(`${API}/api/peserta/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, jenis_tes: 'TIU5' }),
  });
  return r.status;
}

async function main(): Promise<void> {
  const now = new Date();
  const nanti = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  if (tgl(nanti) !== tgl(now)) throw new Error('Jalankan sebelum pukul 22.00 (jadwal uji tidak boleh melewati tengah malam).');

  // TIU 5 berjalan sekarang (kuota 50); TIU 6 baru buka 1 jam lagi (untuk uji di luar jadwal).
  const tokenTiu5 = buatTokenKelompok();
  const tokenTiu6 = buatTokenKelompok();
  const jadwal = [
    { tes: 'TIU5' as const, tanggal: tgl(now), waktu_buka: jam(new Date(now.getTime() - 10 * 60 * 1000)), waktu_tutup: jam(nanti) },
    { tes: 'TIU6' as const, tanggal: tgl(now), waktu_buka: jam(new Date(now.getTime() + 60 * 60 * 1000)), waktu_tutup: jam(nanti) },
  ];
  const sesi = await repo.buatSesiKelompok(
    {
      nama_sesi: `Uji Kuota ${now.toISOString().slice(0, 19)}`,
      kuota: 50,
      email_penerima: 'panitia@contoh.test',
      jadwal,
      tanggal: tgl(now),
      waktu_buka: jadwal[0].waktu_buka,
      waktu_tutup: jadwal[0].waktu_tutup,
      daftar_tes: 'TIU5,TIU6',
    },
    templateBawaan('KELOMPOK'),
    muatTes().bank_aktif,
    null,
    [
      { jadwal: jadwal[0], tokenHash: hashDari(tokenTiu5) },
      { jadwal: jadwal[1], tokenHash: hashDari(tokenTiu6) },
    ],
  );
  if (!sesi) throw new Error('Sesi uji tidak terbentuk');
  const [idTiu5, idTiu6] = sesi.kelompokId;
  console.log(`Sesi uji ${sesi.sesiId} dibuat (TIU 5 kuota 50 sedang buka; TIU 6 belum buka).`);

  // 1. 100 klaim paralel pada kuota 50.
  const hasil = await Promise.all(Array.from({ length: 100 }, (_, n) => klaim(tokenTiu5, 'TIU5', `Peserta Uji ${n + 1}`)));
  const sukses = hasil.filter((h) => h !== null).length;
  const k1 = await repo.ambilKelompok(idTiu5);
  const peserta = await repo.pesertaKelompok(idTiu5);
  periksa('100 klaim paralel pada kuota 50 menghasilkan tepat 50', sukses === 50, `sukses ${sukses}`);
  periksa('terpakai = 50 dan status PENUH', k1?.terpakai === 50 && k1.status === 'PENUH', `terpakai ${k1?.terpakai}, status ${k1?.status}`);
  periksa('tepat 50 catatan ujian untuk token ini', peserta.length === 50, `${peserta.length} catatan`);
  periksa('klaim ke-101 ditolak', (await klaim(tokenTiu5, 'TIU5', 'Peserta Uji 101')) === null);

  // 2. Token untuk tes lain dan di luar jadwal.
  periksa('token TIU 5 dipakai untuk TIU 6 ditolak', (await klaim(tokenTiu5, 'TIU6', 'Peserta Uji Salah Tes')) === null);
  periksa('token TIU 6 di luar jadwal ditolak', (await klaim(tokenTiu6, 'TIU6', 'Peserta Uji Belum Buka')) === null);
  periksa('cek token TIU 6 di luar jadwal ditolak', !(await repo.cekTokenKelompok(hashDari(tokenTiu6), 'TIU6')));

  // 3. Tambah kuota +1, lalu 100 salah ketik dari satu IP lewat HTTP, lalu token benar tetap diterima.
  periksa('tambah kuota menjadi 51', (await repo.tambahKuota(idTiu5, 1000)) && (await repo.ambilKelompok(idTiu5))?.kuota === 51);
  try {
    const salah = await Promise.all(Array.from({ length: 100 }, () => postToken(buatTokenKelompok())));
    const ditolak = salah.filter((s) => s === 401).length;
    periksa('100 salah ketik dari satu IP ditolak dengan pesan seragam', ditolak === 100, `${ditolak} x 401, ${100 - ditolak} lainnya`);
    const benar = await postToken(tokenTiu5.toLowerCase());
    periksa('token benar dari IP yang sama tetap diterima setelah 100 salah ketik', benar === 200, `status ${benar}`);
  } catch {
    periksa(`uji salah ketik lewat HTTP (server ${API} tidak bisa dihubungi; jalankan npm run dev)`, false);
  }
  periksa('klaim ke-51 setelah tambah kuota diterima', (await klaim(tokenTiu5, 'TIU5', 'Peserta Uji Tambahan')) !== null);

  // 4. Token baru: token lama tidak berlaku, kuota dan peserta tidak berubah.
  const sebelum = await repo.ambilKelompok(idTiu5);
  const tokenBaru = buatTokenKelompok();
  await repo.gantiTokenKelompok(idTiu5, hashDari(tokenBaru));
  await repo.tambahKuota(idTiu5, 1000);
  const sesudah = await repo.ambilKelompok(idTiu5);
  periksa('token baru: token lama ditolak', !(await repo.cekTokenKelompok(hashDari(tokenTiu5), 'TIU5')));
  periksa('token baru: token baru diterima', await repo.cekTokenKelompok(hashDari(tokenBaru), 'TIU5'));
  periksa(
    'token baru: terpakai dan peserta tidak berubah',
    sesudah?.terpakai === sebelum?.terpakai && (await repo.pesertaKelompok(idTiu5)).length === 51,
  );

  // 5. Cabut: klaim baru ditolak, tambah kuota ditolak, peserta yang sudah masuk tetap ada.
  await repo.cabutKelompok(idTiu5);
  periksa('setelah dicabut, klaim baru ditolak', (await klaim(tokenBaru, 'TIU5', 'Peserta Uji Setelah Cabut')) === null);
  periksa('setelah dicabut, tambah kuota ditolak', !(await repo.tambahKuota(idTiu5, 1000)));
  periksa('setelah dicabut, peserta yang sudah masuk tetap ada', (await repo.pesertaKelompok(idTiu5)).length === 51);

  // 6. Ubah nama oleh admin.
  const satu = (await repo.pesertaKelompok(idTiu5))[0];
  await repo.ubahNama(satu.ujian_id, 'Peserta Uji Diubah');
  periksa('ubah nama tersimpan', (await repo.pesertaKelompok(idTiu5)).some((p) => p.nama === 'Peserta Uji Diubah'));

  void idTiu6;
  console.log(gagal === 0 ? '\nSemua uji lolos.' : `\n${gagal} uji GAGAL.`);
  if (gagal > 0) process.exitCode = 1;
}

main()
  .catch((galat: unknown) => {
    const nomor = (galat as { number?: unknown })?.number;
    console.error('Gagal:', typeof nomor === 'number' ? `galat database nomor ${nomor}` : galat instanceof Error ? galat.message : 'galat tidak dikenal');
    process.exitCode = 1;
  })
  .finally(() => tutupPool());
