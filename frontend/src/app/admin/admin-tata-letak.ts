import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { KakiPortal } from '../tata-letak/kaki-portal';
import { ApiAdmin } from './admin-api.service';
import { AdminSesi } from './admin-sesi.service';

/** Kerangka dashboard HC: header navy, tiga tab, footer. Tanpa nama dan logo perusahaan. */
@Component({
  selector: 'app-admin-tata-letak',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, KakiPortal],
  template: `
    <div class="halaman">
      <header class="kepala-admin">
        <div class="wadah wadah-lebar kepala-admin-isi">
          <strong>Portal Psikotes · Dashboard HC</strong>
          <span class="akun-admin">
            {{ sesi.username() ?? 'Admin HC' }}
            <button type="button" class="tombol-keluar" (click)="keluar()">Keluar</button>
          </span>
        </div>
      </header>
      <nav class="tab-admin" aria-label="Menu dashboard">
        <div class="wadah wadah-lebar">
          <a routerLink="/admin" routerLinkActive="aktif" [routerLinkActiveOptions]="{ exact: true }">Overview</a>
          <a routerLink="/admin/token" routerLinkActive="aktif">Token dan jadwal</a>
          <a routerLink="/admin/hasil" routerLinkActive="aktif">Hasil dan laporan</a>
        </div>
      </nav>
      <main class="isi-halaman">
        <div class="wadah wadah-lebar"><router-outlet /></div>
      </main>
      <app-kaki-portal [lebar]="true" />
    </div>
  `,
})
export class AdminTataLetak {
  private readonly api = inject(ApiAdmin);
  private readonly router = inject(Router);
  protected readonly sesi = inject(AdminSesi);

  protected async keluar(): Promise<void> {
    try {
      await this.api.keluar();
    } finally {
      this.sesi.bersihkan();
      await this.router.navigateByUrl('/admin/masuk');
    }
  }
}
