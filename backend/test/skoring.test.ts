import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { FOLDER_CONFIG } from '../src/config/jalur.js';
import { muatSkoring, validasiSkoring } from '../src/config/skoring.js';
import { muatTes } from '../src/config/tes.js';

// Salinan baru skoring.json asli untuk tiap tes, supaya perubahan tidak saling memengaruhi.
const salinan = (): any => JSON.parse(readFileSync(join(FOLDER_CONFIG, 'skoring.json'), 'utf8'));
const galatDari = (ubah: (d: any) => void): string => {
  const d = salinan();
  ubah(d);
  return validasiSkoring(d).join('\n');
};

test('skoring.json dan tes.json di repo valid', () => {
  assert.deepEqual(validasiSkoring(salinan()), []);
  assert.doesNotThrow(() => muatSkoring());
  assert.doesNotThrow(() => muatTes());
});

test('celah antar kategori ditolak', () => {
  assert.match(galatDari((d) => (d.TIU5.kategori_dan_skor[1].min = 7)), /celah atau tumpang tindih/);
});

test('tumpang tindih antar kategori ditolak', () => {
  assert.match(galatDari((d) => (d.TIU6.kategori_dan_skor[0].maks_eksklusif = 10)), /celah atau tumpang tindih/);
});

test('kategori pertama harus mulai dari 0', () => {
  assert.match(galatDari((d) => (d.KORAN.kategori_dan_skor[0].min = 1)), /mulai dari 0/);
});

test('kategori terakhir harus tanpa batas atas', () => {
  assert.match(galatDari((d) => (d.TIU5.kategori_dan_skor[4].maks_eksklusif = 31)), /terakhir harus maks_eksklusif null/);
});

test('skor akhir harus naik', () => {
  assert.match(galatDari((d) => (d.TIU6.kategori_dan_skor[2].skor_akhir = 2)), /skor_akhir harus naik/);
});

test('ambang total benar Koran harus cocok dengan pembagi', () => {
  assert.match(galatDari((d) => (d.KORAN.ambang_total_benar = [120, 231, 341, 451])), /ambang_total_benar tidak cocok.*121, 231, 341, 451/);
  assert.match(galatDari((d) => (d.KORAN.pembagi = 20)), /ambang_total_benar tidak cocok/);
});

test('durasi harus bilangan bulat positif', () => {
  assert.match(galatDari((d) => (d.durasi_detik.KORAN = 0)), /durasi_detik\.KORAN/);
});
