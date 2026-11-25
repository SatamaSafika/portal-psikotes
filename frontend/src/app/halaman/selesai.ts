import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Ilustrasi } from '../bersama/ilustrasi';
import { KakiPortal } from '../tata-letak/kaki-portal';
import { KepalaPortal } from '../tata-letak/kepala-portal';

/** Selesai (prototipe v50): lencana centang, judul, pesan terima kasih. Tidak ada skor yang ditampilkan ke peserta. */
@Component({
  selector: 'app-selesai',
  imports: [RouterLink, KepalaPortal, KakiPortal, Ilustrasi],
  template: `
    <div class="halaman">
      <app-kepala-portal />
      <main class="isi-halaman">
        <div class="wadah wadah-sempit tengah selesai">
          <app-ilustrasi varian="selesai" />
          <h1 class="judul">{{ alasan() === 'waktu' ? 'Waktu habis' : 'Tes selesai' }}</h1>
          @if (alasan() === 'waktu') {
            <p class="kotak-peringatan">Waktu pengerjaan habis. Jawaban Anda telah dikirim otomatis.</p>
          }
          <p class="teks-redup teks-selesai">Jawaban Anda telah tersimpan. Terima kasih telah mengikuti tes. Tim HC akan menindaklanjuti hasilnya.</p>
          <a class="tombol tombol-garis" routerLink="/operator">Kembali ke halaman utama</a>
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
