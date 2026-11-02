import { createHash, randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';

// Token sesi (admin dan peserta) dikirim sebagai cookie. Yang disimpan di database hanya hash-nya.

export function buatTokenSesi(): string {
  return randomBytes(32).toString('base64url');
}

export function hashTokenSesi(token: string): Buffer {
  return createHash('sha256').update(token).digest();
}

/** Membaca token sesi dari header Cookie. Null bila tidak ada atau bentuknya salah. */
export function bacaTokenSesi(req: Request, nama: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const bagian of header.split(';')) {
    const pemisah = bagian.indexOf('=');
    if (pemisah < 0) continue;
    if (bagian.slice(0, pemisah).trim() !== nama) continue;
    const nilai = bagian.slice(pemisah + 1).trim();
    // 32 byte base64url = 43 karakter.
    return /^[A-Za-z0-9_-]{43}$/.test(nilai) ? nilai : null;
  }
  return null;
}

function opsiCookie(produksi: boolean) {
  return { httpOnly: true, secure: produksi, sameSite: 'strict' as const, path: '/api' };
}

export function tulisCookieSesi(res: Response, nama: string, token: string, maksMs: number, produksi: boolean): void {
  res.cookie(nama, token, { ...opsiCookie(produksi), maxAge: maksMs });
}

export function hapusCookieSesi(res: Response, nama: string, produksi: boolean): void {
  res.clearCookie(nama, opsiCookie(produksi));
}
