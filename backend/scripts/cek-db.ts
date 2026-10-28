// Cek koneksi ke database proyek. Hanya membaca (SELECT), tidak mengubah apa pun.
// Database BA dipakai bersama, jadi hanya tabel berprefix HCIS_Psikotes_ yang dilihat.
// Jalankan: npm run db:cek
import 'dotenv/config';
import sql from 'mssql';
import { konfigurasiDb } from '../src/config/env.js';

async function main(): Promise<void> {
  const pool = await sql.connect(konfigurasiDb());
  try {
    const info = await pool.request().query<{ db: string }>('SELECT DB_NAME() AS db');
    console.log(`Terhubung ke database: ${info.recordset[0].db}`);

    // Garis bawah di LIKE harus di-escape dengan [_] supaya tidak dianggap wildcard.
    const tabel = await pool
      .request()
      .input('skema', sql.NVarChar, 'dbo')
      .input('pola', sql.NVarChar, 'HCIS[_]Psikotes[_]%')
      .query<{ nama: string }>(
        'SELECT TABLE_NAME AS nama FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = @skema AND TABLE_NAME LIKE @pola ORDER BY TABLE_NAME',
      );
    const daftar = tabel.recordset.map((t) => t.nama);
    console.log(`Tabel HCIS_Psikotes_ (${daftar.length}): ${daftar.join(', ') || '-'}`);
  } finally {
    await pool.close();
  }
}

main().catch((galat: unknown) => {
  // Cetak pesan saja, bukan objek galat lengkap, supaya konfigurasi tidak ikut tercetak.
  console.error('Koneksi gagal:', galat instanceof Error ? galat.message : 'galat tidak dikenal');
  process.exitCode = 1;
});
