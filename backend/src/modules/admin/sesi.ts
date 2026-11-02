import type { Request, Response } from 'express';
import { bacaTokenSesi, buatTokenSesi, hapusCookieSesi, hashTokenSesi, tulisCookieSesi } from '../../lib/cookie.js';

export const NAMA_COOKIE = 'psikotes_admin';
/** Sesi berakhir bila tidak ada permintaan selama ini. */
export const SESI_IDLE_MENIT = 30;
/** Sesi berakhir paling lambat sekian jam setelah login, aktif atau tidak. */
export const SESI_MAKS_JAM = 8;

export const buatToken = buatTokenSesi;
export const hashToken = hashTokenSesi;

export function bacaToken(req: Request): string | null {
  return bacaTokenSesi(req, NAMA_COOKIE);
}

export function tulisCookie(res: Response, token: string, produksi: boolean): void {
  tulisCookieSesi(res, NAMA_COOKIE, token, SESI_MAKS_JAM * 60 * 60 * 1000, produksi);
}

export function hapusCookie(res: Response, produksi: boolean): void {
  hapusCookieSesi(res, NAMA_COOKIE, produksi);
}
