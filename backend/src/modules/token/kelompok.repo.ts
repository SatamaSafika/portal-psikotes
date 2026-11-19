// Akses data sesi serentak (token kelompok, Part 8b). Hanya menyentuh dbo.HCIS_Psikotes_Kelompok,
// dbo.HCIS_Psikotes_Sesi, dan dbo.HCIS_Psikotes_Ujian. Semua query berparameter. Waktu menurut jam server database.
// Kolom database PascalCase (db/11); hasil query di-alias ke snake_case supaya tipe dan API tidak berubah.
import sql from 'mssql';
import { ambilPool } from '../../db/pool.js';
import type { JadwalTes, SesiKelompokMasukan } from './sesi.validasi.js';
import type { JenisTes, Template } from './undangan.js';

/** Awal dan akhir jadwal token kelompok sebagai DATETIME2. */
const BUKA_K = `DATEADD(SECOND, DATEDIFF(SECOND, CAST('00:00:00' AS TIME(0)), k.WaktuBuka), CAST(k.Tanggal AS DATETIME2(0)))`;
const TUTUP_K = `DATEADD(SECOND, DATEDIFF(SECOND, CAST('00:00:00' AS TIME(0)), k.WaktuTutup), CAST(k.Tanggal AS DATETIME2(0)))`;
/** Token kelompok yang masih bisa diklaim: belum dicabut, kuota belum penuh, sekarang di dalam jadwal. */
const BISA_DIKLAIM = `k.DicabutPada IS NULL AND k.Terpakai < k.Kuota AND SYSDATETIME() >= ${BUKA_K} AND SYSDATETIME() < ${TUTUP_K}`;

export type StatusKelompok = 'BELUM_MULAI' | 'AKTIF' | 'PENUH' | 'SELESAI' | 'DICABUT';

export interface KelompokAdmin extends JadwalTes {
  kelompok_id: number;
  kuota: number;
  terpakai: number;
  status: StatusKelompok;
  email_dikirim_pada: string | null;
  /** Token terenkripsi (db/12), dibuka di service. Null untuk token lama. */
  token_sandi: string | null;
}

/** Status untuk dashboard, dihitung di SQL dengan jam server. */
const KOLOM_KELOMPOK = `k.Id AS kelompok_id, k.JenisTes AS tes, CONVERT(CHAR(10), k.Tanggal, 23) AS tanggal,
  CONVERT(CHAR(5), k.WaktuBuka, 108) AS waktu_buka, CONVERT(CHAR(5), k.WaktuTutup, 108) AS waktu_tutup,
  k.Kuota AS kuota, k.Terpakai AS terpakai,
  CASE WHEN k.DicabutPada IS NOT NULL THEN 'DICABUT'
       WHEN SYSDATETIME() >= ${TUTUP_K} THEN 'SELESAI'
       WHEN SYSDATETIME() < ${BUKA_K} THEN 'BELUM_MULAI'
       WHEN k.Terpakai >= k.Kuota THEN 'PENUH'
       ELSE 'AKTIF' END AS status,
  CONVERT(VARCHAR(19), k.EmailDikirimPada, 120) AS email_dikirim_pada, k.TokenSandi AS token_sandi`;

