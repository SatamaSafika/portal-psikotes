import { Component, Injector, OnInit, afterNextRender, computed, inject, signal } from '@angular/core';
import { Avatar } from '../bersama/avatar';
import { Catatan } from '../bersama/catatan';
import { pesanGalat } from '../core/api.service';
import { Ikon } from '../core/ikon';
import { DAFTAR_TES, LABEL_TES, type JenisTes } from '../core/model';
import { formatTanggal, kelompokkanPeserta } from './admin-alat';
import { ApiAdmin } from './admin-api.service';
import type { BarisHasil, JawabanNomor, PesertaHasil, SesiRingkas } from './admin-model';
import { GrafikInterval } from './grafik-interval';
import { lembarLaporan } from './laporan-excel';
import { LaporanPeserta } from './laporan-peserta';
import { buatXlsx, unduhXlsx } from './xlsx';

/**
 * Hasil dan laporan: satu baris per peserta berisi ringkasan semua tesnya. Review membuka Laporan Peserta,
 * Cetak PDF mencetak laporan itu (Simpan sebagai PDF di dialog cetak), Detail jawaban membuka jawaban per nomor
 * dan tracking Koran per interval (benar/salah, tanpa kunci). Ekspor Excel (.xlsx) berisi rekap per peserta dan detail per tes. Hanya admin HC.
 */
@Component({
  selector: 'app-admin-hasil',
  imports: [GrafikInterval, LaporanPeserta, Ikon, Avatar, Catatan],
  templateUrl: './admin-hasil.html',
})
export class AdminHasil implements OnInit {
  private readonly api = inject(ApiAdmin);
  private readonly injector = inject(Injector);
  protected readonly daftarTes = DAFTAR_TES;
  protected readonly label = LABEL_TES;
  /** Kode tes singkat di kolom Hasil per tes. */
  protected readonly singkat: Record<JenisTes, string> = { TIU5: 'TIU 5', TIU6: 'TIU 6', KORAN: 'Koran' };

  protected readonly jenis = signal<JenisTes | ''>('');
  protected readonly sesi = signal('');
  protected readonly tanggal = signal('');
  /** Cari nama: tanpa membedakan huruf besar/kecil, di sisi browser (data sudah dimuat). */
  protected readonly cari = signal('');
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
    const cari = this.cari().trim().toLocaleLowerCase('id');
    return kelompokkanPeserta(this.hasil()).filter(
      (p) =>
        (!jenis || p.tes.some((t) => t.jenis_tes === jenis)) &&
        (!tanggal || p.tanggal.includes(tanggal)) &&
        (!cari || p.nama.toLocaleLowerCase('id').includes(cari)),
    );
  });

  /**
   * Kartu ringkasan, dihitung dari baris yang tampil (mengikuti filter). Sebaran memakai skor akhir 1-5;
   * nama kategori diambil dari data (skoring.json di server), bukan ditulis di sini.
   */
  protected readonly ringkasan = computed(() => {
    const daftar = this.peserta();
    const tes = daftar.flatMap((p) => p.tes);
    const jenis = DAFTAR_TES.filter((j) => tes.some((t) => t.jenis_tes === j)).map((j) => this.singkat[j]);
    const sebaran = [5, 4, 3, 2, 1]
      .map((skor) => {
        const ini = tes.filter((t) => t.skor_akhir === skor);
        return { skor, jumlah: ini.length, label: ini.find((t) => t.kategori)?.kategori ?? `Skor ${skor}` };
      })
      .filter((x) => x.jumlah > 0);
    return {
      peserta: daftar.length,
      sesi: new Set(daftar.map((p) => p.sesi_id ?? p.nama_sesi)).size,
      hasil: tes.length,
      jenis: jenis.join(', '),
      sebaran,
      uraian: sebaran.map((x) => `${x.label} ${x.jumlah}`).join(', '),
      dinilai: sebaran.reduce((n, x) => n + x.jumlah, 0),
    };
  });

  protected tanggalTampil(p: PesertaHasil): string {
    return p.tanggal.map(formatTanggal).join(', ');
  }

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

  /** Excel .xlsx sesuai filter aktif: rekap per peserta, detail per jenis tes, dan keterangan ekspor. */
  protected eksporExcel(): void {
    const sekarang = new Date();
    const dua = (n: number): string => String(n).padStart(2, '0');
    const tgl = `${sekarang.getFullYear()}-${dua(sekarang.getMonth() + 1)}-${dua(sekarang.getDate())}`;
    const waktu = `${tgl} ${dua(sekarang.getHours())}:${dua(sekarang.getMinutes())}:${dua(sekarang.getSeconds())}`;
    const sesi = this.daftarSesi().find((s) => String(s.id) === this.sesi());
    const lembar = lembarLaporan(this.peserta(), {
      waktu,
      jenis: this.jenis(),
      sesi: sesi ? `${sesi.nama_sesi} (${sesi.tanggal})` : '',
      tanggal: this.tanggal(),
      cari: this.cari(),
    });
    unduhXlsx(`laporan-psikotes-${tgl}.xlsx`, buatXlsx(lembar));
  }
}
