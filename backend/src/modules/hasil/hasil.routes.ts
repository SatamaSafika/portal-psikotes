// Rute hasil untuk admin HC: ringkasan hari ini, tabel hasil, dan jawaban per nomor (tanpa kunci).
// Semua wajib sesi admin. Peserta tidak punya rute hasil.
import { Router, type Request } from 'express';
import { muatTes } from '../../config/tes.js';
import { wajibAdmin } from '../admin/wajib-admin.js';
import { kunciUntuk, tandaiJawaban } from '../skoring/koreksi.js';
import { muatBank } from '../tes/bank.js';
import * as repo from './hasil.repo.js';
import { validasiFilterHasil } from './hasil.validasi.js';

function idDari(req: Request): number | null {
  const id = String(req.params.id ?? '');
  return /^[1-9]\d{0,9}$/.test(id) ? Number(id) : null;
}

export function ruteHasilAdmin(): Router {
  const rute = Router();

  rute.get('/ringkasan', wajibAdmin, async (_req, res) => {
    res.json(await repo.ringkasanHariIni());
  });

  rute.get('/hasil', wajibAdmin, async (req, res) => {
    const f = validasiFilterHasil(req.query as Record<string, unknown>);
    if (!f) {
      res.status(400).json({ pesan: 'Filter tidak valid' });
      return;
    }
    res.json({ hasil: await repo.daftarHasil(f) });
  });

  // Jawaban per nomor dengan tanda benar/salah. Kunci tidak dikirim (CLAUDE.md aturan keras 3).
  rute.get('/ujian/:id/jawaban', wajibAdmin, async (req, res) => {
    const id = idDari(req);
    const bahan = id === null ? null : await repo.bahanHitung(id);
    if (!bahan) {
      res.status(404).json({ pesan: 'Ujian tidak ditemukan atau belum selesai' });
      return;
    }
    const bank = await muatBank(bahan.bank_versi);
    const kunci = kunciUntuk(bahan.jenis_tes, bank, muatTes());
    res.json({ jenis_tes: bahan.jenis_tes, jawaban: tandaiJawaban(bahan.jawaban, kunci) });
  });

  return rute;
}
