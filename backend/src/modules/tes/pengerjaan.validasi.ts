// Aturan simpan jawaban dan nomor datar. Fungsi murni, tanpa database.
// Pesan galat tidak pernah memuat kunci.
import type { KonfigurasiTes } from '../../config/tes.js';
import type { JenisTes } from '../token/undangan.js';

/** Satu kiriman simpan otomatis paling banyak sekian baris. */
export const KIRIMAN_TIU_MAKS = 40;
export const KIRIMAN_KORAN_MAKS = 100;

// ---------- nomor datar ----------

/** TIU 6: nomor datar (soal - 1) x butir_per_soal + butir, mulai 1. */
export const nomorDatarTiu6 = (soal: number, butir: number, butirPerSoal: number): number => (soal - 1) * butirPerSoal + butir;

/** Koran: satu kotak = penjumlahan dua angka bersebelahan, jadi angka_per_lajur - 1 kotak per lajur. */
export const kotakPerLajur = (k: KonfigurasiTes): number => k.tes.KORAN.angka_per_lajur - 1;
export const jumlahKotakKoran = (k: KonfigurasiTes): number =>
  kotakPerLajur(k) * k.tes.KORAN.halaman * k.tes.KORAN.lajur_per_halaman;
/** Koran: nomor datar (lajur - 1) x kotak_per_lajur + kotak, mulai 1. Lajur dihitung dari 1 sampai 52. */
export const nomorDatarKoran = (lajur: number, kotak: number, k: KonfigurasiTes): number => (lajur - 1) * kotakPerLajur(k) + kotak;

/** Jumlah nomor jawaban per tes (TIU 5: 30, TIU 6: 40 butir, Koran: 988 kotak). */
export function jumlahNomor(jenis: JenisTes, k: KonfigurasiTes): number {
  if (jenis === 'TIU5') return k.tes.TIU5.jumlah_soal;
  if (jenis === 'TIU6') return k.tes.TIU6.jumlah_soal * k.tes.TIU6.butir_per_soal;
  return jumlahKotakKoran(k);
}

// ---------- TIU 5 dan TIU 6 ----------

export interface JawabanTiu {
  nomor: number;
  /** null = dikosongkan. */
  jawaban: string | null;
}

/** Jawaban boleh kosong dan boleh diubah. Nomor tidak boleh ganda dalam satu kiriman. */
export function validasiJawabanTiu(jenis: 'TIU5' | 'TIU6', data: unknown, k: KonfigurasiTes): { jawaban: JawabanTiu[]; galat: string[] } {
  const galat: string[] = [];
  if (!Array.isArray(data) || data.length === 0 || data.length > KIRIMAN_TIU_MAKS) {
    return { jawaban: [], galat: [`jawaban harus berisi 1 sampai ${KIRIMAN_TIU_MAKS} baris`] };
  }
  const maks = jumlahNomor(jenis, k);
  const pola = jenis === 'TIU5' ? new RegExp(`^[1-${k.tes.TIU5.jumlah_pilihan}]$`) : /^[BS]$/;
  const jawaban: JawabanTiu[] = [];
  const terlihat = new Set<number>();
  data.forEach((b: { nomor?: unknown; jawaban?: unknown } | null, i) => {
    const label = `baris ke-${i + 1}`;
    if (!Number.isInteger(b?.nomor) || (b!.nomor as number) < 1 || (b!.nomor as number) > maks) {
      galat.push(`${label}: nomor harus 1 sampai ${maks}`);
      return;
    }
    const nomor = b!.nomor as number;
    if (terlihat.has(nomor)) {
      galat.push(`${label}: nomor ${nomor} ganda`);
      return;
    }
    terlihat.add(nomor);
    const isi = b?.jawaban;
    if (isi === null || isi === '' || isi === undefined) {
      jawaban.push({ nomor, jawaban: null });
    } else if (typeof isi === 'string' && pola.test(isi)) {
      jawaban.push({ nomor, jawaban: isi });
    } else {
      galat.push(`${label}: jawaban harus ${jenis === 'TIU5' ? `angka 1 sampai ${k.tes.TIU5.jumlah_pilihan}` : 'B atau S'}, atau kosong`);
    }
  });
  return { jawaban: galat.length > 0 ? [] : jawaban, galat };
}

