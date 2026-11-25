import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Ikon } from '../core/ikon';

/** Halaman yang belum dapat diakses (gaya di styles/_landing.scss). */
@Component({
  selector: 'app-belum-tersedia',
  imports: [RouterLink, Ikon],
  template: `
    <main class="layar-gelap belum-tersedia">
      <div class="layar-titik" aria-hidden="true"></div>
      <div class="belum-isi">
        <div class="belum-lencana"><app-ikon nama="clock" [ukuran]="40" /></div>
        <h1>Belum tersedia</h1>
        <p>
          Halaman ini belum dapat diakses. Hubungi pengawas atau tim HC jika Anda memerlukan
          bantuan.
        </p>
        <a class="belum-kembali" routerLink="/">Kembali</a>
      </div>
    </main>
  `,
})
export class BelumTersedia {}
