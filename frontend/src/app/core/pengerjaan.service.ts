import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AntreanSimpan } from './antrean-simpan';
import { ApiPeserta, statusGalat } from './api.service';
import type { DataLatihan, InfoUjian, SoalPublik } from './model';
import { HitungMundur } from './waktu';

const SINKRON_MS = 30_000;

/**
 * Keadaan satu ujian peserta (satu token = satu tes): info dari server, soal, jawaban,
 * hitung mundur, simpan otomatis, dan kirim (termasuk kirim otomatis saat waktu habis).
 */
@Injectable({ providedIn: 'root' })
export class PengerjaanService {
  private readonly api = inject(ApiPeserta);
  private readonly router = inject(Router);

  readonly info = signal<InfoUjian | null>(null);
  readonly latihan = signal<DataLatihan | null>(null);
  readonly soal = signal<SoalPublik[]>([]);
  /** Jawaban per nomor (TIU 6: nomor datar). null = kosong. */
  readonly jawaban = signal<ReadonlyMap<number, string | null>>(new Map());
  readonly sisaDetik = signal<number | null>(null);
  readonly sudahMulai = computed(() => !!this.info()?.mulai_pada);

  private readonly antreanAktif = signal(this.antreanBaru());
  readonly statusSimpan = computed(() => this.antreanAktif().status());
  private get antrean(): AntreanSimpan {
    return this.antreanAktif();
  }
  private hitung: HitungMundur | null = null;
  private detik: ReturnType<typeof setInterval> | null = null;
  private sinkron: ReturnType<typeof setInterval> | null = null;
  private menutup = false;

  private antreanBaru(): AntreanSimpan {
    return new AntreanSimpan(async (kiriman) => {
      try {
        await this.api.simpanJawaban(kiriman);
      } catch (galat) {
        // 409 = waktu habis, 401 = sesi sudah ditutup server: tidak perlu dicoba lagi.
        const s = statusGalat(galat);
        if (s === 409 || s === 401) void this.selesai('waktu');
        throw galat;
      }
    });
  }

  /** Muat info ujian dari server. Melempar galat (mis. 401) bila sesi peserta tidak berlaku. */
  async muatInfo(): Promise<InfoUjian> {
    const info = await this.api.saya();
    this.info.set(info);
    if (info.sisa_detik !== null) this.setelSisa(info.sisa_detik);
    return info;
  }

  async muatLatihan(): Promise<DataLatihan> {
    const ada = this.latihan();
    if (ada) return ada;
    const data = await this.api.latihan();
    this.latihan.set(data);
    return data;
  }

  /** Mulai tes (aman diulang), lalu muat soal dan jawaban tersimpan, lalu jalankan hitung mundur. */
  async siapkanPengerjaan(): Promise<void> {
    this.menutup = false;
    if (!this.sudahMulai()) this.info.set(await this.api.mulai());
    const info = this.info()!;
    if (info.sisa_detik !== null) this.setelSisa(info.sisa_detik);
    const [soal, jawaban] = await Promise.all([this.api.soal(), this.api.jawaban(), this.muatLatihan()]);
    this.soal.set(soal.soal);
    this.jawaban.set(new Map(jawaban.jawaban.map((j) => [j.nomor, j.jawaban])));
    this.jalankanWaktu();
  }

  jawab(nomor: number, nilai: string | null): void {
    if (this.menutup) return;
    const baru = new Map(this.jawaban());
    baru.set(nomor, nilai);
    this.jawaban.set(baru);
    this.antrean.tandai(nomor, nilai);
  }

  /** Kirim jawaban (dari tombol konfirmasi). */
  async kirim(): Promise<void> {
    await this.selesai('kirim');
  }

  private setelSisa(sisa: number): void {
    const sekarang = performance.now();
    if (this.hitung) this.hitung.sinkron(sisa, sekarang);
    else this.hitung = new HitungMundur(sisa, sekarang);
    this.sisaDetik.set(this.hitung.sisa(sekarang));
  }

  private jalankanWaktu(): void {
    this.hentikanWaktu();
    this.detik = setInterval(() => {
      if (!this.hitung) return;
      const sisa = this.hitung.sisa(performance.now());
      this.sisaDetik.set(sisa);
      if (sisa === 0) void this.selesai('waktu');
    }, 250);
    this.sinkron = setInterval(() => {
      this.api.saya().then(
        (info) => {
          this.info.set(info);
          if (info.sisa_detik !== null) this.setelSisa(info.sisa_detik);
        },
        (galat) => {
          // Sesi sudah ditutup server (mis. waktu habis lebih dulu di server).
          if (statusGalat(galat) === 401) void this.selesai('waktu');
        },
      );
    }, SINKRON_MS);
  }

  private hentikanWaktu(): void {
    if (this.detik !== null) clearInterval(this.detik);
    if (this.sinkron !== null) clearInterval(this.sinkron);
    this.detik = this.sinkron = null;
  }

  /**
   * Menutup pengerjaan: simpan sisa jawaban, kirim, lalu ke halaman selesai.
   * Saat waktu habis, kegagalan kirim diabaikan: server tetap menutup ujian otomatis.
   */
  private async selesai(alasan: 'kirim' | 'waktu'): Promise<void> {
    if (this.menutup) return;
    this.menutup = true;
    this.hentikanWaktu();
    try {
      const tersimpan = await this.antrean.kosongkan();
      // Kirim manual hanya bila semua jawaban sudah tersimpan; saat waktu habis, kirim apa adanya.
      if (!tersimpan && alasan === 'kirim') throw new Error('Sebagian jawaban belum tersimpan. Periksa koneksi lalu coba lagi.');
      await this.api.kirim();
    } catch (galat) {
      if (alasan === 'kirim' && statusGalat(galat) !== 409 && statusGalat(galat) !== 401) {
        // Kirim manual gagal karena jaringan: biarkan peserta mencoba lagi.
        this.menutup = false;
        this.jalankanWaktu();
        throw galat;
      }
    }
    this.antrean.berhenti();
    this.reset();
    await this.router.navigate(['/selesai'], { queryParams: alasan === 'waktu' ? { alasan: 'waktu' } : {} });
  }

  private reset(): void {
    this.info.set(null);
    this.latihan.set(null);
    this.soal.set([]);
    this.jawaban.set(new Map());
    this.sisaDetik.set(null);
    this.hitung = null;
    this.antreanAktif.set(this.antreanBaru());
  }
}
