// Akses data sesi dan ujian untuk admin. Hanya menyentuh dbo.HCIS_Psikotes_Sesi dan dbo.HCIS_Psikotes_Ujian.
// Semua query berparameter. Tanggal dan jam dikirim sebagai teks lalu di-CAST di SQL,
// supaya tidak ada pergeseran zona waktu dari driver.
import sql from 'mssql';
import { ambilPool } from '../../db/pool.js';
import type { JadwalTes } from './sesi.validasi.js';
import type { JenisTes, Template } from './undangan.js';

/** Satu token: satu peserta, satu tes, dengan jadwal tes itu. */
export interface BarisUjianBaru {
  email: string;
  nama: string | null;
  jadwal: JadwalTes;
  tokenHash: string;
}

/** Data baris sesi. tanggal dan waktu_* hanya ringkasan hari pertama; jadwal sebenarnya per token. */
export interface SesiBaru {
  nama_sesi: string;
  tanggal: string;
  waktu_buka: string;
  waktu_tutup: string;
  daftar_tes: string;
}

export interface SesiRingkas {
  id: number;
  nama_sesi: string;
  tanggal: string;
  waktu_buka: string;
  waktu_tutup: string;
  daftar_tes: string;
  bank_versi: string;
}

export interface SesiDetail extends SesiRingkas {
  template_subjek: string;
  template_isi: string;
}

export interface UjianAdmin {
  ujian_id: number;
  email: string;
  nama: string | null;
  jenis_tes: JenisTes;
  tanggal: string;
  waktu_buka: string;
  waktu_tutup: string;
  status: string;
  mulai_pada: string | null;
  selesai_pada: string | null;
  // Hasil (hanya untuk admin). Null sampai dihitung.
  jumlah_benar: number | null;
  jumlah_salah: number | null;
  jumlah_dijawab: number | null;
  n_koran: number | null;
  kategori: string | null;
  skor_akhir: number | null;
  /** Koran: 22 interval { dikerjakan, benar, salah }. */
  ringkasan_interval: unknown[] | null;
  aturan_versi: string | null;
}

// Kolom sesi sebagai teks: tanggal YYYY-MM-DD, jam HH:MM.
const KOLOM_SESI = `s.id, s.nama_sesi, CONVERT(CHAR(10), s.tanggal, 23) AS tanggal,
  CONVERT(CHAR(5), s.waktu_buka, 108) AS waktu_buka, CONVERT(CHAR(5), s.waktu_tutup, 108) AS waktu_tutup,
  s.daftar_tes, s.bank_versi`;

/** Kode galat SQL Server untuk pelanggaran UNIQUE. */
export function galatUnik(galat: unknown): boolean {
  const n = (galat as { number?: unknown })?.number;
  return n === 2627 || n === 2601;
}

async function sisipkanUjian(tx: sql.Transaction, sesiId: number, baris: BarisUjianBaru[]): Promise<number[]> {
  const id: number[] = [];
  for (const b of baris) {
    // Jadwal (tanggal, jam) per token; berlaku_sampai = jam tutup tes itu.
    const hasil = await new sql.Request(tx)
      .input('sesiId', sql.Int, sesiId)
      .input('tes', sql.VarChar(10), b.jadwal.tes)
      .input('tanggal', sql.VarChar(10), b.jadwal.tanggal)
      .input('buka', sql.VarChar(5), b.jadwal.waktu_buka)
      .input('tutup', sql.VarChar(5), b.jadwal.waktu_tutup)
      .input('email', sql.NVarChar(150), b.email)
      .input('nama', sql.NVarChar(100), b.nama)
      .input('hash', sql.Char(64), b.tokenHash)
      .query<{ id: number }>(
        `INSERT INTO dbo.HCIS_Psikotes_Ujian
           (nama_sesi, jenis_tes, tanggal, waktu_buka, waktu_tutup, bank_versi, email, nama, token_hash, berlaku_sampai, sesi_id)
         OUTPUT inserted.id
         SELECT s.nama_sesi, @tes, CAST(@tanggal AS DATE), CAST(@buka AS TIME(0)), CAST(@tutup AS TIME(0)),
                s.bank_versi, @email, @nama, @hash,
                DATEADD(SECOND, DATEDIFF(SECOND, CAST('00:00:00' AS TIME(0)), CAST(@tutup AS TIME(0))),
                        CAST(CAST(@tanggal AS DATE) AS DATETIME2(0))),
                s.id
           FROM dbo.HCIS_Psikotes_Sesi s
          WHERE s.id = @sesiId`,
      );
    id.push(hasil.recordset[0].id);
  }
  return id;
}

