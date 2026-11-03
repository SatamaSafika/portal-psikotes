// Semua data di sini DUMMY dan dibuat di dalam tes. Tidak membaca materi_rahasia atau backend/bank.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { KonfigurasiTes } from '../src/config/tes.js';
import { jalurGambar, soalPublik, type BankTermuat } from '../src/modules/tes/bank.js';
import type { LajurKoran } from '../src/modules/tes/bank.types.js';
import {
  barisDariCsv,
  periksaKoran,
  petakanGambar,
  ratakanBank,
  sidikJariKoran,
  susunTiu,
} from '../src/modules/tes/bank.validasi.js';

// Susunan kecil supaya tes mudah dibaca.
const KONFIG: KonfigurasiTes = {
  versi: 'uji',
  bank_aktif: 'v1',
  pengerjaan: { toleransi_kirim_detik: 5, toleransi_waktu_ms: 1000 },
  tes: {
    TIU5: { jumlah_soal: 3, jumlah_latihan: 2, jumlah_pilihan: 5 },
    TIU6: { jumlah_soal: 2, butir_per_soal: 5, jumlah_latihan: 2 },
    KORAN: { halaman: 2, lajur_per_halaman: 2, angka_per_lajur: 4, jumlah_latihan: 2 },
  },
};
const PENANDA = 'PENJELASAN-DUMMY-JANGAN-BOCOR';
const INSTRUKSI = { TIU5: 'Instruksi dummy 5', TIU6: 'Instruksi dummy 6' };
const pad = (n: number): string => String(n).padStart(2, '0');

function barisValid(): string[] {
  const b = ['tes,jenis,soal,butir,kunci,penjelasan'];
  for (let n = 1; n <= 2; n++) b.push(`TIU5,latihan,${n},,${n + 1},"${PENANDA}, dengan koma"`);
  for (let n = 1; n <= 3; n++) b.push(`TIU5,soal,${n},,${n},`);
  for (const jenis of ['latihan', 'soal']) {
    for (let n = 1; n <= 2; n++) {
      for (let u = 1; u <= 5; u++) b.push(`TIU6,${jenis},${n},${u},${u % 2 ? 'B' : 'S'},`);
    }
  }
  return b;
}

function gambarValid(): string[] {
  const g: string[] = [];
  for (let n = 1; n <= 2; n++) g.push(`latihan-tiu5-${pad(n)}.png`, `latihan-tiu6-${pad(n)}.png`, `tiu6-${pad(n)}.png`);
  for (let n = 1; n <= 3; n++) g.push(`tiu5-${pad(n)}.png`);
  return g;
}

function jalankan(baris = barisValid(), gambar = gambarValid(), instruksi: { TIU5: string | null; TIU6: string | null } = INSTRUKSI) {
  const csv = barisDariCsv(baris.join('\n'));
  const hasil = susunTiu(csv.baris, petakanGambar(gambar).dikenal, instruksi, KONFIG);
  const semuaGalat = [...csv.galat, ...hasil.galat];
  // Pesan apa pun tidak boleh memuat isi penjelasan.
  for (const pesan of [...semuaGalat, ...hasil.peringatan]) assert.ok(!pesan.includes(PENANDA), `bocor: ${pesan}`);
  return { ...hasil, galat: semuaGalat };
}

const adaGalat = (galat: string[], pola: RegExp): void =>
  assert.ok(galat.some((g) => pola.test(g)), `galat ${pola} tidak ditemukan di:\n${galat.join('\n')}`);

test('bank dummy yang lengkap lolos', () => {
  const h = jalankan();
  assert.deepEqual(h.galat, []);
  assert.deepEqual(h.peringatan, []);
  assert.equal(h.TIU5!.soal.length, 3);
  assert.equal(h.TIU5!.latihan.length, 2);
  assert.equal(h.TIU6!.soal.length, 2);
  assert.equal(h.TIU6!.soal[0].butir.length, 5);
  assert.equal(h.gambarDipakai.length, 9);
  assert.equal(h.TIU5!.latihan[0].penjelasan, `${PENANDA}, dengan koma`);
  assert.equal(h.TIU5!.soal[0].penjelasan, undefined);
  assert.ok(!('penjelasan' in h.TIU6!.soal[0].butir[0]));
  assert.ok(!('penjelasan' in h.TIU6!.latihan[0].butir[0]));
});

