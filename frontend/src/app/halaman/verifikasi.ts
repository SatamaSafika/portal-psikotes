import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiPeserta, pesanGalat, statusGalat, type Persetujuan } from '../core/api.service';
import { Ikon } from '../core/ikon';
import { DAFTAR_TES, LABEL_TES_PESERTA, type JenisTes } from '../core/model';
import { PengerjaanService } from '../core/pengerjaan.service';
import { KakiPortal } from '../tata-letak/kaki-portal';
import { KepalaPortal } from '../tata-letak/kepala-portal';

/** Pesan seragam: tidak membedakan salah, penuh, kedaluwarsa, dicabut, atau tes lain (teks akhir menunggu HC). */
const GAGAL_TOKEN = 'Token tidak dapat digunakan. Periksa kembali token Anda atau hubungi pengawas atau tim HC.';
/** Sama dengan pesan server bila persetujuan tidak dikirim. */
const WAJIB_SETUJU = 'Tes tidak dapat dilanjutkan tanpa persetujuan. Hubungi pengawas atau tim HC.';

/** Token yang diketik ditampilkan rapi: kelompok XXXXX-XXXXX, individu XXXX-XXXX-XXXX-XXXX-XXXX. */
export function tampilToken(masukan: string): string {
  const t = masukan.toUpperCase().replace(/[\s-]/g, '');
  if (t.length === 10) return `${t.slice(0, 5)}-${t.slice(5)}`;
  return t.match(/.{1,4}/g)?.join('-') ?? t;
}

/**
 * Verifikasi dua langkah. Langkah 1: token saja; server memberi tahu mode tanpa memakai token.
 * Langkah 2: individu = nama dan email; serentak (kelompok) = nama saja. Tes yang dipilih ikut dikirim;
 * token untuk tes lain ditolak dengan pesan yang sama.
 */
@Component({
  selector: 'app-verifikasi',
  imports: [RouterLink, KepalaPortal, KakiPortal, Ikon],
  template: `
    <div class="halaman">
      <app-kepala-portal [langkah]="2" />
      <main class="isi-halaman">
        <div class="wadah" [class.wadah-token]="mode() === null" [class.wadah-identitas]="mode() !== null">
          <span class="ubin-ikon besar"><app-ikon class="ikon-cermin" nama="key" [ukuran]="28" /></span>
          <span class="label-tes label-verifikasi">{{ labelTes() }}</span>
          <h1 class="judul judul-verifikasi">Verifikasi token dan identitas</h1>
          <p class="teks-redup">
            @switch (mode()) {
              @case ('KELOMPOK') { Token ini dipakai bersama satu kelompok. Tulis nama lengkap Anda dengan benar, karena hasil tes dicatat atas nama ini. }
              @case ('INDIVIDU') { Token ini khusus untuk Anda. Isi nama dan email yang sama dengan email undangan. }
              @default { Masukkan token dari tim HC atau pengawas tes. Token hanya berlaku pada jadwal sesi tes. }
            }
          </p>

          @if (mode() === null) {
            <form class="kaca kartu-verifikasi" (submit)="cekToken($event)" novalidate>
              <label class="isian isian-token">
                <span>Token</span>
                <input name="token" autocomplete="off" spellcheck="false" autocapitalize="characters"
                       aria-describedby="petunjuk-token" [value]="token()" (input)="token.set(nilai($event))" />
              </label>
              <p id="petunjuk-token" class="teks-redup teks-kecil petunjuk-isian">Huruf besar atau kecil sama saja. Tanda hubung boleh diabaikan.</p>
              @if (galat()) {
                <div class="kotak-galat" role="alert">{{ galat() }}</div>
              }
              <div class="baris-tombol">
                <button class="tombol tombol-utama" type="submit" [disabled]="memproses()">{{ memproses() ? 'Memeriksa...' : 'Lanjut' }}</button>
                <a class="tombol-tautan" routerLink="/">Kembali</a>
              </div>
            </form>
          } @else {
            <form class="kaca kartu-verifikasi" (submit)="masuk($event)" novalidate>
              <div class="baris-token">
                <span>Token <strong class="token-teks">{{ tokenTampil() }}</strong> diterima</span>
                <button type="button" class="tombol-tautan" (click)="gantiToken()">Ganti token</button>
              </div>
              <div class="kolom-verifikasi">
              @if (persetujuan(); as p) {
                <fieldset class="persetujuan">
                  <legend>{{ p.judul }} <span class="wajib" aria-hidden="true">*</span></legend>
                  <p>{{ p.pembuka }}</p>
                  <ol>
                    @for (b of p.butir; track $index) {
                      <li>{{ b }}</li>
                    }
                  </ol>
                  <p>{{ p.penutup }}</p>
                  <label class="pilihan-setuju">
                    <input type="radio" name="setuju" [checked]="setuju() === true" (change)="setuju.set(true)" />
                    {{ p.label_setuju }}
                  </label>
                  <label class="pilihan-setuju">
                    <input type="radio" name="setuju" [checked]="setuju() === false" (change)="setuju.set(false)" />
                    {{ p.label_tidak_setuju }}
                  </label>
                  @if (setuju() === false) {
                    <div class="kotak-galat" role="alert">{{ wajibSetuju }}</div>
                  }
                </fieldset>
              }
              <div class="isian-identitas">
              <label class="isian">
                <span>Nama lengkap</span>
                <input name="nama" autocomplete="name" placeholder="Sesuai data pendaftaran"
                       [value]="nama()" (input)="nama.set(nilai($event))" />
              </label>
              @if (mode() === 'INDIVIDU') {
                <label class="isian">
                  <span>Email</span>
                  <input name="email" type="email" autocomplete="email" placeholder="nama@email.com"
                         [value]="email()" (input)="email.set(nilai($event))" />
                </label>
              }
              <div class="kotak-peringatan">
                Setelah tes dimulai, waktu berjalan dan tidak dapat dihentikan. Pastikan koneksi internet stabil.
              </div>
              @if (galat()) {
                <div class="kotak-galat galat-identitas" role="alert">{{ galat() }}</div>
              }
              <div class="baris-tombol">
                <button class="tombol tombol-utama" type="submit" [disabled]="memproses() || setuju() !== true">
                  {{ memproses() ? 'Memeriksa...' : 'Verifikasi dan lanjut' }}
                </button>
                <a class="tombol-tautan" routerLink="/">Kembali</a>
              </div>
              </div>
              </div>
            </form>
          }
        </div>
      </main>
      <app-kaki-portal />
    </div>
  `,
})
export class Verifikasi implements OnInit {
  private readonly api = inject(ApiPeserta);
  private readonly pengerjaan = inject(PengerjaanService);
  private readonly router = inject(Router);

