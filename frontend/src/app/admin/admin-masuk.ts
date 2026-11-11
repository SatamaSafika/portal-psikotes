import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { pesanGalat, statusGalat } from '../core/api.service';
import { Ikon } from '../core/ikon';
import { Ilustrasi } from '../bersama/ilustrasi';
import { TandaProduk } from '../bersama/tanda-produk';
import { ApiAdmin } from './admin-api.service';
import { AdminSesi } from './admin-sesi.service';

/**
 * Login admin HC (prototipe v50, HcLogin): kiri panel ilustrasi bergradien navy, kanan kartu kaca.
 * Di layar sempit panel menumpuk di atas formulir. Batas percobaan dan penguncian akun ditegakkan di server.
 */
@Component({
  selector: 'app-admin-masuk',
  imports: [Ikon, Ilustrasi, TandaProduk],
  template: `
    <div class="tata-masuk">
      <section class="panel-masuk">
        <span class="merek merek-putih"><app-tanda-produk [putih]="true" />Portal Psikotes</span>
        <div class="panel-masuk-isi">
          <div class="panel-masuk-teks">
            <span class="chip-panel">Dashboard HC</span>
            <p class="panel-masuk-judul">Dari token sampai laporan,<br /><span class="aksen-panel">semuanya terpantau.</span></p>
            <ol class="alur-panel" aria-label="Alur kerja">
              <li><span class="ikon-alur"><app-ikon nama="calendar-days" [ukuran]="18" /></span>Siapkan sesi</li>
              <li><span class="ikon-alur"><app-ikon nama="users" [ukuran]="18" /></span>Pantau peserta</li>
              <li><span class="ikon-alur"><app-ikon nama="printer" [ukuran]="18" /></span>Cetak laporan</li>
            </ol>
          </div>
          <app-ilustrasi varian="hclogin" />
        </div>
      </section>
      <main class="sisi-masuk">
        <form class="kaca kartu-masuk" (submit)="masuk($event)" novalidate>
          <div class="kepala-kartu-masuk">
            <span class="ubin-ikon kecil"><app-ikon class="ikon-cermin" nama="key" [ukuran]="22" /></span>
            <h1>Masuk admin HC</h1>
          </div>
          <label class="isian">
              <span>Username</span>
              <input name="username" autocomplete="username" [value]="username()" (input)="username.set(nilai($event))" />
            </label>
            <label class="isian">
              <span>Kata sandi</span>
              <input name="password" type="password" autocomplete="current-password"
                     [value]="password()" (input)="password.set(nilai($event))" />
            </label>
            @if (galat()) {
              <div class="kotak-galat" role="alert">{{ galat() }}</div>
            }
            <button class="tombol tombol-navy tombol-penuh" type="submit" [disabled]="memproses()">
              {{ memproses() ? 'Memeriksa...' : 'Masuk' }}
            </button>
        </form>
      </main>
    </div>
  `,
})
export class AdminMasuk {
  private readonly api = inject(ApiAdmin);
  private readonly sesi = inject(AdminSesi);
  private readonly router = inject(Router);
  protected readonly username = signal('');
  protected readonly password = signal('');
  protected readonly galat = signal('');
  protected readonly memproses = signal(false);

  protected nilai(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }

  protected async masuk(e: Event): Promise<void> {
    e.preventDefault();
    this.galat.set('');
    if (!this.username().trim() || !this.password()) {
      this.galat.set('Username dan kata sandi wajib diisi.');
      return;
    }
    this.memproses.set(true);
    try {
      const r = await this.api.masuk(this.username().trim(), this.password());
      this.sesi.username.set(r.username);
      this.password.set('');
      await this.router.navigateByUrl('/admin');
    } catch (galat) {
      this.galat.set(statusGalat(galat) === 401 ? 'Username atau kata sandi salah.' : pesanGalat(galat));
    } finally {
      this.memproses.set(false);
    }
  }
}
