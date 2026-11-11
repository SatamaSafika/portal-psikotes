import { HttpErrorResponse } from '@angular/common/http';
import { AntreanKoran, JamKoran, SusunanKoran, saringDigit, type JawabanKoran } from './koran';
import { LATIHAN_KORAN, kunciKoran } from '../koran/latihan';

// Susunan dari server (sama dengan tes.json saat ini): 13 halaman x 4 lajur x 20 angka.
const S = new SusunanKoran({ halaman: 13, lajur_per_halaman: 4, angka_per_lajur: 20 });

describe('susunan Koran (dari konfigurasi server)', () => {
  it('19 kotak per lajur, 76 per halaman, 988 total', () => {
    expect(S.kotakPerLajur).toBe(19);
    expect(S.kotakPerHalaman).toBe(76);
    expect(S.total).toBe(988);
  });

  it('nomor datar sama dengan backend: (lajur - 1) x 19 + kotak', () => {
    expect(S.nomor(1, 1)).toBe(1);
    expect(S.nomor(1, 19)).toBe(19);
    expect(S.nomor(2, 1)).toBe(20);
    expect(S.nomor(52, 19)).toBe(988);
  });

  it('halaman dan lajur per halaman', () => {
    expect(S.halamanDari(1)).toBe(1);
    expect(S.halamanDari(76)).toBe(1);
    expect(S.halamanDari(77)).toBe(2);
    expect(S.halamanDari(988)).toBe(13);
    expect(S.lajurDiHalaman(1)).toEqual([1, 2, 3, 4]);
    expect(S.lajurDiHalaman(13)).toEqual([49, 50, 51, 52]);
    expect(S.nomorTerakhirHalaman(2)).toBe(152);
  });

  it('halaman setelah refresh mengikuti nomor terakhir tersimpan', () => {
    expect(S.halamanPulih(0)).toBe(1);
    expect(S.halamanPulih(75)).toBe(1);
    expect(S.halamanPulih(76)).toBe(2); // halaman 1 penuh: langsung halaman 2
    expect(S.halamanPulih(77)).toBe(2);
    expect(S.halamanPulih(988)).toBe(13);
  });

  it('susunan lain cukup dari konfigurasi (mis. 20 kotak per lajur)', () => {
    const lain = new SusunanKoran({ halaman: 13, lajur_per_halaman: 4, angka_per_lajur: 21 });
    expect(lain.total).toBe(1040);
    expect(lain.nomor(2, 1)).toBe(21);
  });
});

describe('isi kotak', () => {
  it('hanya satu digit, digit terakhir yang dipakai', () => {
    expect(saringDigit('7')).toBe('7');
    expect(saringDigit('12')).toBe('2');
    expect(saringDigit('a')).toBe('');
    expect(saringDigit('3x')).toBe('3');
    expect(saringDigit('')).toBe('');
    expect(saringDigit(' 9 ')).toBe('9');
  });
});

describe('waktu jawaban Koran', () => {
  it('dari waktu berjalan server ditambah selang jam browser', () => {
    const jam = new JamKoran(1_200, 10_000);
    expect(jam.ambil(10_000)).toBe(1_200);
    expect(jam.ambil(12_500)).toBe(3_700);
  });

  it('tidak pernah mundur setelah sinkron ulang', () => {
    const jam = new JamKoran(0, 0);
    expect(jam.ambil(30_000)).toBe(30_000);
    // Server bilang baru 29.400 ms berjalan: jawaban berikutnya tetap >= 30.000.
    jam.sinkron(29_400, 30_000);
    expect(jam.ambil(30_100)).toBe(30_000);
    expect(jam.ambil(31_000)).toBe(30_400);
  });
});

describe('antrean Koran', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  const j = (nomor: number): JawabanKoran => ({ nomor, jawaban: '1', waktu_ms: nomor * 100 });
  const galat400 = new HttpErrorResponse({ status: 400 });

  it('mengirim berurutan setelah jeda atau setelah 20 jawaban', async () => {
    const kiriman: number[][] = [];
    const a = new AntreanKoran(async (k) => void kiriman.push(k.map((x) => x.nomor)), () => false, async () => 0, 2000, 3);
    a.tambah(j(1));
    a.tambah(j(2));
    expect(kiriman).toEqual([]);
    a.tambah(j(3)); // mencapai batas jumlah: langsung dikirim
    await vi.advanceTimersByTimeAsync(0);
    expect(kiriman).toEqual([[1, 2, 3]]);
    a.tambah(j(4));
    await vi.advanceTimersByTimeAsync(2000);
    expect(kiriman).toEqual([[1, 2, 3], [4]]);
    expect(a.status()).toBe('tersimpan');
  });

  it('gagal jaringan: kiriman yang sama dicoba lagi', async () => {
    let gagal = true;
    const kiriman: number[][] = [];
    const a = new AntreanKoran(async (k) => {
      if (gagal) throw new Error('jaringan');
      kiriman.push(k.map((x) => x.nomor));
    }, () => false, async () => 0, 2000, 20, 3000);
    a.tambah(j(1));
    await vi.advanceTimersByTimeAsync(2000);
    expect(a.status()).toBe('gagal');
    gagal = false;
    await vi.advanceTimersByTimeAsync(3000);
    expect(kiriman).toEqual([[1]]);
    expect(a.jumlahTertunda).toBe(0);
  });

  it('"nomor harus X": baca nomor terakhir tersimpan, buang yang sudah masuk, lanjutkan', async () => {
    // Kiriman 1-2 sebenarnya sudah masuk di server sebelum koneksi putus.
    const server = { terakhir: 2 };
    const kiriman: number[][] = [];
    const a = new AntreanKoran(
      async (k) => {
        if (k[0].nomor !== server.terakhir + 1) throw galat400;
        kiriman.push(k.map((x) => x.nomor));
        server.terakhir = k[k.length - 1].nomor;
      },
      (g) => g instanceof HttpErrorResponse && g.status === 400,
      async () => server.terakhir,
    );
    a.tambah(j(1));
    a.tambah(j(2));
    a.tambah(j(3));
    expect(await a.kosongkan()).toBe(true);
    expect(kiriman).toEqual([[3]]);
    expect(server.terakhir).toBe(3);
  });
});

describe('bahan latihan Koran (latihan.ts, sama dengan prototipe)', () => {
  it('kunci contoh dan uji coba', () => {
    expect(kunciKoran(LATIHAN_KORAN.contoh1)).toEqual([5, 4, 5, 7]);
    expect(kunciKoran(LATIHAN_KORAN.contoh2)).toEqual([4, 3, 5, 6, 5]);
    expect(kunciKoran(LATIHAN_KORAN.ujiCoba)).toEqual([7, 1, 4, 3, 6, 1]);
    // 5+8=13, 8+2=10, 2+9=11, 9+4=13, 4+1=5, 1+7=8
    expect(kunciKoran(LATIHAN_KORAN.ujiCoba2)).toEqual([3, 0, 1, 3, 5, 8]);
  });
});
