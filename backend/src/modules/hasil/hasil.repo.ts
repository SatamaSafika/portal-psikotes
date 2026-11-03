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
