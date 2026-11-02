import assert from 'node:assert/strict';
import { test } from 'node:test';
import { uraiCsv } from '../src/lib/csv.js';

test('kutipan berisi koma dan tanda kutip ganda', () => {
  const hasil = uraiCsv('a,b\n1,"x, y ""z"""\n');
  assert.deepEqual(hasil, [
    { nomor: 1, kolom: ['a', 'b'] },
    { nomor: 2, kolom: ['1', 'x, y "z"'] },
  ]);
});

test('BOM, CRLF, koma terakhir, dan baris kosong', () => {
  const hasil = uraiCsv('﻿a,b,c\r\n1,,\r\n\r\n2,3,\r\n');
  assert.deepEqual(hasil, [
    { nomor: 1, kolom: ['a', 'b', 'c'] },
    { nomor: 2, kolom: ['1', '', ''] },
    { nomor: 4, kolom: ['2', '3', ''] },
  ]);
});

test('baris terakhir tanpa akhir baris', () => {
  assert.deepEqual(uraiCsv('a\n1'), [
    { nomor: 1, kolom: ['a'] },
    { nomor: 2, kolom: ['1'] },
  ]);
});

test('baris baru di dalam kutipan tidak memecah baris, nomor baris tetap benar', () => {
  const hasil = uraiCsv('a,b\n1,"dua\nbaris"\n2,x\n');
  assert.equal(hasil.length, 3);
  assert.deepEqual(hasil[1], { nomor: 2, kolom: ['1', 'dua\nbaris'] });
  assert.equal(hasil[2].nomor, 4);
});

test('kutipan tidak ditutup ditolak', () => {
  assert.throws(() => uraiCsv('a\n"terbuka\n'), /tidak ditutup/);
});
