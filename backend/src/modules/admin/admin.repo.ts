// Akses data akun admin. Hanya menyentuh dbo.HCIS_Psikotes_Admin, semua query berparameter.
import sql from 'mssql';
import { ambilPool } from '../../db/pool.js';

export interface BarisAdmin {
  id: number;
  username: string;
  password_hash: string;
  aktif: boolean;
  terkunci: boolean;
}

export interface AdminSesi {
  id: number;
  username: string;
}

export async function cariPerUsername(username: string): Promise<BarisAdmin | null> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('username', sql.NVarChar(50), username)
    .query<BarisAdmin>(
      `SELECT id, username, password_hash, aktif,
              CAST(CASE WHEN terkunci_sampai > SYSDATETIME() THEN 1 ELSE 0 END AS BIT) AS terkunci
         FROM dbo.HCIS_Psikotes_Admin
        WHERE username = @username`,
    );
  return hasil.recordset[0] ?? null;
}

/**
 * Menambah hitungan gagal secara atomik. Bila mencapai batas, akun dikunci
 * selama `menit` dan hitungan kembali ke 0.
 */
export async function catatGagal(id: number, maksGagal: number, menit: number): Promise<void> {
  const pool = await ambilPool();
  await pool
    .request()
    .input('id', sql.Int, id)
    .input('maks', sql.Int, maksGagal)
    .input('menit', sql.Int, menit)
    .query(
      `UPDATE dbo.HCIS_Psikotes_Admin
          SET terkunci_sampai = CASE WHEN gagal_login + 1 >= @maks
                                     THEN DATEADD(MINUTE, @menit, SYSDATETIME())
                                     ELSE terkunci_sampai END,
              gagal_login     = CASE WHEN gagal_login + 1 >= @maks THEN 0 ELSE gagal_login + 1 END
        WHERE id = @id`,
    );
}

/**
 * Login berhasil: reset hitungan gagal dan simpan sesi baru (mengganti sesi lama).
 * Mengembalikan false bila akun ternyata nonaktif atau terkunci saat UPDATE dijalankan.
 */
export async function catatBerhasil(id: number, sesiHash: Buffer): Promise<boolean> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('id', sql.Int, id)
    .input('sesiHash', sql.VarBinary(32), sesiHash)
    .query(
      `UPDATE dbo.HCIS_Psikotes_Admin
          SET gagal_login = 0,
              terkunci_sampai = NULL,
              login_terakhir = SYSDATETIME(),
              sesi_hash = @sesiHash,
              sesi_dibuat = SYSDATETIME(),
              sesi_aktif_terakhir = SYSDATETIME()
        WHERE id = @id
          AND aktif = 1
          AND (terkunci_sampai IS NULL OR terkunci_sampai <= SYSDATETIME())`,
    );
  return hasil.rowsAffected[0] === 1;
}

/** Mencari sesi yang masih sah dan sekaligus memperpanjang batas idle-nya. */
export async function pakaiSesi(sesiHash: Buffer, idleMenit: number, maksJam: number): Promise<AdminSesi | null> {
  const pool = await ambilPool();
  const hasil = await pool
    .request()
    .input('sesiHash', sql.VarBinary(32), sesiHash)
    .input('idle', sql.Int, idleMenit)
    .input('jam', sql.Int, maksJam)
    .query<AdminSesi>(
      `UPDATE dbo.HCIS_Psikotes_Admin
          SET sesi_aktif_terakhir = SYSDATETIME()
       OUTPUT inserted.id, inserted.username
        WHERE sesi_hash = @sesiHash
          AND aktif = 1
          AND sesi_dibuat > DATEADD(HOUR, -@jam, SYSDATETIME())
          AND sesi_aktif_terakhir > DATEADD(MINUTE, -@idle, SYSDATETIME())`,
    );
  return hasil.recordset[0] ?? null;
}

export async function hapusSesi(sesiHash: Buffer): Promise<void> {
  const pool = await ambilPool();
  await pool
    .request()
    .input('sesiHash', sql.VarBinary(32), sesiHash)
    .query(
      `UPDATE dbo.HCIS_Psikotes_Admin
          SET sesi_hash = NULL, sesi_dibuat = NULL, sesi_aktif_terakhir = NULL
        WHERE sesi_hash = @sesiHash`,
    );
}

export async function tambahAdmin(username: string, passwordHash: string): Promise<void> {
  const pool = await ambilPool();
  await pool
    .request()
    .input('username', sql.NVarChar(50), username)
    .input('passwordHash', sql.NVarChar(255), passwordHash)
    .query('INSERT INTO dbo.HCIS_Psikotes_Admin (username, password_hash) VALUES (@username, @passwordHash)');
}
