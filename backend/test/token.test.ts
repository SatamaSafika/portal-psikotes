// Semua data di sini DUMMY (domain contoh.test).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validasiPeserta, validasiSesi } from '../src/modules/token/sesi.validasi.js';
import { buatTokenPeserta, hashTokenPeserta, normalisasiToken } from '../src/modules/token/token.js';
import { formatTanggal, isiUndangan, MAILTO_MAKS, templateBawaan, validasiTemplate } from '../src/modules/token/undangan.js';

// ---------- token ----------

test('token berbentuk XXXX-XXXX-XXXX-XXXX-XXXX tanpa huruf yang mudah tertukar', () => {
  for (let i = 0; i < 200; i++) {
    const t = buatTokenPeserta();
    assert.match(t, /^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){4}$/);
    assert.ok(!/[ILOU]/.test(t));
  }
});

test('token acak tidak berulang', () => {
  const kumpulan = new Set(Array.from({ length: 1000 }, buatTokenPeserta));
  assert.equal(kumpulan.size, 1000);
});

test('normalisasi menerima huruf kecil, spasi, tanpa tanda hubung', () => {
  const t = buatTokenPeserta();
  const polos = t.replace(/-/g, '');
  assert.equal(normalisasiToken(t), polos);
  assert.equal(normalisasiToken(` ${t.toLowerCase()} `), polos);
  assert.equal(normalisasiToken(polos.match(/.{4}/g)!.join(' ')), polos);
  assert.equal(hashTokenPeserta(normalisasiToken(t.toLowerCase())!), hashTokenPeserta(polos));
});

test('normalisasi menolak panjang atau huruf yang salah', () => {
  assert.equal(normalisasiToken('ABCD-EFGH'), null);
  assert.equal(normalisasiToken('ABCD-EFGH-JKMN-PQRS-TVWXY'), null);
  assert.equal(normalisasiToken('ILOU-ABCD-EFGH-JKMN-PQRS'), null);
  assert.equal(normalisasiToken(''), null);
});

test('hash token 64 karakter heksadesimal', () => {
  assert.match(hashTokenPeserta(normalisasiToken(buatTokenPeserta())!), /^[0-9a-f]{64}$/);
});

// ---------- template dan undangan ----------

test('template bawaan valid dan netral', () => {
  const t = templateBawaan();
  assert.deepEqual(validasiTemplate(t), []);
  assert.ok(!/bakrie|autoparts/i.test(`${t.subjek} ${t.isi}`));
});

test('template tanpa {daftar_token} ditolak', () => {
  assert.match(validasiTemplate({ subjek: 'A', isi: 'tanpa token' }).join(), /daftar_token/);
});

test('penanda salah ketik ditolak', () => {
  assert.match(validasiTemplate({ subjek: 'Halo {nma}', isi: '{daftar_token} {tautn}' }).join(), /\{nma\}, \{tautn\}/);
});

test('subjek kosong, berbaris baru, atau terlalu panjang ditolak', () => {
  assert.ok(validasiTemplate({ subjek: ' ', isi: '{daftar_token}' }).length > 0);
  assert.ok(validasiTemplate({ subjek: 'a\nb', isi: '{daftar_token}' }).length > 0);
  assert.ok(validasiTemplate({ subjek: 'a'.repeat(201), isi: '{daftar_token}' }).length > 0);
});

test('suntingan HC boleh berisi teks apa pun selain aturan wajib', () => {
  assert.deepEqual(validasiTemplate({ subjek: 'Undangan dari Tim Rekrutmen', isi: 'Isi bebas.\n{daftar_token}' }), []);
});

const DATA = {
  email: 'peserta.satu@contoh.test',
  nama: 'Peserta Satu',
  tanggal: '2026-11-10',
  jamBuka: '08:00',
  jamTutup: '12:00',
  portalUrl: 'https://psikotes.contoh.test',
  token: [
    { tes: 'TIU5' as const, token: 'AAAA-BBBB-CCCC-DDDD-EEEE' },
    { tes: 'KORAN' as const, token: 'FFFF-GGGG-HHHH-JJJJ-KKKK' },
  ],
};

test('format tanggal Indonesia', () => {
  assert.equal(formatTanggal('2026-11-10'), 'Selasa, 10 November 2026');
});

