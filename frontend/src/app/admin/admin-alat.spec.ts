// Data DUMMY (domain contoh.test).
import { tampilToken } from '../halaman/verifikasi';
import { batasAtas, buatCsv, persenKuota, skalaGrafik, uraiEmail, uraiKuota, uraiPeserta } from './admin-alat';
import type { Interval } from './admin-model';

describe('sesi serentak', () => {
  it('kuota bilangan bulat 1 sampai 1000', () => {
    expect(uraiKuota('50')).toBe(50);
    expect(uraiKuota(' 1000 ')).toBe(1000);
    for (const salah of ['', '0', '1001', '2.5', '-3', 'abc', '1e2']) expect(uraiKuota(salah)).toBeNull();
  });

  it('email penerima dinormalisasi atau ditolak', () => {
    expect(uraiEmail(' Pengawas@Contoh.Test ')).toBe('pengawas@contoh.test');
    expect(uraiEmail('bukan-email')).toBeNull();
    expect(uraiEmail('a@b.test\nBcc: x@y.test')).toBeNull();
  });

  it('batang kuota dibatasi 0 sampai 100 persen', () => {
    expect(persenKuota(0, 50)).toBe(0);
    expect(persenKuota(25, 50)).toBe(50);
    expect(persenKuota(51, 50)).toBe(100);
    expect(persenKuota(1, 0)).toBe(0);
  });

  it('token ditampilkan dengan format baku', () => {
    expect(tampilToken('abcde fghjk')).toBe('ABCDE-FGHJK');
    expect(tampilToken('abcd-efgh-jkmn-pqrs-tvwx')).toBe('ABCD-EFGH-JKMN-PQRS-TVWX');
    expect(tampilToken('abcdefghjkmnpqrstvwx')).toBe('ABCD-EFGH-JKMN-PQRS-TVWX');
  });
});

describe('daftar peserta dari teks', () => {
  it('email saja atau email dengan nama, berbagai pemisah, baris kosong dilewati', () => {
    const r = uraiPeserta(' Peserta.Satu@Contoh.TEST , Peserta Satu\n\npeserta.dua@contoh.test\npeserta.tiga@contoh.test;Peserta Tiga\r\n');
    expect(r.galat).toEqual([]);
    expect(r.peserta).toEqual([
      { email: 'peserta.satu@contoh.test', nama: 'Peserta Satu' },
      { email: 'peserta.dua@contoh.test', nama: null },
      { email: 'peserta.tiga@contoh.test', nama: 'Peserta Tiga' },
    ]);
  });

  it('email tidak valid atau ganda disebut nomor barisnya', () => {
    const r = uraiPeserta('bukan-email\na@contoh.test\nA@contoh.test');
    expect(r.galat).toEqual(['Baris 1: email tidak valid', 'Baris 3: email ganda']);
    expect(r.peserta.length).toBe(1);
  });
});

describe('skala grafik 22 interval', () => {
  const kosong: Interval[] = Array.from({ length: 22 }, () => ({ dikerjakan: 0, benar: 0, salah: 0 }));

  it('batas atas kelipatan 4, minimal 4', () => {
    expect(batasAtas(0)).toBe(4);
    expect(batasAtas(13)).toBe(16);
    expect(batasAtas(16)).toBe(16);
  });

  it('22 titik dari kiri ke kanan, nilai 0 di dasar', () => {
    const s = skalaGrafik(kosong);
    expect(s.x.length).toBe(22);
    expect(s.x[0]).toBe(44);
    expect(s.x[21]).toBe(744);
    expect(s.titik.benar.every((t) => t.y === s.dasarY)).toBe(true);
    expect(s.gridY.map((g) => g.label)).toEqual([0, 1, 2, 3, 4]);
  });

  it('nilai tertinggi menyentuh garis atas', () => {
    const iv = kosong.map((x, i) => (i === 3 ? { dikerjakan: 12, benar: 10, salah: 2 } : x));
    const s = skalaGrafik(iv);
    expect(s.maks).toBe(12);
    expect(s.titik.dikerjakan[3].y).toBe(16);
    expect(s.garis.salah.split(' ').length).toBe(22);
  });
});

describe('CSV untuk Excel', () => {
  it('BOM, titik koma, CRLF, dan tanda kutip bila perlu', () => {
    const csv = buatCsv(['Nama', 'Skor'], [['Peserta; Satu', 4], ['Peserta "Dua"', null]]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toBe('﻿Nama;Skor\r\n"Peserta; Satu";4\r\n"Peserta ""Dua""";\r\n');
  });

  it('nilai yang tampak seperti rumus tidak dijalankan Excel', () => {
    expect(buatCsv(['x'], [['=1+1'], ['-5'], ['@a']])).toBe("﻿x\r\n'=1+1\r\n'-5\r\n'@a\r\n");
  });
});
