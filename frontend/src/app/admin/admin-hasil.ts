import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { pesanGalat } from '../core/api.service';
import { DAFTAR_TES, LABEL_TES, type JenisTes } from '../core/model';
import { buatCsv, unduh } from './admin-alat';
import { ApiAdmin } from './admin-api.service';
import { LABEL_STATUS, type BarisHasil, type JawabanNomor, type SesiRingkas } from './admin-model';
import { GrafikInterval } from './grafik-interval';

/**
 * Hasil dan laporan: tabel hasil dengan filter, grafik 22 interval Koran, lihat jawaban (benar/salah, tanpa kunci),
 * ekspor CSV untuk Excel, dan cetak (Simpan sebagai PDF). Hanya admin HC.
 */
@Component({
  selector: 'app-admin-hasil',
  imports: [GrafikInterval],
  templateUrl: './admin-hasil.html',
})
export class AdminHasil implements OnInit {
  private readonly api = inject(ApiAdmin);
  protected readonly daftarTes = DAFTAR_TES;
  protected readonly label = LABEL_TES;
  protected readonly labelStatus = LABEL_STATUS;

  protected readonly jenis = signal<JenisTes | ''>('');
  protected readonly sesi = signal('');
  protected readonly tanggal = signal('');
  protected readonly daftarSesi = signal<SesiRingkas[]>([]);
  protected readonly hasil = signal<BarisHasil[]>([]);
  protected readonly memuat = signal(false);
  protected readonly galat = signal('');

  /** Baris Koran untuk grafik: yang dipilih, atau Koran pertama di tabel. */
  protected readonly koranDipilih = signal<number | null>(null);
  protected readonly barisKoran = computed(() => {
    const semua = this.hasil().filter((h) => h.jenis_tes === 'KORAN' && h.ringkasan_interval);
    return semua.find((h) => h.ujian_id === this.koranDipilih()) ?? semua[0] ?? null;
  });

  protected readonly jawabanUntuk = signal<BarisHasil | null>(null);
  protected readonly jawaban = signal<JawabanNomor[]>([]);
  protected readonly ringkasJawaban = computed(() => {
    const j = this.jawaban();
    return {
      benar: j.filter((x) => x.benar === true).length,
      salah: j.filter((x) => x.benar === false).length,
      kosong: j.filter((x) => x.benar === null).length,
    };
  });
  /** Koran: hanya kotak yang dikerjakan (988 kotak terlalu panjang ditampilkan semua). */
  protected readonly jawabanTampil = computed(() =>
    this.jawabanUntuk()?.jenis_tes === 'KORAN' ? this.jawaban().filter((x) => x.jawaban !== null) : this.jawaban(),
  );

  async ngOnInit(): Promise<void> {
    try {
      this.daftarSesi.set((await this.api.daftarSesi()).sesi);
    } catch (galat) {
      this.galat.set(pesanGalat(galat));
    }
    await this.muat();
  }

  protected nilai(e: Event): string {
    return (e.target as HTMLInputElement | HTMLSelectElement).value;
  }

  protected async ubahFilter(kolom: 'jenis' | 'sesi' | 'tanggal', nilai: string): Promise<void> {
    if (kolom === 'jenis') this.jenis.set(nilai as JenisTes | '');
    if (kolom === 'sesi') this.sesi.set(nilai);
    if (kolom === 'tanggal') this.tanggal.set(nilai);
    await this.muat();
  }

  private async muat(): Promise<void> {
    this.memuat.set(true);
    try {
      this.hasil.set((await this.api.hasil({ jenis: this.jenis(), sesi: this.sesi(), tanggal: this.tanggal() })).hasil);
      this.galat.set('');
    } catch (galat) {
      this.galat.set(pesanGalat(galat));
    } finally {
      this.memuat.set(false);
    }
  }

  protected async lihatJawaban(h: BarisHasil): Promise<void> {
    this.jawabanUntuk.set(h);
    this.jawaban.set([]);
    if (h.jenis_tes === 'KORAN') this.koranDipilih.set(h.ujian_id);
    try {
      this.jawaban.set((await this.api.jawabanUjian(h.ujian_id)).jawaban);
    } catch (galat) {
      this.galat.set(pesanGalat(galat));
    }
  }

  protected tutupJawaban(): void {
    this.jawabanUntuk.set(null);
    this.jawaban.set([]);
  }

  protected eksporCsv(): void {
    const kepala = ['Peserta', 'Email', 'Sesi', 'Mode', 'Tanggal tes', 'Tes', 'Status', 'Benar', 'Salah', 'Dijawab', 'N (Koran)', 'Kategori', 'Skor akhir', 'Persetujuan', 'Versi persetujuan'];
    const baris = this.hasil().map((h) => [
      h.nama ?? '',
      h.email ?? '',
      h.nama_sesi,
      h.mode === 'KELOMPOK' ? 'Serentak' : 'Individu',
      h.tanggal,
      LABEL_TES[h.jenis_tes],
      LABEL_STATUS[h.status] ?? h.status,
      h.jumlah_benar,
      h.jumlah_salah,
      h.jumlah_dijawab,
      h.n_koran,
      h.kategori,
      h.skor_akhir,
      h.persetujuan_pada,
      h.persetujuan_versi,
    ]);
    const tgl = new Date().toISOString().slice(0, 10);
    unduh(`hasil-psikotes-${tgl}.csv`, buatCsv(kepala, baris));
  }

  /** Cetak halaman (pilih "Simpan sebagai PDF" di dialog cetak). Navigasi dan tombol disembunyikan saat cetak. */
  protected cetak(): void {
    window.print();
  }
}
