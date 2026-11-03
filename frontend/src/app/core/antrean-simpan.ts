import { signal } from '@angular/core';
import type { JawabanTersimpan } from './model';

export type StatusSimpan = 'tersimpan' | 'menyimpan' | 'gagal';

/**
 * Simpan otomatis TIU: perubahan dikumpulkan lalu dikirim sekaligus setelah jeda singkat.
 * Bila gagal, jawaban dikembalikan ke antrean dan dicoba lagi. Jawaban yang lebih baru untuk nomor
 * yang sama selalu menang atas yang lama.
 */
export class AntreanSimpan {
  readonly status = signal<StatusSimpan>('tersimpan');
  private readonly tertunda = new Map<number, string | null>();
  private pewaktu: ReturnType<typeof setTimeout> | null = null;
  private berjalan: Promise<boolean> | null = null;
  private berhentiTotal = false;

  constructor(
    private readonly kirim: (jawaban: JawabanTersimpan[]) => Promise<void>,
    private readonly jedaMs = 800,
    private readonly ulangMs = 3000,
  ) {}

  tandai(nomor: number, jawaban: string | null): void {
    if (this.berhentiTotal) return;
    this.tertunda.set(nomor, jawaban);
    this.status.set('menyimpan');
    this.jadwalkan(this.jedaMs);
  }

  get adaTertunda(): boolean {
    return this.tertunda.size > 0;
  }

  /** Kirim semua yang tertunda sekarang. true bila semuanya tersimpan. */
  async kosongkan(): Promise<boolean> {
    this.batalJadwal();
    while (this.berjalan) await this.berjalan;
    if (this.tertunda.size === 0 || this.berhentiTotal) return this.tertunda.size === 0;

    const kiriman = [...this.tertunda].map(([nomor, jawaban]) => ({ nomor, jawaban }));
    this.tertunda.clear();
    this.status.set('menyimpan');
    const proses = this.kirim(kiriman).then(
      () => {
        if (this.tertunda.size === 0) this.status.set('tersimpan');
        return true;
      },
      () => {
        // Kembalikan, kecuali nomor yang sudah diubah lagi sejak itu.
        for (const j of kiriman) if (!this.tertunda.has(j.nomor)) this.tertunda.set(j.nomor, j.jawaban);
        this.status.set('gagal');
        if (!this.berhentiTotal) this.jadwalkan(this.ulangMs);
        return false;
      },
    );
    this.berjalan = proses;
    const hasil = await proses;
    if (this.berjalan === proses) this.berjalan = null;
    return hasil && this.tertunda.size === 0;
  }

  /** Hentikan semua pengiriman (misalnya waktu habis atau sesi berakhir). */
  berhenti(): void {
    this.berhentiTotal = true;
    this.batalJadwal();
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
