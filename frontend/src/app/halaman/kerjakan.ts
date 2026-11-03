import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiPeserta, pesanGalat } from '../core/api.service';
import { BUTIR_PER_SOAL_TIU6, LABEL_TES } from '../core/model';
import { statusNomor, type StatusNomor } from '../core/navigasi';
import { PengerjaanService } from '../core/pengerjaan.service';
import { formatSisa } from '../core/waktu';
import { KerjakanKoran } from '../koran/kerjakan-koran';

/**
 * Pengerjaan TIU 5 dan TIU 6. Boleh melewati, mengosongkan (klik pilihan yang sama lagi), dan mengubah jawaban.
 * Timer dari server; jawaban disimpan otomatis; waktu habis -> kirim otomatis.
 */
@Component({
  selector: 'app-kerjakan',
  imports: [KerjakanKoran],
  templateUrl: './kerjakan.html',
})
export class Kerjakan implements OnInit {
  private readonly api = inject(ApiPeserta);
  private readonly pengerjaan = inject(PengerjaanService);
  private readonly router = inject(Router);

  protected readonly info = this.pengerjaan.info;
  protected readonly soal = this.pengerjaan.soal;
  protected readonly jawaban = this.pengerjaan.jawaban;
  protected readonly statusSimpan = this.pengerjaan.statusSimpan;
  protected readonly instruksi = computed(() => this.pengerjaan.latihan()?.instruksi ?? null);
  protected readonly jenis = computed(() => this.info()?.jenis_tes ?? null);
  protected readonly labelTes = computed(() => (this.jenis() ? LABEL_TES[this.jenis()!] : ''));
  protected readonly sisa = computed(() => formatSisa(this.pengerjaan.sisaDetik() ?? 0));
  protected readonly hampirHabis = computed(() => (this.pengerjaan.sisaDetik() ?? 999) <= 60);

  protected readonly pilihan5 = [1, 2, 3, 4, 5].map(String);
  protected readonly butir = Array.from({ length: BUTIR_PER_SOAL_TIU6 }, (_, i) => i + 1);

  protected readonly indeks = signal(0);
  protected readonly item = computed(() => this.soal()[this.indeks()] ?? null);
  protected readonly siap = signal(false);
  protected readonly galat = signal('');

  async ngOnInit(): Promise<void> {
    try {
      await this.pengerjaan.siapkanPengerjaan();
      this.siap.set(true);
    } catch (galat) {
      this.galat.set(pesanGalat(galat));
    }
  }

  /** Peringatan browser bila halaman ditutup saat masih ada jawaban yang belum tersimpan. */
  @HostListener('window:beforeunload', ['$event'])
  protected cegahTutup(e: BeforeUnloadEvent): void {
    if (this.statusSimpan() !== 'tersimpan') e.preventDefault();
  }

  protected gambar(nama: string): string {
    return this.api.gambarUrl(nama);
  }

  /** Nomor jawaban: TIU 5 = nomor soal; TIU 6 = nomor datar (soal - 1) x 5 + butir. */
  protected nomor(soalNomor: number, butir = 0): number {
    return this.jenis() === 'TIU6' ? (soalNomor - 1) * BUTIR_PER_SOAL_TIU6 + butir : soalNomor;
  }

  protected nilai(nomor: number): string | null {
    return this.jawaban().get(nomor) ?? null;
  }

  /** Klik pilihan yang sama lagi mengosongkan jawaban. */
  protected pilih(nomor: number, nilai: string): void {
    this.pengerjaan.jawab(nomor, this.nilai(nomor) === nilai ? null : nilai);
  }

  protected status(i: number): StatusNomor {
    const s = this.soal()[i];
    const nomor = this.jenis() === 'TIU6' ? this.butir.map((b) => this.nomor(s.nomor, b)) : [s.nomor];
    return statusNomor(i === this.indeks(), nomor, this.jawaban());
  }

  protected ke(i: number): void {
    if (i >= 0 && i < this.soal().length) {
      this.indeks.set(i);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  protected async keKirim(): Promise<void> {
    await this.router.navigateByUrl('/tes/kirim');
  }
}
