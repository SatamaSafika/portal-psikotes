/* Portal Psikotes - kolom sesi login admin HC. Jalankan setelah 03.
   Database BA (dipakai bersama), skema dbo, prefix HCIS_Psikotes_.
   Aman dijalankan ulang. Tidak ada DROP, hanya menyentuh dbo.HCIS_Psikotes_Admin.
   Satu sesi per admin: login baru mengganti sesi lama.
   Token sesi mentah tidak disimpan, hanya hash SHA-256 (32 byte). */

USE BA;
GO

IF COL_LENGTH('dbo.HCIS_Psikotes_Admin', 'sesi_hash') IS NULL
    ALTER TABLE dbo.HCIS_Psikotes_Admin ADD sesi_hash VARBINARY(32) NULL;
GO

IF COL_LENGTH('dbo.HCIS_Psikotes_Admin', 'sesi_dibuat') IS NULL
    ALTER TABLE dbo.HCIS_Psikotes_Admin ADD sesi_dibuat DATETIME2(0) NULL;
GO

IF COL_LENGTH('dbo.HCIS_Psikotes_Admin', 'sesi_aktif_terakhir') IS NULL
    ALTER TABLE dbo.HCIS_Psikotes_Admin ADD sesi_aktif_terakhir DATETIME2(0) NULL;
GO

-- Pencarian sesi per hash. Terfilter supaya banyak NULL tidak bentrok dengan UNIQUE.
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'UX_HCIS_Psikotes_Admin_SesiHash'
      AND object_id = OBJECT_ID('dbo.HCIS_Psikotes_Admin')
)
    CREATE UNIQUE NONCLUSTERED INDEX UX_HCIS_Psikotes_Admin_SesiHash
        ON dbo.HCIS_Psikotes_Admin (sesi_hash)
        WHERE sesi_hash IS NOT NULL;
GO
