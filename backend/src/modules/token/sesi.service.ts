// Logika sesi dan undangan untuk admin, terpisah dari rute.
// Token mentah hanya ada di hasil fungsi ini (sekali tampil). Database hanya menyimpan hash.
import type { KonfigurasiAplikasi } from '../../config/env.js';
import { muatTes } from '../../config/tes.js';
import { muatBank } from '../tes/bank.js';
import * as repo from './sesi.repo.js';
import type { PesertaMasukan, SesiMasukan } from './sesi.validasi.js';
import { buatTokenPeserta, hashTokenPeserta, normalisasiToken } from './token.js';
import { isiUndangan, templateBawaan, type JenisTes, type Template, type Undangan } from './undangan.js';

/** Galat yang pesannya aman ditampilkan ke admin, dengan kode HTTP. */
export class GalatPermintaan extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface TokenPeserta {
  ujian_id: number;
  tes: JenisTes;
  token: string;
}

export interface UndanganPeserta extends Undangan {
  nama: string | null;
  token: TokenPeserta[];
}

interface DataSesiUndangan {
  tanggal: string;
  waktu_buka: string;
  waktu_tutup: string;
}

/** Membuat token per peserta per tes. */
function siapkanToken(peserta: PesertaMasukan[], tes: JenisTes[]) {
  return peserta.map((p) => ({
    ...p,
    token: tes.map((t) => ({ tes: t, token: buatTokenPeserta() })),
  }));
}

const hashDari = (token: string): string => hashTokenPeserta(normalisasiToken(token)!);

function susunUndangan(
  sesi: DataSesiUndangan,
  template: Template,
  konfig: KonfigurasiAplikasi,
  peserta: { email: string; nama: string | null; token: TokenPeserta[] }[],
): UndanganPeserta[] {
  return peserta.map((p) => ({
    ...isiUndangan(template, {
      email: p.email,
      nama: p.nama,
      tanggal: sesi.tanggal,
      jamBuka: sesi.waktu_buka,
      jamTutup: sesi.waktu_tutup,
      portalUrl: konfig.portalUrl,
      token: p.token,
    }),
    nama: p.nama,
    token: p.token,
  }));
}

export async function buatSesi(
  sesi: SesiMasukan,
  template: Template | null,
  adminId: number,
  konfig: KonfigurasiAplikasi,
): Promise<{ sesi_id: number; undangan: UndanganPeserta[] }> {
  const bankVersi = muatTes().bank_aktif;
  // Bank harus valid sebelum sesi dibuat, supaya peserta tidak mendapat token untuk bank rusak.
  await muatBank(bankVersi);
  const tpl = template ?? templateBawaan();

  const siap = siapkanToken(sesi.peserta, sesi.tes);
  const baris = siap.flatMap((p) => p.token.map((t) => ({ email: p.email, nama: p.nama, tes: t.tes, tokenHash: hashDari(t.token) })));

  let hasil;
  try {
    hasil = await repo.buatSesi(sesi, tpl, bankVersi, adminId, baris);
  } catch (galat) {
    if (repo.galatUnik(galat)) throw new GalatPermintaan(409, 'Sesi dengan nama dan tanggal ini sudah ada');
    throw galat;
  }
  if (!hasil) throw new GalatPermintaan(400, 'Tanggal sesi sudah lewat');

  // Urutan id ujian sama dengan urutan baris yang disisipkan.
  let i = 0;
  const peserta = siap.map((p) => ({
    email: p.email,
    nama: p.nama,
    token: p.token.map((t) => ({ ujian_id: hasil.ujianId[i++], tes: t.tes, token: t.token })),
  }));
  return { sesi_id: hasil.sesiId, undangan: susunUndangan(sesi, tpl, konfig, peserta) };
}

async function sesiAtauGalat(sesiId: number): Promise<repo.SesiDetail> {
  const sesi = await repo.ambilSesi(sesiId);
  if (!sesi) throw new GalatPermintaan(404, 'Sesi tidak ditemukan');
  return sesi;
}

const templateSesi = (s: repo.SesiDetail): Template => ({ subjek: s.template_subjek, isi: s.template_isi });

export async function tambahPeserta(sesiId: number, peserta: PesertaMasukan[], konfig: KonfigurasiAplikasi): Promise<UndanganPeserta[]> {
  const sesi = await sesiAtauGalat(sesiId);
  const tes = sesi.daftar_tes.split(',') as JenisTes[];
  const siap = siapkanToken(peserta, tes);
  const baris = siap.flatMap((p) => p.token.map((t) => ({ email: p.email, nama: p.nama, tes: t.tes, tokenHash: hashDari(t.token) })));

  let ujianId: number[];
  try {
    ujianId = await repo.tambahUjian(sesiId, baris);
  } catch (galat) {
    if (repo.galatUnik(galat)) throw new GalatPermintaan(409, 'Sebagian email sudah terdaftar di sesi ini');
    throw galat;
  }
  let i = 0;
  const hasil = siap.map((p) => ({
    email: p.email,
    nama: p.nama,
    token: p.token.map((t) => ({ ujian_id: ujianId[i++], tes: t.tes, token: t.token })),
  }));
  return susunUndangan(sesi, templateSesi(sesi), konfig, hasil);
}

/** Token baru untuk satu peserta. Hanya token yang belum dipakai yang diganti; token lama langsung tidak berlaku. */
export async function tokenBaru(sesiId: number, email: string, konfig: KonfigurasiAplikasi): Promise<UndanganPeserta> {
  const sesi = await sesiAtauGalat(sesiId);
  const ujian = await repo.ujianBelumDipakai(sesiId, email);
  if (ujian.length === 0) throw new GalatPermintaan(404, 'Tidak ada token yang belum dipakai untuk email ini di sesi ini');

  const urutan: JenisTes[] = ['TIU5', 'TIU6', 'KORAN'];
  const token = ujian
    .sort((a, b) => urutan.indexOf(a.jenis_tes) - urutan.indexOf(b.jenis_tes))
    .map((u) => ({ ujian_id: u.id, tes: u.jenis_tes, token: buatTokenPeserta() }));
  // Bila ada token yang baru saja dipakai di sela-sela, tidak ada yang diganti.
  if (!(await repo.gantiToken(token.map((t) => ({ id: t.ujian_id, tokenHash: hashDari(t.token) }))))) {
    throw new GalatPermintaan(409, 'Status token berubah, muat ulang data sesi lalu coba lagi');
  }

  return susunUndangan(sesi, templateSesi(sesi), konfig, [{ email, nama: ujian[0].nama, token }])[0];
}

export async function detailSesi(sesiId: number) {
  const sesi = await sesiAtauGalat(sesiId);
  return { ...sesi, ujian: await repo.daftarUjianSesi(sesiId) };
}