test('header salah ditolak', () => {
  const b = barisValid();
  b[0] = 'tes,jenis,soal,kunci';
  adaGalat(jalankan(b).galat, /header/);
});

test('nomor soal bolong', () => {
  const b = barisValid().filter((x) => x !== 'TIU5,soal,2,,2,');
  adaGalat(jalankan(b).galat, /TIU5 soal nomor 2: gambar tiu5-02\.png tidak punya kunci/);
});

test('kunci tanpa gambar', () => {
  adaGalat(jalankan(barisValid(), gambarValid().filter((g) => g !== 'tiu5-03.png')).galat, /TIU5 soal nomor 3: gambar tidak ada/);
});

test('gambar melebihi jumlah di tes.json', () => {
  adaGalat(jalankan(barisValid(), [...gambarValid(), 'tiu5-04.png']).galat, /tiu5-04\.png melebihi jumlah/);
});

test('baris ganda', () => {
  adaGalat(jalankan([...barisValid(), 'TIU5,soal,1,,3,']).galat, /baris ganda/);
});

test('kunci TIU5 di luar 1 sampai 5, berspasi, atau butir terisi', () => {
  for (const salah of ['TIU5,soal,1,,6,', 'TIU5,soal,1,,0,', 'TIU5,soal,1, ,1,', 'TIU5,soal,1,, 1,']) {
    const b = barisValid().map((x) => (x === 'TIU5,soal,1,,1,' ? salah : x));
    assert.ok(jalankan(b).galat.length > 0, salah);
  }
});

test('kunci TIU6 harus B atau S huruf besar', () => {
  const b = barisValid().map((x) => (x === 'TIU6,soal,1,1,B,' ? 'TIU6,soal,1,1,b,' : x));
  adaGalat(jalankan(b).galat, /harus B atau S/);
});

test('jumlah baris TIU6 harus Soal x 5', () => {
  const b = barisValid().filter((x) => x !== 'TIU6,soal,2,5,B,');
  const g = jalankan(b).galat;
  adaGalat(g, /TIU6 soal: ada 9 baris kunci, harusnya 2 x 5 = 10/);
  adaGalat(g, /TIU6 soal nomor 2: butir 5 tidak ada/);
});

test('latihan TIU5 wajib punya penjelasan', () => {
  const b = barisValid().map((x) => (x.startsWith('TIU5,latihan,1,') ? 'TIU5,latihan,1,,2,' : x));
  adaGalat(jalankan(b).galat, /latihan TIU5 wajib punya penjelasan/);
});

test('latihan TIU6 tanpa penjelasan lolos tanpa peringatan', () => {
  const h = jalankan();
  assert.deepEqual(h.galat, []);
  assert.deepEqual(h.peringatan, []);
  assert.equal(h.TIU6!.latihan.length, 2);
});

test('penjelasan di luar latihan TIU5 hanya peringatan dan tidak disimpan', () => {
  const b = barisValid().map((x) => {
    if (x === 'TIU5,soal,1,,1,') return `TIU5,soal,1,,1,${PENANDA}`;
    if (x === 'TIU6,latihan,1,1,B,') return `TIU6,latihan,1,1,B,${PENANDA}`;
    if (x === 'TIU6,soal,2,3,B,') return `TIU6,soal,2,3,B,${PENANDA}`;
    return x;
  });
  const h = jalankan(b);
  assert.deepEqual(h.galat, []);
  assert.equal(h.peringatan.length, 3);
  assert.equal(h.TIU5!.soal[0].penjelasan, undefined);
  assert.ok(!JSON.stringify(h.TIU6).includes(PENANDA));
});

