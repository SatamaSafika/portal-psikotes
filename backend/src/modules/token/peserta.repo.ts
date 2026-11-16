// Akses data peserta: masuk dengan token, sesi peserta, dan mulai ujian.
// Semua pemeriksaan waktu memakai jam server database (SYSDATETIME), bukan jam browser atau jam Node.
// Kolom database PascalCase (db/11); hasil query di-alias ke snake_case supaya tipe dan API tidak berubah.
import sql from 'mssql';
import { ambilPool } from '../../db/pool.js';
import type { JenisTes } from './undangan.js';

/** Awal sesi sebagai DATETIME2 dari kolom Tanggal dan WaktuBuka. */
const BUKA = `DATEADD(SECOND, DATEDIFF(SECOND, CAST('00:00:00' AS TIME(0)), u.WaktuBuka), CAST(u.Tanggal AS DATETIME2(0)))`;
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
export async function masuk(
  email: string,
  tokenHash: string,
  sesiHash: Buffer,
  jenisTes: JenisTes | null,
  nama: string | null,
  persetujuanVersi: string,
): Promise<UjianPeserta | null> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('versi', sql.VarChar(20), persetujuanVersi)
    .input('email', sql.NVarChar(150), email)
    .input('hash', sql.Char(64), tokenHash)
    .input('sesiHash', sql.VarBinary(32), sesiHash)
    .input('jenis', sql.VarChar(10), jenisTes)
    .input('nama', sql.NVarChar(100), nama)
    .query<UjianPeserta>(
      // Tes yang dipilih peserta harus sama dengan tes token; bila beda, tidak ada baris yang berubah
      // (token tidak terpakai). Nama dari peserta hanya mengisi nama yang belum diisi HC.
      `UPDATE u
          SET Status = 'BERJALAN', SesiPesertaHash = @sesiHash, SesiPesertaAktif = SYSDATETIME(),
              PersetujuanPada = SYSDATETIME(), PersetujuanVersi = @versi,
              Nama = CASE WHEN (u.Nama IS NULL OR u.Nama = '') AND @nama IS NOT NULL THEN @nama ELSE u.Nama END
       OUTPUT inserted.Id AS id, inserted.JenisTes AS jenis_tes
         FROM dbo.HCIS_Psikotes_Ujian u
        WHERE u.TokenHash = @hash
          AND u.Email = @email
          AND (@jenis IS NULL OR u.JenisTes = @jenis)
          AND u.Status = 'BELUM_DIPAKAI'
          AND SYSDATETIME() >= ${BUKA}
          AND SYSDATETIME() < u.BerlakuSampai`,
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
          SET SesiPesertaAktif = SYSDATETIME()
       OUTPUT inserted.Id AS id, inserted.JenisTes AS jenis_tes
         FROM dbo.HCIS_Psikotes_Ujian u
        WHERE u.SesiPesertaHash = @sesiHash
          AND u.Status = 'BERJALAN'
          AND ((u.MulaiPada IS NULL AND SYSDATETIME() < u.BerlakuSampai)
            OR (u.MulaiPada IS NOT NULL AND SYSDATETIME() <= DATEADD(MINUTE, @toleransi, u.BatasSelesai)))`,
    );
  return hasil.recordset[0] ?? null;
}

export interface InfoUjian {
  jenis_tes: JenisTes;
  /** Untuk header tes ("Peserta: ..."). Email bila nama kosong. */
  nama: string;
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
      `SELECT JenisTes AS jenis_tes, COALESCE(NULLIF(Nama, ''), Email) AS nama, NamaSesi AS nama_sesi, Status AS status,
              CONVERT(CHAR(5), WaktuTutup, 108) AS waktu_tutup,
              CONVERT(VARCHAR(19), MulaiPada, 120) AS mulai_pada,
              CONVERT(VARCHAR(19), BatasSelesai, 120) AS batas_selesai,
              CASE WHEN BatasSelesai IS NULL THEN NULL
                   WHEN BatasSelesai <= SYSDATETIME() THEN 0
                   ELSE DATEDIFF(SECOND, SYSDATETIME(), BatasSelesai) END AS sisa_detik,
              -- MulaiPada DATETIME2(0) dibulatkan ke detik terdekat, jadi bisa sedikit di depan jam sekarang.
              CASE WHEN MulaiPada IS NULL THEN NULL
                   WHEN MulaiPada > SYSDATETIME() THEN 0
                   ELSE DATEDIFF(MILLISECOND, MulaiPada, SYSDATETIME()) END AS berjalan_ms
         FROM dbo.HCIS_Psikotes_Ujian
        WHERE Id = @id`,
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
          SET MulaiPada = @sekarang, BatasSelesai = DATEADD(SECOND, @durasi, @sekarang)
        WHERE Id = @id AND Status = 'BERJALAN' AND MulaiPada IS NULL AND @sekarang < BerlakuSampai`,
    );
  // Dijumlah karena batch berisi lebih dari satu pernyataan.
  return hasil.rowsAffected.reduce((a, b) => a + b, 0) === 1;
}