test('undangan terisi semua penanda dan memuat semua token', () => {
  const u = isiUndangan(templateBawaan(), DATA);
  assert.equal(u.subjek, 'Undangan Psikotes Selasa, 10 November 2026');
  assert.ok(u.isi.includes('Halo Peserta Satu,'));
  assert.ok(u.isi.includes('pukul 08:00 sampai 12:00'));
  assert.ok(u.isi.includes('https://psikotes.contoh.test/masuk'));
  assert.ok(u.isi.includes('TIU 5     : AAAA-BBBB-CCCC-DDDD-EEEE'));
  assert.ok(u.isi.includes('Tes Koran : FFFF-GGGG-HHHH-JJJJ-KKKK'));
  assert.ok(!/\{[a-z_]+\}/.test(u.subjek + u.isi), 'masih ada penanda yang belum terisi');
});

test('nama kosong diganti "Peserta"', () => {
  assert.ok(isiUndangan(templateBawaan(), { ...DATA, nama: null }).isi.startsWith('Halo Peserta,'));
});

test('nilai berisi kurung kurawal tidak diganti dua kali', () => {
  const u = isiUndangan({ subjek: 'S', isi: '{nama} {daftar_token}' }, { ...DATA, nama: '{tautan}' });
  assert.ok(u.isi.startsWith('{tautan} '));
});

test('mailto berisi alamat, subjek, dan isi yang di-encode', () => {
  const u = isiUndangan(templateBawaan(), DATA);
  assert.ok(u.mailto.startsWith('mailto:peserta.satu@contoh.test?subject='));
  const url = new URL(u.mailto);
  assert.equal(url.searchParams.get('subject'), u.subjek);
  assert.equal(decodeURIComponent(u.mailto.split('&body=')[1]), u.isi);
  assert.ok(u.isi.includes('\r\n'));
  assert.equal(u.mailtoTerlaluPanjang, false);
});

test('mailto panjang ditandai', () => {
  const u = isiUndangan({ subjek: 'S', isi: `${'x'.repeat(MAILTO_MAKS)}\n{daftar_token}` }, DATA);
  assert.equal(u.mailtoTerlaluPanjang, true);
});

// ---------- validasi sesi ----------

const SESI = {
  nama_sesi: 'Batch Uji 1',
  tanggal: '2026-11-10',
  waktu_buka: '08:00',
  waktu_tutup: '12:00',
  tes: ['KORAN', 'TIU5'],
  peserta: [{ email: ' Peserta.Satu@Contoh.TEST ', nama: 'Peserta Satu' }, { email: 'peserta.dua@contoh.test' }],
};

test('sesi valid: email jadi huruf kecil, tes urut baku', () => {
  const v = validasiSesi(SESI);
  assert.deepEqual(v.galat, []);
  assert.deepEqual(v.sesi!.tes, ['TIU5', 'KORAN']);
  assert.deepEqual(v.sesi!.peserta, [
    { email: 'peserta.satu@contoh.test', nama: 'Peserta Satu' },
    { email: 'peserta.dua@contoh.test', nama: null },
  ]);
});

test('sesi: tanggal, jam, dan tes yang salah ditolak', () => {
  for (const ubah of [
    { tanggal: '2026-02-30' },
    { tanggal: '10-11-2026' },
    { waktu_buka: '8:00' },
    { waktu_tutup: '07:00' },
    { waktu_tutup: '08:00' },
    { tes: [] },
    { tes: ['TIU7'] },
    { tes: ['TIU5', 'TIU5'] },
    { nama_sesi: '' },
  ]) {
    assert.equal(validasiSesi({ ...SESI, ...ubah }).sesi, null, JSON.stringify(ubah));
  }
});

test('peserta: email tidak valid, ganda, atau terlalu banyak ditolak tanpa menyebut alamat', () => {
  const g = validasiPeserta([{ email: 'bukan-email' }, { email: 'a@contoh.test' }, { email: 'A@contoh.test' }]).galat;
  assert.deepEqual(g, ['Peserta ke-1: email tidak valid', 'Peserta ke-3: email ganda dalam daftar']);
  assert.ok(validasiPeserta([{ email: 'a%b@contoh.test' }]).galat.length > 0);
  assert.ok(validasiPeserta([]).galat.length > 0);
  assert.ok(validasiPeserta(Array.from({ length: 201 }, (_, i) => ({ email: `p${i}@contoh.test` }))).galat.length > 0);
});
