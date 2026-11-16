// Akses data hasil. Hanya menyentuh dbo.HCIS_Psikotes_Ujian dan dbo.HCIS_Psikotes_Jawaban. Semua query berparameter.
// Kolom database PascalCase (db/11); hasil query di-alias ke snake_case supaya tipe dan API tidak berubah.
import sql from 'mssql';
import { ambilPool } from '../../db/pool.js';
import type { BarisJawaban, HasilUjian } from '../skoring/koreksi.js';
import type { JenisTes } from '../token/undangan.js';

const SELESAI = `Status IN ('DIKIRIM', 'WAKTU_HABIS')`;

/** Ujian selesai yang belum punya hasil. */
export async function ujianBelumDihitung(batas: number): Promise<number[]> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('batas', sql.Int, batas)
    .query<{ id: number }>(`SELECT TOP (@batas) Id AS id FROM dbo.HCIS_Psikotes_Ujian WHERE ${SELESAI} AND DihitungPada IS NULL ORDER BY Id`);
  return hasil.recordset.map((r) => r.id);
}

/** Ujian selesai untuk dihitung ulang: semua, atau satu sesi. */
export async function ujianSelesai(sesiId: number | null): Promise<number[]> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('sesiId', sql.Int, sesiId)
    .query<{ id: number }>(
      `SELECT Id AS id FROM dbo.HCIS_Psikotes_Ujian WHERE ${SELESAI} AND (@sesiId IS NULL OR SesiId = @sesiId) ORDER BY Id`,
    );
  return hasil.recordset.map((r) => r.id);
}

export interface BahanHitung {
  jenis_tes: JenisTes;
  bank_versi: string;
  /** Hasil sebelumnya, untuk mengenali jawaban mentah yang sudah terhapus. */
  jumlah_dijawab_lama: number | null;
  jawaban: BarisJawaban[];
}

export async function bahanHitung(id: number): Promise<BahanHitung | null> {
  const pool = await ambilPool();
  const ujian = await pool
    .request()
    .input('id', sql.Int, id)
    .query<{ jenis_tes: JenisTes; bank_versi: string; jumlah_dijawab: number | null }>(
      `SELECT JenisTes AS jenis_tes, BankVersi AS bank_versi, JumlahDijawab AS jumlah_dijawab
         FROM dbo.HCIS_Psikotes_Ujian WHERE Id = @id AND ${SELESAI}`,
    );
  const u = ujian.recordset[0];
  if (!u) return null;
  const jawaban = await pool
    .request()
    .input('id', sql.Int, id)
    .query<BarisJawaban>(
      'SELECT NomorSoal AS nomor, Jawaban AS jawaban, WaktuMs AS waktu_ms FROM dbo.HCIS_Psikotes_Jawaban WHERE UjianId = @id',
    );
  return { jenis_tes: u.jenis_tes, bank_versi: u.bank_versi, jumlah_dijawab_lama: u.jumlah_dijawab, jawaban: jawaban.recordset };
}

// ---------- untuk dashboard admin ----------

/** Awal dan akhir jadwal sebagai DATETIME2 dari kolom Tanggal dan Waktu*. */
const BUKA = `DATEADD(SECOND, DATEDIFF(SECOND, CAST('00:00:00' AS TIME(0)), u.WaktuBuka), CAST(u.Tanggal AS DATETIME2(0)))`;
const BUKA_K = `DATEADD(SECOND, DATEDIFF(SECOND, CAST('00:00:00' AS TIME(0)), k.WaktuBuka), CAST(k.Tanggal AS DATETIME2(0)))`;
const TUTUP_K = `DATEADD(SECOND, DATEDIFF(SECOND, CAST('00:00:00' AS TIME(0)), k.WaktuTutup), CAST(k.Tanggal AS DATETIME2(0)))`;

/**
 * Satu orang dalam satu sesi: email (individu) atau nama (serentak, tanpa email). Peserta yang mengerjakan 3 tes dihitung 1.
 * Dua peserta serentak dengan nama sama di satu sesi terhitung 1 karena tidak ada penanda lain.
 */
const ORANG = `CONCAT(SesiId, '|', COALESCE(Email, LOWER(LTRIM(RTRIM(Nama)))))`;

