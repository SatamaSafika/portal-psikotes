// Data DUMMY (domain contoh.test). Sesi serentak (Part 8b), tanpa database.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validasiCekToken, validasiMasukKelompok, validasiNama, validasiSesiKelompok } from '../src/modules/token/sesi.validasi.js';
import { buatTokenKelompok, buatTokenPeserta, hashTokenPeserta, normalisasiTokenApaSaja } from '../src/modules/token/token.js';
import { isiEmailKelompok, templateBawaan, validasiTemplate } from '../src/modules/token/undangan.js';

// ---------- token kelompok ----------

test('token kelompok 10 karakter tampil XXXXX-XXXXX tanpa huruf mirip', () => {
  for (let i = 0; i < 200; i++) {
    const t = buatTokenKelompok();
    assert.match(t, /^[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}$/);
  }
  assert.equal(new Set(Array.from({ length: 1000 }, buatTokenKelompok)).size, 1000);
});

test('normalisasi: huruf kecil, spasi, tanda hubung; jenis dari panjang', () => {
  const k = buatTokenKelompok();
  const polos = k.replace('-', '');
  assert.deepEqual(normalisasiTokenApaSaja(k.toLowerCase()), { jenis: 'KELOMPOK', token: polos });
  assert.deepEqual(normalisasiTokenApaSaja(` ${polos.slice(0, 3)} ${polos.slice(3)} `), { jenis: 'KELOMPOK', token: polos });
  const ind = buatTokenPeserta();
  assert.equal(normalisasiTokenApaSaja(ind)?.jenis, 'INDIVIDU');
  // Hash yang sama apa pun cara mengetiknya.
  assert.equal(hashTokenPeserta(normalisasiTokenApaSaja(k.toLowerCase())!.token), hashTokenPeserta(polos));
});

test('normalisasi menolak panjang lain atau huruf mirip', () => {
  for (const salah of ['SALAH-0000', 'ABCDE-FGHJ', 'ILOU0-12345', '', 'A'.repeat(70)]) {
    assert.equal(normalisasiTokenApaSaja(salah), null, salah);
  }
});

// ---------- validasi ----------

const JADWAL = [
  { tes: 'TIU5', tanggal: '2026-11-10', waktu_buka: '08:00', waktu_tutup: '10:00' },
  { tes: 'KORAN', tanggal: '2026-11-10', waktu_buka: '11:30', waktu_tutup: '12:30' },
];

test('sesi kelompok valid: kuota, email penerima, 1 sampai 3 tes', () => {
  const v = validasiSesiKelompok({ nama_sesi: 'Magang Contoh', kuota: 40, email_penerima: ' Panitia@Contoh.TEST ', jadwal: JADWAL });
  assert.deepEqual(v.galat, []);
  assert.equal(v.sesi!.email_penerima, 'panitia@contoh.test');
  assert.deepEqual(v.sesi!.jadwal.map((j) => j.tes), ['TIU5', 'KORAN']);
});

test('sesi kelompok: kuota di luar 1 sampai 1000, email salah, tanpa tes ditolak', () => {
  const dasar = { nama_sesi: 'Magang Contoh', kuota: 40, email_penerima: 'panitia@contoh.test', jadwal: JADWAL };
  for (const ubah of [{ kuota: 0 }, { kuota: 1001 }, { kuota: 2.5 }, { kuota: '40' }, { email_penerima: 'bukan' }, { jadwal: [] }, { nama_sesi: '' }]) {
    assert.equal(validasiSesiKelompok({ ...dasar, ...ubah }).sesi, null, JSON.stringify(ubah));
  }
  assert.ok(validasiSesiKelompok({ ...dasar, kuota: 1000 }).sesi);
});

test('nama peserta: dirapikan, 2 sampai 100 karakter', () => {
  assert.equal(validasiNama('  Ayu   Lestari '), 'Ayu Lestari');
  assert.equal(validasiNama('A'), null);
  assert.equal(validasiNama('   '), null);
  assert.equal(validasiNama('x'.repeat(101)), null);
  assert.equal(validasiNama(12), null);
});

