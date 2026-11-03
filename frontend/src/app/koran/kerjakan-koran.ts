import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { PengerjaanService } from '../core/pengerjaan.service';
import { LajurKoran } from './lajur-koran';

const LAYAR_SEMPIT = '(max-width: 640px)';

/**
 * Tes Koran sebenarnya: ketat satu per satu dari atas ke bawah, lajur 1 sampai 4, halaman 1 sampai 13.
 * Hanya satu kotak aktif. Enter pada kotak berisi mengunci jawaban (dengan waktu_ms) dan pindah ke kotak
 * berikutnya; di layar sempit satu digit langsung mengunci. Tidak bisa kembali ke halaman sebelumnya.
 * Tidak ada indikator benar/salah.
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
        <div class="kertas-koran">
          @for (l of lajurTampil(); track l.lajur) {
            <app-lajur-koran [judul]="'Lajur ' + l.posisi" [angka]="l.angka" [isi]="l.isi" [aktif]="l.aktif"
                             [isiAktif]="isiAktif()" (ketik)="ketik($event)" (enter)="kunci()" />
          }
        </div>
        <div class="kaki-koran">
          <p class="teks-redup teks-kecil">
            Jumlahkan dua angka yang mengapit kotak, tulis digit terakhirnya. Isi satu kotak, lalu tekan <strong>Enter</strong>
            untuk lanjut ke kotak berikutnya. Kotak tidak dapat dilewati, dan jawaban yang sudah ditinggalkan tidak dapat diubah.
            Di layar kecil, kotak pindah otomatis setelah Anda mengisi angka. Setelah semua kotak di halaman ini terisi,
            tekan tombol {{ halamanTerakhir() ? 'Kirim jawaban' : 'Halaman berikutnya' }}.
          </p>
          <button type="button" class="tombol tombol-navy" [disabled]="!halamanPenuh()" (click)="berikutnya()">
            {{ halamanTerakhir() ? 'Kirim jawaban' : 'Halaman berikutnya' }}
          </button>
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
  protected readonly isiAktif = signal('');

  protected readonly halamanTerakhir = computed(() => this.halaman() === (this.susunan()?.soal.halaman ?? 0));
  /** Semua kotak di halaman ini sudah terisi. */
  protected readonly halamanPenuh = computed(() => {
    const s = this.susunan();
    return !!s && this.terakhir() >= s.nomorTerakhirHalaman(this.halaman());
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

  protected ketik(digit: string): void {
    this.isiAktif.set(digit);
    if (digit && window.matchMedia(LAYAR_SEMPIT).matches) this.kunci();
  }

  /** Enter: kunci isi kotak aktif. Kotak kosong tidak berpindah. */
  protected kunci(): void {
    const digit = this.isiAktif();
    const s = this.susunan();
    if (!digit || !s) return;
    const nomor = this.nomorAktif();
    // Kotak aktif harus ada di halaman ini (halaman penuh menunggu tombol halaman berikutnya).
    if (nomor > s.nomorTerakhirHalaman(this.halaman()) || nomor > s.total) return;
    if (this.pengerjaan.jawabKoran(nomor, digit)) this.isiAktif.set('');
  }

  protected async berikutnya(): Promise<void> {
    if (!this.halamanPenuh()) return;
    this.pengerjaan.simpanKoranSekarang();
    if (this.halamanTerakhir()) {
      await this.router.navigateByUrl('/tes/kirim');
      return;
    }
    this.halaman.update((h) => h + 1);
    window.scrollTo({ top: 0 });
  }
}