export interface Ringkasan {
  /** Semua peserta selesai yang datanya masih tersimpan (data dihapus 4 bulan setelah tes). */
  total_selesai: number;
  selesai_hari_ini: number;
  /** Timer tes sedang berjalan. Peserta yang masih di instruksi atau latihan belum dihitung. */
  sedang_mengerjakan: number;
  jadwal_hari_ini: {
    sesi_id: number;
    nama_sesi: string;
    jenis_tes: JenisTes;
    mode: 'INDIVIDU' | 'KELOMPOK';
    /** Individu: jumlah token. Kelompok: jumlah peserta yang sudah masuk (n dari kuota). */
    jumlah_peserta: number;
    /** Hanya kelompok. */
    kuota: number | null;
    waktu_buka: string;
    waktu_tutup: string;
    status: 'BELUM_MULAI' | 'BERJALAN' | 'SELESAI';
  }[];
}

/** Ringkasan hari ini menurut jam server database, individu dan kelompok. */
export async function ringkasanHariIni(): Promise<Ringkasan> {
  const pool = await ambilPool();
  const angka = await pool.request().query<Omit<Ringkasan, 'jadwal_hari_ini'>>(
    `SELECT
       (SELECT COUNT(DISTINCT ${ORANG}) FROM dbo.HCIS_Psikotes_Ujian WHERE ${SELESAI}) AS total_selesai,
       (SELECT COUNT(DISTINCT ${ORANG}) FROM dbo.HCIS_Psikotes_Ujian
         WHERE ${SELESAI} AND CAST(SelesaiPada AS DATE) = CAST(SYSDATETIME() AS DATE)) AS selesai_hari_ini,
       (SELECT COUNT(DISTINCT ${ORANG}) FROM dbo.HCIS_Psikotes_Ujian
         WHERE Status = 'BERJALAN' AND MulaiPada IS NOT NULL AND BatasSelesai > SYSDATETIME()) AS sedang_mengerjakan`,
  );
  const jadwal = await pool.request().query<Ringkasan['jadwal_hari_ini'][number]>(
    `SELECT u.SesiId AS sesi_id, u.NamaSesi AS nama_sesi, u.JenisTes AS jenis_tes, 'INDIVIDU' AS mode,
            COUNT(*) AS jumlah_peserta, CAST(NULL AS INT) AS kuota,
            CONVERT(CHAR(5), u.WaktuBuka, 108) AS waktu_buka, CONVERT(CHAR(5), u.WaktuTutup, 108) AS waktu_tutup,
            CASE WHEN SYSDATETIME() < MIN(${BUKA}) THEN 'BELUM_MULAI'
                 WHEN SYSDATETIME() < MAX(u.BerlakuSampai) THEN 'BERJALAN'
                 ELSE 'SELESAI' END AS status
       FROM dbo.HCIS_Psikotes_Ujian u
      WHERE u.SesiId IS NOT NULL AND u.KelompokId IS NULL AND u.Tanggal = CAST(SYSDATETIME() AS DATE)
      GROUP BY u.SesiId, u.NamaSesi, u.JenisTes, u.WaktuBuka, u.WaktuTutup
     UNION ALL
     SELECT k.SesiId, s.NamaSesi, k.JenisTes, 'KELOMPOK', k.Terpakai, k.Kuota,
            CONVERT(CHAR(5), k.WaktuBuka, 108), CONVERT(CHAR(5), k.WaktuTutup, 108),
            CASE WHEN SYSDATETIME() < ${BUKA_K} THEN 'BELUM_MULAI'
                 WHEN SYSDATETIME() < ${TUTUP_K} THEN 'BERJALAN'
                 ELSE 'SELESAI' END
       FROM dbo.HCIS_Psikotes_Kelompok k JOIN dbo.HCIS_Psikotes_Sesi s ON s.Id = k.SesiId
      WHERE k.Tanggal = CAST(SYSDATETIME() AS DATE)
      ORDER BY waktu_buka, nama_sesi`,
  );
  return { ...angka.recordset[0], jadwal_hari_ini: jadwal.recordset };
}

