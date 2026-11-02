// Semua data di sini DUMMY (domain contoh.test).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ringkasJadwal, validasiPeserta, validasiSesi } from '../src/modules/token/sesi.validasi.js';
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

test('penanda jadwal global tidak dipakai lagi (jadwal ada di {daftar_token})', () => {
  assert.match(validasiTemplate({ subjek: 'Undangan {tanggal}', isi: '{daftar_token} {jam_buka}' }).join(), /\{tanggal\}, \{jam_buka\}/);
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
  portalUrl: 'https://psikotes.contoh.test',
  token: [
    { tes: 'TIU5' as const, token: 'AAAA-BBBB-CCCC-DDDD-EEEE', tanggal: '2026-11-10', waktu_buka: '08:00', waktu_tutup: '09:00' },
    { tes: 'KORAN' as const, token: 'FFFF-GGGG-HHHH-JJJJ-KKKK', tanggal: '2026-11-11', waktu_buka: '13:00', waktu_tutup: '14:00' },
  ],
};

test('format tanggal Indonesia', () => {
  assert.equal(formatTanggal('2026-11-10'), 'Selasa, 10 November 2026');
});

test('undangan memuat setiap token dengan jadwal tesnya sendiri', () => {
  const u = isiUndangan(templateBawaan(), DATA);
  assert.equal(u.subjek, 'Undangan Psikotes');
  assert.ok(u.isi.includes('Halo Peserta Satu,'));
  assert.ok(u.isi.includes('https://psikotes.contoh.test/masuk'));
  assert.ok(u.isi.includes('TIU 5 - Selasa, 10 November 2026, pukul 08:00-09:00\r\nToken: AAAA-BBBB-CCCC-DDDD-EEEE'));
  assert.ok(u.isi.includes('Tes Koran - Rabu, 11 November 2026, pukul 13:00-14:00\r\nToken: FFFF-GGGG-HHHH-JJJJ-KKKK'));
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

const KORAN = { tes: 'KORAN', tanggal: '2026-11-11', waktu_buka: '13:00', waktu_tutup: '14:00' };
const TIU5 = { tes: 'TIU5', tanggal: '2026-11-10', waktu_buka: '08:00', waktu_tutup: '09:00' };
const SESI = {
  nama_sesi: 'Batch Uji 1',
  jadwal: [KORAN, TIU5],
  peserta: [{ email: ' Peserta.Satu@Contoh.TEST ', nama: 'Peserta Satu' }, { email: 'peserta.dua@contoh.test' }],
};

test('sesi valid: jadwal per tes urut baku, email jadi huruf kecil', () => {
  const v = validasiSesi(SESI);
  assert.deepEqual(v.galat, []);
  assert.deepEqual(v.sesi!.jadwal, [TIU5, KORAN]);
  assert.deepEqual(v.sesi!.peserta, [
    { email: 'peserta.satu@contoh.test', nama: 'Peserta Satu' },
    { email: 'peserta.dua@contoh.test', nama: null },
  ]);
});

test('sesi: jadwal yang salah ditolak dengan menyebut tesnya', () => {
  for (const salah of [
    { ...TIU5, tanggal: '2026-02-30' },
    { ...TIU5, tanggal: '10-11-2026' },
    { ...TIU5, waktu_buka: '8:00' },
    { ...TIU5, waktu_tutup: '07:00' },
    { ...TIU5, waktu_tutup: '08:00' },
    { ...TIU5, tes: 'TIU7' },
  ]) {
    const v = validasiSesi({ ...SESI, jadwal: [salah, KORAN] });
    assert.equal(v.sesi, null, JSON.stringify(salah));
  }
  assert.match(validasiSesi({ ...SESI, jadwal: [TIU5, TIU5] }).galat.join(), /ganda/);
  assert.equal(validasiSesi({ ...SESI, jadwal: [] }).sesi, null);
  assert.equal(validasiSesi({ ...SESI, nama_sesi: '' }).sesi, null);
});

test('ringkasan sesi: hari pertama dan rentang jam di hari itu', () => {
  const tiu6 = { tes: 'TIU6' as const, tanggal: '2026-11-10', waktu_buka: '09:30', waktu_tutup: '10:30' };
  assert.deepEqual(ringkasJadwal([TIU5 as never, tiu6, KORAN as never]), {
    tanggal: '2026-11-10',
    waktu_buka: '08:00',
    waktu_tutup: '10:30',
  });
});

test('peserta: email tidak valid, ganda, atau terlalu banyak ditolak tanpa menyebut alamat', () => {
  const g = validasiPeserta([{ email: 'bukan-email' }, { email: 'a@contoh.test' }, { email: 'A@contoh.test' }]).galat;
  assert.deepEqual(g, ['Peserta ke-1: email tidak valid', 'Peserta ke-3: email ganda dalam daftar']);
  assert.ok(validasiPeserta([{ email: 'a%b@contoh.test' }]).galat.length > 0);
  assert.ok(validasiPeserta([]).galat.length > 0);
  assert.ok(validasiPeserta(Array.from({ length: 201 }, (_, i) => ({ email: `p${i}@contoh.test` }))).galat.length > 0);
});
