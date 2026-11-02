import cors from 'cors';
import express, { type Express } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import type { KonfigurasiAplikasi } from '../config/env.js';

const LIMA_BELAS_MENIT = 15 * 60 * 1000;

/** Helmet, CORS terbatas, batas laju umum, dan parser JSON berukuran kecil. */
export function pasangKeamanan(app: Express, konfig: KonfigurasiAplikasi): void {
  app.set('trust proxy', konfig.trustProxy);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(
    cors({
      // Hanya origin terdaftar. Origin lain tidak mendapat header CORS.
      origin: konfig.corsOrigin,
      credentials: true,
    }),
  );
  app.use(
    '/api',
    rateLimit({
      windowMs: LIMA_BELAS_MENIT,
      limit: 300,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { pesan: 'Terlalu banyak permintaan. Coba lagi nanti.' },
    }),
  );
  // Respons API tidak boleh disimpan di cache browser atau proxy (ada token dan data peserta).
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  // Daftar peserta saat membuat sesi bisa lebih besar dari batas umum. Harus dipasang sebelum
  // parser umum; body yang sudah diurai tidak diurai lagi.
  app.use('/api/admin/sesi', express.json({ limit: '200kb' }));
  app.use(express.json({ limit: '10kb' }));
}

/** Batas laju khusus login per IP, di samping penguncian akun di database. */
export const batasLogin = rateLimit({
  windowMs: LIMA_BELAS_MENIT,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { pesan: 'Terlalu banyak percobaan login. Coba lagi nanti.' },
});
