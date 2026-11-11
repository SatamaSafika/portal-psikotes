// Urutan soal acak per peserta (tanpa database, data dummy).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { acakUrutan, benihUjian } from '../src/modules/tes/acak.js';

const soal = Array.from({ length: 30 }, (_, i) => ({ nomor: i + 1, gambar: `dummy-${i + 1}.png` }));

test('urutan tetap sama untuk ujian yang sama (dimuat ulang atau dilanjutkan)', () => {
  const b = benihUjian(42, 'TIU5', 'v1');
  assert.deepEqual(acakUrutan(soal, b), acakUrutan(soal, b));
});

test('isi tetap lengkap: setiap nomor asli muncul tepat sekali, pasangan nomor-gambar tidak berubah', () => {
  const hasil = acakUrutan(soal, benihUjian(7, 'TIU5', 'v1'));
  assert.equal(hasil.length, 30);
  assert.deepEqual([...hasil].sort((a, b) => a.nomor - b.nomor), soal);
  assert.ok(hasil.every((s) => s.gambar === `dummy-${s.nomor}.png`));
});

test('ujian berbeda mendapat urutan berbeda; larik asal tidak diubah', () => {
  const asal = soal.map((s) => s.nomor);
  const urutan = new Set(Array.from({ length: 50 }, (_, i) => acakUrutan(soal, benihUjian(i + 1, 'TIU5', 'v1')).map((s) => s.nomor).join(',')));
  assert.ok(urutan.size >= 49, `hanya ${urutan.size} urutan berbeda dari 50 ujian`);
  assert.deepEqual(soal.map((s) => s.nomor), asal);
  // Tidak sama dengan urutan asli untuk hampir semua ujian.
  const samaAsli = Array.from({ length: 50 }, (_, i) => acakUrutan(soal, benihUjian(i + 1, 'TIU5', 'v1'))).filter((h) =>
    h.every((s, k) => s.nomor === k + 1),
  ).length;
  assert.equal(samaAsli, 0);
});

test('TIU 6: 8 Soal diacak sebagai satu kesatuan (butir tetap di dalam Soal-nya)', () => {
  const tiu6 = Array.from({ length: 8 }, (_, i) => ({ nomor: i + 1, gambar: `dummy6-${i + 1}.png`, jumlah_butir: 5 }));
  const hasil = acakUrutan(tiu6, benihUjian(3, 'TIU6', 'v1'));
  assert.deepEqual([...hasil].sort((a, b) => a.nomor - b.nomor), tiu6);
});

test('sebaran posisi kira-kira merata (tidak condong ke urutan asli)', () => {
  // Dari 3000 ujian, nomor 1 seharusnya jatuh di setiap posisi sekitar 3000 / 30 = 100 kali.
  const hitung = Array(30).fill(0);
  for (let i = 1; i <= 3000; i++) hitung[acakUrutan(soal, benihUjian(i, 'TIU5', 'v1')).findIndex((s) => s.nomor === 1)]++;
  assert.ok(Math.min(...hitung) > 55 && Math.max(...hitung) < 150, `sebaran ${Math.min(...hitung)}..${Math.max(...hitung)}`);
});
