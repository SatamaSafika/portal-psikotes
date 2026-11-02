/* Portal Psikotes - tabel admin HC. Jalankan setelah 02.
   Database BA (dipakai bersama), skema dbo, prefix HCIS_Psikotes_.
   Aman dijalankan ulang. Tidak ada DROP, tidak menyentuh objek tanpa prefix HCIS_Psikotes_.
   Semua admin HC berperan sama, jadi tidak ada tabel peran.
   Tidak ada pendaftaran mandiri: akun dibuat lewat skrip backend (Part 1). */

USE BA;
GO

IF OBJECT_ID('dbo.HCIS_Psikotes_Admin', 'U') IS NULL
CREATE TABLE dbo.HCIS_Psikotes_Admin (
    id              INT IDENTITY(1,1) CONSTRAINT PK_HCIS_Psikotes_Admin PRIMARY KEY,
    username        NVARCHAR(50)  NOT NULL CONSTRAINT UQ_HCIS_Psikotes_Admin_Username UNIQUE,
    password_hash   NVARCHAR(255) NOT NULL,        -- hash argon2 atau bcrypt, bukan password mentah
    aktif           BIT NOT NULL CONSTRAINT DF_HCIS_Psikotes_Admin_Aktif DEFAULT 1,

    -- pembatasan percobaan login
    gagal_login     INT NOT NULL CONSTRAINT DF_HCIS_Psikotes_Admin_Gagal DEFAULT 0,
    terkunci_sampai DATETIME2(0) NULL,

    login_terakhir  DATETIME2(0) NULL,
    dibuat_pada     DATETIME2(0) NOT NULL CONSTRAINT DF_HCIS_Psikotes_Admin_Dibuat DEFAULT SYSDATETIME()
);
GO
