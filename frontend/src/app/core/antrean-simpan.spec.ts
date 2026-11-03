import { AntreanSimpan } from './antrean-simpan';
import type { JawabanTersimpan } from './model';

describe('antrean simpan otomatis', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('mengumpulkan perubahan lalu mengirim sekali setelah jeda; jawaban terbaru menang', async () => {
    const kiriman: JawabanTersimpan[][] = [];
    const a = new AntreanSimpan(async (k) => void kiriman.push(k), 800);
    a.tandai(1, '2');
    a.tandai(2, '5');
    a.tandai(1, '4');
    expect(a.status()).toBe('menyimpan');
    await vi.advanceTimersByTimeAsync(800);
    expect(kiriman).toEqual([[{ nomor: 1, jawaban: '4' }, { nomor: 2, jawaban: '5' }]]);
    expect(a.status()).toBe('tersimpan');
  });

  it('gagal: jawaban dikembalikan dan dicoba lagi', async () => {
    let gagal = true;
    const kiriman: JawabanTersimpan[][] = [];
    const a = new AntreanSimpan(async (k) => {
      if (gagal) throw new Error('jaringan');
      kiriman.push(k);
    }, 800, 3000);
    a.tandai(3, null);
    await vi.advanceTimersByTimeAsync(800);
    expect(a.status()).toBe('gagal');
    expect(a.adaTertunda).toBe(true);
    gagal = false;
    await vi.advanceTimersByTimeAsync(3000);
    expect(kiriman).toEqual([[{ nomor: 3, jawaban: null }]]);
    expect(a.status()).toBe('tersimpan');
  });

  it('perubahan baru selama gagal tidak tertimpa jawaban lama', async () => {
    let gagal = true;
    const kiriman: JawabanTersimpan[][] = [];
    const a = new AntreanSimpan(async (k) => {
      if (gagal) throw new Error('jaringan');
      kiriman.push(k);
    }, 800, 3000);
    a.tandai(1, '1');
    await vi.advanceTimersByTimeAsync(800);
    a.tandai(1, '2');
    gagal = false;
    expect(await a.kosongkan()).toBe(true);
    expect(kiriman).toEqual([[{ nomor: 1, jawaban: '2' }]]);
  });

  it('kosongkan langsung mengirim tanpa menunggu jeda; berhenti menolak perubahan baru', async () => {
    const kiriman: JawabanTersimpan[][] = [];
    const a = new AntreanSimpan(async (k) => void kiriman.push(k), 800);
    a.tandai(5, 'B');
    expect(await a.kosongkan()).toBe(true);
    expect(kiriman.length).toBe(1);
    a.berhenti();
    a.tandai(6, 'S');
    expect(a.adaTertunda).toBe(false);
  });
});
