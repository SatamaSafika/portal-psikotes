// Akses data hasil. Hanya menyentuh dbo.HCIS_Psikotes_Ujian dan dbo.HCIS_Psikotes_Jawaban. Semua query berparameter.
import sql from 'mssql';
import { ambilPool } from '../../db/pool.js';
import type { BarisJawaban, HasilUjian } from '../skoring/koreksi.js';
import type { JenisTes } from '../token/undangan.js';

const SELESAI = `status IN ('DIKIRIM', 'WAKTU_HABIS')`;

/** Ujian selesai yang belum punya hasil. */
export async function ujianBelumDihitung(batas: number): Promise<number[]> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('batas', sql.Int, batas)
    .query<{ id: number }>(`SELECT TOP (@batas) id FROM dbo.HCIS_Psikotes_Ujian WHERE ${SELESAI} AND dihitung_pada IS NULL ORDER BY id`);
  return hasil.recordset.map((r) => r.id);
}

/** Ujian selesai untuk dihitung ulang: semua, atau satu sesi. */
export async function ujianSelesai(sesiId: number | null): Promise<number[]> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('sesiId', sql.Int, sesiId)
    .query<{ id: number }>(
      `SELECT id FROM dbo.HCIS_Psikotes_Ujian WHERE ${SELESAI} AND (@sesiId IS NULL OR sesi_id = @sesiId) ORDER BY id`,
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
      `SELECT jenis_tes, bank_versi, jumlah_dijawab FROM dbo.HCIS_Psikotes_Ujian WHERE id = @id AND ${SELESAI}`,
    );
  const u = ujian.recordset[0];
  if (!u) return null;
  const jawaban = await pool
    .request()
    .input('id', sql.Int, id)
    .query<BarisJawaban>('SELECT nomor_soal AS nomor, jawaban, waktu_ms FROM dbo.HCIS_Psikotes_Jawaban WHERE ujian_id = @id');
  return { jenis_tes: u.jenis_tes, bank_versi: u.bank_versi, jumlah_dijawab_lama: u.jumlah_dijawab, jawaban: jawaban.recordset };
}

// ---------- untuk dashboard admin ----------

/** Awal dan akhir jadwal sebagai DATETIME2 dari kolom tanggal dan waktu_*. */
const BUKA = `DATEADD(SECOND, DATEDIFF(SECOND, CAST('00:00:00' AS TIME(0)), u.waktu_buka), CAST(u.tanggal AS DATETIME2(0)))`;
const BUKA_K = `DATEADD(SECOND, DATEDIFF(SECOND, CAST('00:00:00' AS TIME(0)), k.waktu_buka), CAST(k.tanggal AS DATETIME2(0)))`;
const TUTUP_K = `DATEADD(SECOND, DATEDIFF(SECOND, CAST('00:00:00' AS TIME(0)), k.waktu_tutup), CAST(k.tanggal AS DATETIME2(0)))`;

/**
 * Satu orang dalam satu sesi: email (individu) atau nama (serentak, tanpa email). Peserta yang mengerjakan 3 tes dihitung 1.
 * Dua peserta serentak dengan nama sama di satu sesi terhitung 1 karena tidak ada penanda lain.
 */
const ORANG = `CONCAT(sesi_id, '|', COALESCE(email, LOWER(LTRIM(RTRIM(nama)))))`;

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
         WHERE ${SELESAI} AND CAST(selesai_pada AS DATE) = CAST(SYSDATETIME() AS DATE)) AS selesai_hari_ini,
       (SELECT COUNT(DISTINCT ${ORANG}) FROM dbo.HCIS_Psikotes_Ujian
         WHERE status = 'BERJALAN' AND mulai_pada IS NOT NULL AND batas_selesai > SYSDATETIME()) AS sedang_mengerjakan`,
  );
  const jadwal = await pool.request().query<Ringkasan['jadwal_hari_ini'][number]>(
    `SELECT u.sesi_id, u.nama_sesi, u.jenis_tes, 'INDIVIDU' AS mode, COUNT(*) AS jumlah_peserta, CAST(NULL AS INT) AS kuota,
            CONVERT(CHAR(5), u.waktu_buka, 108) AS waktu_buka, CONVERT(CHAR(5), u.waktu_tutup, 108) AS waktu_tutup,
            CASE WHEN SYSDATETIME() < MIN(${BUKA}) THEN 'BELUM_MULAI'
                 WHEN SYSDATETIME() < MAX(u.berlaku_sampai) THEN 'BERJALAN'
                 ELSE 'SELESAI' END AS status
       FROM dbo.HCIS_Psikotes_Ujian u
      WHERE u.sesi_id IS NOT NULL AND u.kelompok_id IS NULL AND u.tanggal = CAST(SYSDATETIME() AS DATE)
      GROUP BY u.sesi_id, u.nama_sesi, u.jenis_tes, u.waktu_buka, u.waktu_tutup
     UNION ALL
     SELECT k.sesi_id, s.nama_sesi, k.jenis_tes, 'KELOMPOK', k.terpakai, k.kuota,
            CONVERT(CHAR(5), k.waktu_buka, 108), CONVERT(CHAR(5), k.waktu_tutup, 108),
            CASE WHEN SYSDATETIME() < ${BUKA_K} THEN 'BELUM_MULAI'
                 WHEN SYSDATETIME() < ${TUTUP_K} THEN 'BERJALAN'
                 ELSE 'SELESAI' END
       FROM dbo.HCIS_Psikotes_Kelompok k JOIN dbo.HCIS_Psikotes_Sesi s ON s.id = k.sesi_id
      WHERE k.tanggal = CAST(SYSDATETIME() AS DATE)
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
      `SELECT TOP (${BATAS_HASIL}) id AS ujian_id, sesi_id, nama_sesi, CONVERT(CHAR(10), tanggal, 23) AS tanggal, jenis_tes,
              CASE WHEN kelompok_id IS NULL THEN 'INDIVIDU' ELSE 'KELOMPOK' END AS mode,
              email, nama, status, CONVERT(VARCHAR(19), selesai_pada, 120) AS selesai_pada,
              jumlah_benar, jumlah_salah, jumlah_dijawab, n_koran, kategori, skor_akhir, ringkasan_interval,
              CONVERT(VARCHAR(19), persetujuan_pada, 120) AS persetujuan_pada, persetujuan_versi
         FROM dbo.HCIS_Psikotes_Ujian
        WHERE ${SELESAI}
          AND (@jenis IS NULL OR jenis_tes = @jenis)
          AND (@sesiId IS NULL OR sesi_id = @sesiId)
          AND (@tanggal IS NULL OR tanggal = CAST(@tanggal AS DATE))
        -- Per sesi lalu nama (peserta kelompok tanpa email); tidak ada penggabungan otomatis lintas tes.
        ORDER BY tanggal DESC, nama_sesi, sesi_id, COALESCE(nama, email), email,
                 CASE jenis_tes WHEN 'TIU5' THEN 1 WHEN 'TIU6' THEN 2 ELSE 3 END`,
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
          SET jumlah_benar = @benar, jumlah_salah = @salah, jumlah_dijawab = @dijawab, skor_mentah = @skor,
              kategori = @kategori, skor_akhir = @skorAkhir, aturan_versi = @aturan,
              n_koran = @n, ringkasan_interval = @interval, dihitung_pada = SYSDATETIME()
        WHERE id = @id AND ${SELESAI}`,
    );
  return hasil.rowsAffected[0] === 1;
}
