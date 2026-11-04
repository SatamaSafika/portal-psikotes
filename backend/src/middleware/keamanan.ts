import cors from 'cors';
import { createHash } from 'node:crypto';
import express, { type Express, type Request } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
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
      // Peserta di kantor bisa berbagi satu IP, jadi rute pengerjaan dibatasi per peserta (di bawah).
      // /peserta/masuk tetap dibatasi per IP di sini dan punya batas percobaan gagal sendiri.
      skip: (req) => req.path.startsWith('/peserta/') && req.path !== '/peserta/masuk',
      message: { pesan: 'Terlalu banyak permintaan. Coba lagi nanti.' },
    }),
  );
  app.use(
    '/api/peserta',
    rateLimit({
      windowMs: LIMA_BELAS_MENIT,
      limit: 600,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      keyGenerator: kunciPeserta,
      // Jalur sebelum peserta punya cookie (masuk, token, masuk-kelompok) punya batas sendiri; bila dihitung di sini,
      // satu ruang tes dengan satu IP bisa terkunci karena semua permintaan tanpa cookie dihitung per IP.
      skip: (req) => req.path === '/masuk' || req.path === '/token' || req.path === '/masuk-kelompok',
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

/**
 * Kunci batas laju peserta: hash cookie sesi peserta (cookie mentah tidak disimpan di memori),
 * atau IP bila tidak ada cookie.
 */
function kunciPeserta(req: Request): string {
  const cocok = /(?:^|;\s*)psikotes_peserta=([A-Za-z0-9_-]{43})/.exec(req.headers.cookie ?? '');
  if (cocok) return `p:${createHash('sha256').update(cocok[1]).digest('hex')}`;
  return `ip:${ipKeyGenerator(req.ip ?? '')}`;
}

/** Batas laju khusus login per IP, di samping penguncian akun di database. */
export const batasLogin = rateLimit({
  windowMs: LIMA_BELAS_MENIT,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { pesan: 'Terlalu banyak percobaan login. Coba lagi nanti.' },
});
