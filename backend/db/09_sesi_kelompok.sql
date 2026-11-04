/* Portal Psikotes - sesi serentak (kelompok), Part 8b. Jalankan setelah 08.
   DRAF: dijalankan oleh pemilik proyek di SSMS. AI dan aplikasi tidak menjalankan DDL.
   Database BA (dipakai bersama), skema dbo, prefix HCIS_Psikotes_. Hanya menyentuh objek HCIS_Psikotes_.
   Aman dijalankan ulang. Tidak ada DROP TABLE, DROP COLUMN, atau TRUNCATE.

   Bagian 2 memakai DROP CONSTRAINT dan DROP INDEX untuk melonggarkan kolom email dan token_hash
   (keputusan pemilik proyek 4 November 2026, Opsi A). Yang dihapus hanya struktur, BUKAN data:
   constraint dan indeks itu langsung dibuat ulang sebagai indeks unik terfilter.
   Bagian 2 berjalan dalam satu transaksi: bila ada yang gagal, semuanya dibatalkan.
   Uji dulu di salinan atau data dummy bila memungkinkan.

   Setelah dijalankan: bila hak akun aplikasi diberikan per tabel, minta IT memberi
   SELECT, INSERT, UPDATE pada dbo.HCIS_Psikotes_Kelompok. */

USE BA;
GO

/* ---------- Bagian 1: objek baru (tanpa DROP) ---------- */

-- Satu baris = satu token kelompok untuk satu tes dalam satu sesi serentak.
-- Tanpa data pribadi peserta. Token mentah tidak disimpan, hanya hash SHA-256.
IF OBJECT_ID('dbo.HCIS_Psikotes_Kelompok', 'U') IS NULL
CREATE TABLE dbo.HCIS_Psikotes_Kelompok (
    id                 INT IDENTITY(1,1) CONSTRAINT PK_HCIS_Psikotes_Kelompok PRIMARY KEY,
    sesi_id            INT NOT NULL CONSTRAINT FK_HCIS_Psikotes_Kelompok_Sesi
                       REFERENCES dbo.HCIS_Psikotes_Sesi(id),
    jenis_tes          VARCHAR(10) NOT NULL
                       CONSTRAINT CK_HCIS_Psikotes_Kelompok_Jenis CHECK (jenis_tes IN ('TIU5','TIU6','KORAN')),
    token_hash         CHAR(64) NOT NULL CONSTRAINT UQ_HCIS_Psikotes_Kelompok_Token UNIQUE,
    kuota              INT NOT NULL,
    terpakai           INT NOT NULL CONSTRAINT DF_HCIS_Psikotes_Kelompok_Terpakai DEFAULT 0,
    tanggal            DATE NOT NULL,
    waktu_buka         TIME(0) NOT NULL,
    waktu_tutup        TIME(0) NOT NULL,
    dicabut_pada       DATETIME2(0) NULL,        -- cabut: hanya menolak klaim baru
    email_dikirim_pada DATETIME2(0) NULL,        -- HC membuka email token di aplikasi email
    dibuat_pada        DATETIME2(0) NOT NULL CONSTRAINT DF_HCIS_Psikotes_Kelompok_Dibuat DEFAULT SYSDATETIME(),

    CONSTRAINT UQ_HCIS_Psikotes_Kelompok_SesiTes UNIQUE (sesi_id, jenis_tes),
    -- Penjaga kuota di tingkat database, di samping WHERE terpakai < kuota pada klaim.
    CONSTRAINT CK_HCIS_Psikotes_Kelompok_Kuota CHECK (kuota BETWEEN 1 AND 1000 AND terpakai BETWEEN 0 AND kuota),
    CONSTRAINT CK_HCIS_Psikotes_Kelompok_Waktu CHECK (waktu_tutup > waktu_buka)
);
GO

-- Penghubung ujian peserta kelompok ke token kelompoknya. NULL untuk ujian individu.
IF COL_LENGTH('dbo.HCIS_Psikotes_Ujian', 'kelompok_id') IS NULL
    ALTER TABLE dbo.HCIS_Psikotes_Ujian ADD kelompok_id INT NULL
        CONSTRAINT FK_HCIS_Psikotes_Ujian_Kelompok REFERENCES dbo.HCIS_Psikotes_Kelompok(id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'IX_HCIS_Psikotes_Ujian_Kelompok'
                 AND object_id = OBJECT_ID('dbo.HCIS_Psikotes_Ujian'))
    CREATE INDEX IX_HCIS_Psikotes_Ujian_Kelompok ON dbo.HCIS_Psikotes_Ujian (kelompok_id);
GO

