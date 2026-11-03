// Akses data peserta: masuk dengan token, sesi peserta, dan mulai ujian.
// Semua pemeriksaan waktu memakai jam server database (SYSDATETIME), bukan jam browser atau jam Node.
import sql from 'mssql';
import { ambilPool } from '../../db/pool.js';
import type { JenisTes } from './undangan.js';

/** Awal sesi sebagai DATETIME2 dari kolom tanggal dan waktu_buka. */
const BUKA = `DATEADD(SECOND, DATEDIFF(SECOND, CAST('00:00:00' AS TIME(0)), u.waktu_buka), CAST(u.tanggal AS DATETIME2(0)))`;
/** Menit tambahan setelah batas_selesai supaya kiriman terakhir masih bisa diterima (dipakai di Part 4). */
export const TOLERANSI_SESI_MENIT = 5;

export interface UjianPeserta {
  id: number;
  jenis_tes: JenisTes;
}

/**
 * Token sekali pakai: cocok hash dan email, status BELUM_DIPAKAI, dan sekarang di dalam jam sesi.
 * Bila lolos, status menjadi BERJALAN dan sesi peserta dibuat. Satu UPDATE, jadi tidak bisa dipakai dua kali.
 */
export async function masuk(email: string, tokenHash: string, sesiHash: Buffer): Promise<UjianPeserta | null> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('email', sql.NVarChar(150), email)
    .input('hash', sql.Char(64), tokenHash)
    .input('sesiHash', sql.VarBinary(32), sesiHash)
    .query<UjianPeserta>(
      `UPDATE u
          SET status = 'BERJALAN', sesi_peserta_hash = @sesiHash, sesi_peserta_aktif = SYSDATETIME()
       OUTPUT inserted.id, inserted.jenis_tes
         FROM dbo.HCIS_Psikotes_Ujian u
        WHERE u.token_hash = @hash
          AND u.email = @email
          AND u.status = 'BELUM_DIPAKAI'
          AND SYSDATETIME() >= ${BUKA}
          AND SYSDATETIME() < u.berlaku_sampai`,
    );
  return hasil.recordset[0] ?? null;
}

/**
 * Sesi peserta sah bila ujian masih BERJALAN dan:
 * belum mulai -> sebelum jam tutup sesi; sudah mulai -> sampai batas_selesai + toleransi.
 */
export async function pakaiSesiPeserta(sesiHash: Buffer): Promise<UjianPeserta | null> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('sesiHash', sql.VarBinary(32), sesiHash)
    .input('toleransi', sql.Int, TOLERANSI_SESI_MENIT)
    .query<UjianPeserta>(
      `UPDATE u
          SET sesi_peserta_aktif = SYSDATETIME()
       OUTPUT inserted.id, inserted.jenis_tes
         FROM dbo.HCIS_Psikotes_Ujian u
        WHERE u.sesi_peserta_hash = @sesiHash
          AND u.status = 'BERJALAN'
          AND ((u.mulai_pada IS NULL AND SYSDATETIME() < u.berlaku_sampai)
            OR (u.mulai_pada IS NOT NULL AND SYSDATETIME() <= DATEADD(MINUTE, @toleransi, u.batas_selesai)))`,
    );
  return hasil.recordset[0] ?? null;
}

export interface InfoUjian {
  jenis_tes: JenisTes;
  nama_sesi: string;
  status: string;
  waktu_tutup: string;
  mulai_pada: string | null;
  batas_selesai: string | null;
  /** Sisa detik menurut jam server, null bila belum mulai. */
  sisa_detik: number | null;
  /**
   * Milidetik sejak mulai menurut jam server, null bila belum mulai. Dipakai browser untuk menyamakan
   * jam waktu_ms Koran setelah refresh, supaya waktu jawaban berikutnya tidak lebih kecil dari yang tersimpan.
   */
  berjalan_ms: number | null;
}

export async function infoUjian(id: number): Promise<InfoUjian | null> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('id', sql.Int, id)
    .query<InfoUjian>(
      `SELECT jenis_tes, nama_sesi, status,
              CONVERT(CHAR(5), waktu_tutup, 108) AS waktu_tutup,
              CONVERT(VARCHAR(19), mulai_pada, 120) AS mulai_pada,
              CONVERT(VARCHAR(19), batas_selesai, 120) AS batas_selesai,
              CASE WHEN batas_selesai IS NULL THEN NULL
                   WHEN batas_selesai <= SYSDATETIME() THEN 0
                   ELSE DATEDIFF(SECOND, SYSDATETIME(), batas_selesai) END AS sisa_detik,
              -- mulai_pada DATETIME2(0) dibulatkan ke detik terdekat, jadi bisa sedikit di depan jam sekarang.
              CASE WHEN mulai_pada IS NULL THEN NULL
                   WHEN mulai_pada > SYSDATETIME() THEN 0
                   ELSE DATEDIFF(MILLISECOND, mulai_pada, SYSDATETIME()) END AS berjalan_ms
         FROM dbo.HCIS_Psikotes_Ujian
        WHERE id = @id`,
    );
  return hasil.recordset[0] ?? null;
}

/**
 * Mulai ujian: mulai_pada = sekarang, batas_selesai = sekarang + durasi.
 * Hanya bila belum mulai dan sekarang masih sebelum jam tutup sesi. Durasi tidak dipotong jam tutup
 * (keputusan sementara pemilik proyek, menunggu konfirmasi HC). Mengembalikan false bila tidak memenuhi.
 */
export async function mulai(id: number, durasiDetik: number): Promise<boolean> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('id', sql.Int, id)
    .input('durasi', sql.Int, durasiDetik)
    .query(
      `DECLARE @sekarang DATETIME2(0) = SYSDATETIME();
       UPDATE dbo.HCIS_Psikotes_Ujian
          SET mulai_pada = @sekarang, batas_selesai = DATEADD(SECOND, @durasi, @sekarang)
        WHERE id = @id AND status = 'BERJALAN' AND mulai_pada IS NULL AND @sekarang < berlaku_sampai`,
    );
  // Dijumlah karena batch berisi lebih dari satu pernyataan.
  return hasil.rowsAffected.reduce((a, b) => a + b, 0) === 1;
}
