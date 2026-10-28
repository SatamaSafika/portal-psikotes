import express from 'express';

export const app = express();

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'hai fika' });
});

// Rute modul didaftarkan di sini: token, tes, skoring, hasil, admin.
