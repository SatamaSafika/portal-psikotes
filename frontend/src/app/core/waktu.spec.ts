import { HitungMundur, formatDurasi, formatSisa } from './waktu';

describe('waktu', () => {
  it('format sisa mm:ss, tidak pernah negatif', () => {
    expect(formatSisa(600)).toBe('10:00');
    expect(formatSisa(440)).toBe('07:20');
    expect(formatSisa(59.9)).toBe('00:59');
    expect(formatSisa(0)).toBe('00:00');
    expect(formatSisa(-5)).toBe('00:00');
  });

  it('format durasi', () => {
    expect(formatDurasi(600)).toBe('10 menit');
    expect(formatDurasi(440)).toBe('7 menit 20 detik');
    expect(formatDurasi(45)).toBe('45 detik');
  });

  it('hitung mundur dari sisa server, bukan jam peserta', () => {
    const h = new HitungMundur(600, 1_000);
    expect(h.sisa(1_000)).toBe(600);
    expect(h.sisa(1_500)).toBe(600); // dibulatkan ke atas
    expect(h.sisa(2_000)).toBe(599);
    expect(h.sisa(601_000)).toBe(0);
    expect(h.sisa(900_000)).toBe(0);
  });

  it('sinkron ulang mengikuti server', () => {
    const h = new HitungMundur(600, 0);
    // Server bilang sisa 550 pada saat browser mengira masih 570: ikuti server.
    h.sinkron(550, 30_000);
    expect(h.sisa(30_000)).toBe(550);
    expect(h.sisa(40_000)).toBe(540);
  });
});
