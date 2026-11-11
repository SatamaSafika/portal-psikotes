import { Component, computed, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { inject } from '@angular/core';
import { LAJUR_UJI_COBA, LATIHAN_KORAN, kunciKoran } from './latihan';
import { LajurKoran, type TandaKotak } from './lajur-koran';

/** "2 + 3 = 5, tulis 5" untuk setiap kotak contoh. */
function keterangan(angka: number[]): string[] {
  return angka.slice(0, -1).map((a, i) => {
    const jumlah = a + angka[i + 1];
    return `${a} + ${angka[i + 1]} = ${jumlah}, tulis ${jumlah % 10}`;
  });
}

/**
 * Latihan Koran: contoh 1 (hasil 9 atau kurang), contoh 2 (hasil lebih dari 9), uji coba dua lajur.
 * Lajur kedua hanya ada di latihan; susunan dan aturan tes utama tidak berubah.
 * Angka latihan dari latihan.ts (bukan bank soal), jadi kuncinya boleh dihitung di browser.
 * Tidak dinilai, tidak disimpan, tidak dicatat waktunya.
 */
@Component({
  selector: 'app-latihan-koran',
  imports: [LajurKoran, RouterLink],
  templateUrl: './latihan-koran.html',
})
export class LatihanKoran {
  private readonly router = inject(Router);

  protected readonly langkah = signal<1 | 2 | 3>(1);

  protected readonly contoh1 = LATIHAN_KORAN.contoh1;
  protected readonly contoh2 = LATIHAN_KORAN.contoh2;
  protected readonly isiContoh1 = kunciKoran(this.contoh1).map(String);
  protected readonly isiContoh2 = kunciKoran(this.contoh2).map(String);
  protected readonly ketContoh1 = keterangan(this.contoh1);
  protected readonly ketContoh2 = keterangan(this.contoh2);

  // Uji coba dua lajur: aturan sama dengan tes (berurutan dari lajur 1 ke lajur 2, satu digit langsung terkunci).
  // Indeks kotak dihitung datar di semua lajur, seperti nomor pada tes.
  private readonly kunciPerLajur = LAJUR_UJI_COBA.map((angka) => kunciKoran(angka).map(String));
  private readonly kunciUji = this.kunciPerLajur.flat();
  protected readonly isiUji = signal<(string | null)[]>(this.kunciUji.map(() => null));
  protected readonly aktifUji = signal(0);
  protected readonly ujiSelesai = signal(false);
  protected readonly tandaUji = computed<TandaKotak[]>(() =>
    this.ujiSelesai() ? this.isiUji().map((x, i) => (x === this.kunciUji[i] ? 'benar' : 'salah')) : [],
  );
  protected readonly jumlahBenar = computed(() => this.tandaUji().filter((t) => t === 'benar').length);
  protected readonly kunciTampil = this.kunciPerLajur.map((k, i) => `lajur ${i + 1}: ${k.join(', ')}`).join('; ');

  /** Tampilan per lajur: angka, isi, kotak aktif lokal, dan tanda benar/salah setelah selesai. */
  protected readonly lajurUji = computed(() => {
    let awal = 0;
    return LAJUR_UJI_COBA.map((angka, i) => {
      const n = angka.length - 1;
      const aktif = this.aktifUji() - awal;
      const lajur = {
        judul: `Lajur uji coba ${i + 1}`,
        angka,
        isi: this.isiUji().slice(awal, awal + n),
        aktif: aktif >= 0 && aktif < n ? aktif : -1,
        tanda: this.tandaUji().slice(awal, awal + n),
      };
      awal += n;
      return lajur;
    });
  });

  /** Satu angka langsung terkunci dan pindah ke kotak berikutnya, sama dengan tes. */
  protected ketik(digit: string): void {
    const i = this.aktifUji();
    if (i < 0 || this.ujiSelesai()) return;
    this.isiUji.update((x) => x.map((v, k) => (k === i ? digit : v)));
    this.aktifUji.set(i + 1 < this.kunciUji.length ? i + 1 : -1);
  }

  protected selesaiUji(): void {
    this.ujiSelesai.set(true);
    this.aktifUji.set(-1);
  }

  protected ulangiUji(): void {
    this.isiUji.set(this.kunciUji.map(() => null));
    this.aktifUji.set(0);
    this.ujiSelesai.set(false);
  }

  protected async mulaiTes(): Promise<void> {
    await this.router.navigateByUrl('/tes/kerjakan');
  }
}
