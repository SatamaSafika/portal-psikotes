// Menghitung dan menyimpan hasil ujian yang sudah selesai (DIKIRIM atau WAKTU_HABIS).
// Log hanya berisi jumlah atau id ujian, tanpa nama, email, jawaban, atau kunci.
import { muatSkoring } from '../../config/skoring.js';
import { muatTes } from '../../config/tes.js';
import { hitungHasil } from '../skoring/koreksi.js';
import { muatBank } from '../tes/bank.js';
import * as repo from './hasil.repo.js';

export type StatusHitung = 'dihitung' | 'dilewati' | 'tidak_ada';

/**
 * Hitung dan simpan hasil satu ujian dari jawaban mentah.
 * "dilewati" bila jawaban mentah sudah terhapus (retensi 3 bulan) padahal sebelumnya ada jawaban,
 * supaya hasil lama tidak tertimpa nol.
 */
export async function hitungDanSimpan(id: number): Promise<StatusHitung> {
  const bahan = await repo.bahanHitung(id);
  if (!bahan) return 'tidak_ada';
  if (bahan.jawaban.length === 0 && (bahan.jumlah_dijawab_lama ?? 0) > 0) return 'dilewati';

  const skoring = muatSkoring();
  const bank = await muatBank(bahan.bank_versi);
  const hasil = hitungHasil(bahan.jenis_tes, bahan.jawaban, bank, skoring, muatTes());
  return (await repo.simpanHasil(id, hasil, skoring.versi)) ? 'dihitung' : 'tidak_ada';
}

/** Hitung semua ujian selesai yang belum punya hasil. Dipanggil berkala. */
export async function hitungTertunda(): Promise<number> {
  let jumlah = 0;
  for (const id of await repo.ujianBelumDihitung(100)) {
    try {
      if ((await hitungDanSimpan(id)) === 'dihitung') jumlah++;
    } catch (galat) {
      // Satu ujian gagal tidak menghentikan yang lain. Hanya id dan pesan, tanpa data peserta.
      console.error(`Hitung hasil ujian ${id} gagal:`, galat instanceof Error ? galat.message : 'galat tidak dikenal');
    }
  }
  return jumlah;
}

/** Hitung ulang dari jawaban mentah dengan aturan skoring terbaru: semua ujian selesai, atau satu sesi. */
export async function hitungUlang(sesiId: number | null): Promise<Record<StatusHitung | 'gagal', number>> {
  const ringkas = { dihitung: 0, dilewati: 0, tidak_ada: 0, gagal: 0 };
  for (const id of await repo.ujianSelesai(sesiId)) {
    try {
      ringkas[await hitungDanSimpan(id)]++;
    } catch (galat) {
      ringkas.gagal++;
      console.error(`Hitung ulang ujian ${id} gagal:`, galat instanceof Error ? galat.message : 'galat tidak dikenal');
    }
  }
  return ringkas;
}
