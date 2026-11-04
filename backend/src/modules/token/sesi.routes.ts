// Rute admin untuk sesi, token, dan undangan. Semua rute wajib sesi admin.
// Respons yang memuat token mentah hanya dari POST (buat sesi, tambah peserta, token baru), tidak pernah dari GET.
import { Router, type Request, type Response } from 'express';
import type { KonfigurasiAplikasi } from '../../config/env.js';
import { adminAktif, wajibAdmin } from '../admin/wajib-admin.js';
import * as repo from './sesi.repo.js';
import { GalatPermintaan, buatSesi, detailSesi, tambahPeserta, tokenBaru } from './sesi.service.js';
import { validasiPeserta, validasiSesi } from './sesi.validasi.js';
import { templateBawaan, validasiTemplate, type Template } from './undangan.js';

function idDari(req: Request): number | null {
  const id = String(req.params.id ?? '');
  return /^[1-9]\d{0,9}$/.test(id) ? Number(id) : null;
}

/** Template opsional pada permintaan. undefined = tidak dikirim. */
function templateDari(body: Record<string, unknown>): Template | null | { galat: string[] } {
  if (body.template === undefined || body.template === null) return null;
  const t = body.template as Partial<Template>;
  const galat = validasiTemplate(t);
  return galat.length > 0 ? { galat } : { subjek: t.subjek!, isi: t.isi! };
}

function tanganiGalat(res: Response, galat: unknown): void {
  if (galat instanceof GalatPermintaan) {
    res.status(galat.status).json({ pesan: galat.message });
    return;
  }
  throw galat;
}

export function ruteSesiAdmin(konfig: KonfigurasiAplikasi): Router {
  const rute = Router();

  rute.post('/sesi', wajibAdmin, async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const v = validasiSesi(body);
    const template = templateDari(body);
    const galat = [...v.galat, ...(template && 'galat' in template ? template.galat : [])];
    if (!v.sesi || galat.length > 0) {
      res.status(400).json({ pesan: 'Data sesi tidak valid', galat });
      return;
    }
    try {
      const hasil = await buatSesi(v.sesi, template as Template | null, adminAktif(res).id, konfig);
      res.status(201).json(hasil);
    } catch (e) {
      tanganiGalat(res, e);
    }
  });

  rute.get('/sesi', wajibAdmin, async (_req, res) => {
    res.json({ sesi: await repo.daftarSesi() });
  });

  rute.get('/sesi/:id', wajibAdmin, async (req, res) => {
    const id = idDari(req);
    if (id === null) {
      res.status(404).json({ pesan: 'Sesi tidak ditemukan' });
      return;
    }
    try {
      res.json(await detailSesi(id));
    } catch (e) {
      tanganiGalat(res, e);
    }
  });

  rute.put('/sesi/:id/template', wajibAdmin, async (req, res) => {
    const id = idDari(req);
    const t = (req.body ?? {}) as Partial<Template>;
    const galat = validasiTemplate(t);
    if (galat.length > 0) {
      res.status(400).json({ pesan: 'Template tidak valid', galat });
      return;
    }
    if (id === null || !(await repo.simpanTemplate(id, { subjek: t.subjek!, isi: t.isi! }))) {
      res.status(404).json({ pesan: 'Sesi tidak ditemukan' });
      return;
    }
    res.status(204).end();
  });

  rute.post('/sesi/:id/peserta', wajibAdmin, async (req, res) => {
    const id = idDari(req);
    const v = validasiPeserta((req.body as Record<string, unknown> | undefined)?.peserta);
    if (v.galat.length > 0) {
      res.status(400).json({ pesan: 'Data peserta tidak valid', galat: v.galat });
      return;
    }
    if (id === null) {
      res.status(404).json({ pesan: 'Sesi tidak ditemukan' });
      return;
    }
    try {
      res.status(201).json({ undangan: await tambahPeserta(id, v.peserta, konfig) });
    } catch (e) {
      tanganiGalat(res, e);
    }
  });

  // Email di body, bukan di URL, supaya tidak tercatat di log akses.
  rute.post('/sesi/:id/token-baru', wajibAdmin, async (req, res) => {
    const id = idDari(req);
    const v = validasiPeserta([{ email: (req.body as Record<string, unknown> | undefined)?.email }]);
    if (v.galat.length > 0) {
      res.status(400).json({ pesan: 'Email tidak valid' });
      return;
    }
    if (id === null) {
      res.status(404).json({ pesan: 'Sesi tidak ditemukan' });
      return;
    }
    try {
      res.json({ undangan: await tokenBaru(id, v.peserta[0].email, konfig) });
    } catch (e) {
      tanganiGalat(res, e);
    }
  });

  // HC menekan tombol kirim undangan (mailto). Email di body, bukan di URL.
  rute.post('/sesi/:id/undangan-dikirim', wajibAdmin, async (req, res) => {
    const id = idDari(req);
    const v = validasiPeserta([{ email: (req.body as Record<string, unknown> | undefined)?.email }]);
    if (v.galat.length > 0) {
      res.status(400).json({ pesan: 'Email tidak valid' });
      return;
    }
    if (id === null || (await repo.tandaiUndanganDikirim(id, v.peserta[0].email)) === 0) {
      res.status(404).json({ pesan: 'Peserta tidak ditemukan di sesi ini' });
      return;
    }
    res.status(204).end();
  });

  // Template bawaan, untuk diedit HC sebelum membuat sesi.
  rute.get('/template-bawaan', wajibAdmin, (_req, res) => {
    res.json(templateBawaan());
  });

  rute.post('/ujian/:id/cabut', wajibAdmin, async (req, res) => {
    const id = idDari(req);
    if (id === null || !(await repo.cabutUjian(id))) {
      res.status(404).json({ pesan: 'Token tidak ditemukan, sudah selesai, atau sudah dicabut' });
      return;
    }
    res.status(204).end();
  });

  return rute;
}
