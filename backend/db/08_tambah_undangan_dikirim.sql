/* Portal Psikotes - penanda undangan sudah dikirim. Jalankan setelah 07.
   Database BA (dipakai bersama), skema dbo, prefix HCIS_Psikotes_.
   Aman dijalankan ulang. Tidak ada DROP, hanya menyentuh dbo.HCIS_Psikotes_Ujian. Tanpa tabel baru.
   Diisi saat HC menekan tombol kirim undangan di dashboard (membuka email di Outlook lewat mailto).
   mailto tidak bisa memastikan email benar-benar terkirim, jadi artinya "sudah dibuka di aplikasi email". */

USE BA;
GO

IF COL_LENGTH('dbo.HCIS_Psikotes_Ujian', 'undangan_dikirim_pada') IS NULL
    ALTER TABLE dbo.HCIS_Psikotes_Ujian ADD undangan_dikirim_pada DATETIME2(0) NULL;
GO
