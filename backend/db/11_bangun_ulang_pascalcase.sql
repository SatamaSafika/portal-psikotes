/* Portal Psikotes - bangun ulang 5 tabel dengan kolom PascalCase (revisi tim IT, 13 November 2026).
   DRAF: dijalankan oleh pemilik proyek di SSMS. AI dan aplikasi tidak menjalankan DDL.
   Database BA (dipakai bersama), skema dbo. Hanya menyentuh 5 tabel dbo.HCIS_Psikotes_*.

   Menggantikan skrip 02 sampai 10. Hasilnya struktur akhir yang sama (semua kolom, constraint, dan indeks
   dari 02-10), hanya nama kolom yang PascalCase. Nama tabel, constraint, dan indeks tetap.

   >>> MENGHAPUS SEMUA DATA di kelima tabel (DROP TABLE): sesi, token, peserta, jawaban, hasil, dan AKUN ADMIN. <<<
   Keputusan pemilik proyek 13 November 2026: platform baru selesai dikembangkan, data yang ada hanya data uji.
   Untuk database baru (tabel belum ada), Bagian 1 tidak menghapus apa pun.

   Pengaman:
   - Tidak berjalan sebelum @konfirmasi diisi N'HAPUS' (Bagian 1).
   - Berhenti tanpa mengubah apa pun bila ada tabel atau view lain (di luar 5 tabel ini) yang terikat
     ke tabel proyek lewat foreign key atau schema binding.
   - Hapus dan bangun ulang dalam SATU transaksi: bila satu langkah gagal, semuanya dibatalkan
     dan tabel lama beserta datanya kembali utuh.

   Setelah berhasil:
   1. Buat ulang akun admin dari folder backend: npm run admin:buat
   2. Bila hak akun aplikasi diberikan PER TABEL, hak itu ikut hilang bersama DROP TABLE.
      Minta IT memberi lagi SELECT, INSERT, UPDATE, DELETE pada kelima tabel.
   3. Cek: npm run db:cek */

USE BA;
GO

/* ---------- Bagian 0: lihat isi tabel sekarang (hanya SELECT) ---------- */
SELECT t.name AS tabel, SUM(p.rows) AS jumlah_baris
  FROM sys.tables t JOIN sys.partitions p ON p.object_id = t.object_id AND p.index_id IN (0, 1)
 WHERE t.name LIKE 'HCIS[_]Psikotes[_]%'
 GROUP BY t.name
 ORDER BY t.name;
GO

/* ---------- Bagian 1: hapus dan bangun ulang, satu transaksi ---------- */
SET XACT_ABORT ON;
SET NOCOUNT ON;

/* >>> Ganti menjadi N'HAPUS' setelah yakin data di atas boleh dihapus. <<< */
DECLARE @konfirmasi NVARCHAR(10) = N'';

DECLARE @langkah NVARCHAR(200) = N'persiapan';

-- Konfirmasi hanya diperlukan bila masih ada tabel lama yang akan dihapus.
IF @konfirmasi <> N'HAPUS'
   AND (OBJECT_ID('dbo.HCIS_Psikotes_Admin', 'U') IS NOT NULL OR OBJECT_ID('dbo.HCIS_Psikotes_Jawaban', 'U') IS NOT NULL
     OR OBJECT_ID('dbo.HCIS_Psikotes_Kelompok', 'U') IS NOT NULL OR OBJECT_ID('dbo.HCIS_Psikotes_Sesi', 'U') IS NOT NULL
     OR OBJECT_ID('dbo.HCIS_Psikotes_Ujian', 'U') IS NOT NULL)
BEGIN
    PRINT 'Tidak ada yang diubah. Isi @konfirmasi dengan N''HAPUS'' untuk menjalankan.';
    RETURN;
