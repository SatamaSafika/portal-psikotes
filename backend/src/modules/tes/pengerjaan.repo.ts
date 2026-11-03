// Akses data pengerjaan: jawaban, kirim, dan penutupan otomatis saat waktu habis.
// Hanya menyentuh dbo.HCIS_Psikotes_Ujian dan dbo.HCIS_Psikotes_Jawaban. Semua query berparameter.
// Waktu selalu menurut jam server database (SYSDATETIME).
import sql from 'mssql';
import { ambilPool } from '../../db/pool.js';
import type { JawabanKoran, JawabanTiu, KonteksKoran } from './pengerjaan.validasi.js';

/** Pengerjaan masih menerima jawaban: sudah mulai, BERJALAN, dan belum lewat batas_selesai + toleransi. */
const MASIH_BERJALAN = `status = 'BERJALAN' AND mulai_pada IS NOT NULL
  AND SYSDATETIME() <= DATEADD(SECOND, @toleransi, batas_selesai)`;

export interface KeadaanUjian {
  bank_versi: string;
  sudah_mulai: boolean;
  /** true bila jawaban masih boleh disimpan. */
  boleh_tulis: boolean;
}

export async function keadaanUjian(id: number, toleransiDetik: number): Promise<KeadaanUjian | null> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('id', sql.Int, id)
    .input('toleransi', sql.Int, toleransiDetik)
    .query<KeadaanUjian>(
      `SELECT bank_versi,
              CAST(CASE WHEN mulai_pada IS NULL THEN 0 ELSE 1 END AS BIT) AS sudah_mulai,
              CAST(CASE WHEN ${MASIH_BERJALAN} THEN 1 ELSE 0 END AS BIT) AS boleh_tulis
         FROM dbo.HCIS_Psikotes_Ujian
        WHERE id = @id`,
    );
  return hasil.recordset[0] ?? null;
}

/** Jawaban tersimpan, tanpa waktu (data waktu tidak dikirim ke peserta). */
export async function ambilJawaban(id: number): Promise<{ nomor: number; jawaban: string | null }[]> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('id', sql.Int, id)
    .query<{ nomor: number; jawaban: string | null }>(
      'SELECT nomor_soal AS nomor, jawaban FROM dbo.HCIS_Psikotes_Jawaban WHERE ujian_id = @id ORDER BY nomor_soal',
    );
  return hasil.recordset;
}

/** Menjalankan kerja dalam transaksi setelah mengunci baris ujian. Null bila pengerjaan sudah tidak berjalan. */
async function denganKunciUjian<T>(
  id: number,
  toleransiDetik: number,
  kerja: (tx: sql.Transaction, berjalanMs: number) => Promise<T>,
): Promise<T | null> {
  const tx = new sql.Transaction(await ambilPool());
  await tx.begin();
  try {
    const kunci = await new sql.Request(tx)
      .input('id', sql.Int, id)
      .input('toleransi', sql.Int, toleransiDetik)
      .query<{ berjalan_ms: number }>(
        `SELECT DATEDIFF(MILLISECOND, mulai_pada, SYSDATETIME()) AS berjalan_ms
           FROM dbo.HCIS_Psikotes_Ujian WITH (UPDLOCK, ROWLOCK)
          WHERE id = @id AND ${MASIH_BERJALAN}`,
      );
    if (kunci.recordset.length === 0) {
      await tx.rollback();
      return null;
    }
    const hasil = await kerja(tx, kunci.recordset[0].berjalan_ms);
    await tx.commit();
    return hasil;
  } catch (galat) {
    await tx.rollback().catch(() => undefined);
    throw galat;
  }
}

/** TIU 5 dan TIU 6: simpan atau ubah jawaban (null = dikosongkan). False bila waktu sudah habis. */
export async function simpanTiu(id: number, toleransiDetik: number, jawaban: JawabanTiu[]): Promise<boolean> {
  const hasil = await denganKunciUjian(id, toleransiDetik, async (tx) => {
    for (const j of jawaban) {
      await new sql.Request(tx)
        .input('id', sql.Int, id)
        .input('nomor', sql.Int, j.nomor)
        .input('jawaban', sql.VarChar(5), j.jawaban)
        .query(
          `UPDATE dbo.HCIS_Psikotes_Jawaban SET jawaban = @jawaban, dijawab_pada = SYSDATETIME()
            WHERE ujian_id = @id AND nomor_soal = @nomor;
           IF @@ROWCOUNT = 0
             INSERT INTO dbo.HCIS_Psikotes_Jawaban (ujian_id, nomor_soal, jawaban) VALUES (@id, @nomor, @jawaban);`,
        );
    }
    return true;
  });
  return hasil === true;
}

