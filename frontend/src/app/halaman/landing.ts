import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TandaProduk } from '../bersama/tanda-produk';
import { tujuanPintasan } from '../core/pintasan';

/** Layar awal portal: logo, judul, dan animasi saja (gaya di styles/_landing.scss). */
@Component({
  selector: 'app-landing',
  imports: [TandaProduk],
  host: { '(document:keydown)': 'tekan($event)' },
  template: `
    <main class="layar-gelap landing">
      <div class="layar-titik" aria-hidden="true"></div>
      <div class="landing-cahaya" aria-hidden="true"></div>
      <svg class="landing-cincin" aria-hidden="true" focusable="false" viewBox="0 0 520 520">
        <g class="landing-orbit" fill="none" stroke="#8FB4F5">
          <circle cx="260" cy="260" r="250" stroke-opacity=".2" />
          <circle
            cx="260"
            cy="260"
            r="190"
            stroke-opacity=".26"
            stroke-dasharray="2 9"
            stroke-linecap="round"
            stroke-width="2"
          />
          <circle cx="260" cy="10" r="9" fill="#CB642B" stroke="none" />
          <circle cx="450" cy="260" r="6" fill="#8FB4F5" stroke="none" />
        </g>
        <g class="landing-orbit balik" fill="none" stroke="#8FB4F5">
          <circle cx="260" cy="260" r="130" stroke-opacity=".3" />
          <circle
            cx="260"
            cy="260"
            r="70"
            stroke-opacity=".35"
            stroke-dasharray="2 7"
            stroke-linecap="round"
            stroke-width="2"
          />
          <circle cx="130" cy="260" r="7" fill="#8FB4F5" stroke="none" />
          <circle cx="260" cy="190" r="5" fill="#CB642B" stroke="none" />
        </g>
      </svg>
      <div class="landing-isi">
        <app-tanda-produk class="landing-logo" [ukuran]="96" [putih]="true" />
        <h1 class="landing-judul">
          <span class="kata">Portal</span>&ngsp;<span class="kata kilau">Psikotes</span>
        </h1>
        <div class="landing-garis" aria-hidden="true"></div>
      </div>
    </main>
  `,
})
export class Landing {
  private readonly router = inject(Router);

  protected tekan(e: KeyboardEvent): void {
    const tujuan = tujuanPintasan(e);
    if (tujuan) void this.router.navigateByUrl(tujuan);
  }
}