/** Membuat sesi serentak dan satu token kelompok per tes, dalam satu transaksi. Null bila tanggal paling awal sudah lewat. */
export async function buatSesiKelompok(
  sesi: SesiKelompokMasukan & { tanggal: string; waktu_buka: string; waktu_tutup: string; daftar_tes: string },
  template: Template,
  bankVersi: string,
  adminId: number | null,
  token: { jadwal: JadwalTes; tokenHash: string; tokenSandi: string }[],
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
           (NamaSesi, Tanggal, WaktuBuka, WaktuTutup, DaftarTes, BankVersi, TemplateSubjek, TemplateIsi,
            DibuatOleh, Mode, EmailPenerima)
         OUTPUT inserted.Id AS id
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
        .input('sandi', sql.VarChar(100), t.tokenSandi)
        .input('kuota', sql.Int, sesi.kuota)
        .input('tanggal', sql.VarChar(10), t.jadwal.tanggal)
        .input('buka', sql.VarChar(5), t.jadwal.waktu_buka)
        .input('tutup', sql.VarChar(5), t.jadwal.waktu_tutup)
        .query<{ id: number }>(
          `INSERT INTO dbo.HCIS_Psikotes_Kelompok (SesiId, JenisTes, TokenHash, TokenSandi, Kuota, Tanggal, WaktuBuka, WaktuTutup)
           OUTPUT inserted.Id AS id
           VALUES (@sesiId, @tes, @hash, @sandi, @kuota, CAST(@tanggal AS DATE), CAST(@buka AS TIME(0)), CAST(@tutup AS TIME(0)))`,
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
      `SELECT ${KOLOM_KELOMPOK} FROM dbo.HCIS_Psikotes_Kelompok k WHERE k.SesiId = @sesiId
        ORDER BY CASE k.JenisTes WHEN 'TIU5' THEN 1 WHEN 'TIU6' THEN 2 ELSE 3 END`,
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
      `SELECT ${KOLOM_KELOMPOK}, k.SesiId AS sesi_id, s.NamaSesi AS nama_sesi, s.EmailPenerima AS email_penerima,
              s.TemplateSubjek AS template_subjek, s.TemplateIsi AS template_isi
         FROM dbo.HCIS_Psikotes_Kelompok k JOIN dbo.HCIS_Psikotes_Sesi s ON s.Id = k.SesiId
        WHERE k.Id = @id`,
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
    .query('UPDATE dbo.HCIS_Psikotes_Kelompok SET Kuota = Kuota + 1 WHERE Id = @id AND DicabutPada IS NULL AND Kuota < @maks');
  return hasil.rowsAffected[0] === 1;
}

/** Ganti hash token. Kuota, terpakai, dan peserta yang sudah masuk tidak berubah. False bila dicabut. */
export async function gantiTokenKelompok(id: number, tokenHash: string, tokenSandi: string): Promise<boolean> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('id', sql.Int, id)
    .input('hash', sql.Char(64), tokenHash)
    .input('sandi', sql.VarChar(100), tokenSandi)
    .query('UPDATE dbo.HCIS_Psikotes_Kelompok SET TokenHash = @hash, TokenSandi = @sandi WHERE Id = @id AND DicabutPada IS NULL');
  return hasil.rowsAffected[0] === 1;
}

/** Cabut: hanya menolak klaim baru. Peserta yang sudah masuk tetap mengerjakan (keputusan pemilik proyek). */
export async function cabutKelompok(id: number): Promise<boolean> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('id', sql.Int, id)
    .query('UPDATE dbo.HCIS_Psikotes_Kelompok SET DicabutPada = SYSDATETIME() WHERE Id = @id AND DicabutPada IS NULL');
  return hasil.rowsAffected[0] === 1;
}

/** Penanda email token sudah dibuka di aplikasi email, untuk semua token kelompok sesi itu. */
export async function tandaiEmailDikirim(sesiId: number): Promise<number> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('sesiId', sql.Int, sesiId)
    .query('UPDATE dbo.HCIS_Psikotes_Kelompok SET EmailDikirimPada = SYSDATETIME() WHERE SesiId = @sesiId');
  return hasil.rowsAffected[0];
}

export interface PesertaKelompok {
  ujian_id: number;
  nama: string;
  /** Email yang diisi peserta saat verifikasi (db/12). Null untuk peserta sebelum fitur ini. Tidak terikat ke token. */
  email: string | null;
  masuk_pada: string;
  status: string;
  /** Ada peserta lain di token ini dengan nama sama (tidak ditolak, hanya ditandai). */
  nama_kembar: boolean;
  /** Waktu peserta memilih "Saya Setuju" (db/10). */
  persetujuan_pada: string | null;
  persetujuan_versi: string | null;
}

