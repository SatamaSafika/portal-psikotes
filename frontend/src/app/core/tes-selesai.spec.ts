import { TestBed } from '@angular/core/testing';
import { TesSelesai, uraiTesSelesai } from './tes-selesai';

describe('penanda tes selesai (sessionStorage)', () => {
  beforeEach(() => sessionStorage.clear());

  it('hanya jenis tes yang dikenal, urut baku, isi rusak diabaikan', () => {
    expect(uraiTesSelesai('["KORAN","TIU5","TIU5","XYZ"]')).toEqual(['TIU5', 'KORAN']);
    expect(uraiTesSelesai('bukan json')).toEqual([]);
    expect(uraiTesSelesai('{"TIU5":true}')).toEqual([]);
    expect(uraiTesSelesai(null)).toEqual([]);
  });

  it('catat lalu lupakan (peserta lain di komputer yang sama)', () => {
    const s = TestBed.inject(TesSelesai);
    s.catat('TIU6');
    s.catat('TIU5');
    expect(s.daftar()).toEqual(['TIU5', 'TIU6']);
    expect(uraiTesSelesai(sessionStorage.getItem('psikotes_tes_selesai'))).toEqual(['TIU5', 'TIU6']);
    s.lupakan();
    expect(s.daftar()).toEqual([]);
    expect(sessionStorage.getItem('psikotes_tes_selesai')).toBeNull();
  });
});
