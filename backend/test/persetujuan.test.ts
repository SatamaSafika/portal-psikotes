// Persetujuan peserta (Part 8c), tanpa database.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cekPersetujuan, muatPersetujuan, validasiPersetujuan } from '../src/modules/token/persetujuan.js';

test('persetujuan.json sah, 5 butir, tanpa nama perusahaan', () => {
  const p = muatPersetujuan();
  assert.deepEqual(validasiPersetujuan(p), []);
  assert.equal(p.butir.length, 5);
  assert.ok(p.versi.length <= 20);
  assert.doesNotMatch(JSON.stringify(p), /bakrie|autoparts/i);
});

test('konfigurasi persetujuan yang rusak ditolak', () => {
  const sah = muatPersetujuan();
  assert.ok(validasiPersetujuan({ ...sah, versi: 'versi dengan spasi' }).length > 0);
  assert.ok(validasiPersetujuan({ ...sah, versi: 'x'.repeat(21) }).length > 0);
  assert.ok(validasiPersetujuan({ ...sah, butir: [] }).length > 0);
  assert.ok(validasiPersetujuan({ ...sah, butir: ['ok', ''] }).length > 0);
  assert.ok(validasiPersetujuan({ ...sah, judul: '' }).length > 0);
  assert.ok(validasiPersetujuan(null).length > 0);
});

test('masuk hanya sah bila setuju = true dengan versi yang berlaku', () => {
  assert.equal(cekPersetujuan({ setuju: true, persetujuan_versi: 'v1' }, 'v1'), 'SAH');
  assert.equal(cekPersetujuan({ setuju: true, persetujuan_versi: 'v0' }, 'v1'), 'BEDA_VERSI');
  assert.equal(cekPersetujuan({ setuju: true }, 'v1'), 'BEDA_VERSI');
  // Hanya boolean true; string "true", 1, false, atau tidak dikirim berarti tidak setuju.
  for (const setuju of [false, 'true', 1, null, undefined]) {
    assert.equal(cekPersetujuan({ setuju, persetujuan_versi: 'v1' }, 'v1'), 'TIDAK');
  }
  assert.equal(cekPersetujuan(null, 'v1'), 'TIDAK');
});
