/* Portal Psikotes - tabel admin HC. Jalankan setelah 02.
   Aman dijalankan ulang. Tidak ada DROP, tidak menyentuh objek di luar skema psikotes.
   Semua admin HC berperan sama, jadi tidak ada tabel peran.
   Tidak ada pendaftaran mandiri: akun dibuat lewat skrip backend (Part 1).
   JALANKAN HANYA di database khusus platform ini. */

IF OBJECT_ID('psikotes.admin') IS NULL
CREATE TABLE psikotes.admin (
    id              INT IDENTITY(1,1) CONSTRAINT PK_psi_admin PRIMARY KEY,
    username        NVARCHAR(50)  NOT NULL CONSTRAINT UQ_psi_admin_username UNIQUE,
    password_hash   NVARCHAR(255) NOT NULL,        -- hash argon2 atau bcrypt, bukan password mentah
    aktif           BIT NOT NULL CONSTRAINT DF_psi_admin_aktif DEFAULT 1,

    -- pembatasan percobaan login
    gagal_login     INT NOT NULL CONSTRAINT DF_psi_admin_gagal DEFAULT 0,
    terkunci_sampai DATETIME2(0) NULL,

    login_terakhir  DATETIME2(0) NULL,
    dibuat_pada     DATETIME2(0) NOT NULL CONSTRAINT DF_psi_admin_dibuat DEFAULT SYSDATETIME()
);
GO