/** Peserta yang sudah masuk lewat satu token kelompok, urut nama. */
export async function pesertaKelompok(kelompokId: number): Promise<PesertaKelompok[]> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('id', sql.Int, kelompokId)
    .query<PesertaKelompok>(
      `SELECT Id AS ujian_id, Nama AS nama, Email AS email, CONVERT(VARCHAR(19), DibuatPada, 120) AS masuk_pada, Status AS status,
              CAST(CASE WHEN COUNT(*) OVER (PARTITION BY LOWER(LTRIM(RTRIM(Nama)))) > 1 THEN 1 ELSE 0 END AS BIT) AS nama_kembar,
              CONVERT(VARCHAR(19), PersetujuanPada, 120) AS persetujuan_pada, PersetujuanVersi AS persetujuan_versi
         FROM dbo.HCIS_Psikotes_Ujian
        WHERE KelompokId = @id
        ORDER BY Nama, Id`,
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
    .query('UPDATE dbo.HCIS_Psikotes_Ujian SET Nama = @nama WHERE Id = @id');
  return hasil.rowsAffected[0] === 1;
}

/** Langkah 1 (tanpa memakai kuota): token kelompok untuk tes ini masih bisa diklaim. */
export async function cekTokenKelompok(tokenHash: string, jenis: JenisTes): Promise<boolean> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('hash', sql.Char(64), tokenHash)
    .input('jenis', sql.VarChar(10), jenis)
    .query(`SELECT 1 AS ada FROM dbo.HCIS_Psikotes_Kelompok k WHERE k.TokenHash = @hash AND k.JenisTes = @jenis AND ${BISA_DIKLAIM}`);
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
  email: string,
  sesiHash: Buffer,
  persetujuanVersi: string,
): Promise<{ id: number; jenis_tes: JenisTes } | null> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('versi', sql.VarChar(20), persetujuanVersi)
    .input('hash', sql.Char(64), tokenHash)
    .input('jenis', sql.VarChar(10), jenis)
    .input('nama', sql.NVarChar(100), nama)
    .input('email', sql.NVarChar(150), email)
    .input('sesiHash', sql.VarBinary(32), sesiHash)
    .query<{ id: number; jenis_tes: JenisTes }>(
      `SET XACT_ABORT ON;
       BEGIN TRANSACTION;
       DECLARE @klaim TABLE (id INT);
       UPDATE k SET Terpakai = k.Terpakai + 1
       OUTPUT inserted.Id INTO @klaim
         FROM dbo.HCIS_Psikotes_Kelompok k
        WHERE k.TokenHash = @hash AND k.JenisTes = @jenis AND ${BISA_DIKLAIM};
       IF NOT EXISTS (SELECT 1 FROM @klaim)
       BEGIN
         ROLLBACK TRANSACTION;
         RETURN;
       END;
       INSERT INTO dbo.HCIS_Psikotes_Ujian
         (NamaSesi, JenisTes, Tanggal, WaktuBuka, WaktuTutup, BankVersi, Email, Nama, TokenHash, Status,
          BerlakuSampai, SesiId, KelompokId, SesiPesertaHash, SesiPesertaAktif, PersetujuanPada, PersetujuanVersi)
       OUTPUT inserted.Id AS id, inserted.JenisTes AS jenis_tes
       SELECT s.NamaSesi, k.JenisTes, k.Tanggal, k.WaktuBuka, k.WaktuTutup, s.BankVersi, @email, @nama, NULL, 'BERJALAN',
              ${TUTUP_K}, s.Id, k.Id, @sesiHash, SYSDATETIME(), SYSDATETIME(), @versi
         FROM dbo.HCIS_Psikotes_Kelompok k
         JOIN dbo.HCIS_Psikotes_Sesi s ON s.Id = k.SesiId
        WHERE k.Id = (SELECT id FROM @klaim);
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
        WHERE u.TokenHash = @hash AND u.JenisTes = @jenis AND u.Status = 'BELUM_DIPAKAI'
          AND SYSDATETIME() >= DATEADD(SECOND, DATEDIFF(SECOND, CAST('00:00:00' AS TIME(0)), u.WaktuBuka), CAST(u.Tanggal AS DATETIME2(0)))
          AND SYSDATETIME() < u.BerlakuSampai`,
    );
  return hasil.recordset.length === 1;
}
