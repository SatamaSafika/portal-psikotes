// Semua data di sini DUMMY dan dibuat di dalam tes. Hasil yang diharapkan dihitung tangan lebih dulu
// (lihat komentar di tiap tes), lalu dibandingkan dengan hitungan sistem.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { muatSkoring } from '../src/config/skoring.js';
import { muatTes } from '../src/config/tes.js';
import {
  hitungHasil,
  kategoriDari,
  koreksiKoran,
  kunciKoran,
  kunciTiu6,
  nKoran,
  type BarisJawaban,
} from '../src/modules/skoring/koreksi.js';
import type { BankSoal, LajurKoran } from '../src/modules/tes/bank.types.js';

const S = muatSkoring();
const T = muatTes();
const j = (nomor: number, jawaban: string | null, waktu_ms: number | null = null): BarisJawaban => ({ nomor, jawaban, waktu_ms });

// Bank dummy: TIU 5 kunci nomor n = (n mod 5) + 1; TIU 6 kunci butir ganjil B, genap S.
const BANK: BankSoal = {
  versi: 'uji',
  dibuat_pada: '',
  sidik_jari_koran: '',
  TIU5: {
    instruksi: 'x',
    latihan: [],
    soal: Array.from({ length: 30 }, (_, i) => ({ nomor: i + 1, gambar: '', kunci: ((i + 1) % 5) + 1 })),
  },
  TIU6: {
    instruksi: 'x',
    latihan: [],
    soal: Array.from({ length: 8 }, (_, i) => ({
      nomor: i + 1,
      gambar: '',
      butir: Array.from({ length: 5 }, (_, u) => ({ butir: u + 1, kunci: (u % 2 === 0 ? 'B' : 'S') as 'B' | 'S' })),
    })),
  },
};

// ---------- N Koran ----------

test('N Koran setengah ke atas, bilangan bulat', () => {
  // Hitung tangan: 120/22 = 5,45 -> 5; 121/22 = 5,5 -> 6; 230/22 = 10,45 -> 10; 231/22 = 10,5 -> 11;
  // 340/22 = 15,45 -> 15; 341/22 = 15,5 -> 16; 450/22 = 20,45 -> 20; 451/22 = 20,5 -> 21; 988/22 = 44,9 -> 45.
  const harapan: [number, number][] = [
    [0, 0], [10, 0], [11, 1], [120, 5], [121, 6], [230, 10], [231, 11],
    [340, 15], [341, 16], [450, 20], [451, 21], [988, 45],
  ];
  for (const [benar, n] of harapan) assert.equal(nKoran(benar, 22), n, `benar ${benar}`);
});

// ---------- nilai batas kategori ----------

const skor = (tes: 'TIU5' | 'TIU6', benar: number) => kategoriDari(benar, S[tes].kategori_dan_skor);
const skorKoran = (benar: number) => kategoriDari(nKoran(benar, S.KORAN.pembagi), S.KORAN.kategori_dan_skor);

test('nilai batas TIU 5 tiap sisi', () => {
  const harapan: [number, string, number][] = [
    [0, 'Kurang Sekali', 1], [5, 'Kurang Sekali', 1], [6, 'Kurang', 2], [13, 'Kurang', 2], [14, 'Cukup', 3],
    [21, 'Cukup', 3], [22, 'Baik', 4], [28, 'Baik', 4], [29, 'Baik Sekali', 5], [30, 'Baik Sekali', 5],
  ];
  for (const [b, kategori, skor_akhir] of harapan) assert.deepEqual(skor('TIU5', b), { kategori, skor_akhir }, `benar ${b}`);
});

test('nilai batas TIU 6 tiap sisi', () => {
  const harapan: [number, string, number][] = [
    [0, 'Kurang Sekali', 1], [8, 'Kurang Sekali', 1], [9, 'Kurang', 2], [16, 'Kurang', 2], [17, 'Rata-Rata', 3],
    [24, 'Rata-Rata', 3], [25, 'Baik', 4], [32, 'Baik', 4], [33, 'Baik Sekali', 5], [40, 'Baik Sekali', 5],
  ];
  for (const [b, kategori, skor_akhir] of harapan) assert.deepEqual(skor('TIU6', b), { kategori, skor_akhir }, `benar ${b}`);
});

