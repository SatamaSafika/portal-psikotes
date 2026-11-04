// Akses data sesi serentak (token kelompok, Part 8b). Hanya menyentuh dbo.HCIS_Psikotes_Kelompok,
// dbo.HCIS_Psikotes_Sesi, dan dbo.HCIS_Psikotes_Ujian. Semua query berparameter. Waktu menurut jam server database.
import sql from 'mssql';
import { ambilPool } from '../../db/pool.js';
import type { JadwalTes, SesiKelompokMasukan } from './sesi.validasi.js';
import type { JenisTes, Template } from './undangan.js';

/** Awal dan akhir jadwal token kelompok sebagai DATETIME2. */
const BUKA_K = `DATEADD(SECOND, DATEDIFF(SECOND, CAST('00:00:00' AS TIME(0)), k.waktu_buka), CAST(k.tanggal AS DATETIME2(0)))`;
const TUTUP_K = `DATEADD(SECOND, DATEDIFF(SECOND, CAST('00:00:00' AS TIME(0)), k.waktu_tutup), CAST(k.tanggal AS DATETIME2(0)))`;
/** Token kelompok yang masih bisa diklaim: belum dicabut, kuota belum penuh, sekarang di dalam jadwal. */
const BISA_DIKLAIM = `k.dicabut_pada IS NULL AND k.terpakai < k.kuota AND SYSDATETIME() >= ${BUKA_K} AND SYSDATETIME() < ${TUTUP_K}`;

export type StatusKelompok = 'BELUM_MULAI' | 'AKTIF' | 'PENUH' | 'SELESAI' | 'DICABUT';

export interface KelompokAdmin extends JadwalTes {
  kelompok_id: number;
  kuota: number;
  terpakai: number;
  status: StatusKelompok;
  email_dikirim_pada: string | null;
}

/** Status untuk dashboard, dihitung di SQL dengan jam server. */
const KOLOM_KELOMPOK = `k.id AS kelompok_id, k.jenis_tes AS tes, CONVERT(CHAR(10), k.tanggal, 23) AS tanggal,
  CONVERT(CHAR(5), k.waktu_buka, 108) AS waktu_buka, CONVERT(CHAR(5), k.waktu_tutup, 108) AS waktu_tutup,
  k.kuota, k.terpakai,
  CASE WHEN k.dicabut_pada IS NOT NULL THEN 'DICABUT'
       WHEN SYSDATETIME() >= ${TUTUP_K} THEN 'SELESAI'
       WHEN SYSDATETIME() < ${BUKA_K} THEN 'BELUM_MULAI'
       WHEN k.terpakai >= k.kuota THEN 'PENUH'
       ELSE 'AKTIF' END AS status,
  CONVERT(VARCHAR(19), k.email_dikirim_pada, 120) AS email_dikirim_pada`;

/** Membuat sesi serentak dan satu token kelompok per tes, dalam satu transaksi. Null bila tanggal paling awal sudah lewat. */
export async function buatSesiKelompok(
  sesi: SesiKelompokMasukan & { tanggal: string; waktu_buka: string; waktu_tutup: string; daftar_tes: string },
  template: Template,
  bankVersi: string,
  adminId: number | null,
  token: { jadwal: JadwalTes; tokenHash: string }[],
): Promise<{ sesiId: number; kelompokId: number[] } | null> {
  const tx = new sql.Transaction(await ambilPool());
  await tx.begin();
  try {
    const s = await new sql.Request(tx)
      .input('nama', sql.NVarChar(100), sesi.nama_sesi)
      .input('tanggal', sql.VarChar(10), sesi.tanggal)
      .input('buka', sql.VarChar(5), sesi.waktu_buka)
      .input('tutup', sql.VarChar(5), sesi.waktu_tutup)
      .input('tes', sql.VarChar(20), sesi.daftar_tes)
      .input('bank', sql.VarChar(20), bankVersi)
      .input('subjek', sql.NVarChar(200), template.subjek)
      .input('isi', sql.NVarChar(4000), template.isi)
      .input('admin', sql.Int, adminId)
      .input('email', sql.NVarChar(150), sesi.email_penerima)
      .query<{ id: number }>(
        `INSERT INTO dbo.HCIS_Psikotes_Sesi
           (nama_sesi, tanggal, waktu_buka, waktu_tutup, daftar_tes, bank_versi, template_subjek, template_isi,
            dibuat_oleh, mode, email_penerima)
         OUTPUT inserted.id
         SELECT @nama, CAST(@tanggal AS DATE), CAST(@buka AS TIME(0)), CAST(@tutup AS TIME(0)), @tes, @bank,
                @subjek, @isi, @admin, 'KELOMPOK', @email
          WHERE CAST(@tanggal AS DATE) >= CAST(SYSDATETIME() AS DATE)`,
      );
    const sesiId = s.recordset[0]?.id;
    if (sesiId === undefined) {
      await tx.rollback();
      return null;
    }
    const kelompokId: number[] = [];
    for (const t of token) {
      const k = await new sql.Request(tx)
        .input('sesiId', sql.Int, sesiId)
        .input('tes', sql.VarChar(10), t.jadwal.tes)
        .input('hash', sql.Char(64), t.tokenHash)
        .input('kuota', sql.Int, sesi.kuota)
        .input('tanggal', sql.VarChar(10), t.jadwal.tanggal)
        .input('buka', sql.VarChar(5), t.jadwal.waktu_buka)
        .input('tutup', sql.VarChar(5), t.jadwal.waktu_tutup)
        .query<{ id: number }>(
          `INSERT INTO dbo.HCIS_Psikotes_Kelompok (sesi_id, jenis_tes, token_hash, kuota, tanggal, waktu_buka, waktu_tutup)
           OUTPUT inserted.id
           VALUES (@sesiId, @tes, @hash, @kuota, CAST(@tanggal AS DATE), CAST(@buka AS TIME(0)), CAST(@tutup AS TIME(0)))`,
        );
      kelompokId.push(k.recordset[0].id);
    }
    await tx.commit();
    return { sesiId, kelompokId };
  } catch (galat) {
    await tx.rollback().catch(() => undefined);
    throw galat;
  }
}

