/* Portal Psikotes - token selalu tampil dan email peserta serentak (revisi HC dan IT, 19 November 2026).
   Jalankan setelah 11. Database BA (dipakai bersama), hanya tabel dbo.HCIS_Psikotes_*. Dijalankan manual lewat SSMS.

   Isi:
   1. Kolom TokenSandi VARCHAR(100) NULL di HCIS_Psikotes_Ujian dan HCIS_Psikotes_Kelompok.
      Token terenkripsi AES-256-GCM (kunci TOKEN_KUNCI di backend/.env), supaya admin HC selalu bisa melihat token
      (audit trail). Verifikasi tetap memakai TokenHash. NULL untuk token yang dibuat sebelum skrip ini.
   2. CHECK CK_HCIS_Psikotes_Ujian_Mode diganti: baris serentak (KelompokId terisi) kini boleh memiliki Email.
      Aturan baru adalah perluasan aturan lama, jadi semua baris yang ada tetap lolos.
   3. Indeks unik UX_HCIS_Psikotes_Ujian_Peserta dibuat ulang hanya untuk baris individu (KelompokId IS NULL),
      karena email peserta serentak boleh sama (peserta masuk ulang dari perangkat lain).

   Tidak ada DROP TABLE, tidak ada data yang dihapus atau diubah. DROP hanya untuk satu CHECK dan satu indeks yang
   langsung dibuat ulang. Semua dalam satu transaksi: bila satu langkah gagal, semuanya dibatalkan.
   Aman dijalankan ulang. */

USE BA;
GO

SET XACT_ABORT ON;
BEGIN TRY
    BEGIN TRANSACTION;

    IF COL_LENGTH('dbo.HCIS_Psikotes_Ujian', 'TokenSandi') IS NULL
        ALTER TABLE dbo.HCIS_Psikotes_Ujian ADD TokenSandi VARCHAR(100) NULL;

    IF COL_LENGTH('dbo.HCIS_Psikotes_Kelompok', 'TokenSandi') IS NULL
        ALTER TABLE dbo.HCIS_Psikotes_Kelompok ADD TokenSandi VARCHAR(100) NULL;

    IF EXISTS (SELECT 1 FROM sys.check_constraints
                WHERE name = 'CK_HCIS_Psikotes_Ujian_Mode' AND parent_object_id = OBJECT_ID('dbo.HCIS_Psikotes_Ujian'))
        ALTER TABLE dbo.HCIS_Psikotes_Ujian DROP CONSTRAINT CK_HCIS_Psikotes_Ujian_Mode;

    ALTER TABLE dbo.HCIS_Psikotes_Ujian WITH CHECK ADD CONSTRAINT CK_HCIS_Psikotes_Ujian_Mode CHECK (
           (KelompokId IS NULL AND Email IS NOT NULL AND TokenHash IS NOT NULL)
        OR (KelompokId IS NOT NULL AND TokenHash IS NULL AND Nama IS NOT NULL));

    IF EXISTS (SELECT 1 FROM sys.indexes
                WHERE name = 'UX_HCIS_Psikotes_Ujian_Peserta' AND object_id = OBJECT_ID('dbo.HCIS_Psikotes_Ujian'))
        DROP INDEX UX_HCIS_Psikotes_Ujian_Peserta ON dbo.HCIS_Psikotes_Ujian;

    CREATE UNIQUE INDEX UX_HCIS_Psikotes_Ujian_Peserta
        ON dbo.HCIS_Psikotes_Ujian (NamaSesi, Tanggal, JenisTes, Email)
        WHERE Email IS NOT NULL AND KelompokId IS NULL;

    COMMIT TRANSACTION;
    PRINT 'Selesai: TokenSandi ditambahkan, CHECK mode dan indeks peserta diperbarui.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    PRINT 'Dibatalkan, tidak ada yang berubah.';
    THROW;
END CATCH;
GO

/* ---------- Pemeriksaan (hanya SELECT) ---------- */

-- 1. Harus 2 baris: TokenSandi di Ujian dan Kelompok.
SELECT t.name AS tabel, c.name AS kolom, TYPE_NAME(c.user_type_id) AS tipe, c.max_length, c.is_nullable
  FROM sys.columns c JOIN sys.tables t ON t.object_id = c.object_id
 WHERE t.name IN ('HCIS_Psikotes_Ujian', 'HCIS_Psikotes_Kelompok') AND c.name = 'TokenSandi';

-- 2. Definisi CHECK mode dan filter indeks peserta yang baru.
SELECT name, definition FROM sys.check_constraints WHERE name = 'CK_HCIS_Psikotes_Ujian_Mode';
SELECT name, filter_definition FROM sys.indexes WHERE name = 'UX_HCIS_Psikotes_Ujian_Peserta';