test('nilai batas Koran (total benar) tiap sisi', () => {
  const harapan: [number, string, number][] = [
    [0, 'Kurang Sekali', 1], [120, 'Kurang Sekali', 1], [121, 'Kurang', 2], [230, 'Kurang', 2], [231, 'Rata-Rata', 3],
    [340, 'Rata-Rata', 3], [341, 'Baik', 4], [450, 'Baik', 4], [451, 'Baik Sekali', 5], [988, 'Baik Sekali', 5],
  ];
  for (const [b, kategori, skor_akhir] of harapan) assert.deepEqual(skorKoran(b), { kategori, skor_akhir }, `benar ${b}`);
});

// ---------- contoh lengkap TIU ----------

test('contoh TIU 5 dihitung tangan', () => {
  // Kunci nomor 1..9 = 2,3,4,5,1,2,3,4,5. Jawaban: 1..6 sesuai kunci (6 benar), 7..9 dijawab "1" (3 salah),
  // 10 kosong. Hitung tangan: benar 6, salah 3, dijawab 9 -> 6 masuk "Kurang", skor akhir 2.
  const jawaban = [
    ...['2', '3', '4', '5', '1', '2'].map((x, i) => j(i + 1, x)),
    j(7, '1'), j(8, '1'), j(9, '1'), j(10, null),
  ];
  const h = hitungHasil('TIU5', jawaban, { soal: BANK, koran: { lajur: [] } }, S, T);
  assert.deepEqual(h, {
    jumlah_benar: 6, jumlah_salah: 3, jumlah_dijawab: 9, skor_mentah: 6,
    kategori: 'Kurang', skor_akhir: 2, n_koran: null, ringkasan_interval: null,
  });
});

test('nomor datar TIU 6 mengikuti (soal - 1) x 5 + butir', () => {
  const k = kunciTiu6(BANK, 5);
  assert.equal(k.length, 40);
  assert.deepEqual(k.slice(0, 6), ['B', 'S', 'B', 'S', 'B', 'B']);
});

test('contoh TIU 6 dihitung tangan', () => {
  // Kunci tiap Soal: B S B S B. Jawaban: Soal 1 seluruhnya benar (5), Soal 2 butir 1-4 benar (4) dan butir 5 "S" (salah),
  // Soal 3 butir 1 "S" (salah), sisanya kosong. Hitung tangan: benar 9, salah 2, dijawab 11 -> 9 masuk "Kurang", skor 2.
  const jawaban = [
    ...['B', 'S', 'B', 'S', 'B'].map((x, i) => j(i + 1, x)),
    ...['B', 'S', 'B', 'S', 'S'].map((x, i) => j(6 + i, x)),
    j(11, 'S'),
    j(12, null),
  ];
  const h = hitungHasil('TIU6', jawaban, { soal: BANK, koran: { lajur: [] } }, S, T);
  assert.equal(h.jumlah_benar, 9);
  assert.equal(h.jumlah_salah, 2);
  assert.equal(h.jumlah_dijawab, 11);
  assert.deepEqual({ kategori: h.kategori, skor_akhir: h.skor_akhir }, { kategori: 'Kurang', skor_akhir: 2 });
});

// ---------- Koran ----------

test('kunci Koran = digit terakhir dua angka bersebelahan, urut lajur', () => {
  // Lajur 1: 3+5=8, 5+9=14 -> 4, 9+1=10 -> 0. Lajur 2: 7+7=14 -> 4, 7+2=9, 2+6=8.
  const lajur = [
    { lajur: 2, angka: [7, 7, 2, 6] },
    { lajur: 1, angka: [3, 5, 9, 1] },
  ];
  assert.deepEqual(kunciKoran(lajur), ['8', '4', '0', '4', '9', '8']);
});

test('contoh Koran dihitung tangan, interval 20 detik', () => {
  // Kunci 1..6 = 8,4,0,4,9,8 (tes di atas). Durasi uji 60 detik = 3 interval.
  // 1: "8" di 1.000 ms   -> benar, interval 1
  // 2: "5" di 19.999 ms  -> salah, interval 1
  // 3: "0" di 20.000 ms  -> benar, interval 2
  // 4: "4" di 39.999 ms  -> benar, interval 2
  // 5: "1" di 59.999 ms  -> salah, interval 3
  // 6: "8" di 60.000 ms  -> tidak dihitung (pada atau setelah durasi)
  // Hitung tangan: interval 1 {2,1,1}, interval 2 {2,2,0}, interval 3 {1,0,1}; total benar 3, salah 2, dikerjakan 5.
  const kunci = ['8', '4', '0', '4', '9', '8'];
  const jawaban = [j(1, '8', 1000), j(2, '5', 19_999), j(3, '0', 20_000), j(4, '4', 39_999), j(5, '1', 59_999), j(6, '8', 60_000)];
  assert.deepEqual(koreksiKoran(jawaban, kunci, 60_000, 20_000), {
    benar: 3,
    salah: 2,
    dikerjakan: 5,
    interval: [
      { dikerjakan: 2, benar: 1, salah: 1 },
      { dikerjakan: 2, benar: 2, salah: 0 },
      { dikerjakan: 1, benar: 0, salah: 1 },
    ],
  });
});

