import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { pesanGalat } from '../core/api.service';
import { Ikon } from '../core/ikon';
import { LABEL_TES_PESERTA } from '../core/model';
import { jumlahDijawab } from '../core/navigasi';
import { PengerjaanService } from '../core/pengerjaan.service';
import { formatSisa } from '../core/waktu';
import { KakiPortal } from '../tata-letak/kaki-portal';
import { KepalaPortal } from '../tata-letak/kepala-portal';

/** Konfirmasi kirim. Waktu tetap berjalan; bila habis di halaman ini, jawaban terkirim otomatis. */
@Component({
  selector: 'app-kirim',
  imports: [RouterLink, KepalaPortal, KakiPortal, Ikon],
  template: `
    <div class="halaman">
      <app-kepala-portal [keterangan]="labelTes() + ' · Sisa waktu ' + sisa()" />
      <main class="isi-halaman">
        <div class="wadah wadah-sempit">
          <span class="ubin-ikon besar ubin-judul"><app-ikon nama="send" [ukuran]="28" /></span>
          <h1 class="judul">Kirim jawaban sekarang?</h1>
          <div class="kartu">
            <div class="statistik">
              <div><span class="teks-kecil">Sudah dijawab</span><span class="nilai">{{ dijawab() }}</span></div>
              <div class="oranye">
                <span class="teks-kecil">Belum dijawab</span><span class="nilai">{{ total() - dijawab() }}</span>
              </div>
            </div>
            <p class="teks-redup">
              Dari {{ total() }} {{ satuan() }}. Setelah dikirim, jawaban tidak dapat diubah. Soal yang belum dijawab dianggap kosong.
            </p>
            @if (galat()) {
              <div class="kotak-galat" role="alert">{{ galat() }}</div>
            }
            <div class="baris-tombol">
              <button class="tombol tombol-utama" type="button" [disabled]="mengirim() || !siap()" (click)="kirim()">
                {{ mengirim() ? 'Mengirim...' : 'Ya, kirim jawaban' }}
              </button>
              <a class="tombol tombol-garis" routerLink="/tes/kerjakan">Kembali ke soal</a>
            </div>
          </div>
        </div>
      </main>
      <app-kaki-portal />
    </div>
  `,
})
export class Kirim implements OnInit {
  private readonly pengerjaan = inject(PengerjaanService);
  protected readonly labelTes = computed(() => {
    const i = this.pengerjaan.info();
    return i ? LABEL_TES_PESERTA[i.jenis_tes] : '';
  });
  protected readonly sisa = computed(() => formatSisa(this.pengerjaan.sisaDetik() ?? 0));
  /** TIU 5: 30 soal; TIU 6: 40 butir. */
  protected readonly total = computed(() => this.pengerjaan.info()?.jumlah_nomor ?? 0);
  protected readonly satuan = computed(() => (this.pengerjaan.info()?.jenis_tes === 'TIU6' ? 'butir' : 'soal'));
  protected readonly dijawab = computed(() => jumlahDijawab(this.total(), this.pengerjaan.jawaban()));
  protected readonly siap = signal(false);
  protected readonly mengirim = signal(false);
  protected readonly galat = signal('');

  async ngOnInit(): Promise<void> {
    try {
      // Setelah refresh: pulihkan jawaban dan hitung mundur dari server.
      await this.pengerjaan.siapkanPengerjaan();
      this.siap.set(true);
    } catch (galat) {
      this.galat.set(pesanGalat(galat));
    }
  }

  protected async kirim(): Promise<void> {
    this.mengirim.set(true);
    this.galat.set('');
    try {
      await this.pengerjaan.kirim();
    } catch (galat) {
      this.galat.set(galat instanceof Error && !('status' in galat) ? galat.message : pesanGalat(galat));
      this.mengirim.set(false);
    }
  }
}
