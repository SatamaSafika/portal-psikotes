export type StatusNomor = 'saat-ini' | 'dijawab' | 'kosong';

/**
 * Status kotak di panel navigasi soal.
 * TIU 6: satu Soal dianggap dijawab bila kelima butirnya terisi.
 */
export function statusNomor(saatIni: boolean, nomor: number[], jawaban: ReadonlyMap<number, string | null>): StatusNomor {
  if (saatIni) return 'saat-ini';
  return nomor.every((n) => (jawaban.get(n) ?? null) !== null) ? 'dijawab' : 'kosong';
}

/** Jumlah nomor 1..total yang sudah dijawab (tidak kosong). */
export function jumlahDijawab(total: number, jawaban: ReadonlyMap<number, string | null>): number {
  let n = 0;
  for (let i = 1; i <= total; i++) if ((jawaban.get(i) ?? null) !== null) n++;
  return n;
}
