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
    pool: { max: 10, min: 0, idleTimeoutMillis: 30_000 },
  };
}

function bacaBulatPositif(nama: string, bawaan: number): number {
  const nilai = process.env[nama];
  if (nilai === undefined || nilai === '') return bawaan;
  const angka = Number(nilai);
  if (!Number.isInteger(angka) || angka <= 0) {
    throw new Error(`${nama} harus berupa angka bulat positif`);
  }
  return angka;
}

export interface KonfigurasiAplikasi {
  produksi: boolean;
  corsOrigin: string[];
  /** Nilai untuk app.set('trust proxy'): false, true, atau jumlah proxy. */
  trustProxy: boolean | number;
  loginMaksGagal: number;
  loginKunciMenit: number;
  /** Alamat portal peserta, dipakai di undangan email. */
  portalUrl: string;
}

/** Konfigurasi aplikasi selain database. Semua punya nilai bawaan. */
export function konfigurasiAplikasi(): KonfigurasiAplikasi {
  const corsOrigin = (process.env.CORS_ORIGIN ?? 'http://localhost:4200')
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o !== '');

  const proxy = process.env.TRUST_PROXY ?? '';
  let trustProxy: boolean | number = false;
  if (proxy.toLowerCase() === 'true') trustProxy = true;
  else if (proxy !== '' && proxy.toLowerCase() !== 'false') trustProxy = bacaBulatPositif('TRUST_PROXY', 1);

  return {
    produksi: process.env.NODE_ENV === 'production',
    corsOrigin,
    trustProxy,
    loginMaksGagal: bacaBulatPositif('LOGIN_MAKS_GAGAL', 5),
    loginKunciMenit: bacaBulatPositif('LOGIN_KUNCI_MENIT', 15),
    portalUrl: bacaPortalUrl(),
  };
}

function bacaPortalUrl(): string {
  const nilai = (process.env.PORTAL_URL ?? 'http://localhost:4200').replace(/\/+$/, '');
  let url: URL;
  try {
    url = new URL(nilai);
  } catch {
    throw new Error('PORTAL_URL harus berupa alamat lengkap, contoh https://psikotes.contoh.id');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('PORTAL_URL harus diawali http:// atau https://');
  }
  return nilai;
}