async function dalamTransaksi<T>(kerja: (tx: sql.Transaction) => Promise<T>): Promise<T> {
  const tx = new sql.Transaction(await ambilPool());
  await tx.begin();
  try {
    const hasil = await kerja(tx);
    await tx.commit();
    return hasil;
  } catch (galat) {
    await tx.rollback().catch(() => undefined);
    throw galat;
  }
}

/**
 * Membuat sesi dan seluruh baris ujian dalam satu transaksi.
 * Null bila hari pertama sesi sudah lewat menurut jam server database
 * (tanggal sesi = tanggal tes paling awal, jadi semua tes tidak di masa lalu).
 */
export function buatSesi(
  sesi: SesiBaru,
  template: Template,
  bankVersi: string,
  adminId: number,
  baris: BarisUjianBaru[],
): Promise<{ sesiId: number; ujianId: number[] } | null> {
  return dalamTransaksi(async (tx) => {
    const hasil = await new sql.Request(tx)
      .input('nama', sql.NVarChar(100), sesi.nama_sesi)
      .input('tanggal', sql.VarChar(10), sesi.tanggal)
      .input('buka', sql.VarChar(5), sesi.waktu_buka)
      .input('tutup', sql.VarChar(5), sesi.waktu_tutup)
      .input('tes', sql.VarChar(20), sesi.daftar_tes)
      .input('bank', sql.VarChar(20), bankVersi)
      .input('subjek', sql.NVarChar(200), template.subjek)
      .input('isi', sql.NVarChar(4000), template.isi)
      .input('admin', sql.Int, adminId)
      .query<{ id: number }>(
        `INSERT INTO dbo.HCIS_Psikotes_Sesi
           (nama_sesi, tanggal, waktu_buka, waktu_tutup, daftar_tes, bank_versi, template_subjek, template_isi, dibuat_oleh)
         OUTPUT inserted.id
         SELECT @nama, CAST(@tanggal AS DATE), CAST(@buka AS TIME(0)), CAST(@tutup AS TIME(0)), @tes, @bank, @subjek, @isi, @admin
          WHERE CAST(@tanggal AS DATE) >= CAST(SYSDATETIME() AS DATE)`,
      );
    const sesiId = hasil.recordset[0]?.id;
    if (sesiId === undefined) return null;
    return { sesiId, ujianId: await sisipkanUjian(tx, sesiId, baris) };
  });
}

export function tambahUjian(sesiId: number, baris: BarisUjianBaru[]): Promise<number[]> {
  return dalamTransaksi((tx) => sisipkanUjian(tx, sesiId, baris));
}

export async function daftarSesi(): Promise<(SesiRingkas & Record<string, number>)[]> {
  const pool = await ambilPool();
  const hasil = await pool.request().query(
    `SELECT ${KOLOM_SESI},
            COUNT(DISTINCT u.email) AS jumlah_peserta,
            COUNT(u.id) AS jumlah_token,
            SUM(CASE WHEN u.status = 'BELUM_DIPAKAI' THEN 1 ELSE 0 END) AS belum_dipakai,
            SUM(CASE WHEN u.status = 'BERJALAN' THEN 1 ELSE 0 END) AS berjalan,
            SUM(CASE WHEN u.status IN ('DIKIRIM', 'WAKTU_HABIS') THEN 1 ELSE 0 END) AS selesai,
            SUM(CASE WHEN u.status = 'DICABUT' THEN 1 ELSE 0 END) AS dicabut
       FROM dbo.HCIS_Psikotes_Sesi s
       LEFT JOIN dbo.HCIS_Psikotes_Ujian u ON u.sesi_id = s.id
      GROUP BY s.id, s.nama_sesi, s.tanggal, s.waktu_buka, s.waktu_tutup, s.daftar_tes, s.bank_versi
      ORDER BY s.tanggal DESC, s.id DESC`,
  );
  return hasil.recordset;
}

export async function ambilSesi(id: number): Promise<SesiDetail | null> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('id', sql.Int, id)
    .query<SesiDetail>(`SELECT ${KOLOM_SESI}, s.template_subjek, s.template_isi FROM dbo.HCIS_Psikotes_Sesi s WHERE s.id = @id`);
  return hasil.recordset[0] ?? null;
}

