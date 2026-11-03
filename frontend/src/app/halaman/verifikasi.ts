import { Component, OnInit, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiPeserta, pesanGalat, statusGalat } from '../core/api.service';
import { DAFTAR_TES, LABEL_TES, type JenisTes } from '../core/model';
import { PengerjaanService } from '../core/pengerjaan.service';
import { KakiPortal } from '../tata-letak/kaki-portal';
import { KepalaPortal } from '../tata-letak/kepala-portal';

/** Verifikasi token, nama, dan email. Tes yang dipilih dikirim ke server; token untuk tes lain ditolak tanpa terpakai. */
@Component({
  selector: 'app-verifikasi',
  imports: [RouterLink, KepalaPortal, KakiPortal],
  template: `
    <div class="halaman">
      <app-kepala-portal [langkah]="2" />
      <main class="isi-halaman">
        <div class="wadah wadah-sempit">
          <span class="label-tes">{{ labelTes() }}</span>
          <h1 class="judul">Verifikasi token dan identitas</h1>
          <p class="teks-redup">Masukkan token dari tim HC beserta nama dan email Anda. Token hanya berlaku pada jadwal sesi tes Anda.</p>

          <form class="kartu" (submit)="kirim($event)" novalidate>
              <label class="isian">
                <span>Token</span>
                <input name="token" autocomplete="off" spellcheck="false" placeholder="Contoh: ABCD-1234"
                       [value]="token()" (input)="token.set(nilai($event))" required />
              </label>
              <label class="isian">
                <span>Nama lengkap</span>
                <input name="nama" autocomplete="name" placeholder="Sesuai data pendaftaran"
                       [value]="nama()" (input)="nama.set(nilai($event))" required />
              </label>
              <label class="isian">
                <span>Email</span>
                <input name="email" type="email" autocomplete="email" placeholder="nama@email.com"
                       [value]="email()" (input)="email.set(nilai($event))" required />
              </label>
              <div class="kotak-peringatan">
                Setelah tes dimulai, waktu berjalan dan tidak dapat dihentikan. Pastikan koneksi internet stabil.
              </div>
              @if (galat()) {
                <div class="kotak-galat" role="alert" style="margin-top: 12px">{{ galat() }}</div>
              }
              <div class="baris-tombol">
                <button class="tombol tombol-utama" type="submit" [disabled]="memproses()">
                  {{ memproses() ? 'Memeriksa...' : 'Verifikasi dan lanjut' }}
                </button>
                <a class="tombol-tautan" routerLink="/">Kembali</a>
              </div>
            </form>
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
  protected readonly token = signal('');
  protected readonly nama = signal('');
  protected readonly email = signal('');
  protected readonly galat = signal('');
  protected readonly memproses = signal(false);

  protected labelTes(): string {
    return LABEL_TES[this.tes() as JenisTes] ?? '';
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

  protected async kirim(e: Event): Promise<void> {
    e.preventDefault();
    this.galat.set('');
    if (!this.token().trim() || !this.nama().trim() || !this.email().trim()) {
      this.galat.set('Token, nama lengkap, dan email wajib diisi.');
      return;
    }
    this.memproses.set(true);
    try {
      await this.api.masuk({
        email: this.email().trim(),
        token: this.token().trim(),
        jenis_tes: this.tes() as JenisTes,
        nama: this.nama().trim(),
      });
      await this.pengerjaan.muatInfo();
      await this.router.navigateByUrl('/tes/instruksi');
    } catch (galat) {
      this.galat.set(
        statusGalat(galat) === 401
          ? 'Token atau email tidak sesuai, token sudah dipakai, token bukan untuk tes ini, atau di luar jadwal tes. Hubungi tim HC bila perlu.'
          : pesanGalat(galat),
      );
    } finally {
      this.memproses.set(false);
    }
  }
}
