import express from 'express';
import { konfigurasiAplikasi } from './config/env.js';
import { penanganGalat, tidakDitemukan } from './middleware/galat.js';
import { pasangKeamanan } from './middleware/keamanan.js';
import { ruteAdmin } from './modules/admin/admin.routes.js';
import { ruteHasilAdmin } from './modules/hasil/hasil.routes.js';
import { rutePengerjaan } from './modules/tes/pengerjaan.routes.js';
import { rutePeserta } from './modules/token/peserta.routes.js';
import { ruteSesiAdmin } from './modules/token/sesi.routes.js';

const konfig = konfigurasiAplikasi();

export const app = express();

pasangKeamanan(app, konfig);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'hai fika' });
});

// Rute modul didaftarkan di sini: token, tes, skoring, hasil, admin.
app.use('/api/admin', ruteAdmin(konfig));
app.use('/api/admin', ruteSesiAdmin(konfig));
app.use('/api/admin', ruteHasilAdmin());
app.use('/api/peserta', rutePeserta(konfig));
// Setelah rutePeserta: rute pengerjaan seluruhnya wajib sesi peserta.
app.use('/api/peserta', rutePengerjaan());

app.use(tidakDitemukan);
app.use(penanganGalat);
