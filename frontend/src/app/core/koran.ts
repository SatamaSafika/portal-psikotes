// Logika murni Tes Koran di browser. Susunan (halaman, lajur, angka) selalu dari server (tes.json dan bank),
// jadi bila konfigurasi berubah tidak ada angka yang perlu diubah di sini.
import { signal } from '@angular/core';
import type { StatusSimpan } from './antrean-simpan';

export interface SoalKoran {
  halaman: number;
  lajur_per_halaman: number;
  angka_per_lajur: number;
  /** Angka per lajur, urut lajur 1, 2, ... (lajur global). */
  lajur: number[][];
}

export interface JawabanKoran {
  nomor: number;
  jawaban: string;
  waktu_ms: number;
}

/** Pemetaan kotak <-> nomor datar, sama dengan backend: nomor = (lajur - 1) x kotak_per_lajur + kotak. */
export class SusunanKoran {
  readonly kotakPerLajur: number;
  readonly kotakPerHalaman: number;
  readonly total: number;

  constructor(readonly soal: Pick<SoalKoran, 'halaman' | 'lajur_per_halaman' | 'angka_per_lajur'>) {
    this.kotakPerLajur = soal.angka_per_lajur - 1;
    this.kotakPerHalaman = this.kotakPerLajur * soal.lajur_per_halaman;
    this.total = this.kotakPerHalaman * soal.halaman;
  }

  /** lajur global mulai 1, kotak mulai 1. */
  nomor(lajur: number, kotak: number): number {
    return (lajur - 1) * this.kotakPerLajur + kotak;
  }

  /** Halaman (mulai 1) tempat nomor itu berada. */
  halamanDari(nomor: number): number {
    return Math.ceil(nomor / this.kotakPerHalaman);
  }

  /** Nomor kotak terakhir di sebuah halaman. */
  nomorTerakhirHalaman(halaman: number): number {
    return halaman * this.kotakPerHalaman;
  }

  /** Lajur global (mulai 1) yang tampil di sebuah halaman. */
  lajurDiHalaman(halaman: number): number[] {
    const awal = (halaman - 1) * this.soal.lajur_per_halaman;
    return Array.from({ length: this.soal.lajur_per_halaman }, (_, i) => awal + i + 1);
  }

  /**
   * Halaman yang dibuka setelah refresh, dari nomor terakhir yang tersimpan.
   * Bila semua kotak sudah terisi, tetap di halaman terakhir.
   */
  halamanPulih(terakhirTersimpan: number): number {
    if (terakhirTersimpan <= 0) return 1;
    // Halaman yang sudah penuh berganti otomatis, jadi yang dibuka adalah halaman kotak berikutnya.
    return Math.min(this.halamanDari(terakhirTersimpan + 1), this.soal.halaman);
  }
}

/** Isi kotak: hanya satu digit; karakter lain dibuang, digit terakhir yang dipakai. */
export function saringDigit(masukan: string): string {
  const digit = masukan.replace(/\D/g, '');
  return digit ? digit[digit.length - 1] : '';
}

/**
 * waktu_ms jawaban: waktu berjalan menurut server saat terakhir disinkronkan, ditambah selang jam browser sejak itu.
 * Tidak pernah mundur, sehingga lolos pemeriksaan server meski sinkron ulang sedikit menggeser jam.
 */
export class JamKoran {
  private dasarMs: number;
  private titikMs: number;
  private terakhir = 0;

  constructor(berjalanServerMs: number, sekarangMs: number) {
    this.dasarMs = berjalanServerMs;
    this.titikMs = sekarangMs;
  }

  sinkron(berjalanServerMs: number, sekarangMs: number): void {
    this.dasarMs = berjalanServerMs;
    this.titikMs = sekarangMs;
  }

  /** Waktu untuk jawaban berikutnya (dan mencatatnya sebagai yang terakhir). */
  ambil(sekarangMs: number): number {
    const w = Math.max(this.terakhir, Math.floor(this.dasarMs + (sekarangMs - this.titikMs)));
    this.terakhir = w;
    return w;
  }
}

/**
 * Pengiriman Koran bertahap: satu kiriman dalam satu waktu, urut nomor, dicoba lagi bila gagal.
 * Bila server menolak urutan (mis. kiriman sebelumnya ternyata sudah masuk sebelum koneksi putus),
 * nomor terakhir tersimpan dibaca ulang dan jawaban yang sudah tersimpan dibuang dari antrean.
 */
export class AntreanKoran {
  readonly status = signal<StatusSimpan>('tersimpan');
  private antre: JawabanKoran[] = [];
  private pewaktu: ReturnType<typeof setTimeout> | null = null;
  private berjalan: Promise<boolean> | null = null;
  private berhentiTotal = false;

  constructor(
    private readonly kirim: (kiriman: JawabanKoran[]) => Promise<void>,
    /** true bila galat berarti "urutan tidak cocok" (HTTP 400) dan perlu dipulihkan. */
    private readonly galatUrutan: (galat: unknown) => boolean,
    /** Nomor terakhir yang tersimpan di server. */
    private readonly ambilTerakhir: () => Promise<number>,
    private readonly jedaMs = 2000,
    private readonly batasJumlah = 20,
    private readonly ulangMs = 3000,
    private readonly maksKiriman = 100,
  ) {}

  get jumlahTertunda(): number {
    return this.antre.length;
  }

  tambah(j: JawabanKoran): void {
    if (this.berhentiTotal) return;
    this.antre.push(j);
    this.status.set('menyimpan');
    if (this.antre.length >= this.batasJumlah) void this.kosongkan();
    else this.jadwalkan(this.jedaMs);
  }

  /** Kirim semua yang tertunda sekarang. true bila semuanya tersimpan. */
  async kosongkan(): Promise<boolean> {
    this.batalJadwal();
    while (this.berjalan) await this.berjalan;
    while (this.antre.length > 0 && !this.berhentiTotal) {
      const proses = this.kirimSatu();
      this.berjalan = proses;
      const ok = await proses;
      if (this.berjalan === proses) this.berjalan = null;
      if (!ok) return false;
    }
    if (this.antre.length === 0) this.status.set('tersimpan');
    return this.antre.length === 0;
  }

  berhenti(): void {
    this.berhentiTotal = true;
    this.batalJadwal();
  }

  private async kirimSatu(): Promise<boolean> {
    const kiriman = this.antre.slice(0, this.maksKiriman);
    try {
      await this.kirim(kiriman);
      this.antre.splice(0, kiriman.length);
      return true;
    } catch (galat) {
      if (this.galatUrutan(galat)) {
        try {
          const terakhir = await this.ambilTerakhir();
          const sebelum = this.antre.length;
          this.antre = this.antre.filter((j) => j.nomor > terakhir);
          if (this.antre.length < sebelum) return true; // ada yang ternyata sudah tersimpan: lanjutkan
        } catch {
          // gagal membaca ulang: perlakukan sebagai gagal biasa
        }
      }
      this.status.set('gagal');
      if (!this.berhentiTotal) this.jadwalkan(this.ulangMs);
      return false;
    }
  }

  private jadwalkan(ms: number): void {
    this.batalJadwal();
    this.pewaktu = setTimeout(() => void this.kosongkan(), ms);
  }

  private batalJadwal(): void {
    if (this.pewaktu !== null) clearTimeout(this.pewaktu);
    this.pewaktu = null;
  }
}