test('langkah 1 dan 2: tes pilihan wajib, kelompok wajib nama', () => {
  const k = buatTokenKelompok();
  assert.deepEqual(validasiCekToken({ token: k, jenis_tes: 'TIU5' }, normalisasiTokenApaSaja)?.jenis, 'KELOMPOK');
  assert.equal(validasiCekToken({ token: k, jenis_tes: 'TIU7' }, normalisasiTokenApaSaja), null);
  assert.equal(validasiCekToken({ token: 'salah', jenis_tes: 'TIU5' }, normalisasiTokenApaSaja), null);
  assert.deepEqual(
    validasiMasukKelompok({ token: k, jenis_tes: 'KORAN', nama: ' Budi  Santoso ', email: ' Budi@Contoh.TEST ' }, normalisasiTokenApaSaja),
    { token: k.replace('-', ''), jenis_tes: 'KORAN', nama: 'Budi Santoso', email: 'budi@contoh.test' },
  );
  assert.equal(validasiMasukKelompok({ token: k, jenis_tes: 'KORAN', email: 'budi@contoh.test' }, normalisasiTokenApaSaja), null);
  // Email wajib (revisi HC 19 November 2026) dan formatnya diperiksa.
  assert.equal(validasiMasukKelompok({ token: k, jenis_tes: 'KORAN', nama: 'Budi' }, normalisasiTokenApaSaja), null);
  assert.equal(validasiMasukKelompok({ token: k, jenis_tes: 'KORAN', nama: 'Budi', email: 'budi@' }, normalisasiTokenApaSaja), null);
  // Token individu tidak bisa dipakai di jalur kelompok.
  assert.equal(
    validasiMasukKelompok({ token: buatTokenPeserta(), jenis_tes: 'KORAN', nama: 'Budi', email: 'budi@contoh.test' }, normalisasiTokenApaSaja),
    null,
  );
});

// ---------- template kelompok ----------

test('template kelompok bawaan valid, netral, tanpa larangan membagikan token', () => {
  const t = templateBawaan('KELOMPOK');
  assert.deepEqual(validasiTemplate(t, 'KELOMPOK'), []);
  assert.ok(!/bakrie|autoparts/i.test(`${t.subjek} ${t.isi}`));
  assert.ok(!/jangan bagikan/i.test(t.isi));
});

test('penanda per mode: {nama} hanya individu, {nama_sesi} dan {kuota} hanya kelompok', () => {
  assert.match(validasiTemplate({ subjek: 'S', isi: 'Halo {nama} {daftar_token}' }, 'KELOMPOK').join(), /\{nama\}/);
  assert.match(validasiTemplate({ subjek: 'S', isi: '{kuota} {daftar_token}' }, 'INDIVIDU').join(), /\{kuota\}/);
  assert.deepEqual(validasiTemplate({ subjek: '{nama_sesi}', isi: '{kuota} {tautan} {daftar_token}' }, 'KELOMPOK'), []);
  assert.match(validasiTemplate({ subjek: 'S', isi: 'tanpa token' }, 'KELOMPOK').join(), /daftar_token/);
});

test('email token kelompok berisi sesi, kuota, dan token tiap tes', () => {
  const u = isiEmailKelompok(templateBawaan('KELOMPOK'), {
    email: 'panitia@contoh.test',
    namaSesi: 'Magang Contoh',
    kuota: 40,
    portalUrl: 'https://psikotes.contoh.test',
    token: [{ tes: 'TIU5', token: 'AAAAA-BBBBB', tanggal: '2026-11-10', waktu_buka: '08:00', waktu_tutup: '10:00' }],
  });
  assert.equal(u.email, 'panitia@contoh.test');
  assert.ok(u.isi.includes('sesi Magang Contoh'));
  assert.ok(u.isi.includes('maksimal 40 orang'));
  assert.ok(u.isi.includes('Tes 2 - Selasa, 10 November 2026, pukul 08:00-10:00\r\nToken: AAAAA-BBBBB'));
  assert.ok(!/TIU|Koran/.test(u.isi), 'nama jenis tes tidak boleh tampil di email token kelompok');
  assert.ok(u.isi.includes('membuka https://psikotes.contoh.test/operator, memilih tes'));
  assert.ok(!/\{[a-z_]+\}/.test(u.subjek + u.isi));
});
