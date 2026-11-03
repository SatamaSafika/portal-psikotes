// Semua data di sini DUMMY dan dibuat di dalam tes.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { KonfigurasiTes } from '../src/config/tes.js';
import { muatTes } from '../src/config/tes.js';
import type { BankTermuat } from '../src/modules/tes/bank.js';
import { latihanPublik, periksaLatihan } from '../src/modules/tes/latihan.js';
import {
  gambarBoleh,
  jumlahNomor,
  nomorDatarKoran,
  nomorDatarTiu6,
  validasiJawabanTiu,
  validasiKoran,
  type KonteksKoran,
} from '../src/modules/tes/pengerjaan.validasi.js';

const K: KonfigurasiTes = muatTes();

// ---------- nomor datar ----------

test('jumlah nomor sesuai tes.json: 30, 40, 988', () => {
  assert.equal(jumlahNomor('TIU5', K), 30);
  assert.equal(jumlahNomor('TIU6', K), 40);
  assert.equal(jumlahNomor('KORAN', K), 988);
});

test('nomor datar TIU 6 dan Koran', () => {
  assert.equal(nomorDatarTiu6(1, 1, 5), 1);
  assert.equal(nomorDatarTiu6(2, 1, 5), 6);
  assert.equal(nomorDatarTiu6(8, 5, 5), 40);
  assert.equal(nomorDatarKoran(1, 1, K), 1);
  assert.equal(nomorDatarKoran(2, 1, K), 20);
  assert.equal(nomorDatarKoran(52, 19, K), 988);
});

// ---------- TIU ----------

test('TIU 5: angka 1 sampai 5 atau kosong diterima', () => {
  const v = validasiJawabanTiu('TIU5', [{ nomor: 1, jawaban: '3' }, { nomor: 30, jawaban: null }, { nomor: 2, jawaban: '' }], K);
  assert.deepEqual(v.galat, []);
  assert.deepEqual(v.jawaban, [
    { nomor: 1, jawaban: '3' },
    { nomor: 30, jawaban: null },
    { nomor: 2, jawaban: null },
  ]);
});

test('TIU 5: jawaban atau nomor di luar aturan ditolak seluruhnya', () => {
  for (const salah of [
    [{ nomor: 1, jawaban: '6' }],
    [{ nomor: 1, jawaban: 3 }],
    [{ nomor: 1, jawaban: 'B' }],
    [{ nomor: 0, jawaban: '1' }],
    [{ nomor: 31, jawaban: '1' }],
    [{ nomor: 1, jawaban: '1' }, { nomor: 1, jawaban: '2' }],
    [],
  ]) {
    const v = validasiJawabanTiu('TIU5', salah, K);
    assert.ok(v.galat.length > 0, JSON.stringify(salah));
    assert.deepEqual(v.jawaban, []);
  }
});

test('TIU 6: B, S, atau kosong untuk nomor 1 sampai 40', () => {
  assert.deepEqual(validasiJawabanTiu('TIU6', [{ nomor: 40, jawaban: 'S' }, { nomor: 1, jawaban: null }], K).galat, []);
  assert.ok(validasiJawabanTiu('TIU6', [{ nomor: 41, jawaban: 'B' }], K).galat.length > 0);
  assert.ok(validasiJawabanTiu('TIU6', [{ nomor: 1, jawaban: 'b' }], K).galat.length > 0);
  assert.ok(validasiJawabanTiu('TIU6', [{ nomor: 1, jawaban: '1' }], K).galat.length > 0);
});

// ---------- Koran ----------

const CTX: KonteksKoran = { terakhir: null, maksNomor: 988, durasiMs: 440_000, berjalanMs: 10_000, toleransiMs: 1000 };
const baris = (nomor: number, waktu_ms: number, jawaban: unknown = '7') => ({ nomor, jawaban, waktu_ms });

test('Koran: kiriman pertama mulai dari nomor 1, berurutan', () => {
  const v = validasiKoran([baris(1, 800), baris(2, 1500, 3)], CTX);
  assert.deepEqual(v.galat, []);
  assert.deepEqual(v.jawaban, [
    { nomor: 1, jawaban: '7', waktu_ms: 800 },
    { nomor: 2, jawaban: '3', waktu_ms: 1500 },
  ]);
});

test('Koran: melanjutkan tepat dari nomor terakhir tersimpan', () => {
  const ctx = { ...CTX, terakhir: { nomor: 5, waktu_ms: 4000 } };
  assert.deepEqual(validasiKoran([baris(6, 4000), baris(7, 4200)], ctx).galat, []);
});

test('Koran: melompat, mundur, atau mengulang nomor ditolak', () => {
  const ctx = { ...CTX, terakhir: { nomor: 5, waktu_ms: 4000 } };
  assert.match(validasiKoran([baris(7, 5000)], ctx).galat[0], /nomor harus 6/);
  assert.match(validasiKoran([baris(5, 5000)], ctx).galat[0], /nomor harus 6/);
  assert.match(validasiKoran([baris(6, 5000), baris(8, 5100)], ctx).galat[0], /baris ke-2: nomor harus 7/);
  assert.match(validasiKoran([baris(2, 500)], CTX).galat[0], /nomor harus 1/);
});

