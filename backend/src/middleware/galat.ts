import type { NextFunction, Request, Response } from 'express';

export function tidakDitemukan(_req: Request, res: Response): void {
  res.status(404).json({ pesan: 'Tidak ditemukan' });
}

/**
 * Penangan galat terpusat.
 * Hanya mencetak pesan galat, tidak pernah body, header, atau objek konfigurasi.
 */
export function penanganGalat(galat: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(galat);
    return;
  }

  // Galat dari body-parser (JSON rusak, body terlalu besar) membawa status 4xx.
  const status = (galat as { status?: unknown })?.status;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    res.status(status).json({ pesan: status === 413 ? 'Permintaan terlalu besar' : 'Permintaan tidak valid' });
    return;
  }

  console.error('Galat server:', galat instanceof Error ? galat.message : 'galat tidak dikenal');
  res.status(500).json({ pesan: 'Terjadi galat di server' });
}
