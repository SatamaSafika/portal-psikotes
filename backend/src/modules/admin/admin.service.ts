// Logika login admin, terpisah dari rute.
import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import type { KonfigurasiAplikasi } from '../../config/env.js';
import * as repo from './admin.repo.js';
import { buatToken, hashToken } from './sesi.js';

export const OPSI_ARGON2 = { type: argon2.argon2id } as const;

/** Aturan username dan kata sandi, dipakai juga oleh skrip pembuat admin. */
export const POLA_USERNAME = /^[A-Za-z0-9._-]{3,50}$/;
/**
 * Minimal 5 karakter: keputusan pemilik proyek 12 November 2026 (sebelumnya 12). Risiko: kata sandi pendek
 * mudah dipecahkan bila hash bocor; batas gagal login hanya melindungi login lewat halaman. Tinjau sebelum produksi.
 */
export const PASSWORD_MIN = 5;
/** Batas atas supaya kata sandi sangat panjang tidak membebani argon2. */
export const PASSWORD_MAKS = 256;

// Hash tiruan untuk username yang tidak ada, supaya waktu respons setara.
let hashTiruan: Promise<string> | null = null;
function ambilHashTiruan(): Promise<string> {
  hashTiruan ??= argon2.hash(randomBytes(32), OPSI_ARGON2);
  return hashTiruan;
}

export type HasilLogin = { berhasil: true; username: string; token: string } | { berhasil: false };

export async function login(username: string, password: string, konfig: KonfigurasiAplikasi): Promise<HasilLogin> {
  const admin = POLA_USERNAME.test(username) ? await repo.cariPerUsername(username) : null;

  if (!admin || !admin.aktif || admin.terkunci) {
    // Tetap verifikasi supaya akun tidak ada, nonaktif, dan terkunci tidak bisa dibedakan dari waktunya.
    await argon2.verify(await ambilHashTiruan(), password).catch(() => false);
    return { berhasil: false };
  }

  const cocok = await argon2.verify(admin.password_hash, password).catch(() => false);
  if (!cocok) {
    await repo.catatGagal(admin.id, konfig.loginMaksGagal, konfig.loginKunciMenit);
    return { berhasil: false };
  }

  const token = buatToken();
  const tersimpan = await repo.catatBerhasil(admin.id, hashToken(token));
  if (!tersimpan) return { berhasil: false };
  return { berhasil: true, username: admin.username, token };
}
