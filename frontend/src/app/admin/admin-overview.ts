import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Catatan } from '../bersama/catatan';
import { pesanGalat } from '../core/api.service';
import { Ikon } from '../core/ikon';
import { LABEL_TES } from '../core/model';
import { ApiAdmin } from './admin-api.service';
import type { Ringkasan } from './admin-model';

const LABEL_JADWAL = { BELUM_MULAI: 'Belum mulai', BERJALAN: 'Berjalan', SELESAI: 'Selesai' } as const;

/** Overview: tiga angka peserta (dihitung per orang) dan jadwal hari ini menurut jam server, diperbarui tiap menit. */
@Component({
  selector: 'app-admin-overview',
  imports: [Ikon, Catatan],
  template: `
    <div class="kepala-halaman">
      <h1 class="judul">Ringkasan</h1>
      <span class="teks-redup">{{ hariIni }}</span>
    </div>
    @if (galat()) {
      <div class="kotak-galat" role="alert">{{ galat() }}</div>
    }
    @if (data(); as d) {
      <!-- Tiga kartu KPI terpisah. Dihitung per orang, bukan per tes. -->
      <section class="strip-kpi" aria-label="Angka peserta">
        <div class="kpi kpi-utama">
          <span class="ubin-ikon kecil"><app-ikon nama="clock" [ukuran]="22" /></span>
          <div>
            <span class="kpi-label">Sedang mengerjakan</span>
            <strong>{{ d.sedang_mengerjakan }}</strong>
          </div>
        </div>
        <div class="kpi">
          <span class="ubin-ikon kecil"><app-ikon nama="circle-check-big" [ukuran]="22" /></span>
          <div>
            <span class="kpi-label">Selesai hari ini</span>
            <strong>{{ d.selesai_hari_ini }}</strong>
          </div>
        </div>
        <div class="kpi">
          <span class="ubin-ikon kecil"><app-ikon nama="chart-column" [ukuran]="22" /></span>
          <div>
            <span class="kpi-label">Total selesai</span>
            <strong>{{ d.total_selesai }}</strong>
          </div>
        </div>
      </section>
      <section class="kartu">
        <h2 class="judul-kartu">Sesi hari ini</h2>
        <div class="tabel-gulir">
          <table class="tabel">
            <thead><tr><th>Nama sesi</th><th>Mode</th><th>Jenis tes</th><th>Jumlah peserta</th><th>Waktu</th><th>Status</th></tr></thead>
            <tbody>
              @for (j of d.jadwal_hari_ini; track j.sesi_id + j.jenis_tes) {
                <tr>
                  <td>{{ j.nama_sesi }}</td>
                  <td>{{ j.mode === 'KELOMPOK' ? 'Serentak' : 'Individu' }}</td>
                  <td>{{ label[j.jenis_tes] }}</td>
                  <td>{{ j.mode === 'KELOMPOK' ? j.jumlah_peserta + ' dari ' + j.kuota : j.jumlah_peserta }}</td>
                  <td>{{ j.waktu_buka }}–{{ j.waktu_tutup }}</td>
                  <td><span class="lencana" [class]="'lencana ' + j.status">{{ labelJadwal[j.status] }}</span></td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="teks-redup">Tidak ada jadwal tes hari ini.</td></tr>
              }
            </tbody>
          </table>
        </div>
        <app-catatan class="catatan-bawah">
          Angka dihitung per orang. Sedang mengerjakan: timer tes masih berjalan. Selesai hari ini: jawaban terkirim hari ini.
          Total selesai: semua data yang masih tersimpan (data peserta dihapus 4 bulan setelah tanggal tes).
          Jadwal dan status mengikuti jam server dan diperbarui tiap menit.
        </app-catatan>
      </section>
    }
  `,
})
export class AdminOverview implements OnInit, OnDestroy {
  private readonly api = inject(ApiAdmin);
  protected readonly data = signal<Ringkasan | null>(null);
  protected readonly galat = signal('');
  protected readonly label = LABEL_TES;
  protected readonly labelJadwal = LABEL_JADWAL;
  protected readonly hariIni = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  private pewaktu: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    void this.muat();
    this.pewaktu = setInterval(() => void this.muat(), 60_000);
  }

  ngOnDestroy(): void {
    if (this.pewaktu !== null) clearInterval(this.pewaktu);
  }

  private async muat(): Promise<void> {
    try {
      this.data.set(await this.api.ringkasan());
      this.galat.set('');
    } catch (galat) {
      this.galat.set(pesanGalat(galat));
    }
  }
}
