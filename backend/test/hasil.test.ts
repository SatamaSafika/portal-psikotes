// Data DUMMY.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validasiFilterHasil } from '../src/modules/hasil/hasil.validasi.js';
import { tandaiJawaban } from '../src/modules/skoring/koreksi.js';

test('filter hasil: kosong berarti tidak disaring', () => {
  assert.deepEqual(validasiFilterHasil({}), { jenis: null, sesiId: null, tanggal: null });
  assert.deepEqual(validasiFilterHasil({ jenis: 'KORAN', sesi: '12', tanggal: '2026-11-04' }), {
    jenis: 'KORAN',
    sesiId: 12,
    tanggal: '2026-11-04',
  });
});

test('filter hasil: bentuk salah ditolak', () => {
  for (const q of [{ jenis: 'TIU7' }, { sesi: '0' }, { sesi: 'abc' }, { tanggal: '04-11-2026' }, { sesi: "1; DROP" }]) {
    assert.equal(validasiFilterHasil(q), null, JSON.stringify(q));
  }
});

test('lihat jawaban: benar/salah/kosong per nomor, tanpa kunci', () => {
  const kunci = ['3', '1', '5', '2'];
  const hasil = tandaiJawaban(
    [
      { nomor: 1, jawaban: '3', waktu_ms: null },
      { nomor: 2, jawaban: '4', waktu_ms: null },
      { nomor: 3, jawaban: null, waktu_ms: null },
    ],
    kunci,
  );
  assert.deepEqual(hasil, [
    { nomor: 1, jawaban: '3', benar: true, waktu_ms: null },
    { nomor: 2, jawaban: '4', benar: false, waktu_ms: null },
    { nomor: 3, jawaban: null, benar: null, waktu_ms: null },
    { nomor: 4, jawaban: null, benar: null, waktu_ms: null },
  ]);
  // Kunci tidak ikut di respons: tidak ada nilai kunci yang tidak dijawab peserta.
  assert.ok(!JSON.stringify(hasil).includes('"5"'));
  assert.ok(!('kunci' in hasil[0]));
});