// ---------- Koran ----------

export interface JawabanKoran {
  nomor: number;
  /** Satu digit "0" sampai "9". */
  jawaban: string;
  /** Milidetik sejak tes dimulai, dicatat browser. */
  waktu_ms: number;
}

export interface KonteksKoran {
  /** Jawaban terakhir yang sudah tersimpan, null bila belum ada. */
  terakhir: { nomor: number; waktu_ms: number } | null;
  maksNomor: number;
  durasiMs: number;
  /** Waktu berjalan sejak mulai_pada menurut jam server. */
  berjalanMs: number;
  toleransiMs: number;
}

/**
 * Koran ketat satu per satu: kiriman harus melanjutkan tepat dari nomor terakhir, tanpa celah,
 * setiap kotak satu digit, waktu tidak mundur, di bawah durasi, dan tidak mendahului jam server.
 * Satu pelanggaran menolak seluruh kiriman.
 */
export function validasiKoran(data: unknown, ctx: KonteksKoran): { jawaban: JawabanKoran[]; galat: string[] } {
  if (!Array.isArray(data) || data.length === 0 || data.length > KIRIMAN_KORAN_MAKS) {
    return { jawaban: [], galat: [`jawaban harus berisi 1 sampai ${KIRIMAN_KORAN_MAKS} baris`] };
  }
  const jawaban: JawabanKoran[] = [];
  let nomorBerikut = (ctx.terakhir?.nomor ?? 0) + 1;
  let waktuSebelum = ctx.terakhir?.waktu_ms ?? 0;
  const batasServer = ctx.berjalanMs + ctx.toleransiMs;

  for (let i = 0; i < data.length; i++) {
    const b = data[i] as { nomor?: unknown; jawaban?: unknown; waktu_ms?: unknown } | null;
    const label = `baris ke-${i + 1}`;
    if (b?.nomor !== nomorBerikut) {
      return { jawaban: [], galat: [`${label}: nomor harus ${nomorBerikut} (berurutan, tidak melompat, tidak mengubah)`] };
    }
    if (nomorBerikut > ctx.maksNomor) return { jawaban: [], galat: [`${label}: semua ${ctx.maksNomor} kotak sudah terisi`] };

    const isi = typeof b.jawaban === 'number' ? String(b.jawaban) : b.jawaban;
    if (typeof isi !== 'string' || !/^[0-9]$/.test(isi)) {
      return { jawaban: [], galat: [`${label}: jawaban harus satu digit 0 sampai 9`] };
    }
    const w = b.waktu_ms;
    if (!Number.isInteger(w) || (w as number) < 0) return { jawaban: [], galat: [`${label}: waktu_ms harus bilangan bulat >= 0`] };
    const waktu = w as number;
    if (waktu < waktuSebelum) return { jawaban: [], galat: [`${label}: waktu_ms mundur`] };
    if (waktu >= ctx.durasiMs) return { jawaban: [], galat: [`${label}: waktu_ms melewati durasi tes`] };
    if (waktu > batasServer) return { jawaban: [], galat: [`${label}: waktu_ms mendahului waktu server`] };

    jawaban.push({ nomor: nomorBerikut, jawaban: isi, waktu_ms: waktu });
    nomorBerikut++;
    waktuSebelum = waktu;
  }
  return { jawaban, galat: [] };
}

// ---------- gambar ----------

/**
 * Gambar yang boleh diambil peserta: hanya milik jenis tesnya sendiri.
 * Gambar latihan boleh kapan saja selama sesi; gambar soal hanya selama pengerjaan berjalan.
 */
export function gambarBoleh(nama: string, jenis: JenisTes, sedangMengerjakan: boolean): boolean {
  if (jenis === 'KORAN') return false;
  const cocok = /^(latihan-)?tiu([56])-\d{2}\.png$/.exec(nama);
  if (!cocok || `TIU${cocok[2]}` !== jenis) return false;
  return cocok[1] ? true : sedangMengerjakan;
}
