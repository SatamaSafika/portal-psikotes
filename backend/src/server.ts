import 'dotenv/config';
import { app } from './app.js';
import { durasiUji } from './config/durasi.js';
import { muatSkoring } from './config/skoring.js';
import { muatTes } from './config/tes.js';
import { tutupPool } from './db/pool.js';
import { tutupOtomatis } from './modules/tes/pengerjaan.repo.js';

// Konfigurasi tes dan skoring diperiksa saat mulai: server tidak jalan bila tidak valid.
muatTes();
muatSkoring();
const uji = durasiUji();
if (uji !== null) console.warn(`PERINGATAN: DURASI_UJI_DETIK aktif, semua tes berdurasi ${uji} detik (hanya untuk pengujian).`);

const port = Number(process.env.PORT ?? 3000);

const server = app.listen(port, () => {
  console.log(`API berjalan di http://localhost:${port}`);
});

// Ujian yang waktunya habis terkirim otomatis; token yang jadwalnya lewat menjadi kedaluwarsa.
// Galat hanya dicetak nomornya atau pesannya, tanpa data peserta.
const SELANG_TUTUP_MS = 15_000;
async function jalankanTutupOtomatis(): Promise<void> {
  try {
    await tutupOtomatis(muatTes().pengerjaan.toleransi_kirim_detik);
  } catch (galat) {
    const nomor = (galat as { number?: unknown })?.number;
    console.error('Tutup otomatis gagal:', typeof nomor === 'number' ? `galat database nomor ${nomor}` : galat instanceof Error ? galat.message : 'galat tidak dikenal');
  }
}
void jalankanTutupOtomatis();
const pewaktuTutup = setInterval(() => void jalankanTutupOtomatis(), SELANG_TUTUP_MS);
pewaktuTutup.unref();

// Tutup koneksi HTTP dan pool database dengan rapi saat dihentikan.
function berhenti(): void {
  clearInterval(pewaktuTutup);
  server.close(() => {
    tutupPool().finally(() => process.exit(0));
  });
}
process.once('SIGINT', berhenti);
process.once('SIGTERM', berhenti);
