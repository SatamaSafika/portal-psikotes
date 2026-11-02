/* Portal Psikotes - DDL SQL Server 2024: tabel ujian dan jawaban.
   Database BA (dipakai bersama), skema dbo. Semua objek proyek berprefix HCIS_Psikotes_.
   Aman dijalankan ulang. Tidak ada DROP, tidak menyentuh objek tanpa prefix HCIS_Psikotes_.
   Bank soal, kunci jawaban, durasi, dan aturan skor TIDAK di database: ada di berkas backend.
   Belum diuji di server nyata. */

USE BA;
GO

/* Satu baris = satu peserta mengerjakan satu tes dalam satu sesi.
   Memuat data sesi, peserta, token, waktu pengerjaan, dan hasil. */
IF OBJECT_ID('dbo.HCIS_Psikotes_Ujian', 'U') IS NULL
CREATE TABLE dbo.HCIS_Psikotes_Ujian (
    id              INT IDENTITY(1,1) CONSTRAINT PK_HCIS_Psikotes_Ujian PRIMARY KEY,

    -- sesi (dibuat HC)
    nama_sesi       NVARCHAR(100) NOT NULL,
    jenis_tes       VARCHAR(10)   NOT NULL
                    CONSTRAINT CK_HCIS_Psikotes_Ujian_Jenis CHECK (jenis_tes IN ('TIU5','TIU6','KORAN')),
    tanggal         DATE NOT NULL,
    waktu_buka      TIME(0) NOT NULL,
    waktu_tutup     TIME(0) NOT NULL,
    bank_versi      VARCHAR(20) NOT NULL,          -- versi folder bank soal yang dipakai, contoh v1

    -- peserta
    email           NVARCHAR(150) NOT NULL,
    nama            NVARCHAR(100) NULL,

    -- token sekali pakai (simpan HASH, bukan token mentah)
    token_hash      CHAR(64) NOT NULL CONSTRAINT UQ_HCIS_Psikotes_Ujian_Token UNIQUE,
    status          VARCHAR(15) NOT NULL CONSTRAINT DF_HCIS_Psikotes_Ujian_Status DEFAULT 'BELUM_DIPAKAI'
                    CONSTRAINT CK_HCIS_Psikotes_Ujian_Status CHECK (status IN
                        ('BELUM_DIPAKAI','BERJALAN','DIKIRIM','WAKTU_HABIS','DICABUT','KEDALUWARSA')),
    berlaku_sampai  DATETIME2(0) NOT NULL,

    -- pengerjaan (waktu dihitung di SERVER)
    mulai_pada      DATETIME2(0) NULL,
    batas_selesai   DATETIME2(0) NULL,
    selesai_pada    DATETIME2(0) NULL,

    -- hasil koreksi (diisi setelah selesai; skor dapat dihitung ulang dari tabel jawaban)
    jumlah_benar    INT NULL,
    jumlah_salah    INT NULL,
    jumlah_dijawab  INT NULL,
    skor_mentah     DECIMAL(9,2) NULL,
    kategori        NVARCHAR(30) NULL,
    skor_akhir      TINYINT NULL,                  -- rentang nilai perlu verifikasi HC, belum diberi CHECK
    aturan_versi    VARCHAR(20) NULL,              -- versi berkas skoring yang dipakai
    dihitung_pada   DATETIME2(0) NULL,

    dibuat_pada     DATETIME2(0) NOT NULL CONSTRAINT DF_HCIS_Psikotes_Ujian_Dibuat DEFAULT SYSDATETIME(),

    -- satu peserta satu tes satu sesi
    CONSTRAINT UQ_HCIS_Psikotes_Ujian_Peserta UNIQUE (nama_sesi, tanggal, jenis_tes, email)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'IX_HCIS_Psikotes_Ujian_Email'
                 AND object_id = OBJECT_ID('dbo.HCIS_Psikotes_Ujian'))
    CREATE INDEX IX_HCIS_Psikotes_Ujian_Email ON dbo.HCIS_Psikotes_Ujian (email);
GO

/* Jawaban mentah. nomor_soal merujuk ke nomor di berkas bank soal versi ujian.bank_versi.
   Soal kosong = tidak ada baris, atau jawaban NULL.
   Contoh nilai jawaban: TIU5 angka pilihan, TIU6 'B' atau 'S', KORAN satu digit. */
IF OBJECT_ID('dbo.HCIS_Psikotes_Jawaban', 'U') IS NULL
CREATE TABLE dbo.HCIS_Psikotes_Jawaban (
    ujian_id        INT NOT NULL CONSTRAINT FK_HCIS_Psikotes_Jawaban_Ujian
                    REFERENCES dbo.HCIS_Psikotes_Ujian(id),
    nomor_soal      INT NOT NULL,
    jawaban         VARCHAR(5) NULL,
    dijawab_pada    DATETIME2(0) NOT NULL CONSTRAINT DF_HCIS_Psikotes_Jawaban_Waktu DEFAULT SYSDATETIME(),
    CONSTRAINT PK_HCIS_Psikotes_Jawaban PRIMARY KEY (ujian_id, nomor_soal)
);
GO