export interface BarisHasil {
  ujian_id: number;
  sesi_id: number | null;
  nama_sesi: string;
  tanggal: string;
  jenis_tes: JenisTes;
  mode: 'INDIVIDU' | 'KELOMPOK';
  /** Null untuk peserta kelompok. */
  email: string | null;
  nama: string | null;
  status: string;
  selesai_pada: string | null;
  jumlah_benar: number | null;
  jumlah_salah: number | null;
  jumlah_dijawab: number | null;
  n_koran: number | null;
  kategori: string | null;
  skor_akhir: number | null;
  ringkasan_interval: unknown[] | null;
  /** Bukti persetujuan peserta (db/10); null untuk ujian sebelum fitur ini. */
  persetujuan_pada: string | null;
  persetujuan_versi: string | null;
}

/** Batas baris supaya laporan per peserta tidak kehilangan tes pada pemakaian normal; rute memberi tahu bila terpotong. */
export const BATAS_HASIL = 5000;

/** Hasil ujian yang sudah selesai, dengan filter opsional. Paling banyak BATAS_HASIL baris terbaru. */
export async function daftarHasil(f: { jenis: JenisTes | null; sesiId: number | null; tanggal: string | null }): Promise<BarisHasil[]> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('jenis', sql.VarChar(10), f.jenis)
    .input('sesiId', sql.Int, f.sesiId)
    .input('tanggal', sql.VarChar(10), f.tanggal)
    .query<BarisHasil>(
      `SELECT TOP (${BATAS_HASIL}) Id AS ujian_id, SesiId AS sesi_id, NamaSesi AS nama_sesi,
              CONVERT(CHAR(10), Tanggal, 23) AS tanggal, JenisTes AS jenis_tes,
              CASE WHEN KelompokId IS NULL THEN 'INDIVIDU' ELSE 'KELOMPOK' END AS mode,
              Email AS email, Nama AS nama, Status AS status, CONVERT(VARCHAR(19), SelesaiPada, 120) AS selesai_pada,
              JumlahBenar AS jumlah_benar, JumlahSalah AS jumlah_salah, JumlahDijawab AS jumlah_dijawab,
              NKoran AS n_koran, Kategori AS kategori, SkorAkhir AS skor_akhir, RingkasanInterval AS ringkasan_interval,
              CONVERT(VARCHAR(19), PersetujuanPada, 120) AS persetujuan_pada, PersetujuanVersi AS persetujuan_versi
         FROM dbo.HCIS_Psikotes_Ujian
        WHERE ${SELESAI}
          AND (@jenis IS NULL OR JenisTes = @jenis)
          AND (@sesiId IS NULL OR SesiId = @sesiId)
          AND (@tanggal IS NULL OR Tanggal = CAST(@tanggal AS DATE))
        -- Per sesi lalu nama (peserta kelompok tanpa email); tidak ada penggabungan otomatis lintas tes.
        ORDER BY Tanggal DESC, NamaSesi, SesiId, COALESCE(Nama, Email), Email,
                 CASE JenisTes WHEN 'TIU5' THEN 1 WHEN 'TIU6' THEN 2 ELSE 3 END`,
    );
  return hasil.recordset.map((r) => ({
    ...r,
    ringkasan_interval: typeof r.ringkasan_interval === 'string' ? (JSON.parse(r.ringkasan_interval) as unknown[]) : null,
  }));
}

export async function simpanHasil(id: number, h: HasilUjian, aturanVersi: string): Promise<boolean> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('id', sql.Int, id)
    .input('benar', sql.Int, h.jumlah_benar)
    .input('salah', sql.Int, h.jumlah_salah)
    .input('dijawab', sql.Int, h.jumlah_dijawab)
    .input('skor', sql.Decimal(9, 2), h.skor_mentah)
    .input('kategori', sql.NVarChar(30), h.kategori)
    .input('skorAkhir', sql.TinyInt, h.skor_akhir)
    .input('aturan', sql.VarChar(20), aturanVersi)
    .input('n', sql.TinyInt, h.n_koran)
    .input('interval', sql.NVarChar(2000), h.ringkasan_interval === null ? null : JSON.stringify(h.ringkasan_interval))
    .query(
      `UPDATE dbo.HCIS_Psikotes_Ujian
          SET JumlahBenar = @benar, JumlahSalah = @salah, JumlahDijawab = @dijawab, SkorMentah = @skor,
              Kategori = @kategori, SkorAkhir = @skorAkhir, AturanVersi = @aturan,
              NKoran = @n, RingkasanInterval = @interval, DihitungPada = SYSDATETIME()
        WHERE Id = @id AND ${SELESAI}`,
    );
  return hasil.rowsAffected[0] === 1;
}
