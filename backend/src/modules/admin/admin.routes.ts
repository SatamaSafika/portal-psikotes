import { Router } from 'express';
import type { KonfigurasiAplikasi } from '../../config/env.js';
import { batasLogin } from '../../middleware/keamanan.js';
import { hapusSesi } from './admin.repo.js';
import { PASSWORD_MAKS, login } from './admin.service.js';
import { bacaToken, hapusCookie, hashToken, tulisCookie } from './sesi.js';
import { adminAktif, wajibAdmin } from './wajib-admin.js';

export function ruteAdmin(konfig: KonfigurasiAplikasi): Router {
  const rute = Router();

  rute.post('/login', batasLogin, async (req, res) => {
    // Hanya JSON: formulir lintas situs tidak bisa mengirim jenis ini tanpa preflight CORS.
    if (!req.is('application/json')) {
      res.status(415).json({ pesan: 'Gunakan application/json' });
      return;
    }
    const { username, password } = (req.body ?? {}) as Record<string, unknown>;
    if (
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      password.length === 0 ||
      password.length > PASSWORD_MAKS
    ) {
      res.status(400).json({ pesan: 'Username dan kata sandi wajib diisi' });
      return;
    }

    const hasil = await login(username.trim(), password, konfig);
    if (!hasil.berhasil) {
      res.status(401).json({ pesan: 'Username atau kata sandi salah' });
      return;
    }
    tulisCookie(res, hasil.token, konfig.produksi);
    res.json({ username: hasil.username });
  });

  // Tidak mewajibkan sesi sah, supaya cookie selalu bisa dibersihkan.
  rute.post('/logout', async (req, res) => {
    const token = bacaToken(req);
    if (token) await hapusSesi(hashToken(token));
    hapusCookie(res, konfig.produksi);
    res.status(204).end();
  });

  rute.get('/saya', wajibAdmin, (_req, res) => {
    res.json({ username: adminAktif(res).username });
  });

  return rute;
}