END

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @proyek TABLE (oid INT PRIMARY KEY);
    INSERT INTO @proyek (oid)
    SELECT OBJECT_ID(n) FROM (VALUES ('dbo.HCIS_Psikotes_Admin'), ('dbo.HCIS_Psikotes_Jawaban'),
                                     ('dbo.HCIS_Psikotes_Kelompok'), ('dbo.HCIS_Psikotes_Sesi'),
                                     ('dbo.HCIS_Psikotes_Ujian')) v(n)
     WHERE OBJECT_ID(n) IS NOT NULL;

    -- Penjaga 1: foreign key dari tabel lain (bukan proyek ini) ke tabel proyek.
    SET @langkah = N'penjaga foreign key';
    IF EXISTS (SELECT 1 FROM sys.foreign_keys fk
                WHERE fk.referenced_object_id IN (SELECT oid FROM @proyek)
                  AND fk.parent_object_id NOT IN (SELECT oid FROM @proyek))
        THROW 50010, 'Ada tabel lain yang memakai foreign key ke tabel HCIS_Psikotes_. Tidak ada yang diubah. Hubungi pengembang.', 1;

    -- Penjaga 2: view atau fungsi schema-bound yang memakai tabel proyek.
    SET @langkah = N'penjaga objek schema-bound';
    IF EXISTS (SELECT 1 FROM sys.sql_expression_dependencies d
                 JOIN sys.objects o ON o.object_id = d.referencing_id
                WHERE d.referenced_id IN (SELECT oid FROM @proyek)
                  AND d.is_schema_bound_reference = 1
                  AND o.parent_object_id NOT IN (SELECT oid FROM @proyek))
        THROW 50011, 'Ada view atau fungsi schema-bound yang memakai tabel HCIS_Psikotes_. Tidak ada yang diubah. Hubungi pengembang.', 1;

    -- Hapus tabel lama, anak dulu baru induk (urutan foreign key).
    SET @langkah = N'hapus tabel lama';
    IF OBJECT_ID('dbo.HCIS_Psikotes_Jawaban',  'U') IS NOT NULL DROP TABLE dbo.HCIS_Psikotes_Jawaban;
    IF OBJECT_ID('dbo.HCIS_Psikotes_Ujian',    'U') IS NOT NULL DROP TABLE dbo.HCIS_Psikotes_Ujian;
    IF OBJECT_ID('dbo.HCIS_Psikotes_Kelompok', 'U') IS NOT NULL DROP TABLE dbo.HCIS_Psikotes_Kelompok;
    IF OBJECT_ID('dbo.HCIS_Psikotes_Sesi',     'U') IS NOT NULL DROP TABLE dbo.HCIS_Psikotes_Sesi;
    IF OBJECT_ID('dbo.HCIS_Psikotes_Admin',    'U') IS NOT NULL DROP TABLE dbo.HCIS_Psikotes_Admin;

    -- Semua CREATE lewat EXEC supaya batch bisa dikompilasi selagi tabel lama (kolom lama) masih ada.

    /* Admin HC. Tidak ada pendaftaran mandiri: akun dibuat lewat npm run admin:buat.
       Hanya hash password (argon2) dan hash sesi login (SHA-256), tidak ada yang mentah. */
    SET @langkah = N'buat HCIS_Psikotes_Admin';
    EXEC (N'
    CREATE TABLE dbo.HCIS_Psikotes_Admin (
        Id                INT IDENTITY(1,1) CONSTRAINT PK_HCIS_Psikotes_Admin PRIMARY KEY,
        Username          NVARCHAR(50)  NOT NULL CONSTRAINT UQ_HCIS_Psikotes_Admin_Username UNIQUE,
        PasswordHash      NVARCHAR(255) NOT NULL,
        Aktif             BIT NOT NULL CONSTRAINT DF_HCIS_Psikotes_Admin_Aktif DEFAULT 1,
        GagalLogin        INT NOT NULL CONSTRAINT DF_HCIS_Psikotes_Admin_Gagal DEFAULT 0,
        TerkunciSampai    DATETIME2(0) NULL,
        LoginTerakhir     DATETIME2(0) NULL,
        DibuatPada        DATETIME2(0) NOT NULL CONSTRAINT DF_HCIS_Psikotes_Admin_Dibuat DEFAULT SYSDATETIME(),
        SesiHash          VARBINARY(32) NULL,
        SesiDibuat        DATETIME2(0) NULL,
        SesiAktifTerakhir DATETIME2(0) NULL
    );
    CREATE UNIQUE NONCLUSTERED INDEX UX_HCIS_Psikotes_Admin_SesiHash
        ON dbo.HCIS_Psikotes_Admin (SesiHash) WHERE SesiHash IS NOT NULL;');

    /* Sesi tes dan template undangan. EmailPenerima (PIC sesi serentak) adalah data pribadi: retensi 4 bulan. */
    SET @langkah = N'buat HCIS_Psikotes_Sesi';
    EXEC (N'
    CREATE TABLE dbo.HCIS_Psikotes_Sesi (
        Id             INT IDENTITY(1,1) CONSTRAINT PK_HCIS_Psikotes_Sesi PRIMARY KEY,
        NamaSesi       NVARCHAR(100) NOT NULL,
        Tanggal        DATE NOT NULL,
        WaktuBuka      TIME(0) NOT NULL,
        WaktuTutup     TIME(0) NOT NULL,
        DaftarTes      VARCHAR(20) NOT NULL,          -- contoh: TIU5,TIU6,KORAN
        BankVersi      VARCHAR(20) NOT NULL,
        TemplateSubjek NVARCHAR(200)  NOT NULL,
        TemplateIsi    NVARCHAR(4000) NOT NULL,
        DibuatOleh     INT NULL CONSTRAINT FK_HCIS_Psikotes_Sesi_Admin REFERENCES dbo.HCIS_Psikotes_Admin(Id),
        DibuatPada     DATETIME2(0) NOT NULL CONSTRAINT DF_HCIS_Psikotes_Sesi_Dibuat DEFAULT SYSDATETIME(),
        Mode           VARCHAR(10) NOT NULL CONSTRAINT DF_HCIS_Psikotes_Sesi_Mode DEFAULT ''INDIVIDU''
                       CONSTRAINT CK_HCIS_Psikotes_Sesi_Mode CHECK (Mode IN (''INDIVIDU'',''KELOMPOK'')),
        EmailPenerima  NVARCHAR(150) NULL,
        CONSTRAINT UQ_HCIS_Psikotes_Sesi_Nama UNIQUE (NamaSesi, Tanggal),
        CONSTRAINT CK_HCIS_Psikotes_Sesi_Waktu CHECK (WaktuTutup > WaktuBuka)
    );');

    /* Token kelompok per tes dalam sesi serentak. Tanpa data pribadi, hanya hash token. */
    SET @langkah = N'buat HCIS_Psikotes_Kelompok';
    EXEC (N'
    CREATE TABLE dbo.HCIS_Psikotes_Kelompok (
        Id               INT IDENTITY(1,1) CONSTRAINT PK_HCIS_Psikotes_Kelompok PRIMARY KEY,
        SesiId           INT NOT NULL CONSTRAINT FK_HCIS_Psikotes_Kelompok_Sesi REFERENCES dbo.HCIS_Psikotes_Sesi(Id),
        JenisTes         VARCHAR(10) NOT NULL
                         CONSTRAINT CK_HCIS_Psikotes_Kelompok_Jenis CHECK (JenisTes IN (''TIU5'',''TIU6'',''KORAN'')),
        TokenHash        CHAR(64) NOT NULL CONSTRAINT UQ_HCIS_Psikotes_Kelompok_Token UNIQUE,
        Kuota            INT NOT NULL,
        Terpakai         INT NOT NULL CONSTRAINT DF_HCIS_Psikotes_Kelompok_Terpakai DEFAULT 0,
        Tanggal          DATE NOT NULL,
        WaktuBuka        TIME(0) NOT NULL,
        WaktuTutup       TIME(0) NOT NULL,
        DicabutPada      DATETIME2(0) NULL,           -- cabut: hanya menolak klaim baru
        EmailDikirimPada DATETIME2(0) NULL,           -- HC membuka email token di aplikasi email
        DibuatPada       DATETIME2(0) NOT NULL CONSTRAINT DF_HCIS_Psikotes_Kelompok_Dibuat DEFAULT SYSDATETIME(),
        CONSTRAINT UQ_HCIS_Psikotes_Kelompok_SesiTes UNIQUE (SesiId, JenisTes),
        -- Penjaga kuota di tingkat database, di samping WHERE Terpakai < Kuota pada klaim.
        CONSTRAINT CK_HCIS_Psikotes_Kelompok_Kuota CHECK (Kuota BETWEEN 1 AND 1000 AND Terpakai BETWEEN 0 AND Kuota),
        CONSTRAINT CK_HCIS_Psikotes_Kelompok_Waktu CHECK (WaktuTutup > WaktuBuka)
    );');

    /* Satu baris = satu peserta mengerjakan satu tes dalam satu sesi: data sesi, peserta, token (hash), waktu, hasil.
       Individu: Email dan TokenHash wajib. Serentak (KelompokId terisi): Nama wajib, tanpa Email dan TokenHash. */
    SET @langkah = N'buat HCIS_Psikotes_Ujian';
    EXEC (N'
    CREATE TABLE dbo.HCIS_Psikotes_Ujian (
        Id                  INT IDENTITY(1,1) CONSTRAINT PK_HCIS_Psikotes_Ujian PRIMARY KEY,
        NamaSesi            NVARCHAR(100) NOT NULL,
        JenisTes            VARCHAR(10) NOT NULL
                            CONSTRAINT CK_HCIS_Psikotes_Ujian_Jenis CHECK (JenisTes IN (''TIU5'',''TIU6'',''KORAN'')),
        Tanggal             DATE NOT NULL,
        WaktuBuka           TIME(0) NOT NULL,
        WaktuTutup          TIME(0) NOT NULL,
        BankVersi           VARCHAR(20) NOT NULL,     -- versi folder bank soal, contoh v1
        Email               NVARCHAR(150) NULL,
        Nama                NVARCHAR(100) NULL,
        TokenHash           CHAR(64) NULL,            -- hash SHA-256, bukan token mentah
        Status              VARCHAR(15) NOT NULL CONSTRAINT DF_HCIS_Psikotes_Ujian_Status DEFAULT ''BELUM_DIPAKAI''
                            CONSTRAINT CK_HCIS_Psikotes_Ujian_Status CHECK (Status IN
                                (''BELUM_DIPAKAI'',''BERJALAN'',''DIKIRIM'',''WAKTU_HABIS'',''DICABUT'',''KEDALUWARSA'')),
        BerlakuSampai       DATETIME2(0) NOT NULL,
        MulaiPada           DATETIME2(0) NULL,        -- waktu dihitung di server
        BatasSelesai        DATETIME2(0) NULL,
        SelesaiPada         DATETIME2(0) NULL,
        JumlahBenar         INT NULL,
        JumlahSalah         INT NULL,
        JumlahDijawab       INT NULL,
        SkorMentah          DECIMAL(9,2) NULL,
        Kategori            NVARCHAR(30) NULL,
        SkorAkhir           TINYINT NULL,             -- rentang nilai perlu verifikasi HC, belum diberi CHECK
        AturanVersi         VARCHAR(20) NULL,         -- versi berkas skoring yang dipakai
        DihitungPada        DATETIME2(0) NULL,
        DibuatPada          DATETIME2(0) NOT NULL CONSTRAINT DF_HCIS_Psikotes_Ujian_Dibuat DEFAULT SYSDATETIME(),
        SesiId              INT NULL CONSTRAINT FK_HCIS_Psikotes_Ujian_Sesi REFERENCES dbo.HCIS_Psikotes_Sesi(Id),
        SesiPesertaHash     VARBINARY(32) NULL,       -- sesi login peserta (hash SHA-256)
        SesiPesertaAktif    DATETIME2(0) NULL,
        NKoran              TINYINT NULL,             -- N Koran = total benar / 22, dibulatkan setengah ke atas
        RingkasanInterval   NVARCHAR(2000) NULL       -- JSON 22 interval Koran
                            CONSTRAINT CK_HCIS_Psikotes_Ujian_Interval CHECK (RingkasanInterval IS NULL OR ISJSON(RingkasanInterval) = 1),
        UndanganDikirimPada DATETIME2(0) NULL,        -- HC membuka undangan di aplikasi email
        KelompokId          INT NULL CONSTRAINT FK_HCIS_Psikotes_Ujian_Kelompok REFERENCES dbo.HCIS_Psikotes_Kelompok(Id),
        PersetujuanPada     DATETIME2(0) NULL,        -- peserta memilih "Saya Setuju"
        PersetujuanVersi    VARCHAR(20) NULL,
        CONSTRAINT CK_HCIS_Psikotes_Ujian_Mode CHECK (
               (KelompokId IS NULL AND Email IS NOT NULL AND TokenHash IS NOT NULL)
            OR (KelompokId IS NOT NULL AND Email IS NULL AND TokenHash IS NULL AND Nama IS NOT NULL))
    );
    CREATE UNIQUE INDEX UX_HCIS_Psikotes_Ujian_Token
        ON dbo.HCIS_Psikotes_Ujian (TokenHash) WHERE TokenHash IS NOT NULL;
    CREATE UNIQUE INDEX UX_HCIS_Psikotes_Ujian_Peserta
        ON dbo.HCIS_Psikotes_Ujian (NamaSesi, Tanggal, JenisTes, Email) WHERE Email IS NOT NULL;
    CREATE UNIQUE NONCLUSTERED INDEX UX_HCIS_Psikotes_Ujian_SesiPeserta
        ON dbo.HCIS_Psikotes_Ujian (SesiPesertaHash) WHERE SesiPesertaHash IS NOT NULL;
    CREATE INDEX IX_HCIS_Psikotes_Ujian_Email    ON dbo.HCIS_Psikotes_Ujian (Email);
    CREATE INDEX IX_HCIS_Psikotes_Ujian_Sesi     ON dbo.HCIS_Psikotes_Ujian (SesiId);
    CREATE INDEX IX_HCIS_Psikotes_Ujian_Kelompok ON dbo.HCIS_Psikotes_Ujian (KelompokId);');

    /* Jawaban mentah per nomor soal (retensi 3 bulan). Kosong = tidak ada baris, atau Jawaban NULL.
       WaktuMs = milidetik sejak tes dimulai, hanya Koran (dicatat browser, divalidasi server). */
    SET @langkah = N'buat HCIS_Psikotes_Jawaban';
    EXEC (N'
    CREATE TABLE dbo.HCIS_Psikotes_Jawaban (
        UjianId     INT NOT NULL CONSTRAINT FK_HCIS_Psikotes_Jawaban_Ujian REFERENCES dbo.HCIS_Psikotes_Ujian(Id),
        NomorSoal   INT NOT NULL,
        Jawaban     VARCHAR(5) NULL,
        DijawabPada DATETIME2(0) NOT NULL CONSTRAINT DF_HCIS_Psikotes_Jawaban_Waktu DEFAULT SYSDATETIME(),
        WaktuMs     INT NULL CONSTRAINT CK_HCIS_Psikotes_Jawaban_Waktu CHECK (WaktuMs IS NULL OR WaktuMs >= 0),
        CONSTRAINT PK_HCIS_Psikotes_Jawaban PRIMARY KEY (UjianId, NomorSoal)
    );');

    COMMIT TRANSACTION;
    PRINT 'Selesai: 5 tabel dibangun ulang dengan kolom PascalCase. Lanjutkan: npm run admin:buat';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    PRINT CONCAT('DIBATALKAN, tabel lama dan datanya kembali utuh. Berhenti di langkah: ', @langkah,
                 '. Kirim pesan galat berikut ke pengembang.');
    THROW;
END CATCH;
GO

/* ---------- Bagian 2: pemeriksaan (hanya SELECT) ---------- */

-- 1. Harus kosong: kolom proyek yang masih memakai garis bawah atau diawali huruf kecil.
SELECT t.name AS tabel, c.name AS kolom
  FROM sys.columns c JOIN sys.tables t ON t.object_id = c.object_id
 WHERE t.name LIKE 'HCIS[_]Psikotes[_]%'
   AND (c.name LIKE '%[_]%' OR LEFT(c.name, 1) COLLATE Latin1_General_BIN <> UPPER(LEFT(c.name, 1)))
 ORDER BY t.name, c.column_id;

-- 2. Jumlah objek: harus 5 tabel, 74 kolom, 10 CHECK, 4 indeks terfilter.
SELECT
  (SELECT COUNT(*) FROM sys.tables WHERE name LIKE 'HCIS[_]Psikotes[_]%') AS tabel,
  (SELECT COUNT(*) FROM sys.columns c JOIN sys.tables t ON t.object_id = c.object_id
    WHERE t.name LIKE 'HCIS[_]Psikotes[_]%') AS kolom,
  (SELECT COUNT(*) FROM sys.check_constraints WHERE OBJECT_NAME(parent_object_id) LIKE 'HCIS[_]Psikotes[_]%') AS cek,
  (SELECT COUNT(*) FROM sys.indexes WHERE has_filter = 1 AND OBJECT_NAME(object_id) LIKE 'HCIS[_]Psikotes[_]%') AS indeks_terfilter;
GO
