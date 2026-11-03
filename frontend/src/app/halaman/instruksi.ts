import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { pesanGalat } from '../core/api.service';
import { LABEL_TES } from '../core/model';
import { PengerjaanService } from '../core/pengerjaan.service';
import { formatDurasi } from '../core/waktu';
import { KakiPortal } from '../tata-letak/kaki-portal';
import { KepalaPortal } from '../tata-letak/kepala-portal';

/** Instruksi: durasi dan jumlah soal dari server, teks instruksi dari bank soal (tidak ditulis di front-end). */
@Component({
  selector: 'app-instruksi',
  imports: [RouterLink, KepalaPortal, KakiPortal],
  template: `
    <div class="halaman">
      <app-kepala-portal [langkah]="3" />
      <main class="isi-halaman">
        <div class="wadah wadah-sedang">
          <span class="label-tes">{{ labelTes() }}</span>
          <h1 class="judul">Instruksi pengerjaan</h1>
          <div class="kartu">
            @if (info(); as i) {
              <div class="statistik">
                <div><span class="teks-kecil">Durasi</span><span class="nilai">{{ durasi() }}</span></div>
                @if (i.jenis_tes === 'KORAN') {
                  <div><span class="teks-kecil">Jumlah halaman</span><span class="nilai">{{ i.jumlah_halaman }} halaman</span></div>
                } @else {
                  <div><span class="teks-kecil">Jumlah soal</span><span class="nilai">{{ jumlahSoal() }}</span></div>
                }
              </div>
            }
            @if (instruksi()) {
              <p class="instruksi">{{ instruksi() }}</p>
            }
            @if (galat()) {
              <div class="kotak-galat" role="alert">{{ galat() }}</div>
            }
            @if (info()?.jenis_tes === 'KORAN') {
              <p>
                Anda akan diberi daftar penjumlahan dua angka. Kerjakan secepat dan seteliti mungkin, dan jawablah
                sebanyak-banyaknya dengan tepat dalam waktu yang tersedia.
              </p>
              <ol>
                <li>Jumlahkan dua angka yang mengapit kotak, lalu tulis angka terakhir dari hasilnya.</li>
                <li>Kerjakan berurutan dari atas ke bawah. Tekan Enter untuk lanjut ke kotak berikutnya. Kotak tidak dapat dilewati dan Anda tidak dapat kembali ke halaman sebelumnya.</li>
                <li>Sebelum tes ada 2 contoh dan 1 uji coba. Uji coba tidak dinilai dan jawabannya tidak disimpan.</li>
                <li>Pada tes sebenarnya tidak muncul indikator benar atau salah. Peserta dimohon fokus mengerjakan soal dengan cepat, teliti, dan akurat.</li>
                <li>Waktu berjalan saat tes dimulai dan tidak dapat dihentikan. Jawaban dikirim otomatis saat waktu habis.</li>
              </ol>
              <div class="baris-tombol">
                <a class="tombol tombol-utama" routerLink="/tes/latihan">Saya sudah membaca, lihat contoh</a>
                <a class="tombol-tautan" routerLink="/">Kembali</a>
              </div>
            } @else {
            <ol>
              <li>Anda akan mengerjakan 2 soal latihan lebih dulu. Kunci jawaban langsung ditampilkan setelah Anda menjawab.</li>
              <li>Pada tes, Anda boleh melewati soal, tidak mengisi, dan mengubah jawaban sebelum mengirim.</li>
              <li>Waktu mulai berjalan saat tes dimulai dan tidak dapat dihentikan.</li>
              <li>Jawaban dikirim otomatis saat waktu habis.</li>
            </ol>
            <div class="baris-tombol">
              <a class="tombol tombol-utama" routerLink="/tes/latihan">Saya sudah membaca, mulai latihan</a>
              <a class="tombol-tautan" routerLink="/">Kembali</a>
            </div>
            }
          </div>
        </div>
      </main>
      <app-kaki-portal />
    </div>
  `,
})
export class Instruksi implements OnInit {
  private readonly pengerjaan = inject(PengerjaanService);
  private readonly router = inject(Router);
  protected readonly info = this.pengerjaan.info;
  protected readonly instruksi = signal<string | null>(null);
  protected readonly galat = signal('');

  protected readonly labelTes = computed(() => {
    const i = this.info();
    return i ? LABEL_TES[i.jenis_tes] : '';
  });
  protected readonly durasi = computed(() => formatDurasi(this.info()?.durasi_detik ?? 0));
  protected readonly jumlahSoal = computed(() => {
    const i = this.info();
    if (!i) return '';
    return i.jenis_tes === 'TIU6' ? `${i.jumlah_soal} soal (${i.jumlah_nomor} butir)` : `${i.jumlah_soal} soal`;
  });

  async ngOnInit(): Promise<void> {
    if (this.pengerjaan.sudahMulai()) {
      await this.router.navigateByUrl('/tes/kerjakan');
      return;
    }
    if (this.info()?.jenis_tes === 'KORAN') return; // instruksi Koran tetap di halaman ini
    try {
      this.instruksi.set((await this.pengerjaan.muatLatihan()).instruksi);
    } catch (galat) {
      this.galat.set(pesanGalat(galat));
    }
  }
}
