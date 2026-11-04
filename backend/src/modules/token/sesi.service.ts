// Logika sesi dan undangan untuk admin, terpisah dari rute.
// Token mentah hanya ada di hasil fungsi ini (sekali tampil). Database hanya menyimpan hash.
import type { KonfigurasiAplikasi } from '../../config/env.js';
import { muatTes } from '../../config/tes.js';
import { muatBank } from '../tes/bank.js';
import { daftarKelompokSesi } from './kelompok.repo.js';
import * as repo from './sesi.repo.js';
import { DAFTAR_TES, ringkasJadwal, type JadwalTes, type PesertaMasukan, type SesiMasukan } from './sesi.validasi.js';
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

/** Satu token beserta jadwal tesnya. */
export interface TokenPeserta extends JadwalTes {
  ujian_id: number;
  token: string;
}

export interface UndanganPeserta extends Undangan {
  nama: string | null;
  token: TokenPeserta[];
}

interface PesertaBertoken {
  email: string;
  nama: string | null;
  token: (JadwalTes & { token: string })[];
}

const hashDari = (token: string): string => hashTokenPeserta(normalisasiToken(token)!);

/** Satu token per peserta per tes, mengikuti jadwal tes itu. */
function siapkanToken(peserta: PesertaMasukan[], jadwal: JadwalTes[]): PesertaBertoken[] {
  return peserta.map((p) => ({ ...p, token: jadwal.map((j) => ({ ...j, token: buatTokenPeserta() })) }));
}

function barisDari(siap: PesertaBertoken[]): repo.BarisUjianBaru[] {
  return siap.flatMap((p) =>
    p.token.map(({ token, ...jadwal }) => ({ email: p.email, nama: p.nama, jadwal, tokenHash: hashDari(token) })),
  );
}

/** Menggabungkan id ujian hasil sisip (urutannya sama dengan baris) lalu mengisi template. */
function susunUndangan(siap: PesertaBertoken[], ujianId: number[], template: Template, konfig: KonfigurasiAplikasi): UndanganPeserta[] {
  let i = 0;
  return siap.map((p) => {
    const token = p.token.map((t) => ({ ...t, ujian_id: ujianId[i++] }));
    return {
      ...isiUndangan(template, { email: p.email, nama: p.nama, portalUrl: konfig.portalUrl, token }),
      nama: p.nama,
      token,
    };
  });
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
  const siap = siapkanToken(sesi.peserta, sesi.jadwal);

  let hasil;
  try {
    hasil = await repo.buatSesi(
      { nama_sesi: sesi.nama_sesi, ...ringkasJadwal(sesi.jadwal), daftar_tes: sesi.jadwal.map((j) => j.tes).join(',') },
      tpl,
      bankVersi,
      adminId,
      barisDari(siap),
    );
  } catch (galat) {
    if (repo.galatUnik(galat)) throw new GalatPermintaan(409, 'Sesi dengan nama dan tanggal ini sudah ada');
    throw galat;
  }
  if (!hasil) throw new GalatPermintaan(400, 'Jadwal tes paling awal sudah lewat');
  return { sesi_id: hasil.sesiId, undangan: susunUndangan(siap, hasil.ujianId, tpl, konfig) };
}

async function sesiAtauGalat(sesiId: number): Promise<repo.SesiDetail> {
  const sesi = await repo.ambilSesi(sesiId);
  if (!sesi) throw new GalatPermintaan(404, 'Sesi tidak ditemukan');
  return sesi;
}

const templateSesi = (s: repo.SesiDetail): Template => ({ subjek: s.template_subjek, isi: s.template_isi });
const urutBaku = (a: { tes: JenisTes }, b: { tes: JenisTes }): number => DAFTAR_TES.indexOf(a.tes) - DAFTAR_TES.indexOf(b.tes);

/** Jadwal per tes yang sudah dipakai sesi ini, supaya peserta tambahan mendapat jadwal yang sama. */
async function jadwalAtauGalat(sesiId: number): Promise<JadwalTes[]> {
  const jadwal = await repo.jadwalSesi(sesiId);
  if (!jadwal || jadwal.length === 0) throw new GalatPermintaan(409, 'Jadwal sesi tidak bisa ditentukan');
  return jadwal.sort(urutBaku);
}

export async function tambahPeserta(sesiId: number, peserta: PesertaMasukan[], konfig: KonfigurasiAplikasi): Promise<UndanganPeserta[]> {
  const sesi = await sesiAtauGalat(sesiId);
  wajibIndividu(sesi);
  const siap = siapkanToken(peserta, await jadwalAtauGalat(sesiId));
  let ujianId: number[];
  try {
    ujianId = await repo.tambahUjian(sesiId, barisDari(siap));
  } catch (galat) {
    if (repo.galatUnik(galat)) throw new GalatPermintaan(409, 'Sebagian email sudah terdaftar di sesi ini');
    throw galat;
  }
  return susunUndangan(siap, ujianId, templateSesi(sesi), konfig);
}

/** Token baru untuk satu peserta. Hanya token yang belum dipakai yang diganti; token lama langsung tidak berlaku. */
export async function tokenBaru(sesiId: number, email: string, konfig: KonfigurasiAplikasi): Promise<UndanganPeserta> {
  const sesi = await sesiAtauGalat(sesiId);
  wajibIndividu(sesi);
  const ujian = (await repo.ujianBelumDipakai(sesiId, email)).sort(urutBaku);
  if (ujian.length === 0) throw new GalatPermintaan(404, 'Tidak ada token yang belum dipakai untuk email ini di sesi ini');

  const siap: PesertaBertoken = {
    email,
    nama: ujian[0].nama,
    token: ujian.map(({ tes, tanggal, waktu_buka, waktu_tutup }) => ({ tes, tanggal, waktu_buka, waktu_tutup, token: buatTokenPeserta() })),
  };
  // Bila ada token yang baru saja dipakai di sela-sela, tidak ada yang diganti.
  const ganti = siap.token.map((t, i) => ({ id: ujian[i].id, tokenHash: hashDari(t.token) }));
  if (!(await repo.gantiToken(ganti))) {
    throw new GalatPermintaan(409, 'Status token berubah, muat ulang data sesi lalu coba lagi');
  }
  return susunUndangan([siap], ujian.map((u) => u.id), templateSesi(sesi), konfig)[0];
}

export async function detailSesi(sesiId: number) {
  const sesi = await sesiAtauGalat(sesiId);
  const ujian = await repo.daftarUjianSesi(sesiId);
  if (sesi.mode === 'KELOMPOK') {
    // Jadwal sesi serentak ada di token kelompok, bukan di catatan ujian (yang baru ada setelah peserta masuk).
    const kelompok = await daftarKelompokSesi(sesiId);
    return { ...sesi, jadwal: kelompok.map(({ tes, tanggal, waktu_buka, waktu_tutup }) => ({ tes, tanggal, waktu_buka, waktu_tutup })), kelompok, ujian };
  }
  return { ...sesi, jadwal: ((await repo.jadwalSesi(sesiId)) ?? []).sort(urutBaku), kelompok: [], ujian };
}

/** Peserta tambahan dan token baru per email hanya untuk sesi individu. */
function wajibIndividu(sesi: repo.SesiDetail): void {
  if (sesi.mode === 'KELOMPOK') throw new GalatPermintaan(409, 'Sesi serentak memakai token kelompok, bukan token per peserta');
}
