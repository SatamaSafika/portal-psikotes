import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { pesanGalat } from '../core/api.service';
import { LABEL_TES } from '../core/model';
import { ApiAdmin } from './admin-api.service';
import type { Ringkasan } from './admin-model';

const LABEL_JADWAL = { BELUM_MULAI: 'Belum mulai', BERJALAN: 'Berjalan', SELESAI: 'Selesai' } as const;

/** Overview: tiga angka peserta (dihitung per orang) dan jadwal hari ini menurut jam server, diperbarui tiap menit. */
@Component({
  selector: 'app-admin-overview',
  template: `
    <h1 class="judul">Ringkasan hari ini</h1>
    @if (galat()) {
      <div class="kotak-galat" role="alert">{{ galat() }}</div>
    }
    @if (data(); as d) {
      <div class="kartu-angka">
        <div class="kartu">
          <span class="teks-redup">Total peserta selesai</span><strong>{{ d.total_selesai }}</strong>
          <span class="teks-redup teks-kecil">Data tersimpan (dihapus 4 bulan setelah tes)</span>
        </div>
        <div class="kartu">
          <span class="teks-redup">Peserta selesai hari ini</span><strong>{{ d.selesai_hari_ini }}</strong>
        </div>
        <div class="kartu">
          <span class="teks-redup">Peserta sedang mengerjakan</span><strong>{{ d.sedang_mengerjakan }}</strong>
          <span class="teks-redup teks-kecil">Timer tes sedang berjalan</span>
        </div>
      </div>
      <div class="kartu">
        <h2 class="judul-kartu">Jadwal hari ini</h2>
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
      </div>
    }
  `,
})
export class AdminOverview implements OnInit, OnDestroy {
  private readonly api = inject(ApiAdmin);
  protected readonly data = signal<Ringkasan | null>(null);
  protected readonly galat = signal('');
  protected readonly label = LABEL_TES;
  protected readonly labelJadwal = LABEL_JADWAL;
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