test('interval Koran sebenarnya: 22 interval, batas 25.999/26.000/571.999/572.000', () => {
  const kunci = Array.from({ length: 988 }, () => '0');
  const r = koreksiKoran([j(1, '0', 25_999), j(2, '0', 26_000), j(3, '1', 571_999), j(4, '0', 572_000)], kunci, 572_000, 26_000);
  assert.equal(r.interval.length, 22);
  assert.deepEqual(r.interval[0], { dikerjakan: 1, benar: 1, salah: 0 });
  assert.deepEqual(r.interval[1], { dikerjakan: 1, benar: 1, salah: 0 });
  assert.deepEqual(r.interval[21], { dikerjakan: 1, benar: 0, salah: 1 });
  // 572.000 tidak dihitung di interval maupun di skor.
  assert.deepEqual({ benar: r.benar, salah: r.salah, dikerjakan: r.dikerjakan }, { benar: 2, salah: 1, dikerjakan: 3 });
});

test('tes Koran tanpa jawaban menghasilkan 22 interval berisi nol', () => {
  const r = koreksiKoran([], ['1'], 572_000, 26_000);
  assert.equal(r.interval.length, 22);
  assert.ok(r.interval.every((x) => x.dikerjakan === 0 && x.benar === 0 && x.salah === 0));
  assert.deepEqual({ benar: r.benar, salah: r.salah, dikerjakan: r.dikerjakan }, { benar: 0, salah: 0, dikerjakan: 0 });
});

test('jumlah 22 interval selalu sama dengan total (jawaban acak dummy)', () => {
  const kunci = Array.from({ length: 988 }, (_, i) => String(i % 10));
  const jawaban: BarisJawaban[] = [];
  let w = 0;
  for (let n = 1; n <= 700; n++) {
    w += 300 + (n % 7) * 50;
    jawaban.push(j(n, String((n * 3) % 10), w));
  }
  const r = koreksiKoran(jawaban, kunci, 572_000, 26_000);
  const jumlah = (f: 'dikerjakan' | 'benar' | 'salah') => r.interval.reduce((a, x) => a + x[f], 0);
  assert.equal(r.interval.length, 22);
  assert.equal(jumlah('benar'), r.benar);
  assert.equal(jumlah('salah'), r.salah);
  assert.equal(jumlah('dikerjakan'), r.dikerjakan);
  assert.equal(r.benar + r.salah, r.dikerjakan);
});

test('hitungHasil Koran memakai durasi skoring.json (22 interval) dan menyimpan N', () => {
  // Lajur dummy berisi 0 semua: setiap kunci "0". 121 jawaban benar -> N = 6 -> "Kurang", skor 2.
  const lajur: LajurKoran[] = Array.from({ length: 52 }, (_, i) => ({ lajur: i + 1, halaman: 1, posisi: 1, angka: Array(20).fill(0) }));
  const jawaban = Array.from({ length: 121 }, (_, i) => j(i + 1, '0', i * 1000));
  const h = hitungHasil('KORAN', jawaban, { soal: BANK, koran: { lajur } }, S, T);
  assert.equal(h.jumlah_benar, 121);
  assert.equal(h.n_koran, 6);
  assert.deepEqual({ kategori: h.kategori, skor_akhir: h.skor_akhir }, { kategori: 'Kurang', skor_akhir: 2 });
  assert.equal(h.ringkasan_interval!.length, 22);
  // 1 jawaban per detik (detik 0-120): 26 per interval untuk interval 1-4, sisanya 17 di interval 5.
  assert.deepEqual(h.ringkasan_interval!.slice(0, 6).map((x) => x.benar), [26, 26, 26, 26, 17, 0]);
  assert.ok(JSON.stringify(h.ringkasan_interval).length < 2000, 'muat di kolom NVARCHAR(2000)');
});
