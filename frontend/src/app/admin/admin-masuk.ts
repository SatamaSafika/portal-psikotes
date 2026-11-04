import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { pesanGalat, statusGalat } from '../core/api.service';
import { KakiPortal } from '../tata-letak/kaki-portal';
import { ApiAdmin } from './admin-api.service';
import { AdminSesi } from './admin-sesi.service';

/** Login admin HC. Batas percobaan dan penguncian akun ditegakkan di server. */
@Component({
  selector: 'app-admin-masuk',
  imports: [KakiPortal],
  template: `
    <div class="halaman">
      <header class="kepala-admin">
        <div class="wadah kepala-admin-isi"><strong>Portal Psikotes · Dashboard HC</strong></div>
      </header>
      <main class="isi-halaman">
        <div class="wadah wadah-sempit">
          <h1 class="judul">Masuk admin HC</h1>
          <form class="kartu" (submit)="masuk($event)" novalidate>
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
            <div class="baris-tombol">
              <button class="tombol tombol-navy" type="submit" [disabled]="memproses()">
                {{ memproses() ? 'Memeriksa...' : 'Masuk' }}
              </button>
            </div>
          </form>
        </div>
      </main>
      <app-kaki-portal />
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
