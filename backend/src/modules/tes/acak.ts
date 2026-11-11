// Urutan soal acak per peserta (TIU 5 dan TIU 6), tanpa kolom baru di database.
// Urutan diturunkan secara deterministik dari id ujian, jenis tes, dan versi bank: setiap catatan ujian punya urutan
// sendiri, dan urutan itu selalu sama saat halaman dimuat ulang atau tes dilanjutkan (tidak diacak ulang).
// Yang diacak hanya urutan tampil. Nomor asli soal tetap dipakai untuk jawaban, kunci, dan skoring.
import { createHash } from 'node:crypto';

/** Aliran bilangan semu dari SHA-256(benih | penghitung), cukup untuk mengacak urutan tampil. */
function* aliran(benih: string): Generator<number> {
  for (let i = 0; ; i++) {
    const h = createHash('sha256').update(`${benih}|${i}`).digest();
    for (let j = 0; j + 4 <= h.length; j += 4) yield h.readUInt32BE(j);
  }
}

/** Bilangan bulat seragam di [0, n) tanpa bias modulo (sampel yang jatuh di sisa ditolak). */
function bilangan(acak: Generator<number>, n: number): number {
  const batas = Math.floor(0x1_0000_0000 / n) * n;
  for (;;) {
    const x = acak.next().value as number;
    if (x < batas) return x % n;
  }
}

/** Fisher-Yates dengan benih tetap. Larik asal tidak diubah. */
export function acakUrutan<T>(item: readonly T[], benih: string): T[] {
  const hasil = [...item];
  const acak = aliran(benih);
  for (let i = hasil.length - 1; i > 0; i--) {
    const j = bilangan(acak, i + 1);
    [hasil[i], hasil[j]] = [hasil[j], hasil[i]];
  }
  return hasil;
}

/** Benih urutan soal untuk satu catatan ujian. */
export function benihUjian(ujianId: number, jenisTes: string, bankVersi: string): string {
  return `psikotes-urutan-soal|${ujianId}|${jenisTes}|${bankVersi}`;
}
