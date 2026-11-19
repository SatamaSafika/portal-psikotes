import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';
import { bukaToken, lupakanKunciToken, sandiToken } from '../src/lib/sandi-token.js';
import { buatTokenKelompok, buatTokenPeserta } from '../src/modules/token/token.js';

// Kunci acak khusus tes; tidak pernah kunci produksi.
function pakaiKunci(): void {
  process.env.TOKEN_KUNCI = randomBytes(32).toString('base64');
  lupakanKunciToken();
}

test('token individu dan kelompok kembali utuh setelah disandikan, dan muat di kolom VARCHAR(100)', () => {
  pakaiKunci();
  for (const token of [buatTokenPeserta(), buatTokenKelompok()]) {
    const sandi = sandiToken(token);
    assert.ok(sandi.startsWith('v1.'));
    assert.ok(sandi.length <= 100, `panjang ${sandi.length}`);
    assert.ok(!sandi.includes(token.replace(/-/g, '').slice(0, 6)), 'token tidak terlihat di sandi');
    assert.equal(bukaToken(sandi), token);
  }
});

test('token yang sama menghasilkan sandi berbeda (IV acak)', () => {
  pakaiKunci();
  const t = buatTokenPeserta();
  assert.notEqual(sandiToken(t), sandiToken(t));
});

test('kosong, rusak, atau kunci lain: null, bukan galat', () => {
  pakaiKunci();
  const sandi = sandiToken(buatTokenKelompok());
  assert.equal(bukaToken(null), null);
  assert.equal(bukaToken(''), null);
  assert.equal(bukaToken('bukan-sandi'), null);
  assert.equal(bukaToken(`${sandi.slice(0, -2)}AA`), null);
  pakaiKunci();
  assert.equal(bukaToken(sandi), null);
});

test('TOKEN_KUNCI kosong atau bukan 32 byte ditolak tanpa menyebut nilainya', () => {
  for (const nilai of ['', randomBytes(16).toString('base64')]) {
    process.env.TOKEN_KUNCI = nilai;
    lupakanKunciToken();
    assert.throws(() => sandiToken('ABCDE-FGHJK'), (g: Error) => g.message.startsWith('TOKEN_KUNCI') && (nilai === '' || !g.message.includes(nilai)));
  }
  pakaiKunci();
});
