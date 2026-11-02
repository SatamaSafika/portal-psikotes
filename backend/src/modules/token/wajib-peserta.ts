import type { NextFunction, Request, Response } from 'express';
import { bacaTokenSesi, hashTokenSesi } from '../../lib/cookie.js';
import { pakaiSesiPeserta, type UjianPeserta } from './peserta.repo.js';

export const COOKIE_PESERTA = 'psikotes_peserta';
/** Batas umur cookie. Keabsahan sebenarnya ditentukan server (jam sesi dan batas_selesai). */
export const COOKIE_PESERTA_MAKS_MS = 12 * 60 * 60 * 1000;

/** Menolak permintaan tanpa sesi peserta yang sah (401). Ujian tersimpan di res.locals.ujian. */
export async function wajibPeserta(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = bacaTokenSesi(req, COOKIE_PESERTA);
  const ujian = token ? await pakaiSesiPeserta(hashTokenSesi(token)) : null;
  if (!ujian) {
    res.status(401).json({ pesan: 'Sesi tidak berlaku. Masuk dengan email dan token.' });
    return;
  }
  res.locals.ujian = ujian;
  next();
}

export function ujianAktif(res: Response): UjianPeserta {
  return res.locals.ujian as UjianPeserta;
}
