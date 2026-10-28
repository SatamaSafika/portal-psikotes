// Cek koneksi ke database proyek. Hanya membaca (SELECT), tidak mengubah apa pun.
// Jalankan: npm run db:cek
import 'dotenv/config';
import sql from 'mssql';
import { konfigurasiDb } from '../src/config/env.js';

async function main(): Promise<void> {
  const pool = await sql.connect(konfigurasiDb());
  try {
    const info = await pool.request().query<{ db: string; skema: number | null }>(
      "SELECT DB_NAME() AS db, SCHEMA_ID('psikotes') AS skema",
    );
    const { db, skema } = info.recordset[0];
    console.log(`Terhubung ke database: ${db}`);
    console.log(`Skema psikotes: ${skema === null ? 'BELUM ADA' : 'ada'}`);

    const tabel = await pool
      .request()
      .input('skema', sql.NVarChar, 'psikotes')
      .query<{ nama: string }>(
        'SELECT TABLE_NAME AS nama FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = @skema ORDER BY TABLE_NAME',
      );
    const daftar = tabel.recordset.map((t) => t.nama);
    console.log(`Tabel di skema psikotes (${daftar.length}): ${daftar.join(', ') || '-'}`);
  } finally {
    await pool.close();
  }
}

main().catch((galat: unknown) => {
  // Cetak pesan saja, bukan objek galat lengkap, supaya konfigurasi tidak ikut tercetak.
  console.error('Koneksi gagal:', galat instanceof Error ? galat.message : 'galat tidak dikenal');
  process.exitCode = 1;
});
