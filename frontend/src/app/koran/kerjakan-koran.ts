import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { PengerjaanService } from '../core/pengerjaan.service';
import { LajurKoran } from './lajur-koran';

/**
 * Tes Koran sebenarnya: ketat satu per satu dari atas ke bawah, lajur 1 sampai 4, halaman 1 sampai 13.
 * Hanya satu kotak aktif. Satu angka langsung terkunci (dengan waktu_ms) dan pindah ke kotak berikutnya, tanpa Enter;
 * kotak terakhir sebuah halaman langsung membuka halaman berikutnya (revisi HC 5 November 2026).
 * Kotak terakhir halaman 13 membuka layar konfirmasi kirim. Tidak ada indikator benar/salah.
 */
@Component({
  selector: 'app-kerjakan-koran',
  imports: [LajurKoran],
  template: `
    @if (susunan(); as s) {
      <div class="wadah area-koran">
        <div class="info-halaman">
          <strong>Halaman {{ halaman() }} dari {{ s.soal.halaman }}</strong>
          <span class="teks-redup">Terjawab {{ terakhir() }} dari {{ s.total }} soal</span>
        </div>
        <div class="kotak-peringatan peringatan-koran" role="note">
          <strong>Perhatian:</strong> satu angka yang Anda ketik langsung terkunci dan tidak dapat diubah. Kursor pindah otomatis
          ke kotak berikutnya, tanpa menekan Enter, dan halaman yang sudah lewat tidak dapat dibuka lagi.
        </div>
        <div class="kertas-koran">
          @for (l of lajurTampil(); track l.lajur) {
            <app-lajur-koran [judul]="'Lajur ' + l.posisi" [angka]="l.angka" [isi]="l.isi" [aktif]="l.aktif" (ketik)="ketik($event)" />
          }
        </div>
        <div class="kaki-koran">
          <p class="teks-redup teks-kecil">
            Jumlahkan dua angka yang mengapit kotak, lalu ketik angka terakhirnya saja: untuk hasil 12, ketik 2.
            Kotak tidak dapat dilewati. Setelah kotak terakhir di halaman ini terisi, halaman berikutnya terbuka otomatis.
          </p>
          <!-- Hanya setelah kembali dari layar konfirmasi atau memuat ulang: semua kotak sudah terisi. -->
          @if (selesaiSemua()) {
            <button type="button" class="tombol tombol-navy" (click)="keKonfirmasi()">Kirim jawaban</button>
          }
        </div>
      </div>
    }
  `,
})
export class KerjakanKoran {
  private readonly pengerjaan = inject(PengerjaanService);
  private readonly router = inject(Router);

  protected readonly susunan = this.pengerjaan.susunanKoran;
  /** Nomor terakhir yang sudah dikunci (jawaban Koran selalu berurutan tanpa celah). */
  protected readonly terakhir = computed(() => {
    let m = 0;
    for (const [nomor, nilai] of this.pengerjaan.jawaban()) if (nilai !== null && nomor > m) m = nomor;
    return m;
  });
  protected readonly nomorAktif = computed(() => this.terakhir() + 1);
  protected readonly halaman = signal(1);
  /** Semua kotak tes sudah terisi. */
  protected readonly selesaiSemua = computed(() => {
    const s = this.susunan();
    return !!s && this.terakhir() >= s.total;
  });
  protected readonly lajurTampil = computed(() => {
    const s = this.susunan();
    const soal = this.pengerjaan.soalKoran();
    if (!s || !soal) return [];
    const jawaban = this.pengerjaan.jawaban();
    const aktif = this.nomorAktif();
    return s.lajurDiHalaman(this.halaman()).map((lajur, i) => {
      const isi: (string | null)[] = [];
      let indeksAktif = -1;
      for (let k = 1; k <= s.kotakPerLajur; k++) {
        const nomor = s.nomor(lajur, k);
        isi.push(jawaban.get(nomor) ?? null);
        if (nomor === aktif) indeksAktif = k - 1;
      }
      return { lajur, posisi: i + 1, angka: soal.lajur[lajur - 1], isi, aktif: indeksAktif };
    });
  });

  constructor() {
    // Setelah soal dan jawaban dimuat (termasuk setelah refresh): buka halaman tempat kotak aktif berada.
    let dipulihkan = false;
    effect(() => {
      const s = this.susunan();
      if (!s || dipulihkan) return;
      dipulihkan = true;
      this.halaman.set(s.halamanPulih(untracked(this.terakhir)));
    });
  }

  /** Satu angka: kunci kotak aktif, lalu pindah halaman bila kotak itu yang terakhir di halamannya. */
  protected ketik(digit: string): void {
    const s = this.susunan();
    if (!s) return;
    const nomor = this.nomorAktif();
    if (nomor > s.total || !this.pengerjaan.jawabKoran(nomor, digit)) return;
    if (nomor < s.nomorTerakhirHalaman(this.halaman())) return;
    this.pengerjaan.simpanKoranSekarang();
    if (nomor === s.total) {
      void this.keKonfirmasi();
      return;
    }
    this.halaman.update((h) => h + 1);
    window.scrollTo({ top: 0 });
  }

  protected async keKonfirmasi(): Promise<void> {
    this.pengerjaan.simpanKoranSekarang();
    await this.router.navigateByUrl('/tes/kirim');
  }
}
