/* Portal Psikotes - waktu jawaban Tes Koran. Jalankan setelah 05.
   Database BA (dipakai bersama), skema dbo, prefix HCIS_Psikotes_.
   Aman dijalankan ulang. Tidak ada DROP, hanya menyentuh dbo.HCIS_Psikotes_Jawaban.
   waktu_ms = milidetik sejak tes dimulai, dicatat browser dan divalidasi server.
   Hanya terisi untuk Koran (bahan tracking 22 interval x 20 detik); NULL untuk TIU 5 dan TIU 6.
   Ikut terhapus bersama jawaban mentah (retensi 3 bulan). */

USE BA;
GO

IF COL_LENGTH('dbo.HCIS_Psikotes_Jawaban', 'waktu_ms') IS NULL
    ALTER TABLE dbo.HCIS_Psikotes_Jawaban ADD waktu_ms INT NULL
        CONSTRAINT CK_HCIS_Psikotes_Jawaban_Waktu CHECK (waktu_ms IS NULL OR waktu_ms >= 0);
GO
