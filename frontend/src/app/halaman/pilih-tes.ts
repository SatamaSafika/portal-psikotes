import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Ilustrasi } from '../bersama/ilustrasi';
import { Ikon, type NamaIkon } from '../core/ikon';
import { DAFTAR_TES_PESERTA, LABEL_TES_PESERTA, type JenisTes } from '../core/model';
import { TesSelesai } from '../core/tes-selesai';
import { KakiPortal } from '../tata-letak/kaki-portal';
import { KepalaPortal } from '../tata-letak/kepala-portal';

const IKON_TES: Record<JenisTes, NamaIkon> = { KORAN: 'calculator', TIU5: 'shapes', TIU6: 'layers' };

/**
 * Halaman awal (prototipe v50, Main): hero dua kolom dengan ilustrasi, lalu tiga kartu tes dalam satu baris.
 * Revisi HC 10 November 2026: nama Tes 1-3 dan urutan Koran, TIU 5, TIU 6 (lihat DAFTAR_TES_PESERTA).
 * Kartu tanpa keterangan jenis tes (permintaan pemilik proyek 11 November 2026).
 * Seluruh kartu satu tautan ke halaman token tes itu. Tes yang sudah dikirim dari tab ini tampil redup dengan
 * label Selesai dan tanpa tautan (penanda di sessionStorage, tanpa identitas; token tetap sekali pakai di server).
 * Tautan "Peserta lain" untuk komputer yang dipakai bergantian.
 */
@Component({
  selector: 'app-pilih-tes',
  imports: [RouterLink, KepalaPortal, KakiPortal, Ikon, Ilustrasi],
  template: `
    <div class="halaman">
      <app-kepala-portal />
      <main class="isi-halaman">
        <div class="wadah">
          <section class="hero">
            <div class="hero-teks">
              <h1 class="judul-hero">Pilih tes<br />yang akan<br /><span class="judul-gradien">Anda ikuti</span></h1>
              <p>Siapkan token dari pengawas atau tim HC. Setiap tes memiliki token dan jadwalnya sendiri.</p>
            </div>
            <app-ilustrasi varian="main" class="hero-ilustrasi" />
          </section>

          <section class="daftar-ubin" aria-label="Pilihan tes">
            @for (tes of daftar; track tes) {
              @let sudah = selesai.daftar().includes(tes);
              @if (sudah) {
                <div class="ubin-tes kaca sudah">
                  <div class="ubin-tes-kepala">
                    <span class="ubin-ikon"><app-ikon [nama]="ikon[tes]" [ukuran]="26" /></span>
                    <h2>{{ label[tes] }}</h2>
                  </div>
                  <span class="lencana SELESAI label-selesai"><app-ikon nama="circle-check" [ukuran]="14" />Selesai</span>
                </div>
              } @else {
                <a class="ubin-tes kaca" [routerLink]="['/masuk', tes]">
                  <div class="ubin-tes-kepala">
                    <span class="ubin-ikon"><app-ikon [nama]="ikon[tes]" [ukuran]="26" /></span>
                    <h2>{{ label[tes] }}</h2>
                  </div>
                  <span class="tautan-ubin">Pilih tes<app-ikon nama="arrow-right" [ukuran]="18" /></span>
                </a>
              }
            }
          </section>

          @if (selesai.daftar().length > 0) {
            <p class="teks-redup teks-kecil peserta-lain">
              Penanda Selesai hanya berlaku di browser ini.
              <button type="button" class="tombol-tautan" (click)="selesai.lupakan()">Peserta lain memakai komputer ini</button>
            </p>
          }
        </div>
      </main>
      <app-kaki-portal />
    </div>
  `,
})
export class PilihTes {
  protected readonly selesai = inject(TesSelesai);
  protected readonly daftar = DAFTAR_TES_PESERTA;
  protected readonly label = LABEL_TES_PESERTA;
  protected readonly ikon = IKON_TES;
}