test('instruksi kosong ditolak', () => {
  adaGalat(jalankan(barisValid(), gambarValid(), { TIU5: '  \r\n', TIU6: null }).galat, /TIU5: instruksi/);
});

test('nama berkas di luar pola dilaporkan tidak dikenal', () => {
  const p = petakanGambar(['tiu5-01.png', 'tiu5-1.png', 'TIU5-02.png', 'catatan.docx', 'tiu5-00.png']);
  assert.equal(p.dikenal.size, 1);
  assert.deepEqual(p.tidakDikenal, ['tiu5-1.png', 'TIU5-02.png', 'catatan.docx', 'tiu5-00.png']);
});

test('soal.json hasil susun lolos pemeriksaan ulang dan hasilnya sama', () => {
  const h = jalankan();
  const rata = ratakanBank({ TIU5: h.TIU5, TIU6: h.TIU6 });
  assert.deepEqual(rata.galat, []);
  const ulang = susunTiu(rata.baris, petakanGambar(gambarValid()).dikenal, rata.instruksi, KONFIG);
  assert.deepEqual(ulang.galat, []);
  assert.deepEqual(ulang.TIU5, h.TIU5);
  assert.deepEqual(ulang.TIU6, h.TIU6);
});

// ---------- Koran ----------

function koranDummy() {
  const lajur: LajurKoran[] = [];
  for (let i = 0; i < 4; i++) {
    lajur.push({ lajur: i + 1, halaman: Math.floor(i / 2) + 1, posisi: (i % 2) + 1, angka: [i, 9 - i, 5, 0] });
  }
  return {
    versi: 'koran-uji',
    dibuat_pada: '2026-01-01',
    halaman: 2,
    lajur_per_halaman: 2,
    angka_per_lajur: 4,
    sidik_jari_sha256: sidikJariKoran(lajur),
    lajur,
  };
}

test('koran dummy yang benar lolos', () => {
  assert.deepEqual(periksaKoran(koranDummy(), KONFIG).galat, []);
});

test('koran: susunan tidak sesuai tes.json', () => {
  const k = { ...koranDummy(), halaman: 3 };
  assert.match(periksaKoran(k, KONFIG).galat.join('\n'), /halaman = 3, harusnya 2/);
});

test('koran: angka di luar 0 sampai 9', () => {
  const k = koranDummy();
  k.lajur[1].angka[2] = 10;
  k.sidik_jari_sha256 = sidikJariKoran(k.lajur);
  assert.match(periksaKoran(k, KONFIG).galat.join('\n'), /digit 0 sampai 9/);
});

test('koran: angka berubah setelah dibuat terdeteksi lewat sidik jari', () => {
  const k = koranDummy();
  k.lajur[0].angka[0] = 7;
  assert.match(periksaKoran(k, KONFIG).galat.join('\n'), /sidik jari tidak cocok/);
});

// ---------- pembaca bank ----------

function bankTermuat(): BankTermuat {
  const h = jalankan();
  return {
    versi: 'v1',
    soal: { versi: 'v1', dibuat_pada: '', sidik_jari_koran: '', TIU5: h.TIU5!, TIU6: h.TIU6! },
    koran: koranDummy(),
    folder: '/bank/v1',
    gambar: new Set(h.gambarDipakai),
  };
}

test('soalPublik tidak memuat kunci', () => {
  const bank = bankTermuat();
  for (const tes of ['TIU5', 'TIU6'] as const) {
    const daftar = soalPublik(bank, tes);
    assert.ok(daftar.length > 0);
    assert.ok(!JSON.stringify(daftar).includes('kunci'));
  }
  assert.equal(soalPublik(bank, 'TIU6')[0].jumlah_butir, 5);
});

test('jalurGambar hanya menerima nama yang dirujuk bank', () => {
  const bank = bankTermuat();
  assert.ok(jalurGambar(bank, 'tiu5-01.png'));
  for (const nama of ['../soal.json', '..\\soal.json', 'tiu5-01.png/../../x', 'soal.json', 'tiu5-99.png', '']) {
    assert.equal(jalurGambar(bank, nama), null, nama);
  }
});
