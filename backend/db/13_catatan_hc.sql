/* Portal Psikotes - catatan / komentar HC pada Laporan Peserta disimpan (revisi HC 19 November 2026).
   Menggantikan keputusan 5 November 2026 ("catatan HC tidak disimpan"). Jalankan setelah 12.
   Database BA (dipakai bersama), hanya dbo.HCIS_Psikotes_Ujian. Dijalankan manual lewat SSMS.

   Kolom baru di HCIS_Psikotes_Ujian (semua NULL, tanpa nilai bawaan):
   - CatatanHc     NVARCHAR(2000) : isi catatan. Satu laporan = satu peserta dalam satu sesi, jadi catatan yang sama
                                    ditulis ke semua baris tes peserta itu di sesi tersebut.
   - CatatanHcPada DATETIME2(0)   : waktu server saat catatan terakhir disimpan.
   - CatatanHcOleh NVARCHAR(50)   : username admin yang terakhir menyimpan (panjang sama dengan HCIS_Psikotes_Admin.Username).
   Termasuk data peserta: ikut terhapus bersama baris ujian pada retensi 4 bulan.

   Hanya ADD COLUMN. Tidak ada DROP dan tidak ada data yang diubah. Aman dijalankan ulang. */

USE BA;
GO

SET XACT_ABORT ON;
BEGIN TRY
    BEGIN TRANSACTION;

    IF COL_LENGTH('dbo.HCIS_Psikotes_Ujian', 'CatatanHc') IS NULL
        ALTER TABLE dbo.HCIS_Psikotes_Ujian ADD CatatanHc NVARCHAR(2000) NULL;

    IF COL_LENGTH('dbo.HCIS_Psikotes_Ujian', 'CatatanHcPada') IS NULL
        ALTER TABLE dbo.HCIS_Psikotes_Ujian ADD CatatanHcPada DATETIME2(0) NULL;

    IF COL_LENGTH('dbo.HCIS_Psikotes_Ujian', 'CatatanHcOleh') IS NULL
        ALTER TABLE dbo.HCIS_Psikotes_Ujian ADD CatatanHcOleh NVARCHAR(50) NULL;

    COMMIT TRANSACTION;
    PRINT 'Selesai: kolom CatatanHc, CatatanHcPada, CatatanHcOleh ditambahkan.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    PRINT 'Dibatalkan, tidak ada yang berubah.';
    THROW;
END CATCH;
GO

/* ---------- Pemeriksaan (hanya SELECT): harus 3 baris ---------- */
SELECT c.name AS kolom, TYPE_NAME(c.user_type_id) AS tipe, c.max_length, c.is_nullable
  FROM sys.columns c
 WHERE c.object_id = OBJECT_ID('dbo.HCIS_Psikotes_Ujian') AND c.name LIKE 'CatatanHc%'
 ORDER BY c.column_id;
