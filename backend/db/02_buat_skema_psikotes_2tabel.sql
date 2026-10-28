/* Portal Psikotes - DDL SQL Server 2024, versi 2 tabel (menggantikan 01_buat_skema_psikotes.sql).
   Skema: psikotes. Aman dijalankan ulang. Tidak ada DROP, tidak menyentuh objek di luar skema psikotes.
   Bank soal, kunci jawaban, durasi, dan aturan skor TIDAK di database: ada di berkas backend.
   JALANKAN HANYA di database khusus platform ini. Belum diuji di server nyata. */

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'psikotes')
    EXEC('CREATE SCHEMA psikotes');
GO

/* Satu baris = satu peserta mengerjakan satu tes dalam satu sesi.
   Memuat data sesi, peserta, token, waktu pengerjaan, dan hasil. */
IF OBJECT_ID('psikotes.ujian') IS NULL
CREATE TABLE psikotes.ujian (
    id              INT IDENTITY(1,1) CONSTRAINT PK_psi_ujian PRIMARY KEY,

    -- sesi (dibuat HC)
    nama_sesi       NVARCHAR(100) NOT NULL,
    jenis_tes       VARCHAR(10)   NOT NULL
                    CONSTRAINT CK_psi_ujian_jenis CHECK (jenis_tes IN ('TIU5','TIU6','KORAN')),
    tanggal         DATE NOT NULL,
    waktu_buka      TIME(0) NOT NULL,
    waktu_tutup     TIME(0) NOT NULL,
    bank_versi      VARCHAR(20) NOT NULL,          -- versi folder bank soal yang dipakai, contoh v1

    -- peserta
    email           NVARCHAR(150) NOT NULL,
    nama            NVARCHAR(100) NULL,

    -- token sekali pakai (simpan HASH, bukan token mentah)
    token_hash      CHAR(64) NOT NULL CONSTRAINT UQ_psi_ujian_token UNIQUE,
    status          VARCHAR(15) NOT NULL CONSTRAINT DF_psi_ujian_status DEFAULT 'BELUM_DIPAKAI'
                    CONSTRAINT CK_psi_ujian_status CHECK (status IN
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

    dibuat_pada     DATETIME2(0) NOT NULL CONSTRAINT DF_psi_ujian_dibuat DEFAULT SYSDATETIME(),

    -- satu peserta satu tes satu sesi
    CONSTRAINT UQ_psi_ujian_peserta UNIQUE (nama_sesi, tanggal, jenis_tes, email)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_psi_ujian_email')
    CREATE INDEX IX_psi_ujian_email ON psikotes.ujian (email);
GO

/* Jawaban mentah. nomor_soal merujuk ke nomor di berkas bank soal versi ujian.bank_versi.
   Soal kosong = tidak ada baris, atau jawaban NULL.
   Contoh nilai jawaban: TIU5 angka pilihan, TIU6 'B' atau 'S', KORAN satu digit. */
IF OBJECT_ID('psikotes.jawaban') IS NULL
CREATE TABLE psikotes.jawaban (
    ujian_id        INT NOT NULL CONSTRAINT FK_psi_jawaban_ujian REFERENCES psikotes.ujian(id),
    nomor_soal      INT NOT NULL,
    jawaban         VARCHAR(5) NULL,
    dijawab_pada    DATETIME2(0) NOT NULL CONSTRAINT DF_psi_jawaban_waktu DEFAULT SYSDATETIME(),
    CONSTRAINT PK_psi_jawaban PRIMARY KEY (ujian_id, nomor_soal)
);
GO