-- Mode sesi. Sesi lama otomatis INDIVIDU.
IF COL_LENGTH('dbo.HCIS_Psikotes_Sesi', 'mode') IS NULL
    ALTER TABLE dbo.HCIS_Psikotes_Sesi ADD mode VARCHAR(10) NOT NULL
        CONSTRAINT DF_HCIS_Psikotes_Sesi_Mode DEFAULT 'INDIVIDU'
        CONSTRAINT CK_HCIS_Psikotes_Sesi_Mode CHECK (mode IN ('INDIVIDU','KELOMPOK'));
GO

-- Email penerima token kelompok (pengawas, guru, atau panitia). Data pribadi: ikut retensi 4 bulan.
IF COL_LENGTH('dbo.HCIS_Psikotes_Sesi', 'email_penerima') IS NULL
    ALTER TABLE dbo.HCIS_Psikotes_Sesi ADD email_penerima NVARCHAR(150) NULL;
GO

/* ---------- Bagian 2: melonggarkan email dan token_hash di tabel ujian (Opsi A) ----------
   SQL Server tidak mengizinkan ALTER COLUMN pada kolom yang dipakai UNIQUE atau indeks,
   jadi constraint dan indeks dilepas, kolom diubah, lalu keunikan dibuat ulang hanya untuk
   baris yang terisi (indeks unik terfilter). Satu batch, satu transaksi. */

SET XACT_ABORT ON;
BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID('dbo.UQ_HCIS_Psikotes_Ujian_Token', 'UQ') IS NOT NULL
        ALTER TABLE dbo.HCIS_Psikotes_Ujian DROP CONSTRAINT UQ_HCIS_Psikotes_Ujian_Token;

    IF OBJECT_ID('dbo.UQ_HCIS_Psikotes_Ujian_Peserta', 'UQ') IS NOT NULL
        ALTER TABLE dbo.HCIS_Psikotes_Ujian DROP CONSTRAINT UQ_HCIS_Psikotes_Ujian_Peserta;

    IF EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'IX_HCIS_Psikotes_Ujian_Email' AND object_id = OBJECT_ID('dbo.HCIS_Psikotes_Ujian'))
        DROP INDEX IX_HCIS_Psikotes_Ujian_Email ON dbo.HCIS_Psikotes_Ujian;

    ALTER TABLE dbo.HCIS_Psikotes_Ujian ALTER COLUMN email NVARCHAR(150) NULL;
    ALTER TABLE dbo.HCIS_Psikotes_Ujian ALTER COLUMN token_hash CHAR(64) NULL;

    -- Dibuat lewat EXEC supaya batch ini bisa dikompilasi sebelum kolom berubah.
    IF NOT EXISTS (SELECT 1 FROM sys.indexes
                   WHERE name = 'UX_HCIS_Psikotes_Ujian_Token' AND object_id = OBJECT_ID('dbo.HCIS_Psikotes_Ujian'))
        EXEC (N'CREATE UNIQUE INDEX UX_HCIS_Psikotes_Ujian_Token
                 ON dbo.HCIS_Psikotes_Ujian (token_hash) WHERE token_hash IS NOT NULL;');

    IF NOT EXISTS (SELECT 1 FROM sys.indexes
                   WHERE name = 'UX_HCIS_Psikotes_Ujian_Peserta' AND object_id = OBJECT_ID('dbo.HCIS_Psikotes_Ujian'))
        EXEC (N'CREATE UNIQUE INDEX UX_HCIS_Psikotes_Ujian_Peserta
                 ON dbo.HCIS_Psikotes_Ujian (nama_sesi, tanggal, jenis_tes, email) WHERE email IS NOT NULL;');

    IF NOT EXISTS (SELECT 1 FROM sys.indexes
                   WHERE name = 'IX_HCIS_Psikotes_Ujian_Email' AND object_id = OBJECT_ID('dbo.HCIS_Psikotes_Ujian'))
        EXEC (N'CREATE INDEX IX_HCIS_Psikotes_Ujian_Email ON dbo.HCIS_Psikotes_Ujian (email);');

    -- Baris individu wajib email dan token; baris kelompok wajib nama, tanpa email dan token.
    IF OBJECT_ID('dbo.CK_HCIS_Psikotes_Ujian_Mode', 'C') IS NULL
        EXEC (N'ALTER TABLE dbo.HCIS_Psikotes_Ujian ADD CONSTRAINT CK_HCIS_Psikotes_Ujian_Mode CHECK (
                  (kelompok_id IS NULL AND email IS NOT NULL AND token_hash IS NOT NULL)
               OR (kelompok_id IS NOT NULL AND email IS NULL AND token_hash IS NULL AND nama IS NOT NULL));');

    COMMIT TRANSACTION;
    PRINT 'Bagian 2 selesai: email dan token_hash boleh NULL, keunikan dibuat ulang sebagai indeks terfilter.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    PRINT 'Bagian 2 DIBATALKAN, tabel ujian tidak berubah. Kirim pesan galat berikut ke pengembang.';
    THROW;
END CATCH;
GO
