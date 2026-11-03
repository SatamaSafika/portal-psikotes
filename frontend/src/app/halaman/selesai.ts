import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { KakiPortal } from '../tata-letak/kaki-portal';
import { KepalaPortal } from '../tata-letak/kepala-portal';

/** Selesai. Tidak ada skor yang ditampilkan ke peserta. */
@Component({
  selector: 'app-selesai',
  imports: [RouterLink, KepalaPortal, KakiPortal],
  template: `
    <div class="halaman">
      <app-kepala-portal [langkah]="6" />
      <main class="isi-halaman">
        <div class="wadah wadah-sempit tengah">
          <div class="lingkaran-selesai" aria-hidden="true">✓</div>
          <h1 class="judul judul-tengah">Tes selesai</h1>
          @if (alasan() === 'waktu') {
            <p class="kotak-peringatan">Waktu pengerjaan habis. Jawaban Anda telah dikirim otomatis.</p>
          }
          <p class="teks-redup">Jawaban Anda telah tersimpan. Terima kasih telah mengikuti tes. Tim HC akan menindaklanjuti hasilnya.</p>
          <a class="tombol tombol-garis" routerLink="/">Kembali ke halaman utama</a>
        </div>
      </main>
      <app-kaki-portal />
    </div>
  `,
})
export class Selesai {
  /** Dari ?alasan=waktu */
  readonly alasan = input<string | undefined>();
}
