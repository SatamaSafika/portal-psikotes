// Rute peserta: masuk dengan email dan token, info ujian, dan mulai ujian.
// Tidak ada respons yang memuat kunci, skor, atau token.
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { KonfigurasiAplikasi } from '../../config/env.js';
import { durasiDetik } from '../../config/durasi.js';
import { buatTokenSesi, hashTokenSesi, tulisCookieSesi } from '../../lib/cookie.js';
import { infoUjian, masuk, mulai } from './peserta.repo.js';
import { validasiPeserta } from './sesi.validasi.js';
import { hashTokenPeserta, normalisasiToken } from './token.js';
import { COOKIE_PESERTA, COOKIE_PESERTA_MAKS_MS, ujianAktif, wajibPeserta } from './wajib-peserta.js';

// Banyak peserta bisa berbagi satu IP kantor, jadi yang dihitung hanya percobaan gagal.
// Token 100 bit acak, jadi menebak tetap tidak mungkin; batas ini untuk meredam percobaan beruntun.
const batasMasuk = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { pesan: 'Terlalu banyak percobaan. Coba lagi nanti.' },
});

const GAGAL_MASUK = 'Email atau token salah, sudah dipakai, atau di luar jam sesi';

/** Info ujian beserta durasi. sisa_detik tidak melebihi durasi (mulai_pada tersimpan dibulatkan ke detik). */
async function infoDenganDurasi(id: number, durasi: number) {
  const info = await infoUjian(id);
  const sisa = info?.sisa_detik ?? null;
  return { ...info, sisa_detik: sisa === null ? null : Math.min(sisa, durasi), durasi_detik: durasi };
}

export function rutePeserta(konfig: KonfigurasiAplikasi): Router {
  const rute = Router();

  rute.post('/masuk', batasMasuk, async (req, res) => {
    if (!req.is('application/json')) {
      res.status(415).json({ pesan: 'Gunakan application/json' });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const email = validasiPeserta([{ email: body.email }]).peserta[0]?.email;
    const token = typeof body.token === 'string' && body.token.length <= 64 ? normalisasiToken(body.token) : null;
    // Pesan sama untuk semua alasan gagal, supaya tidak membocorkan token mana yang ada.
    if (!email || !token) {
      res.status(401).json({ pesan: GAGAL_MASUK });
      return;
    }
    const sesi = buatTokenSesi();
    const ujian = await masuk(email, hashTokenPeserta(token), hashTokenSesi(sesi));
    if (!ujian) {
      res.status(401).json({ pesan: GAGAL_MASUK });
      return;
    }
    tulisCookieSesi(res, COOKIE_PESERTA, sesi, COOKIE_PESERTA_MAKS_MS, konfig.produksi);
    res.json({ jenis_tes: ujian.jenis_tes });
  });

  rute.get('/saya', wajibPeserta, async (_req, res) => {
    const ujian = ujianAktif(res);
    res.json(await infoDenganDurasi(ujian.id, durasiDetik(ujian.jenis_tes)));
  });

  // Aman diulang: bila sudah mulai, mengembalikan waktu yang sudah tercatat.
  rute.post('/mulai', wajibPeserta, async (_req, res) => {
    const ujian = ujianAktif(res);
    const durasi = durasiDetik(ujian.jenis_tes);
    await mulai(ujian.id, durasi);
    const info = await infoDenganDurasi(ujian.id, durasi);
    if (!info.mulai_pada) {
      res.status(409).json({ pesan: 'Ujian tidak bisa dimulai: jam sesi sudah lewat' });
      return;
    }
    res.json(info);
  });

  return rute;
}