export async function daftarKelompokSesi(sesiId: number): Promise<KelompokAdmin[]> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('sesiId', sql.Int, sesiId)
    .query<KelompokAdmin>(
      `SELECT ${KOLOM_KELOMPOK} FROM dbo.HCIS_Psikotes_Kelompok k WHERE k.sesi_id = @sesiId
        ORDER BY CASE k.jenis_tes WHEN 'TIU5' THEN 1 WHEN 'TIU6' THEN 2 ELSE 3 END`,
    );
  return hasil.recordset;
}

export interface KelompokDetail extends KelompokAdmin {
  sesi_id: number;
  nama_sesi: string;
  email_penerima: string | null;
  template_subjek: string;
  template_isi: string;
}

export async function ambilKelompok(id: number): Promise<KelompokDetail | null> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('id', sql.Int, id)
    .query<KelompokDetail>(
      `SELECT ${KOLOM_KELOMPOK}, k.sesi_id, s.nama_sesi, s.email_penerima, s.template_subjek, s.template_isi
         FROM dbo.HCIS_Psikotes_Kelompok k JOIN dbo.HCIS_Psikotes_Sesi s ON s.id = k.sesi_id
        WHERE k.id = @id`,
    );
  return hasil.recordset[0] ?? null;
}

/** Kuota +1 (untuk peserta yang berganti perangkat atau terlambat). False bila dicabut atau sudah batas maksimum. */
export async function tambahKuota(id: number, kuotaMaks: number): Promise<boolean> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('id', sql.Int, id)
    .input('maks', sql.Int, kuotaMaks)
    .query('UPDATE dbo.HCIS_Psikotes_Kelompok SET kuota = kuota + 1 WHERE id = @id AND dicabut_pada IS NULL AND kuota < @maks');
  return hasil.rowsAffected[0] === 1;
}

/** Ganti hash token. Kuota, terpakai, dan peserta yang sudah masuk tidak berubah. False bila dicabut. */
export async function gantiTokenKelompok(id: number, tokenHash: string): Promise<boolean> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('id', sql.Int, id)
    .input('hash', sql.Char(64), tokenHash)
    .query('UPDATE dbo.HCIS_Psikotes_Kelompok SET token_hash = @hash WHERE id = @id AND dicabut_pada IS NULL');
  return hasil.rowsAffected[0] === 1;
}

/** Cabut: hanya menolak klaim baru. Peserta yang sudah masuk tetap mengerjakan (keputusan pemilik proyek). */
export async function cabutKelompok(id: number): Promise<boolean> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('id', sql.Int, id)
    .query('UPDATE dbo.HCIS_Psikotes_Kelompok SET dicabut_pada = SYSDATETIME() WHERE id = @id AND dicabut_pada IS NULL');
  return hasil.rowsAffected[0] === 1;
}

/** Penanda email token sudah dibuka di aplikasi email, untuk semua token kelompok sesi itu. */
export async function tandaiEmailDikirim(sesiId: number): Promise<number> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('sesiId', sql.Int, sesiId)
    .query('UPDATE dbo.HCIS_Psikotes_Kelompok SET email_dikirim_pada = SYSDATETIME() WHERE sesi_id = @sesiId');
  return hasil.rowsAffected[0];
}

export interface PesertaKelompok {
  ujian_id: number;
  nama: string;
  masuk_pada: string;
  status: string;
  /** Ada peserta lain di token ini dengan nama sama (tidak ditolak, hanya ditandai). */
  nama_kembar: boolean;
}

