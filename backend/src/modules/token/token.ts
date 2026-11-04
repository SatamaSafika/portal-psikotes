// Token peserta: 20 karakter acak, ditulis berkelompok XXXX-XXXX-XXXX-XXXX-XXXX.
// Hanya hash SHA-256 (heksadesimal, cocok dengan kolom token_hash CHAR(64)) yang disimpan.
import { createHash, randomInt } from 'node:crypto';

/** Crockford base32: tanpa I, L, O, U supaya tidak tertukar dengan 1 dan 0 saat diketik. */
const HURUF = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const PANJANG = 20; // 20 x 5 bit = 100 bit acak

export function buatTokenPeserta(): string {
  let isi = '';
  for (let i = 0; i < PANJANG; i++) isi += HURUF[randomInt(HURUF.length)];
  return isi.match(/.{4}/g)!.join('-');
}

/**
 * Menyeragamkan token yang diketik peserta: huruf besar, tanpa tanda hubung dan spasi.
 * Null bila bentuknya pasti salah, supaya tidak perlu ke database.
 */
export function normalisasiToken(masukan: string): string | null {
  const bersih = masukan.toUpperCase().replace(/[\s-]/g, '');
  if (bersih.length !== PANJANG) return null;
  for (const c of bersih) if (!HURUF.includes(c)) return null;
  return bersih;
}

export function hashTokenPeserta(tokenNormal: string): string {
  return createHash('sha256').update(tokenNormal).digest('hex');
}

// ---------- token kelompok (sesi serentak, Part 8b) ----------

/** 10 karakter (sekitar 50 bit): pendek supaya mudah diketik satu ruangan, tetap tidak mungkin ditebak. */
const PANJANG_KELOMPOK = 10;

/** Token kelompok, tampil XXXXX-XXXXX. Huruf yang sama dengan token individu (tanpa I, L, O, U). */
export function buatTokenKelompok(): string {
  let isi = '';
  for (let i = 0; i < PANJANG_KELOMPOK; i++) isi += HURUF[randomInt(HURUF.length)];
  return `${isi.slice(0, 5)}-${isi.slice(5)}`;
}

export type JenisToken = 'INDIVIDU' | 'KELOMPOK';

/**
 * Menyeragamkan token apa pun yang diketik peserta. Jenisnya ditentukan dari panjang setelah dinormalisasi
 * (individu 20, kelompok 10), jadi kedua jenis tidak pernah tertukar. Null bila bentuknya pasti salah.
 */
export function normalisasiTokenApaSaja(masukan: string): { jenis: JenisToken; token: string } | null {
  if (typeof masukan !== 'string' || masukan.length > 64) return null;
  const bersih = masukan.toUpperCase().replace(/[\s-]/g, '');
  if (bersih.length !== PANJANG && bersih.length !== PANJANG_KELOMPOK) return null;
  for (const c of bersih) if (!HURUF.includes(c)) return null;
  return { jenis: bersih.length === PANJANG ? 'INDIVIDU' : 'KELOMPOK', token: bersih };
}
