import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AntreanSimpan, type StatusSimpan } from './antrean-simpan';
import { ApiPeserta, statusGalat } from './api.service';
import { AntreanKoran, JamKoran, SusunanKoran, type SoalKoran } from './koran';
import type { DataLatihan, InfoUjian, SoalPublik } from './model';
import { HitungMundur } from './waktu';

const SINKRON_MS = 30_000;

/**
 * Keadaan satu ujian peserta (satu token = satu tes): info dari server, soal, jawaban,
 * hitung mundur, simpan otomatis, dan kirim (termasuk kirim otomatis saat waktu habis).
 * TIU memakai simpan otomatis per nomor; Koran memakai kiriman berurutan dengan waktu_ms.
 */
@Injectable({ providedIn: 'root' })
export class PengerjaanService {
  private readonly api = inject(ApiPeserta);
  private readonly router = inject(Router);

  readonly info = signal<InfoUjian | null>(null);
  readonly latihan = signal<DataLatihan | null>(null);
  readonly soal = signal<SoalPublik[]>([]);
  readonly soalKoran = signal<SoalKoran | null>(null);
  readonly susunanKoran = computed(() => {
    const s = this.soalKoran();
    return s ? new SusunanKoran(s) : null;
  });
  /** Jawaban per nomor (TIU 6 dan Koran: nomor datar). null = kosong. */
  readonly jawaban = signal<ReadonlyMap<number, string | null>>(new Map());
  readonly sisaDetik = signal<number | null>(null);
  readonly sudahMulai = computed(() => !!this.info()?.mulai_pada);
  /** Soal dan jawaban sudah dimuat dan hitung mundur berjalan. */
  readonly siap = signal(false);

  private readonly antreanTiu = signal(this.antreanTiuBaru());
  private readonly antreanKoran = signal<AntreanKoran | null>(null);
  readonly statusSimpan = computed<StatusSimpan>(() => (this.antreanKoran() ?? this.antreanTiu()).status());

  private hitung: HitungMundur | null = null;
  private jam: JamKoran | null = null;
  private detik: ReturnType<typeof setInterval> | null = null;
  private sinkron: ReturnType<typeof setInterval> | null = null;
  private menutup = false;

  private antreanTiuBaru(): AntreanSimpan {
    return new AntreanSimpan(async (kiriman) => {
      try {
        await this.api.simpanJawaban(kiriman);
      } catch (galat) {
        this.tanganiGalatSimpan(galat);
        throw galat;
      }
    });
  }

  private antreanKoranBaru(): AntreanKoran {
    return new AntreanKoran(
      async (kiriman) => {
        try {
          await this.api.simpanKoran(kiriman);
        } catch (galat) {
          this.tanganiGalatSimpan(galat);
          throw galat;
        }
      },
      (galat) => statusGalat(galat) === 400,
      async () => {
        const { jawaban } = await this.api.jawaban();
        return jawaban.reduce((m, j) => Math.max(m, j.nomor), 0);
      },
    );
  }

  /** 409 = waktu habis, 401 = sesi sudah ditutup server: tutup pengerjaan, tidak perlu dicoba lagi. */
  private tanganiGalatSimpan(galat: unknown): void {
    const s = statusGalat(galat);
    if (s === 409 || s === 401) void this.selesai('waktu');
  }

  /** Muat info ujian dari server. Melempar galat (mis. 401) bila sesi peserta tidak berlaku. */
  async muatInfo(): Promise<InfoUjian> {
    const info = await this.api.saya();
    this.terimaInfo(info);
    return info;
  }

  async muatLatihan(): Promise<DataLatihan> {
    const ada = this.latihan();
    if (ada) return ada;
    const data = await this.api.latihan();
    this.latihan.set(data);
    return data;
  }

