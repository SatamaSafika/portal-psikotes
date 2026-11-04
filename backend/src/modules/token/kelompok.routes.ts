// Rute admin sesi serentak (token kelompok). Semua wajib sesi admin.
// Respons berisi token mentah hanya dari POST (buat sesi, token baru), tidak pernah dari GET.
import { Router, type Request, type Response } from 'express';
import type { KonfigurasiAplikasi } from '../../config/env.js';
import { adminAktif, wajibAdmin } from '../admin/wajib-admin.js';
import * as repo from './kelompok.repo.js';
import { buatSesiKelompok, tokenBaruKelompok } from './kelompok.service.js';
import { GalatPermintaan } from './sesi.service.js';
import { KUOTA_MAKS, validasiNama, validasiSesiKelompok } from './sesi.validasi.js';
import { validasiTemplate, type Template } from './undangan.js';

function idDari(req: Request): number | null {
  const id = String(req.params.id ?? '');
  return /^[1-9]\d{0,9}$/.test(id) ? Number(id) : null;
}

function tanganiGalat(res: Response, galat: unknown): void {
  if (galat instanceof GalatPermintaan) {
    res.status(galat.status).json({ pesan: galat.message });
    return;
  }
  throw galat;
}

export function ruteKelompokAdmin(konfig: KonfigurasiAplikasi): Router {
  const rute = Router();

  rute.post('/sesi-kelompok', wajibAdmin, async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const v = validasiSesiKelompok(body);
    let template: Template | null = null;
    const galat = [...v.galat];
    if (body.template !== undefined && body.template !== null) {
      const t = body.template as Partial<Template>;
      const g = validasiTemplate(t, 'KELOMPOK');
      galat.push(...g);
      if (g.length === 0) template = { subjek: t.subjek!, isi: t.isi! };
    }
    if (!v.sesi || galat.length > 0) {
      res.status(400).json({ pesan: 'Data sesi tidak valid', galat });
      return;
    }
    try {
      res.status(201).json(await buatSesiKelompok(v.sesi, template, adminAktif(res).id, konfig));
    } catch (e) {
      tanganiGalat(res, e);
    }
  });

  rute.get('/kelompok/:id/peserta', wajibAdmin, async (req, res) => {
    const id = idDari(req);
    if (id === null) {
      res.status(404).json({ pesan: 'Token kelompok tidak ditemukan' });
      return;
    }
    res.json({ peserta: await repo.pesertaKelompok(id) });
  });

  rute.post('/kelompok/:id/tambah-kuota', wajibAdmin, async (req, res) => {
    const id = idDari(req);
    if (id === null || !(await repo.tambahKuota(id, KUOTA_MAKS))) {
      res.status(409).json({ pesan: `Kuota tidak bisa ditambah: token dicabut, tidak ditemukan, atau sudah ${KUOTA_MAKS}` });
      return;
    }
    const k = await repo.ambilKelompok(id);
    res.json({ kuota: k?.kuota ?? null });
  });

  rute.post('/kelompok/:id/token-baru', wajibAdmin, async (req, res) => {
    const id = idDari(req);
    if (id === null) {
      res.status(404).json({ pesan: 'Token kelompok tidak ditemukan' });
      return;
    }
    try {
      res.json(await tokenBaruKelompok(id, konfig));
    } catch (e) {
      tanganiGalat(res, e);
    }
  });

  rute.post('/kelompok/:id/cabut', wajibAdmin, async (req, res) => {
    const id = idDari(req);
    if (id === null || !(await repo.cabutKelompok(id))) {
      res.status(404).json({ pesan: 'Token kelompok tidak ditemukan atau sudah dicabut' });
      return;
    }
    res.status(204).end();
  });

  rute.post('/sesi/:id/email-kelompok-dikirim', wajibAdmin, async (req, res) => {
    const id = idDari(req);
    if (id === null || (await repo.tandaiEmailDikirim(id)) === 0) {
      res.status(404).json({ pesan: 'Sesi serentak tidak ditemukan' });
      return;
    }
    res.status(204).end();
  });

  // Koreksi nama (salah ketik) oleh admin.
  rute.put('/ujian/:id/nama', wajibAdmin, async (req, res) => {
    const id = idDari(req);
    const nama = validasiNama((req.body as Record<string, unknown> | undefined)?.nama);
    if (!nama) {
      res.status(400).json({ pesan: 'Nama harus 2 sampai 100 karakter' });
      return;
    }
    if (id === null || !(await repo.ubahNama(id, nama))) {
      res.status(404).json({ pesan: 'Ujian tidak ditemukan' });
      return;
    }
    res.json({ nama });
  });

  return rute;
}
