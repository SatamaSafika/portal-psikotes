import { jumlahDijawab, statusNomor } from './navigasi';

describe('navigasi soal', () => {
  const j = new Map<number, string | null>([
    [1, '3'],
    [2, null],
    [6, 'B'], [7, 'S'], [8, 'B'], [9, 'B'], [10, 'S'],
    [11, 'B'],
  ]);

  it('status TIU 5: saat ini, dijawab, kosong', () => {
    expect(statusNomor(true, [1], j)).toBe('saat-ini');
    expect(statusNomor(false, [1], j)).toBe('dijawab');
    expect(statusNomor(false, [2], j)).toBe('kosong'); // dikosongkan lagi
    expect(statusNomor(false, [3], j)).toBe('kosong'); // belum pernah
  });

  it('status TIU 6: dijawab hanya bila kelima butir terisi', () => {
    expect(statusNomor(false, [6, 7, 8, 9, 10], j)).toBe('dijawab');
    expect(statusNomor(false, [11, 12, 13, 14, 15], j)).toBe('kosong');
  });

  it('jumlah dijawab tidak menghitung yang dikosongkan', () => {
    expect(jumlahDijawab(30, j)).toBe(7);
    expect(jumlahDijawab(5, j)).toBe(1);
  });
});