export async function daftarUjianSesi(sesiId: number): Promise<UjianAdmin[]> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('id', sql.Int, sesiId)
    .query<UjianAdmin>(
      `SELECT id AS ujian_id, email, nama, jenis_tes,
              CONVERT(CHAR(10), tanggal, 23) AS tanggal,
              CONVERT(CHAR(5), waktu_buka, 108) AS waktu_buka, CONVERT(CHAR(5), waktu_tutup, 108) AS waktu_tutup,
              status,
              CONVERT(VARCHAR(19), mulai_pada, 120) AS mulai_pada,
              CONVERT(VARCHAR(19), selesai_pada, 120) AS selesai_pada,
              jumlah_benar, jumlah_salah, jumlah_dijawab, n_koran, kategori, skor_akhir,
              ringkasan_interval, aturan_versi
         FROM dbo.HCIS_Psikotes_Ujian
        WHERE sesi_id = @id
        ORDER BY email, CASE jenis_tes WHEN 'TIU5' THEN 1 WHEN 'TIU6' THEN 2 ELSE 3 END`,
    );
  return hasil.recordset.map((u) => ({
    ...u,
    ringkasan_interval: typeof u.ringkasan_interval === 'string' ? (JSON.parse(u.ringkasan_interval) as unknown[]) : null,
  }));
}

export async function simpanTemplate(id: number, t: Template): Promise<boolean> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('id', sql.Int, id)
    .input('subjek', sql.NVarChar(200), t.subjek)
    .input('isi', sql.NVarChar(4000), t.isi)
    .query('UPDATE dbo.HCIS_Psikotes_Sesi SET template_subjek = @subjek, template_isi = @isi WHERE id = @id');
  return hasil.rowsAffected[0] === 1;
}

const KOLOM_JADWAL = `jenis_tes AS tes, CONVERT(CHAR(10), tanggal, 23) AS tanggal,
  CONVERT(CHAR(5), waktu_buka, 108) AS waktu_buka, CONVERT(CHAR(5), waktu_tutup, 108) AS waktu_tutup`;

/**
 * Jadwal per tes sebuah sesi, dibaca dari token yang sudah ada (semua peserta sesi berjadwal sama).
 * Null bila jadwal satu tes ternyata tidak seragam.
 */
export async function jadwalSesi(sesiId: number): Promise<JadwalTes[] | null> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('sesiId', sql.Int, sesiId)
    .query<JadwalTes>(`SELECT DISTINCT ${KOLOM_JADWAL} FROM dbo.HCIS_Psikotes_Ujian WHERE sesi_id = @sesiId`);
  const jadwal = hasil.recordset;
  if (new Set(jadwal.map((j) => j.tes)).size !== jadwal.length) return null;
  return jadwal;
}

/** Ujian milik satu email di satu sesi yang tokennya belum dipakai, beserta jadwalnya. */
export async function ujianBelumDipakai(sesiId: number, email: string): Promise<(JadwalTes & { id: number; nama: string | null })[]> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('sesiId', sql.Int, sesiId)
    .input('email', sql.NVarChar(150), email)
    .query<JadwalTes & { id: number; nama: string | null }>(
      `SELECT id, nama, ${KOLOM_JADWAL} FROM dbo.HCIS_Psikotes_Ujian
        WHERE sesi_id = @sesiId AND email = @email AND status = 'BELUM_DIPAKAI'`,
    );
  return hasil.recordset;
}

class StatusBerubah extends Error {}

/**
 * Mengganti hash token, semua atau tidak sama sekali. Hanya untuk token yang belum dipakai.
 * Mengembalikan false (dan membatalkan semua) bila salah satu sudah tidak BELUM_DIPAKAI.
 */
export async function gantiToken(ganti: { id: number; tokenHash: string }[]): Promise<boolean> {
  try {
    await dalamTransaksi(async (tx) => {
      for (const g of ganti) {
        const hasil = await new sql.Request(tx)
          .input('id', sql.Int, g.id)
          .input('hash', sql.Char(64), g.tokenHash)
          .query(`UPDATE dbo.HCIS_Psikotes_Ujian SET token_hash = @hash WHERE id = @id AND status = 'BELUM_DIPAKAI'`);
        if (hasil.rowsAffected[0] !== 1) throw new StatusBerubah();
      }
    });
    return true;
  } catch (galat) {
    if (galat instanceof StatusBerubah) return false;
    throw galat;
  }
}

/** Mencabut token yang belum dipakai atau sedang berjalan. Sesi peserta ikut diputus. */
export async function cabutUjian(id: number): Promise<boolean> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('id', sql.Int, id)
    .query(
      `UPDATE dbo.HCIS_Psikotes_Ujian
          SET status = 'DICABUT', sesi_peserta_hash = NULL, sesi_peserta_aktif = NULL
        WHERE id = @id AND status IN ('BELUM_DIPAKAI', 'BERJALAN')`,
    );
  return hasil.rowsAffected[0] === 1;
}
