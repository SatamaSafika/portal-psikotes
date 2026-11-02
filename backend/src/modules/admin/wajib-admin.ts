import type { NextFunction, Request, Response } from 'express';
import { pakaiSesi, type AdminSesi } from './admin.repo.js';
import { SESI_IDLE_MENIT, SESI_MAKS_JAM, bacaToken, hashToken } from './sesi.js';

/** Menolak permintaan tanpa sesi admin yang sah (401). Admin tersimpan di res.locals.admin. */
export async function wajibAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = bacaToken(req);
  const admin = token ? await pakaiSesi(hashToken(token), SESI_IDLE_MENIT, SESI_MAKS_JAM) : null;
  if (!admin) {
    res.status(401).json({ pesan: 'Silakan login terlebih dahulu' });
    return;
  }
  res.locals.admin = admin;
  next();
}

export function adminAktif(res: Response): AdminSesi {
  return res.locals.admin as AdminSesi;
}