test('Koran: kotak kosong atau bukan satu digit ditolak', () => {
  for (const isi of ['', null, '10', 'a', 12, -1, ' 1']) {
    assert.ok(validasiKoran([baris(1, 500, isi)], CTX).galat.length > 0, String(isi));
  }
});

test('Koran: waktu negatif, mundur, melewati durasi, atau mendahului server ditolak', () => {
  assert.match(validasiKoran([baris(1, -1)], CTX).galat[0], /waktu_ms/);
  assert.match(validasiKoran([baris(1, 1.5)], CTX).galat[0], /waktu_ms/);
  assert.match(validasiKoran([baris(1, 900), baris(2, 800)], CTX).galat[0], /mundur/);
  assert.match(validasiKoran([baris(6, 3999)], { ...CTX, terakhir: { nomor: 5, waktu_ms: 4000 } }).galat[0], /mundur/);
  const akhir = { ...CTX, berjalanMs: 445_000 };
  assert.match(validasiKoran([baris(1, 440_000)], akhir).galat[0], /melewati durasi/);
  assert.deepEqual(validasiKoran([baris(1, 439_999)], akhir).galat, []);
  assert.match(validasiKoran([baris(1, 11_001)], CTX).galat[0], /mendahului waktu server/);
  assert.deepEqual(validasiKoran([baris(1, 11_000)], CTX).galat, []);
});

test('Koran: satu pelanggaran menolak seluruh kiriman', () => {
  const v = validasiKoran([baris(1, 100), baris(2, 200), baris(3, 150)], CTX);
  assert.deepEqual(v.jawaban, []);
  assert.equal(v.galat.length, 1);
});

test('Koran: tidak bisa melewati kotak terakhir', () => {
  const ctx = { ...CTX, terakhir: { nomor: 988, waktu_ms: 9000 } };
  assert.match(validasiKoran([baris(989, 9500)], ctx).galat[0], /sudah terisi/);
});

// ---------- gambar ----------

test('gambar: hanya milik jenis tes sendiri, soal hanya saat mengerjakan', () => {
  assert.equal(gambarBoleh('latihan-tiu5-01.png', 'TIU5', false), true);
  assert.equal(gambarBoleh('tiu5-01.png', 'TIU5', false), false);
  assert.equal(gambarBoleh('tiu5-01.png', 'TIU5', true), true);
  assert.equal(gambarBoleh('tiu6-01.png', 'TIU5', true), false);
  assert.equal(gambarBoleh('latihan-tiu6-01.png', 'TIU5', true), false);
  assert.equal(gambarBoleh('tiu5-01.png', 'KORAN', true), false);
  assert.equal(gambarBoleh('../soal.json', 'TIU5', true), false);
  assert.equal(gambarBoleh('tiu5-01.png/../x', 'TIU5', true), false);
});

// ---------- latihan ----------

const BANK = {
  soal: {
    TIU5: {
      instruksi: 'Instruksi dummy',
      latihan: [{ nomor: 1, gambar: 'latihan-tiu5-01.png', kunci: 4, penjelasan: 'Penjelasan dummy' }],
      soal: [],
    },
    TIU6: {
      instruksi: 'Instruksi dummy 6',
      latihan: [{ nomor: 1, gambar: 'latihan-tiu6-01.png', butir: ['B', 'S', 'B', 'S', 'B'].map((k, i) => ({ butir: i + 1, kunci: k })) }],
      soal: [],
    },
  },
} as unknown as BankTermuat;

test('latihan dikirim tanpa kunci dan penjelasan', () => {
  const t5 = JSON.stringify(latihanPublik(BANK, 'TIU5'));
  const t6 = JSON.stringify(latihanPublik(BANK, 'TIU6'));
  assert.ok(!t5.includes('kunci') && !t5.includes('Penjelasan'));
  assert.ok(!t6.includes('kunci'));
  assert.equal(latihanPublik(BANK, 'TIU6').latihan[0].jumlah_butir, 5);
});

test('periksa latihan TIU 5: kunci dan penjelasan setelah menjawab', () => {
  assert.deepEqual(periksaLatihan(BANK, 'TIU5', 1, '2'), { benar: false, kunci: '4', penjelasan: 'Penjelasan dummy' });
  assert.deepEqual(periksaLatihan(BANK, 'TIU5', 1, '4'), { benar: true, kunci: '4', penjelasan: 'Penjelasan dummy' });
});

test('periksa latihan TIU 6: per butir, tanpa penjelasan', () => {
  const h = periksaLatihan(BANK, 'TIU6', 1, ['B', 'B', 'B', 'S', 'S']) as { butir: { benar: boolean }[] };
  assert.deepEqual(h.butir.map((b) => b.benar), [true, false, true, true, false]);
  assert.ok(!JSON.stringify(h).includes('penjelasan'));
});

test('kunci latihan tidak bisa diintip tanpa jawaban yang sah', () => {
  assert.equal(periksaLatihan(BANK, 'TIU5', 1, ''), null);
  assert.equal(periksaLatihan(BANK, 'TIU5', 1, undefined), null);
  assert.equal(periksaLatihan(BANK, 'TIU5', 2, '1'), null);
  assert.equal(periksaLatihan(BANK, 'TIU6', 1, ['B', 'S']), null);
  assert.equal(periksaLatihan(BANK, 'TIU6', 1, ['B', 'S', 'B', 'S', '']), null);
  assert.equal(periksaLatihan(BANK, 'KORAN', 1, '1'), null);
});
