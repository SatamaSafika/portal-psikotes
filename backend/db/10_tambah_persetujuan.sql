/* Portal Psikotes - bukti persetujuan peserta (Part 8c). Jalankan setelah 09.
   Database BA (dipakai bersama), skema dbo, prefix HCIS_Psikotes_.
   Aman dijalankan ulang. Tidak ada DROP, hanya menyentuh dbo.HCIS_Psikotes_Ujian. Tanpa tabel baru.
   Diisi server saat peserta masuk setelah memilih "Saya Setuju" (individu dan serentak):
   - persetujuan_pada  : waktu server saat persetujuan diterima.
   - persetujuan_versi : versi teks persetujuan (config/persetujuan.json) yang disetujui.
   Boleh NULL untuk baris lama yang dibuat sebelum fitur ini. Ikut retensi 4 bulan bersama data peserta. */

USE BA;
GO

IF COL_LENGTH('dbo.HCIS_Psikotes_Ujian', 'persetujuan_pada') IS NULL
    ALTER TABLE dbo.HCIS_Psikotes_Ujian ADD persetujuan_pada DATETIME2(0) NULL;
GO

IF COL_LENGTH('dbo.HCIS_Psikotes_Ujian', 'persetujuan_versi') IS NULL
    ALTER TABLE dbo.HCIS_Psikotes_Ujian ADD persetujuan_versi VARCHAR(20) NULL;
GO
