import { describe, expect, it } from 'vitest';
import { inisial } from './avatar';

describe('inisial', () => {
  it('mengambil huruf pertama dua kata pertama', () => {
    expect(inisial('Peserta Contoh Satu')).toBe('PC');
    expect(inisial('ayu lestari')).toBe('AL');
  });

  it('satu kata hanya satu huruf', () => {
    expect(inisial('Budi')).toBe('B');
  });

  it('mengabaikan tanda baca dan spasi berlebih', () => {
    expect(inisial('  Budi   S. ')).toBe('BS');
    expect(inisial('(Contoh) - Dua')).toBe('CD');
  });

  it('kosong menjadi tanda tanya', () => {
    expect(inisial('')).toBe('?');
    expect(inisial(null)).toBe('?');
  });
});
