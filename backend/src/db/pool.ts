import sql from 'mssql';
import { konfigurasiDb } from '../config/env.js';

// Satu pool bersama untuk seluruh aplikasi. Dibuat saat pertama dipakai.
let janjiPool: Promise<sql.ConnectionPool> | null = null;

export function ambilPool(): Promise<sql.ConnectionPool> {
  if (!janjiPool) {
    const pool = new sql.ConnectionPool(konfigurasiDb());
    // Galat pool dicetak pesannya saja, supaya konfigurasi tidak ikut tercetak.
    pool.on('error', (galat: unknown) => {
      console.error('Galat pool database:', galat instanceof Error ? galat.message : 'galat tidak dikenal');
    });
    janjiPool = pool.connect().catch((galat: unknown) => {
      // Gagal konek: kosongkan supaya permintaan berikutnya mencoba lagi.
      janjiPool = null;
      throw galat;
    });
  }
  return janjiPool;
}

export async function tutupPool(): Promise<void> {
  if (!janjiPool) return;
  const pool = await janjiPool.catch(() => null);
  janjiPool = null;
  await pool?.close();
}
