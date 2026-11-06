import { Component, computed, input, signal } from '@angular/core';
import { skalaGrafik } from './admin-alat';
import type { Interval } from './admin-model';

/**
 * Grafik garis 22 interval Koran (dikerjakan, benar, salah), SVG tanpa pustaka. Hanya untuk admin HC.
 * Disertai tabel 22 interval yang bisa dibuka, supaya angkanya bisa dibaca persis.
 */
@Component({
  selector: 'app-grafik-interval',
  template: `
    <ul class="legenda-grafik">
      <li><span style="background: var(--navy)"></span>Dikerjakan</li>
      <li><span style="background: var(--benar)"></span>Benar</li>
      <li><span style="background: var(--salah)"></span>Salah</li>
    </ul>
    @let s = skala();
    <svg viewBox="0 0 760 260" class="grafik" role="img"
         [attr.aria-label]="'Grafik ' + interval().length + ' interval: dikerjakan, benar, dan salah per ' + detik() + ' detik'">
      @for (g of s.gridY; track g.label) {
        <line x1="44" x2="744" [attr.y1]="g.y" [attr.y2]="g.y" stroke="#EAEEF3" />
        <text x="36" [attr.y]="g.y + 4" text-anchor="end" class="label-sumbu">{{ g.label }}</text>
      }
      @for (x of s.x; track $index) {
        <text [attr.x]="x" [attr.y]="s.dasarY + 18" text-anchor="middle" class="label-sumbu">{{ $index + 1 }}</text>
      }
      <text x="394" y="256" text-anchor="middle" class="label-sumbu">Interval ke- (setiap {{ detik() }} detik, total {{ interval().length }})</text>
      <polyline [attr.points]="s.garis.dikerjakan" fill="none" stroke="#003C71" stroke-width="2" />
      <polyline [attr.points]="s.garis.benar" fill="none" stroke="#1E6B3A" stroke-width="2" />
      <polyline [attr.points]="s.garis.salah" fill="none" stroke="#8A1F2B" stroke-width="2" />
      @for (t of s.titik.dikerjakan; track $index) {
        <circle [attr.cx]="t.x" [attr.cy]="t.y" r="3" fill="#003C71"><title>Interval {{ $index + 1 }}: dikerjakan {{ interval()[$index].dikerjakan }}</title></circle>
      }
      @for (t of s.titik.benar; track $index) {
        <circle [attr.cx]="t.x" [attr.cy]="t.y" r="3" fill="#1E6B3A"><title>Interval {{ $index + 1 }}: benar {{ interval()[$index].benar }}</title></circle>
      }
      @for (t of s.titik.salah; track $index) {
        <circle [attr.cx]="t.x" [attr.cy]="t.y" r="3" fill="#8A1F2B"><title>Interval {{ $index + 1 }}: salah {{ interval()[$index].salah }}</title></circle>
      }
    </svg>

    @if (denganTabel()) {
      <button type="button" class="tombol-tautan" (click)="tabelTerbuka.set(!tabelTerbuka())" [attr.aria-expanded]="tabelTerbuka()">
        {{ tabelTerbuka() ? '▾' : '▸' }} Lihat tabel {{ interval().length }} interval
      </button>
    }
    @if (denganTabel() && tabelTerbuka()) {
      <div class="tabel-gulir">
        <table class="tabel tabel-rapat">
          <thead><tr><th>Interval</th><th>Detik</th><th>Dikerjakan</th><th>Benar</th><th>Salah</th></tr></thead>
          <tbody>
            @for (iv of interval(); track $index) {
              <tr><td>{{ $index + 1 }}</td><td>{{ $index * detik() }}–{{ ($index + 1) * detik() }}</td>
                <td>{{ iv.dikerjakan }}</td><td>{{ iv.benar }}</td><td>{{ iv.salah }}</td></tr>
            }
            <tr class="baris-jumlah"><td colspan="2">Jumlah</td><td>{{ jumlah().dikerjakan }}</td><td>{{ jumlah().benar }}</td><td>{{ jumlah().salah }}</td></tr>
          </tbody>
        </table>
      </div>
    }
  `,
})
export class GrafikInterval {
  readonly interval = input.required<Interval[]>();
  /** Panjang interval (detik) dari server, sesuai interval_detik di skoring.json. */
  readonly detik = input.required<number>();
  /** false di Laporan Peserta: grafik saja. */
  readonly denganTabel = input(true);
  protected readonly skala = computed(() => skalaGrafik(this.interval()));
  protected readonly tabelTerbuka = signal(false);
  protected readonly jumlah = computed(() =>
    this.interval().reduce((a, x) => ({ dikerjakan: a.dikerjakan + x.dikerjakan, benar: a.benar + x.benar, salah: a.salah + x.salah }), {
      dikerjakan: 0,
      benar: 0,
      salah: 0,
    }),
  );
}