export type HasilKoran =
  | { status: 'tutup' }
  | { status: 'tolak'; galat: string[] }
  | { status: 'ok'; nomor_terakhir: number };

/**
 * Koran: periksa kiriman terhadap jawaban terakhir dan jam server di dalam transaksi yang sama,
 * lalu sisipkan. Kiriman yang melanggar ditolak seluruhnya.
 */
export async function simpanKoran(
  id: number,
  toleransiDetik: number,
  periksa: (ctx: Pick<KonteksKoran, 'terakhir' | 'berjalanMs'>) => { jawaban: JawabanKoran[]; galat: string[] },
): Promise<HasilKoran> {
  class Tolak extends Error {
    constructor(public readonly galat: string[]) {
      super('tolak');
    }
  }
  try {
    const hasil = await denganKunciUjian(id, toleransiDetik, async (tx, berjalanMs) => {
      const akhir = await new sql.Request(tx)
        .input('id', sql.Int, id)
        .query<{ nomor: number; waktu_ms: number | null }>(
          `SELECT TOP 1 nomor_soal AS nomor, waktu_ms FROM dbo.HCIS_Psikotes_Jawaban
            WHERE ujian_id = @id ORDER BY nomor_soal DESC`,
        );
      const t = akhir.recordset[0];
      const v = periksa({ terakhir: t ? { nomor: t.nomor, waktu_ms: t.waktu_ms ?? 0 } : null, berjalanMs });
      if (v.galat.length > 0) throw new Tolak(v.galat);
      for (const j of v.jawaban) {
        await new sql.Request(tx)
          .input('id', sql.Int, id)
          .input('nomor', sql.Int, j.nomor)
          .input('jawaban', sql.VarChar(5), j.jawaban)
          .input('waktu', sql.Int, j.waktu_ms)
          .query('INSERT INTO dbo.HCIS_Psikotes_Jawaban (ujian_id, nomor_soal, jawaban, waktu_ms) VALUES (@id, @nomor, @jawaban, @waktu)');
      }
      return v.jawaban[v.jawaban.length - 1].nomor;
    });
    return hasil === null ? { status: 'tutup' } : { status: 'ok', nomor_terakhir: hasil };
  } catch (galat) {
    if (galat instanceof Tolak) return { status: 'tolak', galat: galat.galat };
    throw galat;
  }
}

/** Peserta menyelesaikan ujian. Sesi peserta ditutup. False bila sudah tidak berjalan. */
export async function kirim(id: number, toleransiDetik: number): Promise<boolean> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('id', sql.Int, id)
    .input('toleransi', sql.Int, toleransiDetik)
    .query(
      `UPDATE dbo.HCIS_Psikotes_Ujian
          SET status = 'DIKIRIM', selesai_pada = SYSDATETIME(), sesi_peserta_hash = NULL, sesi_peserta_aktif = NULL
        WHERE id = @id AND ${MASIH_BERJALAN}`,
    );
  return hasil.rowsAffected[0] === 1;
}

/**
 * Penutupan otomatis (dijalankan berkala):
 * - sudah mulai dan lewat batas_selesai + toleransi -> WAKTU_HABIS (terkirim otomatis, jawaban tersimpan tetap dinilai);
 * - token belum dipakai, atau sudah dipakai tapi tidak pernah mulai, dan jadwal sudah tutup -> KEDALUWARSA.
 */
export async function tutupOtomatis(toleransiDetik: number): Promise<{ waktu_habis: number; kedaluwarsa: number }> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('toleransi', sql.Int, toleransiDetik)
    .query(
      `UPDATE dbo.HCIS_Psikotes_Ujian
          SET status = 'WAKTU_HABIS', selesai_pada = batas_selesai, sesi_peserta_hash = NULL, sesi_peserta_aktif = NULL
        WHERE status = 'BERJALAN' AND mulai_pada IS NOT NULL
          AND SYSDATETIME() > DATEADD(SECOND, @toleransi, batas_selesai);
       UPDATE dbo.HCIS_Psikotes_Ujian
          SET status = 'KEDALUWARSA', sesi_peserta_hash = NULL, sesi_peserta_aktif = NULL
        WHERE status IN ('BELUM_DIPAKAI', 'BERJALAN') AND mulai_pada IS NULL
          AND SYSDATETIME() >= berlaku_sampai;`,
    );
  return { waktu_habis: hasil.rowsAffected[0] ?? 0, kedaluwarsa: hasil.rowsAffected[1] ?? 0 };
}
