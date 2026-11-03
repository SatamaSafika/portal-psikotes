import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DAFTAR_TES, LABEL_TES } from '../core/model';
import { KakiPortal } from '../tata-letak/kaki-portal';
import { KepalaPortal } from '../tata-letak/kepala-portal';

/** Halaman awal: hanya judul dan pilihan tes, tanpa deskripsi (revisi HC 2 November 2026). */
@Component({
  selector: 'app-pilih-tes',
  imports: [RouterLink, KepalaPortal, KakiPortal],
  template: `
    <div class="halaman">
      <app-kepala-portal />
      <section class="sampul">
        <div class="wadah"><h1 class="judul">Pilih tes yang akan Anda ikuti</h1></div>
      </section>
      <main class="isi-halaman">
        <div class="wadah daftar-tes">
          @for (tes of daftar; track tes; let i = $index) {
            <div class="kartu" [class.lebar]="tes === 'KORAN'">
              <span class="label-tes">Tes {{ i + 1 }}</span>
              <h2>{{ label[tes] }}</h2>
              <a class="tombol tombol-navy tombol-penuh" [routerLink]="['/masuk', tes]">Pilih {{ tes === 'KORAN' ? 'Tes Koran' : label[tes] }}</a>
            </div>
          }
        </div>
      </main>
      <div class="pita-bantuan"><div class="wadah">Belum memiliki token atau mengalami kendala? Hubungi tim HC.</div></div>
      <app-kaki-portal />
    </div>
  `,
})
export class PilihTes {
  protected readonly daftar = DAFTAR_TES;
  protected readonly label = LABEL_TES;
}
