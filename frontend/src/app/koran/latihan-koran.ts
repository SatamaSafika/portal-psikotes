import { Component, computed, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { inject } from '@angular/core';
import { LATIHAN_KORAN, kunciKoran } from './latihan';
import { LajurKoran, type TandaKotak } from './lajur-koran';

/** "2 + 3 = 5, tulis 5" untuk setiap kotak contoh. */
function keterangan(angka: number[]): string[] {
  return angka.slice(0, -1).map((a, i) => {
    const jumlah = a + angka[i + 1];
    return `${a} + ${angka[i + 1]} = ${jumlah}, tulis ${jumlah % 10}`;
  });
}

/**
 * Latihan Koran: contoh 1 (hasil 9 atau kurang), contoh 2 (hasil lebih dari 9), uji coba satu lajur.
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

  // Uji coba: aturan sama dengan tes (berurutan, satu digit langsung terkunci).
  protected readonly ujiCoba = LATIHAN_KORAN.ujiCoba;
  private readonly kunciUji = kunciKoran(this.ujiCoba).map(String);
  protected readonly isiUji = signal<(string | null)[]>(this.kunciUji.map(() => null));
  protected readonly aktifUji = signal(0);
  protected readonly ujiSelesai = signal(false);
  protected readonly tandaUji = computed<TandaKotak[]>(() =>
    this.ujiSelesai() ? this.isiUji().map((x, i) => (x === this.kunciUji[i] ? 'benar' : 'salah')) : [],
  );
  protected readonly jumlahBenar = computed(() => this.tandaUji().filter((t) => t === 'benar').length);
  protected readonly kunciTampil = this.kunciUji.join(', ');

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
