import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiPeserta, pesanGalat } from '../core/api.service';
import { BUTIR_PER_SOAL_TIU6, LABEL_TES, type HasilPeriksa, type ItemLatihan } from '../core/model';
import { PengerjaanService } from '../core/pengerjaan.service';
import { LatihanKoran } from '../koran/latihan-koran';
import { KakiPortal } from '../tata-letak/kaki-portal';
import { KepalaPortal } from '../tata-letak/kepala-portal';

type HasilTiu5 = { benar: boolean; kunci: string; penjelasan?: string };
type HasilTiu6 = { butir: { butir: number; benar: boolean; kunci: string }[] };

/**
 * Latihan: tidak dinilai dan tidak disimpan. Kunci diminta ke server setelah peserta menjawab
 * (TIU 5: setelah memilih; TIU 6: setelah kelima butir terisi). Penjelasan hanya TIU 5.
 */
@Component({
  selector: 'app-latihan',
  imports: [RouterLink, KepalaPortal, KakiPortal, LatihanKoran],
  templateUrl: './latihan.html',
})
export class Latihan implements OnInit {
  private readonly api = inject(ApiPeserta);
  private readonly pengerjaan = inject(PengerjaanService);
  private readonly router = inject(Router);

  protected readonly pilihan5 = [1, 2, 3, 4, 5].map(String);
  protected readonly butir = Array.from({ length: BUTIR_PER_SOAL_TIU6 }, (_, i) => i + 1);

  protected readonly jenis = computed(() => this.pengerjaan.info()?.jenis_tes ?? null);
  protected readonly labelTes = computed(() => (this.jenis() ? LABEL_TES[this.jenis()!] : ''));
  protected readonly instruksi = computed(() => this.pengerjaan.latihan()?.instruksi ?? null);
  protected readonly daftar = computed<ItemLatihan[]>(() => this.pengerjaan.latihan()?.latihan ?? []);
  protected readonly indeks = signal(0);
  protected readonly item = computed(() => this.daftar()[this.indeks()] ?? null);
  protected readonly terakhir = computed(() => this.indeks() === this.daftar().length - 1);

  /** Jawaban latihan per nomor: TIU 5 satu nilai, TIU 6 lima nilai ('' = belum). */
  protected readonly jawaban = signal<Record<number, string[]>>({});
  protected readonly hasil = signal<Record<number, HasilPeriksa>>({});
  protected readonly galat = signal('');
  protected readonly memulai = signal(false);

  async ngOnInit(): Promise<void> {
    if (this.pengerjaan.sudahMulai()) {
      await this.router.navigateByUrl('/tes/kerjakan');
      return;
    }
    try {
      await this.pengerjaan.muatLatihan();
    } catch (galat) {
      this.galat.set(pesanGalat(galat));
    }
  }

  protected gambar(nama: string): string {
    return this.api.gambarUrl(nama);
  }

  protected isian(nomor: number): string[] {
    return this.jawaban()[nomor] ?? [];
  }

  protected hasil5(nomor: number): HasilTiu5 | null {
    const h = this.hasil()[nomor];
    return h && 'kunci' in h ? h : null;
  }

  protected hasil6(nomor: number, butir: number): HasilTiu6['butir'][number] | null {
    const h = this.hasil()[nomor];
    return h && 'butir' in h ? (h.butir.find((b) => b.butir === butir) ?? null) : null;
  }

  protected async pilih5(nomor: number, nilai: string): Promise<void> {
    this.jawaban.update((j) => ({ ...j, [nomor]: [nilai] }));
    await this.periksa(nomor, nilai);
  }

  protected async pilih6(nomor: number, butir: number, nilai: 'B' | 'S'): Promise<void> {
    const isi = [...(this.isian(nomor).length ? this.isian(nomor) : Array<string>(BUTIR_PER_SOAL_TIU6).fill(''))];
    isi[butir - 1] = nilai;
    this.jawaban.update((j) => ({ ...j, [nomor]: isi }));
    if (isi.every((x) => x === 'B' || x === 'S')) await this.periksa(nomor, isi);
  }

  private async periksa(nomor: number, jawaban: string | string[]): Promise<void> {
    this.galat.set('');
    try {
      const h = await this.api.periksaLatihan(nomor, jawaban);
      this.hasil.update((x) => ({ ...x, [nomor]: h }));
    } catch (galat) {
      this.galat.set(pesanGalat(galat));
    }
  }

  protected berikutnya(): void {
    this.indeks.update((i) => Math.min(i + 1, this.daftar().length - 1));
  }

  protected sebelumnya(): void {
    this.indeks.update((i) => Math.max(i - 1, 0));
  }

  /** Mulai tes: timer server mulai berjalan di halaman pengerjaan. */
  protected async mulaiTes(): Promise<void> {
    this.memulai.set(true);
    await this.router.navigateByUrl('/tes/kerjakan');
  }
}
