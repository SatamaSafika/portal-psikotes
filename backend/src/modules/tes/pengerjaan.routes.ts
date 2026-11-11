// Rute pengerjaan peserta: latihan, soal, gambar, simpan jawaban, kirim.
// Tidak ada rute hasil atau skor untuk peserta. Kunci hanya untuk latihan, setelah latihan dijawab.
import { Router, type Response } from 'express';
import { durasiDetik } from '../../config/durasi.js';
import { muatTes } from '../../config/tes.js';
import { hitungDanSimpan } from '../hasil/hasil.service.js';
import { acakUrutan, benihUjian } from './acak.js';
import { ujianAktif, wajibPeserta } from '../token/wajib-peserta.js';
import { angkaKoran, jalurGambar, muatBank, soalPublik, type BankTermuat } from './bank.js';
import { latihanPublik, periksaLatihan } from './latihan.js';
import * as repo from './pengerjaan.repo.js';
import { gambarBoleh, jumlahNomor, validasiJawabanTiu, validasiKoran } from './pengerjaan.validasi.js';

const WAKTU_HABIS = 'Waktu pengerjaan sudah habis';
const toleransiKirim = (): number => muatTes().pengerjaan.toleransi_kirim_detik;

/** Keadaan ujian dan bank versinya. Null (dan respons sudah dikirim) bila ujian tidak ditemukan. */
async function siapkan(res: Response): Promise<{ keadaan: repo.KeadaanUjian; bank: BankTermuat } | null> {
  const keadaan = await repo.keadaanUjian(ujianAktif(res).id, toleransiKirim());
  if (!keadaan) {
    res.status(404).json({ pesan: 'Ujian tidak ditemukan' });
    return null;
  }
  return { keadaan, bank: await muatBank(keadaan.bank_versi) };
}

export function rutePengerjaan(): Router {
  const rute = Router();
  rute.use(wajibPeserta);

  rute.get('/latihan', async (_req, res) => {
    const s = await siapkan(res);
    if (s) res.json(latihanPublik(s.bank, ujianAktif(res).jenis_tes));
  });

  rute.post('/latihan/periksa', async (req, res) => {
    const s = await siapkan(res);
    if (!s) return;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const hasil = periksaLatihan(s.bank, ujianAktif(res).jenis_tes, body.nomor, body.jawaban);
    if (!hasil) {
      res.status(400).json({ pesan: 'Nomor latihan atau jawaban tidak valid' });
      return;
    }
    res.json(hasil);
  });

  rute.get('/soal', async (_req, res) => {
    const s = await siapkan(res);
    if (!s) return;
    if (!s.keadaan.boleh_tulis) {
      res.status(409).json({ pesan: s.keadaan.sudah_mulai ? WAKTU_HABIS : 'Tes belum dimulai' });
      return;
    }
    const jenis = ujianAktif(res).jenis_tes;
    if (jenis === 'KORAN') {
      const k = muatTes().tes.KORAN;
      res.json({ halaman: k.halaman, lajur_per_halaman: k.lajur_per_halaman, angka_per_lajur: k.angka_per_lajur, lajur: angkaKoran(s.bank) });
      return;
    }
    // Urutan tampil acak per peserta dan tetap sama setiap dimuat; nomor asli tetap dipakai untuk jawaban.
    const id = ujianAktif(res).id;
    res.json({ soal: acakUrutan(soalPublik(s.bank, jenis), benihUjian(id, jenis, s.keadaan.bank_versi)) });
  });

  rute.get('/gambar/:nama', async (req, res) => {
    const s = await siapkan(res);
    if (!s) return;
    const nama = String(req.params.nama ?? '');
    const jalur = gambarBoleh(nama, ujianAktif(res).jenis_tes, s.keadaan.boleh_tulis) ? jalurGambar(s.bank, nama) : null;
    if (!jalur) {
      res.status(404).json({ pesan: 'Gambar tidak ditemukan' });
      return;
    }
    // Tanpa cache dan ETag: gambar soal hanya boleh diambil selama pengerjaan.
    res.type('png').sendFile(jalur, { cacheControl: false, etag: false, lastModified: false });
  });

  rute.get('/jawaban', async (_req, res) => {
    const s = await siapkan(res);
    if (!s) return;
    if (!s.keadaan.sudah_mulai) {
      res.status(409).json({ pesan: 'Tes belum dimulai' });
      return;
    }
    res.json({ jawaban: await repo.ambilJawaban(ujianAktif(res).id) });
  });

  // TIU 5 dan TIU 6: simpan otomatis, boleh kosong dan boleh diubah.
  rute.put('/jawaban', async (req, res) => {
    const ujian = ujianAktif(res);
    if (ujian.jenis_tes === 'KORAN') {
      res.status(400).json({ pesan: 'Tes Koran memakai POST /api/peserta/koran' });
      return;
    }
    const v = validasiJawabanTiu(ujian.jenis_tes, (req.body as Record<string, unknown> | undefined)?.jawaban, muatTes());
    if (v.galat.length > 0) {
      res.status(400).json({ pesan: 'Jawaban tidak valid', galat: v.galat });
      return;
    }
    if (!(await repo.simpanTiu(ujian.id, toleransiKirim(), v.jawaban))) {
      res.status(409).json({ pesan: WAKTU_HABIS });
      return;
    }
    res.status(204).end();
  });

  // Koran: ketat satu per satu, setiap jawaban dengan waktu_ms.
  rute.post('/koran', async (req, res) => {
    const ujian = ujianAktif(res);
    if (ujian.jenis_tes !== 'KORAN') {
      res.status(400).json({ pesan: 'Rute ini hanya untuk Tes Koran' });
      return;
    }
    const konfig = muatTes();
    const data = (req.body as Record<string, unknown> | undefined)?.jawaban;
    const hasil = await repo.simpanKoran(ujian.id, konfig.pengerjaan.toleransi_kirim_detik, (ctx) =>
      validasiKoran(data, {
        ...ctx,
        maksNomor: jumlahNomor('KORAN', konfig),
        durasiMs: durasiDetik('KORAN') * 1000,
        toleransiMs: konfig.pengerjaan.toleransi_waktu_ms,
      }),
    );
    if (hasil.status === 'tutup') res.status(409).json({ pesan: WAKTU_HABIS });
    else if (hasil.status === 'tolak') res.status(400).json({ pesan: 'Jawaban ditolak', galat: hasil.galat });
    else res.json({ nomor_terakhir: hasil.nomor_terakhir });
  });

  rute.post('/kirim', async (_req, res) => {
    const id = ujianAktif(res).id;
    if (!(await repo.kirim(id, toleransiKirim()))) {
      res.status(409).json({ pesan: 'Ujian tidak bisa dikirim: belum dimulai atau waktu sudah habis' });
      return;
    }
    // Hasil langsung dihitung. Bila gagal, pemeriksaan berkala menghitungnya nanti; peserta tetap selesai.
    try {
      await hitungDanSimpan(id);
    } catch (galat) {
      console.error(`Hitung hasil ujian ${id} gagal:`, galat instanceof Error ? galat.message : 'galat tidak dikenal');
    }
    res.status(204).end();
  });

  return rute;
}
