/* Portal Psikotes - tabel sesi tes dan kolom sesi peserta. Jalankan setelah 04.
   Database BA (dipakai bersama), skema dbo, prefix HCIS_Psikotes_.
   Aman dijalankan ulang. Tidak ada DROP, hanya menyentuh objek HCIS_Psikotes_.
   Tabel sesi TIDAK berisi data pribadi: hanya data sesi dan template undangan.
   Kolom nama_sesi, tanggal, waktu_* di tabel ujian tetap diisi (wajib, tidak dihapus).

   PENTING: bila hak akun aplikasi diberikan per tabel, minta IT memberi
   SELECT, INSERT, UPDATE pada dbo.HCIS_Psikotes_Sesi setelah skrip ini dijalankan. */

USE BA;
GO

IF OBJECT_ID('dbo.HCIS_Psikotes_Sesi', 'U') IS NULL
CREATE TABLE dbo.HCIS_Psikotes_Sesi (
    id              INT IDENTITY(1,1) CONSTRAINT PK_HCIS_Psikotes_Sesi PRIMARY KEY,
    nama_sesi       NVARCHAR(100) NOT NULL,
    tanggal         DATE NOT NULL,
    waktu_buka      TIME(0) NOT NULL,
    waktu_tutup     TIME(0) NOT NULL,
    daftar_tes      VARCHAR(20) NOT NULL,          -- contoh: TIU5,TIU6,KORAN
    bank_versi      VARCHAR(20) NOT NULL,

    -- template undangan email untuk sesi ini (bisa diedit HC)
    template_subjek NVARCHAR(200)  NOT NULL,
    template_isi    NVARCHAR(4000) NOT NULL,

    dibuat_oleh     INT NULL CONSTRAINT FK_HCIS_Psikotes_Sesi_Admin
                    REFERENCES dbo.HCIS_Psikotes_Admin(id),
    dibuat_pada     DATETIME2(0) NOT NULL CONSTRAINT DF_HCIS_Psikotes_Sesi_Dibuat DEFAULT SYSDATETIME(),

    CONSTRAINT UQ_HCIS_Psikotes_Sesi_Nama UNIQUE (nama_sesi, tanggal),
    CONSTRAINT CK_HCIS_Psikotes_Sesi_Waktu CHECK (waktu_tutup > waktu_buka)
);
GO

-- Penghubung ujian ke sesi.
IF COL_LENGTH('dbo.HCIS_Psikotes_Ujian', 'sesi_id') IS NULL
    ALTER TABLE dbo.HCIS_Psikotes_Ujian ADD sesi_id INT NULL
        CONSTRAINT FK_HCIS_Psikotes_Ujian_Sesi REFERENCES dbo.HCIS_Psikotes_Sesi(id);
GO

-- Sesi login peserta setelah token diverifikasi (hash SHA-256, token mentah tidak disimpan).
IF COL_LENGTH('dbo.HCIS_Psikotes_Ujian', 'sesi_peserta_hash') IS NULL
    ALTER TABLE dbo.HCIS_Psikotes_Ujian ADD sesi_peserta_hash VARBINARY(32) NULL;
GO

IF COL_LENGTH('dbo.HCIS_Psikotes_Ujian', 'sesi_peserta_aktif') IS NULL
    ALTER TABLE dbo.HCIS_Psikotes_Ujian ADD sesi_peserta_aktif DATETIME2(0) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'UX_HCIS_Psikotes_Ujian_SesiPeserta'
                 AND object_id = OBJECT_ID('dbo.HCIS_Psikotes_Ujian'))
    CREATE UNIQUE NONCLUSTERED INDEX UX_HCIS_Psikotes_Ujian_SesiPeserta
        ON dbo.HCIS_Psikotes_Ujian (sesi_peserta_hash)
        WHERE sesi_peserta_hash IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'IX_HCIS_Psikotes_Ujian_Sesi'
                 AND object_id = OBJECT_ID('dbo.HCIS_Psikotes_Ujian'))
    CREATE INDEX IX_HCIS_Psikotes_Ujian_Sesi ON dbo.HCIS_Psikotes_Ujian (sesi_id);
GO
