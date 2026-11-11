import { Component, computed, input } from '@angular/core';
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  Calculator,
  CalendarDays,
  ChartColumn,
  CircleCheck,
  CircleCheckBig,
  Clock,
  Download,
  Eye,
  File,
  FileSpreadsheet,
  FileText,
  Info,
  Key,
  KeyRound,
  Layers,
  LayoutDashboard,
  ListOrdered,
  Lock,
  LogOut,
  Mail,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Send,
  Shapes,
  Timer,
  TriangleAlert,
  UserCheck,
  Users,
  type IconNode,
} from 'lucide';

/**
 * Daftar ikon yang dipakai aplikasi (Lucide, lisensi ISC). Hanya yang terdaftar di sini yang ikut di-bundle.
 * Paket `lucide-angular` belum mendukung Angular 22, jadi data ikon dari paket inti `lucide` dirender sendiri.
 */
export const IKON = {
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  ban: Ban,
  calculator: Calculator,
  'calendar-days': CalendarDays,
  'chart-column': ChartColumn,
  'circle-check': CircleCheck,
  'circle-check-big': CircleCheckBig,
  clock: Clock,
  download: Download,
  eye: Eye,
  file: File,
  'file-spreadsheet': FileSpreadsheet,
  'file-text': FileText,
  info: Info,
  key: Key,
  'key-round': KeyRound,
  layers: Layers,
  'layout-dashboard': LayoutDashboard,
  'list-ordered': ListOrdered,
  lock: Lock,
  'log-out': LogOut,
  mail: Mail,
  plus: Plus,
  printer: Printer,
  'refresh-cw': RefreshCw,
  search: Search,
  send: Send,
  shapes: Shapes,
  timer: Timer,
  'triangle-alert': TriangleAlert,
  'user-check': UserCheck,
  users: Users,
} satisfies Record<string, IconNode>;

export type NamaIkon = keyof typeof IKON;

/** Ikon outline Lucide. Dekoratif (aria-hidden); teks atau aria-label ada di elemen induknya. */
@Component({
  selector: 'app-ikon',
  host: { class: 'ikon', 'aria-hidden': 'true' },
  template: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round" [attr.width]="ukuran()" [attr.height]="ukuran()" focusable="false">
      @for (b of bagian(); track $index) {
        @let a = b[1];
        @switch (b[0]) {
          @case ('path') { <svg:path [attr.d]="a['d']" /> }
          @case ('circle') { <svg:circle [attr.cx]="a['cx']" [attr.cy]="a['cy']" [attr.r]="a['r']" /> }
          @case ('rect') {
            <svg:rect [attr.x]="a['x']" [attr.y]="a['y']" [attr.width]="a['width']" [attr.height]="a['height']"
                      [attr.rx]="a['rx']" [attr.ry]="a['ry']" />
          }
          @case ('line') { <svg:line [attr.x1]="a['x1']" [attr.y1]="a['y1']" [attr.x2]="a['x2']" [attr.y2]="a['y2']" /> }
          @case ('polyline') { <svg:polyline [attr.points]="a['points']" /> }
          @case ('polygon') { <svg:polygon [attr.points]="a['points']" /> }
          @case ('ellipse') { <svg:ellipse [attr.cx]="a['cx']" [attr.cy]="a['cy']" [attr.rx]="a['rx']" [attr.ry]="a['ry']" /> }
        }
      }
    </svg>
  `,
})
export class Ikon {
  readonly nama = input.required<NamaIkon>();
  /** 16-20 px untuk navigasi dan aksi, 20-24 px untuk statistik. */
  readonly ukuran = input(18);
  protected readonly bagian = computed(() => IKON[this.nama()] as unknown as [string, Record<string, string | number>][]);
}
