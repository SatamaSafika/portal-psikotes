// Enkripsi token peserta dan token kelompok supaya admin HC dapat melihatnya kembali (audit trail, revisi HC 19 November 2026).
// Verifikasi token tetap memakai hash (TokenHash); kolom TokenSandi hanya untuk ditampilkan ke admin.
// AES-256-GCM dengan kunci TOKEN_KUNCI di backend/.env (32 byte, base64). Database BA dipakai bersama proyek lain,
// jadi isi kolom tidak dapat dibaca tanpa kunci ini.
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const VERSI = 'v1';
const PANJANG_IV = 12;
const PANJANG_TAG = 16;
/** Data tambahan yang ikut diautentikasi: sandi dari kolom lain atau aplikasi lain tidak bisa dipakai di sini. */
const AAD = Buffer.from('portal-psikotes:token');

let kunciTersimpan: Buffer | null = null;

/** Membaca dan memeriksa TOKEN_KUNCI. Galat hanya menyebut nama variabel, tidak pernah nilainya. */
export function kunciToken(): Buffer {
  if (kunciTersimpan) return kunciTersimpan;
  const nilai = process.env.TOKEN_KUNCI ?? '';
  const kunci = Buffer.from(nilai, 'base64');
  if (nilai === '' || kunci.length !== 32) {
    throw new Error(
      'TOKEN_KUNCI belum diisi atau bukan 32 byte base64. Buat dengan: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"',
    );
  }
  kunciTersimpan = kunci;
  return kunci;
}

/** Hanya untuk tes: lupakan kunci yang sudah dibaca. */
export function lupakanKunciToken(): void {
  kunciTersimpan = null;
}

/** Token mentah -> teks "v1.<base64url(iv|tag|isi)>" untuk kolom TokenSandi. */
export function sandiToken(token: string): string {
  const iv = randomBytes(PANJANG_IV);
  const cipher = createCipheriv('aes-256-gcm', kunciToken(), iv);
  cipher.setAAD(AAD);
  const isi = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return `${VERSI}.${Buffer.concat([iv, cipher.getAuthTag(), isi]).toString('base64url')}`;
}

/**
 * Kebalikan sandiToken. Null bila kolom kosong (token dibuat sebelum fitur ini) atau tidak dapat dibuka
 * (kunci berbeda atau isi rusak), supaya satu baris rusak tidak menggagalkan seluruh halaman admin.
 */
export function bukaToken(sandi: string | null | undefined): string | null {
  if (!sandi || !sandi.startsWith(`${VERSI}.`)) return null;
  try {
    const data = Buffer.from(sandi.slice(VERSI.length + 1), 'base64url');
    if (data.length <= PANJANG_IV + PANJANG_TAG) return null;
    const decipher = createDecipheriv('aes-256-gcm', kunciToken(), data.subarray(0, PANJANG_IV));
    decipher.setAAD(AAD);
    decipher.setAuthTag(data.subarray(PANJANG_IV, PANJANG_IV + PANJANG_TAG));
    return Buffer.concat([decipher.update(data.subarray(PANJANG_IV + PANJANG_TAG)), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}