/** Peserta yang sudah masuk lewat satu token kelompok, urut nama. */
export async function pesertaKelompok(kelompokId: number): Promise<PesertaKelompok[]> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('id', sql.Int, kelompokId)
    .query<PesertaKelompok>(
      `SELECT id AS ujian_id, nama, CONVERT(VARCHAR(19), dibuat_pada, 120) AS masuk_pada, status,
              CAST(CASE WHEN COUNT(*) OVER (PARTITION BY LOWER(LTRIM(RTRIM(nama)))) > 1 THEN 1 ELSE 0 END AS BIT) AS nama_kembar
         FROM dbo.HCIS_Psikotes_Ujian
        WHERE kelompok_id = @id
        ORDER BY nama, id`,
    );
  return hasil.recordset;
}

/** Koreksi nama oleh admin (salah ketik). */
export async function ubahNama(ujianId: number, nama: string): Promise<boolean> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('id', sql.Int, ujianId)
    .input('nama', sql.NVarChar(100), nama)
    .query('UPDATE dbo.HCIS_Psikotes_Ujian SET nama = @nama WHERE id = @id');
  return hasil.rowsAffected[0] === 1;
}

/** Langkah 1 (tanpa memakai kuota): token kelompok untuk tes ini masih bisa diklaim. */
export async function cekTokenKelompok(tokenHash: string, jenis: JenisTes): Promise<boolean> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('hash', sql.Char(64), tokenHash)
    .input('jenis', sql.VarChar(10), jenis)
    .query(`SELECT 1 AS ada FROM dbo.HCIS_Psikotes_Kelompok k WHERE k.token_hash = @hash AND k.jenis_tes = @jenis AND ${BISA_DIKLAIM}`);
  return hasil.recordset.length === 1;
}

/**
 * Klaim kuota atomik: satu batch, satu transaksi. UPDATE ... WHERE terpakai < kuota memeriksa ulang syarat
 * setelah mengunci baris, jadi klaim paralel tidak bisa melebihi kuota (CHECK di tabel menjadi lapis kedua).
 * Bila berhasil, satu catatan ujian dibuat (status BERJALAN, belum mulai) dengan sesi peserta sendiri.
 * Null bila token salah, tes lain, penuh, dicabut, atau di luar jadwal (tanpa membedakan alasannya).
 */
export async function klaimKelompok(
  tokenHash: string,
  jenis: JenisTes,
  nama: string,
  sesiHash: Buffer,
): Promise<{ id: number; jenis_tes: JenisTes } | null> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('hash', sql.Char(64), tokenHash)
    .input('jenis', sql.VarChar(10), jenis)
    .input('nama', sql.NVarChar(100), nama)
    .input('sesiHash', sql.VarBinary(32), sesiHash)
    .query<{ id: number; jenis_tes: JenisTes }>(
      `SET XACT_ABORT ON;
       BEGIN TRANSACTION;
       DECLARE @klaim TABLE (id INT);
       UPDATE k SET terpakai = k.terpakai + 1
       OUTPUT inserted.id INTO @klaim
         FROM dbo.HCIS_Psikotes_Kelompok k
        WHERE k.token_hash = @hash AND k.jenis_tes = @jenis AND ${BISA_DIKLAIM};
       IF NOT EXISTS (SELECT 1 FROM @klaim)
       BEGIN
         ROLLBACK TRANSACTION;
         RETURN;
       END;
       INSERT INTO dbo.HCIS_Psikotes_Ujian
         (nama_sesi, jenis_tes, tanggal, waktu_buka, waktu_tutup, bank_versi, email, nama, token_hash, status,
          berlaku_sampai, sesi_id, kelompok_id, sesi_peserta_hash, sesi_peserta_aktif)
       OUTPUT inserted.id, inserted.jenis_tes
       SELECT s.nama_sesi, k.jenis_tes, k.tanggal, k.waktu_buka, k.waktu_tutup, s.bank_versi, NULL, @nama, NULL, 'BERJALAN',
              ${TUTUP_K}, s.id, k.id, @sesiHash, SYSDATETIME()
         FROM dbo.HCIS_Psikotes_Kelompok k
         JOIN dbo.HCIS_Psikotes_Sesi s ON s.id = k.sesi_id
        WHERE k.id = (SELECT id FROM @klaim);
       COMMIT TRANSACTION;`,
    );
  return hasil.recordset?.[0] ?? null;
}

/** Langkah 1 untuk token individu (tanpa memakai token): cocok, belum dipakai, tes ini, dalam jadwal. */
export async function cekTokenIndividu(tokenHash: string, jenis: JenisTes): Promise<boolean> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('hash', sql.Char(64), tokenHash)
    .input('jenis', sql.VarChar(10), jenis)
    .query(
      `SELECT 1 AS ada FROM dbo.HCIS_Psikotes_Ujian u
        WHERE u.token_hash = @hash AND u.jenis_tes = @jenis AND u.status = 'BELUM_DIPAKAI'
          AND SYSDATETIME() >= DATEADD(SECOND, DATEDIFF(SECOND, CAST('00:00:00' AS TIME(0)), u.waktu_buka), CAST(u.tanggal AS DATETIME2(0)))
          AND SYSDATETIME() < u.berlaku_sampai`,
    );
  return hasil.recordset.length === 1;
}
