import 'dotenv/config';
import { app } from './app.js';
import { muatSkoring } from './config/skoring.js';
import { muatTes } from './config/tes.js';
import { tutupPool } from './db/pool.js';

// Konfigurasi tes dan skoring diperiksa saat mulai: server tidak jalan bila tidak valid.
muatTes();
muatSkoring();

const port = Number(process.env.PORT ?? 3000);

const server = app.listen(port, () => {
  console.log(`API berjalan di http://localhost:${port}`);
});

// Tutup koneksi HTTP dan pool database dengan rapi saat dihentikan.
function berhenti(): void {
  server.close(() => {
    tutupPool().finally(() => process.exit(0));
  });
}
process.once('SIGINT', berhenti);
process.once('SIGTERM', berhenti);