  /**
   * Mulai tes (aman diulang), lalu muat soal dan jawaban tersimpan, lalu jalankan hitung mundur.
   * Bila sudah siap (mis. kembali dari halaman konfirmasi), tidak memuat ulang supaya jawaban yang
   * belum terkirim tidak tertimpa.
   */
  async siapkanPengerjaan(): Promise<void> {
    if (this.siap()) {
      if (!this.menutup && this.detik === null) this.jalankanWaktu();
      return;
    }
    this.menutup = false;
    if (!this.sudahMulai()) this.terimaInfo(await this.api.mulai());
    const info = this.info()!;

    if (info.jenis_tes === 'KORAN') {
      const [soal, jawaban] = await Promise.all([this.api.soalKoran(), this.api.jawaban()]);
      this.soalKoran.set(soal);
      this.jawaban.set(new Map(jawaban.jawaban.map((j) => [j.nomor, j.jawaban])));
      this.antreanKoran.set(this.antreanKoranBaru());
    } else {
      const [soal, jawaban] = await Promise.all([this.api.soal(), this.api.jawaban(), this.muatLatihan()]);
      this.soal.set(soal.soal);
      this.jawaban.set(new Map(jawaban.jawaban.map((j) => [j.nomor, j.jawaban])));
    }
    this.siap.set(true);
    this.jalankanWaktu();
  }

  /** TIU: simpan atau kosongkan jawaban satu nomor. */
  jawab(nomor: number, nilai: string | null): void {
    if (this.menutup) return;
    const baru = new Map(this.jawaban());
    baru.set(nomor, nilai);
    this.jawaban.set(baru);
    this.antreanTiu().tandai(nomor, nilai);
  }

  /**
   * Koran: kunci jawaban satu kotak dengan waktu_ms-nya. false bila waktu sudah habis
   * (jawaban pada atau setelah durasi tidak dihitung, sama dengan aturan server).
   */
  jawabKoran(nomor: number, digit: string): boolean {
    const antrean = this.antreanKoran();
    const info = this.info();
    if (this.menutup || !antrean || !this.jam || !info) return false;
    const waktu = this.jam.ambil(performance.now());
    if (waktu >= info.durasi_detik * 1000) return false;
    const baru = new Map(this.jawaban());
    baru.set(nomor, digit);
    this.jawaban.set(baru);
    antrean.tambah({ nomor, jawaban: digit, waktu_ms: waktu });
    return true;
  }

  /** Koran: kirim yang tertunda sekarang (mis. saat pindah halaman), tanpa menunggu jeda. */
  simpanKoranSekarang(): void {
    void this.antreanKoran()?.kosongkan();
  }

  /** Kirim jawaban (dari tombol konfirmasi). */
  async kirim(): Promise<void> {
    await this.selesai('kirim');
  }

  private terimaInfo(info: InfoUjian): void {
    this.info.set(info);
    const sekarang = performance.now();
    if (info.sisa_detik !== null) {
      if (this.hitung) this.hitung.sinkron(info.sisa_detik, sekarang);
      else this.hitung = new HitungMundur(info.sisa_detik, sekarang);
      this.sisaDetik.set(this.hitung.sisa(sekarang));
    }
    if (info.jenis_tes === 'KORAN' && info.berjalan_ms !== null) {
      if (this.jam) this.jam.sinkron(info.berjalan_ms, sekarang);
      else this.jam = new JamKoran(info.berjalan_ms, sekarang);
    }
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
        (info) => this.terimaInfo(info),
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
      const tersimpan = await (this.antreanKoran() ?? this.antreanTiu()).kosongkan();
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
    this.antreanTiu().berhenti();
    this.antreanKoran()?.berhenti();
    this.reset();
    await this.router.navigate(['/selesai'], { queryParams: alasan === 'waktu' ? { alasan: 'waktu' } : {} });
  }

  private reset(): void {
    this.info.set(null);
    this.latihan.set(null);
    this.soal.set([]);
    this.soalKoran.set(null);
    this.jawaban.set(new Map());
    this.sisaDetik.set(null);
    this.siap.set(false);
    this.hitung = null;
    this.jam = null;
    this.antreanTiu.set(this.antreanTiuBaru());
    this.antreanKoran.set(null);
  }
}
