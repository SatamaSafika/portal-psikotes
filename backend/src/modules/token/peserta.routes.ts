// Rute peserta: masuk dengan email dan token, info ujian, dan mulai ujian.
// Tidak ada respons yang memuat kunci, skor, atau token.
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { KonfigurasiAplikasi } from '../../config/env.js';
import { durasiDetik } from '../../config/durasi.js';
import { buatTokenSesi, hashTokenSesi, tulisCookieSesi } from '../../lib/cookie.js';
import { infoUjian, masuk, mulai } from './peserta.repo.js';
import { muatTes } from '../../config/tes.js';
import { jumlahNomor } from '../tes/pengerjaan.validasi.js';
import { validasiMasuk } from './sesi.validasi.js';
import type { JenisTes } from './undangan.js';
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

/**
 * Jumlah soal untuk layar instruksi: TIU 5 = 30 soal, TIU 6 = 8 Soal (40 butir), Koran = 988 kotak dalam 13 halaman.
 * Semua dari tes.json, jadi susunan yang berubah cukup diubah di konfigurasi dan bank.
 */
function jumlahSoal(jenis: JenisTes): { jumlah_soal: number; jumlah_nomor: number; jumlah_halaman: number | null } {
  const k = muatTes();
  return {
    jumlah_soal: jenis === 'TIU6' ? k.tes.TIU6.jumlah_soal : jumlahNomor(jenis, k),
    jumlah_nomor: jumlahNomor(jenis, k),
    jumlah_halaman: jenis === 'KORAN' ? k.tes.KORAN.halaman : null,
  };
}

/** Info ujian beserta durasi dan jumlah soal. sisa_detik tidak melebihi durasi (mulai_pada tersimpan dibulatkan ke detik). */
async function infoDenganDurasi(id: number, jenis: JenisTes, durasi: number) {
  const info = await infoUjian(id);
  const sisa = info?.sisa_detik ?? null;
  return { ...info, sisa_detik: sisa === null ? null : Math.min(sisa, durasi), durasi_detik: durasi, ...jumlahSoal(jenis) };
}

export function rutePeserta(konfig: KonfigurasiAplikasi): Router {
  const rute = Router();

  rute.post('/masuk', batasMasuk, async (req, res) => {
    if (!req.is('application/json')) {
      res.status(415).json({ pesan: 'Gunakan application/json' });
      return;
    }
    const m = validasiMasuk(req.body, normalisasiToken);
    // Pesan sama untuk semua alasan gagal (termasuk token untuk tes lain), supaya tidak membocorkan token mana yang ada.
    if (!m) {
      res.status(401).json({ pesan: GAGAL_MASUK });
      return;
    }
    const sesi = buatTokenSesi();
    const ujian = await masuk(m.email, hashTokenPeserta(m.token), hashTokenSesi(sesi), m.jenis_tes, m.nama);
    if (!ujian) {
      res.status(401).json({ pesan: GAGAL_MASUK });
      return;
    }
    tulisCookieSesi(res, COOKIE_PESERTA, sesi, COOKIE_PESERTA_MAKS_MS, konfig.produksi);
    res.json({ jenis_tes: ujian.jenis_tes });
  });

  rute.get('/saya', wajibPeserta, async (_req, res) => {
    const ujian = ujianAktif(res);
    res.json(await infoDenganDurasi(ujian.id, ujian.jenis_tes, durasiDetik(ujian.jenis_tes)));
  });

  // Aman diulang: bila sudah mulai, mengembalikan waktu yang sudah tercatat.
  rute.post('/mulai', wajibPeserta, async (_req, res) => {
    const ujian = ujianAktif(res);
    const durasi = durasiDetik(ujian.jenis_tes);
    await mulai(ujian.id, durasi);
    const info = await infoDenganDurasi(ujian.id, ujian.jenis_tes, durasi);
    if (!info.mulai_pada) {
      res.status(409).json({ pesan: 'Ujian tidak bisa dimulai: jam sesi sudah lewat' });
      return;
    }
    res.json(info);
  });

  return rute;
}
