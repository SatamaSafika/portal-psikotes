import { Component, input } from '@angular/core';
import { Ikon } from '../core/ikon';

let urutan = 0;

/**
 * Chip "Catatan" dengan tooltip (dashboard HC, 7a). Penjelasan panjang dipindah ke sini, tidak dihapus.
 * Terbuka saat hover dan saat fokus keyboard (tabindex 0); isi tooltip juga menjadi deskripsi aksesibel.
 * Pemakaian: <app-catatan>Teks penjelasan...</app-catatan>
 */
@Component({
  selector: 'app-catatan',
  imports: [Ikon],
  host: {
    class: 'catatan',
    tabindex: '0',
    '[class.ke-kiri]': 'kiri()',
    '[attr.aria-describedby]': 'id',
  },
  template: `
    <app-ikon nama="info" [ukuran]="13" />{{ label() }}
    <span class="catatan-isi" role="tooltip" [id]="id"><ng-content /></span>
  `,
})
export class Catatan {
  readonly label = input('Catatan');
  /** true bila chip dekat tepi kanan: tooltip dibuka ke kiri. */
  readonly kiri = input(false);
  protected readonly id = `catatan-${++urutan}`;
}
