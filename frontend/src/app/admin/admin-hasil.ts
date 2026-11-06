import { Component, Injector, OnInit, afterNextRender, computed, inject, signal } from '@angular/core';
import { pesanGalat } from '../core/api.service';
import { DAFTAR_TES, LABEL_TES, type JenisTes } from '../core/model';
import { buatCsv, kelompokkanPeserta, ringkasHasil, unduh } from './admin-alat';
import { ApiAdmin } from './admin-api.service';
import { LABEL_STATUS, type BarisHasil, type JawabanNomor, type PesertaHasil, type SesiRingkas } from './admin-model';
import { GrafikInterval } from './grafik-interval';
import { LaporanPeserta } from './laporan-peserta';

/**
 * Hasil dan laporan: satu baris per peserta berisi ringkasan semua tesnya. Review membuka Laporan Peserta,
 * Cetak PDF mencetak laporan itu (Simpan sebagai PDF di dialog cetak), Detail jawaban membuka jawaban per nomor
 * dan tracking Koran per interval (benar/salah, tanpa kunci). Ekspor Excel tetap satu baris per tes. Hanya admin HC.
 */
@Component({
  selector: 'app-admin-hasil',
  imports: [GrafikInterval, LaporanPeserta],
  templateUrl: './admin-hasil.html',
})
export class AdminHasil implements OnInit {
  private readonly api = inject(ApiAdmin);
  private readonly injector = inject(Injector);
  protected readonly daftarTes = DAFTAR_TES;
  protected readonly label = LABEL_TES;
  protected readonly ringkas = ringkasHasil;

  protected readonly jenis = signal<JenisTes | ''>('');
  protected readonly sesi = signal('');
  protected readonly tanggal = signal('');
  protected readonly daftarSesi = signal<SesiRingkas[]>([]);
  private readonly hasil = signal<BarisHasil[]>([]);
  protected readonly intervalDetik = signal(0);
  protected readonly terpotong = signal(false);
  protected readonly memuat = signal(false);
  protected readonly galat = signal('');

  /** Filter jenis tes dan tanggal memilih peserta, tetapi semua tes peserta itu tetap masuk laporan. */
  protected readonly peserta = computed(() => {
    const jenis = this.jenis();
    const tanggal = this.tanggal();
    return kelompokkanPeserta(this.hasil()).filter(
      (p) => (!jenis || p.tes.some((t) => t.jenis_tes === jenis)) && (!tanggal || p.tanggal.includes(tanggal)),
    );
  });

  // ----- Review dan cetak -----
  private readonly reviewKunci = signal<string | null>(null);
  protected readonly review = computed(() => this.peserta().find((p) => p.kunci === this.reviewKunci()) ?? null);
  /** Catatan HC per peserta, hanya di memori (tidak disimpan). */
  private readonly catatan = signal<ReadonlyMap<string, string>>(new Map());
  /** Laporan yang dirender di area cetak. */
  protected readonly cetakan = signal<PesertaHasil[]>([]);

  // ----- Detail jawaban -----
  private readonly detailKunci = signal<string | null>(null);
  protected readonly detail = computed(() => this.peserta().find((p) => p.kunci === this.detailKunci()) ?? null);
  protected readonly detailTes = signal<BarisHasil | null>(null);
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
    this.detailTes()?.jenis_tes === 'KORAN' ? this.jawaban().filter((x) => x.jawaban !== null) : this.jawaban(),
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

  protected async ubahSesi(nilai: string): Promise<void> {
    this.sesi.set(nilai);
    await this.muat();
  }

  private async muat(): Promise<void> {
    this.memuat.set(true);
    try {
      const r = await this.api.hasil(this.sesi());
      this.hasil.set(r.hasil);
      this.intervalDetik.set(r.interval_detik);
      this.terpotong.set(r.terpotong);
      this.galat.set('');
    } catch (galat) {
      this.galat.set(pesanGalat(galat));
    } finally {
      this.memuat.set(false);
    }
  }

  protected bukaReview(p: PesertaHasil): void {
    this.reviewKunci.set(p.kunci);
  }

  protected tutupReview(): void {
    this.reviewKunci.set(null);
  }

  protected catatanUntuk(p: PesertaHasil): string {
    return this.catatan().get(p.kunci) ?? '';
  }

  protected ubahCatatan(p: PesertaHasil, teks: string): void {
    this.catatan.update((c) => new Map(c).set(p.kunci, teks));
  }

  /** Dialog cetak browser setelah laporan dirender; pilih "Simpan sebagai PDF" untuk berkas PDF. Satu peserta per halaman. */
  protected cetak(daftar: PesertaHasil[]): void {
    this.cetakan.set(daftar);
    afterNextRender({ read: () => window.print() }, { injector: this.injector });
  }

  protected async bukaDetail(p: PesertaHasil): Promise<void> {
    this.detailKunci.set(p.kunci);
    await this.pilihTesDetail(p.tes[0]);
  }

  protected tutupDetail(): void {
    this.detailKunci.set(null);
    this.detailTes.set(null);
    this.jawaban.set([]);
  }

  protected async pilihTesDetail(t: BarisHasil): Promise<void> {
    this.detailTes.set(t);
    this.jawaban.set([]);
    try {
      this.jawaban.set((await this.api.jawabanUjian(t.ujian_id)).jawaban);
    } catch (galat) {
      this.galat.set(pesanGalat(galat));
    }
  }

  protected eksporCsv(): void {
    const jenis = this.jenis();
    const kepala = ['Peserta', 'Email', 'Sesi', 'Mode', 'Tanggal tes', 'Tes', 'Status', 'Benar', 'Salah', 'Dijawab', 'N (Koran)', 'Kategori', 'Skor akhir', 'Persetujuan', 'Versi persetujuan'];
    const baris = this.peserta()
      .flatMap((p) => p.tes)
      .filter((h) => !jenis || h.jenis_tes === jenis)
      .map((h) => [
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
}
