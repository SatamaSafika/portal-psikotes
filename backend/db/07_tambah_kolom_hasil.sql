/* Portal Psikotes - kolom hasil tambahan di tabel ujian. Jalankan setelah 06.
   Database BA (dipakai bersama), skema dbo, prefix HCIS_Psikotes_.
   Aman dijalankan ulang. Tidak ada DROP, hanya menyentuh dbo.HCIS_Psikotes_Ujian. Tanpa tabel baru.
   Kedua kolom ikut terhapus bersama baris ujian (retensi 4 bulan), jadi grafik Koran
   tetap bisa dibuka setelah jawaban mentah dihapus (3 bulan). */

USE BA;
GO

-- N Koran = total benar / 22, dibulatkan setengah ke atas (0 sampai 45). NULL untuk TIU 5 dan TIU 6.
IF COL_LENGTH('dbo.HCIS_Psikotes_Ujian', 'n_koran') IS NULL
    ALTER TABLE dbo.HCIS_Psikotes_Ujian ADD n_koran TINYINT NULL;
GO

-- Ringkasan 22 interval x 20 detik Koran, JSON: [{"dikerjakan":..,"benar":..,"salah":..}, ...].
-- NULL untuk TIU 5 dan TIU 6.
IF COL_LENGTH('dbo.HCIS_Psikotes_Ujian', 'ringkasan_interval') IS NULL
    ALTER TABLE dbo.HCIS_Psikotes_Ujian ADD ringkasan_interval NVARCHAR(2000) NULL
        CONSTRAINT CK_HCIS_Psikotes_Ujian_Interval CHECK (ringkasan_interval IS NULL OR ISJSON(ringkasan_interval) = 1);
GO
