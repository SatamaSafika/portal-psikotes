import { Directive, ElementRef, OnInit, inject } from '@angular/core';
import { Component, input, output } from '@angular/core';
import { saringDigit } from '../core/koran';

/** Fokus otomatis ke kotak aktif setiap kali kotak itu dibuat (tidak mengandalkan tabindex). */
@Directive({ selector: '[appFokus]' })
export class Fokus implements OnInit {
  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef);
  ngOnInit(): void {
    // Setelah elemen masuk DOM.
    queueMicrotask(() => {
      this.el.nativeElement.focus({ preventScroll: true });
      this.el.nativeElement.scrollIntoView({ block: 'nearest' });
    });
  }
}

export type TandaKotak = 'benar' | 'salah' | null;

/**
 * Satu lajur Koran: angka bertumpuk dengan kotak di antara dua angka.
 * Hanya kotak aktif yang berupa <input>; kotak lain hanya tampilan (terkunci atau redup), jadi tidak bisa dilompati.
 */
@Component({
  selector: 'app-lajur-koran',
  imports: [Fokus],
  template: `
    @if (judul()) {
      <div class="lajur-judul">{{ judul() }}</div>
    }
    <div class="lajur">
      <div class="lajur-angka">
        @for (a of angka(); track $index) {
          <span>{{ a }}</span>
        }
      </div>
      <div class="lajur-kotak">
        @for (x of isi(); track $index; let k = $index) {
          <div class="baris-kotak">
            @if (k === aktif()) {
              <input class="kotak aktif" appFokus inputmode="numeric" autocomplete="off" maxlength="2"
                     [attr.aria-label]="'Kotak ' + (k + 1) + (judul() ? ', ' + judul() : '')"
                     [value]="isiAktif()" (input)="ketikan($event)" (keydown.enter)="tekanEnter($event)"
                     (paste)="$event.preventDefault()" (drop)="$event.preventDefault()" />
            } @else {
              <span class="kotak" [class.terisi]="x !== null" [class.redup]="x === null"
                    [class.benar]="tanda()[k] === 'benar'" [class.salah]="tanda()[k] === 'salah'">{{ x ?? '' }}</span>
            }
            @if (keterangan()[k]) {
              <span class="keterangan-kotak">{{ keterangan()[k] }}</span>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class LajurKoran {
  readonly judul = input<string>('');
  readonly angka = input.required<number[]>();
  /** Isi tiap kotak (panjang = angka - 1). null = belum diisi. */
  readonly isi = input.required<(string | null)[]>();
  /** Indeks kotak aktif, -1 bila tidak ada kotak aktif di lajur ini. */
  readonly aktif = input<number>(-1);
  /** Isi sementara kotak aktif (sebelum Enter). */
  readonly isiAktif = input<string>('');
  /** Hanya uji coba: tanda benar/salah setelah selesai. */
  readonly tanda = input<TandaKotak[]>([]);
  /** Hanya contoh: penjelasan di samping kotak. */
  readonly keterangan = input<string[]>([]);

  readonly ketik = output<string>();
  readonly enter = output<void>();

  protected ketikan(e: Event): void {
    const el = e.target as HTMLInputElement;
    const digit = saringDigit(el.value);
    el.value = digit;
    this.ketik.emit(digit);
  }

  protected tekanEnter(e: Event): void {
    e.preventDefault();
    this.enter.emit();
  }
}
