// Logika sesi serentak (token kelompok) untuk admin, terpisah dari rute.
// Token mentah hanya ada di hasil fungsi ini (sekali tampil). Database hanya menyimpan hash.
import type { KonfigurasiAplikasi } from '../../config/env.js';
import { muatTes } from '../../config/tes.js';
import { muatBank } from '../tes/bank.js';
import * as repo from './kelompok.repo.js';
import { GalatPermintaan } from './sesi.service.js';
import { galatUnik } from './sesi.repo.js';
import { ringkasJadwal, type JadwalTes, type SesiKelompokMasukan } from './sesi.validasi.js';
import { buatTokenKelompok, hashTokenPeserta, normalisasiTokenApaSaja } from './token.js';
import { isiEmailKelompok, templateBawaan, type Template, type Undangan } from './undangan.js';

export interface TokenKelompokBaru extends JadwalTes {
  kelompok_id: number;
  /** Token mentah, hanya tampil sekali. */
  token: string;
}

const hashDari = (token: string): string => hashTokenPeserta(normalisasiTokenApaSaja(token)!.token);

export async function buatSesiKelompok(
  sesi: SesiKelompokMasukan,
  template: Template | null,
  adminId: number,
  konfig: KonfigurasiAplikasi,
): Promise<{ sesi_id: number; token: TokenKelompokBaru[]; email: Undangan }> {
  const bankVersi = muatTes().bank_aktif;
  await muatBank(bankVersi);
  const tpl = template ?? templateBawaan('KELOMPOK');
  const token = sesi.jadwal.map((jadwal) => ({ jadwal, token: buatTokenKelompok() }));

  let hasil;
  try {
    hasil = await repo.buatSesiKelompok(
      { ...sesi, ...ringkasJadwal(sesi.jadwal), daftar_tes: sesi.jadwal.map((j) => j.tes).join(',') },
      tpl,
      bankVersi,
      adminId,
      token.map((t) => ({ jadwal: t.jadwal, tokenHash: hashDari(t.token) })),
    );
  } catch (galat) {
    if (galatUnik(galat)) throw new GalatPermintaan(409, 'Sesi dengan nama dan tanggal ini sudah ada');
    throw galat;
  }
  if (!hasil) throw new GalatPermintaan(400, 'Jadwal tes paling awal sudah lewat');

  const baru = token.map((t, i) => ({ ...t.jadwal, kelompok_id: hasil.kelompokId[i], token: t.token }));
  const email = isiEmailKelompok(tpl, {
    email: sesi.email_penerima,
    namaSesi: sesi.nama_sesi,
    kuota: sesi.kuota,
    portalUrl: konfig.portalUrl,
    token: baru,
  });
  return { sesi_id: hasil.sesiId, token: baru, email };
}

/**
 * Token baru untuk satu token kelompok. Kuota, terpakai, dan peserta yang sudah masuk tidak berubah;
 * token lama langsung tidak berlaku. Email berisi token baru itu saja.
 */
export async function tokenBaruKelompok(
  kelompokId: number,
  konfig: KonfigurasiAplikasi,
): Promise<{ token: TokenKelompokBaru; email: Undangan | null }> {
  const k = await repo.ambilKelompok(kelompokId);
  if (!k) throw new GalatPermintaan(404, 'Token kelompok tidak ditemukan');
  const token = buatTokenKelompok();
  if (!(await repo.gantiTokenKelompok(kelompokId, hashDari(token)))) {
    throw new GalatPermintaan(409, 'Token kelompok sudah dicabut');
  }
  const baru: TokenKelompokBaru = {
    tes: k.tes,
    tanggal: k.tanggal,
    waktu_buka: k.waktu_buka,
    waktu_tutup: k.waktu_tutup,
    kelompok_id: k.kelompok_id,
    token,
  };
  const email = k.email_penerima
    ? isiEmailKelompok(
        { subjek: k.template_subjek, isi: k.template_isi },
        { email: k.email_penerima, namaSesi: k.nama_sesi, kuota: k.kuota, portalUrl: konfig.portalUrl, token: [baru] },
      )
    : null;
  return { token: baru, email };
}
