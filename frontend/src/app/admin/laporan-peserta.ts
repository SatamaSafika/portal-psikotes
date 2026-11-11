import { Component, computed, input, output } from '@angular/core';
import type { JenisTes } from '../core/model';
import { formatTanggal } from './admin-alat';
import type { BarisHasil, PesertaHasil } from './admin-model';
import { GrafikInterval } from './grafik-interval';

const JUDUL_TES: Record<JenisTes, string> = {
  TIU5: 'Tes Intelegensi Umum 5 (TIU 5)',
  TIU6: 'Tes Intelegensi Umum 6 (TIU 6)',
  KORAN: 'Tes Koran / Kraepelin',
};

/**
 * Laporan Peserta: dokumen individual untuk Review dan cetak. Memuat identitas, hasil tiap tes yang selesai,
 * grafik Koran, dan catatan HC. Kolom N Koran tidak ditampilkan (revisi HC 10 November 2026; N tetap di Excel).
 * Format mengikuti contoh dokumen dari pemilik proyek (11 November 2026). Catatan tidak disimpan: ikut tercetak lalu hilang saat halaman dimuat ulang.
 * Tanpa kunci jawaban. Hanya untuk admin HC.
 */
@Component({
  selector: 'app-laporan-peserta',
  imports: [GrafikInterval],
  template: `
    @let p = peserta();
    <article class="laporan">
      <header class="laporan-kepala">Portal Psikotes</header>
      <h2 class="laporan-judul">Laporan Hasil Psikotes</h2>
      <p class="laporan-subjudul">Ringkasan Hasil Peserta</p>

      <dl class="laporan-identitas">
        <dt>Nama Peserta</dt><dd>{{ p.nama }}</dd>
        @if (p.email) {
          <dt>Email</dt><dd>{{ p.email }}</dd>
        }
        <dt>Sesi</dt><dd>{{ p.nama_sesi }}</dd>
        <dt>Tanggal Tes</dt><dd>{{ tanggal() }}</dd>
      </dl>

      @for (t of p.tes; track t.ujian_id; let i = $index) {
        <section class="laporan-bagian">
          <h3>{{ nomor(i) }} · {{ judul[t.jenis_tes] }}</h3>
          <table class="laporan-tabel">
            <thead>
              <tr>
                <th>{{ t.jenis_tes === 'KORAN' ? 'Dikerjakan' : 'Dijawab' }}</th><th>Benar</th><th>Salah</th>
                <th>Kategori</th><th>Skor akhir</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{{ t.jumlah_dijawab ?? '—' }}</td><td>{{ t.jumlah_benar ?? '—' }}</td><td>{{ t.jumlah_salah ?? '—' }}</td>
                <td class="laporan-kategori" [attr.data-skor]="t.skor_akhir">{{ t.kategori ?? 'Belum dihitung' }}</td><td>{{ t.skor_akhir ?? '—' }}</td>
              </tr>
            </tbody>
          </table>
          @if (t.status === 'WAKTU_HABIS') {
            <p class="laporan-catatan-kecil">Terkirim otomatis karena waktu habis.</p>
          }
          @if (grafikDari(t); as iv) {
            <app-grafik-interval [interval]="iv" [detik]="intervalDetik()" [denganTabel]="false" />
          }
        </section>
      }

      <section class="laporan-bagian">
        <h3>Catatan / Komentar HC</h3>
        @if (bisaDiisi()) {
          <textarea class="laporan-isian tanpa-cetak" rows="4" aria-label="Catatan atau komentar HC"
                    [value]="catatan()" (input)="ubahCatatan.emit(nilai($event))"></textarea>
          <p class="laporan-catatan-kecil tanpa-cetak">Catatan ikut tercetak, tetapi tidak disimpan di sistem.</p>
        }
        <div class="laporan-catatan-cetak" [class.hanya-cetak]="bisaDiisi()">
          @if (catatan().trim()) {
            {{ catatan() }}
          } @else {
            <span></span><span></span><span></span>
          }
        </div>
      </section>

      <footer class="laporan-kaki">Dokumen internal HC · Portal Psikotes</footer>
    </article>
  `,
})
export class LaporanPeserta {
  readonly peserta = input.required<PesertaHasil>();
  readonly intervalDetik = input.required<number>();
  readonly catatan = input('');
  /** true di Review (ada kotak isian), false di salinan untuk cetak. */
  readonly bisaDiisi = input(false);
  readonly ubahCatatan = output<string>();

  protected readonly judul = JUDUL_TES;
  protected readonly tanggal = computed(() => this.peserta().tanggal.map(formatTanggal).join(', '));

  protected nomor(i: number): string {
    return String(i + 1).padStart(2, '0');
  }

  protected grafikDari(t: BarisHasil): BarisHasil['ringkasan_interval'] {
    return t.jenis_tes === 'KORAN' ? t.ringkasan_interval : null;
  }

  protected nilai(e: Event): string {
    return (e.target as HTMLTextAreaElement).value;
  }
}
