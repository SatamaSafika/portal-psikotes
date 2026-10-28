import type { config as KonfigurasiMssql } from 'mssql';

// Variabel wajib untuk koneksi database. Nilainya hanya ada di backend/.env.
const WAJIB = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'] as const;

function bacaBoolean(nama: string, bawaan: boolean): boolean {
  const nilai = process.env[nama];
  if (nilai === undefined || nilai === '') return bawaan;
  return nilai.toLowerCase() === 'true';
}

/**
 * Menyusun konfigurasi mssql dari process.env.
 * Galat hanya menyebut nama variabel, tidak pernah nilainya.
 */
export function konfigurasiDb(): KonfigurasiMssql {
  const kosong = WAJIB.filter((nama) => !process.env[nama]);
  if (kosong.length > 0) {
    throw new Error(`Variabel .env belum diisi: ${kosong.join(', ')}`);
  }

  const port = Number(process.env.DB_PORT);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('DB_PORT harus berupa angka bulat positif');
  }

  return {
    server: process.env.DB_HOST!,
    port,
    database: process.env.DB_NAME!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    options: {
      encrypt: bacaBoolean('DB_ENCRYPT', true),
      trustServerCertificate: bacaBoolean('DB_TRUST_CERT', false),
    },
  };
}
