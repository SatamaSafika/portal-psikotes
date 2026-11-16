// Akses data akun admin. Hanya menyentuh dbo.HCIS_Psikotes_Admin, semua query berparameter.
// Kolom database PascalCase (db/11); hasil query di-alias ke snake_case supaya tipe dan API tidak berubah.
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
      `SELECT Id AS id, Username AS username, PasswordHash AS password_hash, Aktif AS aktif,
              CAST(CASE WHEN TerkunciSampai > SYSDATETIME() THEN 1 ELSE 0 END AS BIT) AS terkunci
         FROM dbo.HCIS_Psikotes_Admin
        WHERE Username = @username`,
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
          SET TerkunciSampai = CASE WHEN GagalLogin + 1 >= @maks
                                    THEN DATEADD(MINUTE, @menit, SYSDATETIME())
                                    ELSE TerkunciSampai END,
              GagalLogin     = CASE WHEN GagalLogin + 1 >= @maks THEN 0 ELSE GagalLogin + 1 END
        WHERE Id = @id`,
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
          SET GagalLogin = 0,
              TerkunciSampai = NULL,
              LoginTerakhir = SYSDATETIME(),
              SesiHash = @sesiHash,
              SesiDibuat = SYSDATETIME(),
              SesiAktifTerakhir = SYSDATETIME()
        WHERE Id = @id
          AND Aktif = 1
          AND (TerkunciSampai IS NULL OR TerkunciSampai <= SYSDATETIME())`,
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
          SET SesiAktifTerakhir = SYSDATETIME()
       OUTPUT inserted.Id AS id, inserted.Username AS username
        WHERE SesiHash = @sesiHash
          AND Aktif = 1
          AND SesiDibuat > DATEADD(HOUR, -@jam, SYSDATETIME())
          AND SesiAktifTerakhir > DATEADD(MINUTE, -@idle, SYSDATETIME())`,
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
          SET SesiHash = NULL, SesiDibuat = NULL, SesiAktifTerakhir = NULL
        WHERE SesiHash = @sesiHash`,
    );
}

export async function tambahAdmin(username: string, passwordHash: string): Promise<void> {
  const pool = await ambilPool();
  await pool
    .request()
    .input('username', sql.NVarChar(50), username)
    .input('passwordHash', sql.NVarChar(255), passwordHash)
    .query('INSERT INTO dbo.HCIS_Psikotes_Admin (Username, PasswordHash) VALUES (@username, @passwordHash)');
}