  /** Dari rute /masuk/:tes */
  readonly tes = input.required<string>();
  protected readonly mode = signal<'INDIVIDU' | 'KELOMPOK' | null>(null);
  protected readonly token = signal('');
  protected readonly nama = signal('');
  protected readonly email = signal('');
  protected readonly galat = signal('');
  protected readonly memproses = signal(false);
  protected readonly tokenTampil = computed(() => tampilToken(this.token()));
  /** Teks persetujuan dari server (balasan langkah 1). */
  protected readonly persetujuan = signal<Persetujuan | null>(null);
  /** null = belum memilih. Tidak ada pilihan bawaan. */
  protected readonly setuju = signal<boolean | null>(null);
  protected readonly wajibSetuju = WAJIB_SETUJU;

  protected labelTes(): string {
    return LABEL_TES_PESERTA[this.tes() as JenisTes] ?? '';
  }

  async ngOnInit(): Promise<void> {
    if (!DAFTAR_TES.includes(this.tes() as JenisTes)) {
      await this.router.navigateByUrl('/');
      return;
    }
    // Sudah masuk untuk tes ini (mis. kembali ke halaman ini atau refresh): lanjutkan saja.
    try {
      const info = await this.pengerjaan.muatInfo();
      if (info.jenis_tes === this.tes()) await this.router.navigateByUrl(info.mulai_pada ? '/tes/kerjakan' : '/tes/instruksi');
    } catch {
      // Belum ada sesi: tampilkan formulir.
    }
  }

  protected nilai(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }

  private pesanGagal(galat: unknown): string {
    return statusGalat(galat) === 401 ? GAGAL_TOKEN : pesanGalat(galat);
  }

  protected async cekToken(e: Event): Promise<void> {
    e.preventDefault();
    this.galat.set('');
    if (!this.token().trim()) {
      this.galat.set('Token wajib diisi.');
      return;
    }
    this.memproses.set(true);
    try {
      const hasil = await this.api.cekToken(this.token().trim(), this.tes() as JenisTes);
      this.persetujuan.set(hasil.persetujuan);
      this.setuju.set(null);
      this.mode.set(hasil.mode);
    } catch (galat) {
      this.galat.set(this.pesanGagal(galat));
    } finally {
      this.memproses.set(false);
    }
  }

  protected gantiToken(): void {
    this.mode.set(null);
    this.galat.set('');
  }

  protected async masuk(e: Event): Promise<void> {
    e.preventDefault();
    this.galat.set('');
    const p = this.persetujuan();
    if (!p || this.setuju() !== true) {
      this.galat.set(WAJIB_SETUJU);
      return;
    }
    const nama = this.nama().trim();
    if (nama.length < 2 || (this.mode() === 'INDIVIDU' && !this.email().trim())) {
      this.galat.set(this.mode() === 'INDIVIDU' ? 'Nama lengkap dan email wajib diisi.' : 'Nama lengkap wajib diisi (minimal 2 huruf).');
      return;
    }
    this.memproses.set(true);
    try {
      const jenis_tes = this.tes() as JenisTes;
      const setuju = { setuju: true as const, persetujuan_versi: p.versi };
      if (this.mode() === 'KELOMPOK') await this.api.masukKelompok({ token: this.token().trim(), jenis_tes, nama, ...setuju });
      else await this.api.masuk({ email: this.email().trim(), token: this.token().trim(), jenis_tes, nama, ...setuju });
      await this.pengerjaan.muatInfo();
      await this.router.navigateByUrl('/tes/instruksi');
    } catch (galat) {
      this.galat.set(
        statusGalat(galat) === 401 && this.mode() === 'INDIVIDU'
          ? 'Email tidak sesuai dengan token, token sudah dipakai, atau di luar jadwal tes. Hubungi tim HC bila perlu.'
          : this.pesanGagal(galat),
      );
    } finally {
      this.memproses.set(false);
    }
  }
}
