import { Component, input } from '@angular/core';

const LANGKAH = ['Pilih tes', 'Verifikasi', 'Instruksi', 'Latihan', 'Tes', 'Selesai'];

/** Header portal: nama netral "Portal Psikotes" (tanpa nama atau logo perusahaan) dan stepper alur peserta. */
@Component({
  selector: 'app-kepala-portal',
  template: `
    <header class="kepala">
      <div class="wadah kepala-isi">
        <span class="merek">Portal Psikotes</span>
        @if (langkah()) {
          <ol class="stepper" aria-label="Langkah">
            @for (nama of daftar; track nama; let i = $index) {
              <li [class.aktif]="i + 1 === langkah()" [attr.aria-current]="i + 1 === langkah() ? 'step' : null">
                {{ i + 1 }} {{ nama }}
              </li>
            }
          </ol>
        } @else if (keterangan()) {
          <span class="teks-redup teks-kecil">{{ keterangan() }}</span>
        }
      </div>
    </header>
  `,
})
export class KepalaPortal {
  /** 1 sampai 6; kosong = tanpa stepper. */
  readonly langkah = input<number | null>(null);
  /** Teks kecil di kanan bila tanpa stepper (mis. nama tes). */
  readonly keterangan = input<string | null>(null);
  protected readonly daftar = LANGKAH;
}
