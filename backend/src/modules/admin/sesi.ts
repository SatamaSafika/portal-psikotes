import { createHash, randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';

export const NAMA_COOKIE = 'psikotes_admin';
/** Sesi berakhir bila tidak ada permintaan selama ini. */
export const SESI_IDLE_MENIT = 30;
/** Sesi berakhir paling lambat sekian jam setelah login, aktif atau tidak. */
export const SESI_MAKS_JAM = 8;

/** Token acak 32 byte untuk cookie. Yang disimpan di database hanya hash-nya. */
export function buatToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): Buffer {
  return createHash('sha256').update(token).digest();
}

/** Membaca token sesi dari header Cookie. Mengembalikan null bila tidak ada atau bentuknya salah. */
export function bacaToken(req: Request): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const bagian of header.split(';')) {
    const pemisah = bagian.indexOf('=');
    if (pemisah < 0) continue;
    if (bagian.slice(0, pemisah).trim() !== NAMA_COOKIE) continue;
    const nilai = bagian.slice(pemisah + 1).trim();
    // 32 byte base64url = 43 karakter.
    return /^[A-Za-z0-9_-]{43}$/.test(nilai) ? nilai : null;
  }
  return null;
}

function opsiCookie(produksi: boolean) {
  return {
    httpOnly: true,
    secure: produksi,
    sameSite: 'strict' as const,
    path: '/api',
  };
}

export function tulisCookie(res: Response, token: string, produksi: boolean): void {
  res.cookie(NAMA_COOKIE, token, { ...opsiCookie(produksi), maxAge: SESI_MAKS_JAM * 60 * 60 * 1000 });
}

export function hapusCookie(res: Response, produksi: boolean): void {
  res.clearCookie(NAMA_COOKIE, opsiCookie(produksi));
}
