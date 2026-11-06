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
 * Satu angka langsung dikirim ke induk dan terkunci, tanpa Enter (revisi HC 5 November 2026). Tombol keyboard ditangkap di
 * dokumen, jadi ketikan cepat tidak hilang saat kotak berganti. Keyboard layar HP tidak memberi nilai tombol, jadi lewat <input>.
 */
@Component({
  selector: 'app-lajur-koran',
  imports: [Fokus],
  host: { '(document:keydown)': 'tekanTombol($event)' },
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
              <input class="kotak aktif" appFokus inputmode="numeric" autocomplete="off" maxlength="1"
                     [attr.aria-label]="'Kotak ' + (k + 1) + (judul() ? ', ' + judul() : '')"
                     (input)="ketikan($event)" (paste)="$event.preventDefault()" (drop)="$event.preventDefault()" />
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
  /** Hanya uji coba: tanda benar/salah setelah selesai. */
  readonly tanda = input<TandaKotak[]>([]);
  /** Hanya contoh: penjelasan di samping kotak. */
  readonly keterangan = input<string[]>([]);

  /** Satu digit yang langsung dikunci induk. Induk menentukan nomor kotak, bukan lajur ini. */
  readonly ketik = output<string>();

  /** Tombol angka. Ditahan tidak mengulang; beberapa lajur mendengar event yang sama, jadi hanya satu yang memprosesnya. */
  protected tekanTombol(e: KeyboardEvent): void {
    if (this.aktif() < 0 || e.defaultPrevented || e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
    if (!/^[0-9]$/.test(e.key)) return;
    e.preventDefault();
    this.ketik.emit(e.key);
  }

  protected ketikan(e: Event): void {
    const el = e.target as HTMLInputElement;
    const digit = saringDigit(el.value);
    el.value = '';
    if (digit) this.ketik.emit(digit);
  }
}
