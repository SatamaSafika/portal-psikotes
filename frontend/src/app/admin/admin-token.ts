import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Catatan } from '../bersama/catatan';
import { pesanGalat } from '../core/api.service';
import { DAFTAR_TES, LABEL_TES, type JenisTes } from '../core/model';
import { KUOTA_MAKS, jadwalSingkat, persenKuota, uraiEmail, uraiKuota, uraiPeserta } from './admin-alat';
import { ApiAdmin } from './admin-api.service';
import {
  LABEL_STATUS,
  LABEL_STATUS_KELOMPOK,
  type DetailSesi,
  type KelompokAdmin,
  type ModeSesi,
  type PesertaKelompok,
  type SesiRingkas,
  type Template,
  type Undangan,
} from './admin-model';
import { AdminSesi } from './admin-sesi.service';

interface IsianJadwal {
  aktif: boolean;
  tanggal: string;
  buka: string;
  tutup: string;
}

interface BarisUndangan {
  email: string;
  nama: string | null;
  tes: JenisTes[];
  dikirimPada: string | null;
  /** Token mentah tersedia di memori (baru dibuat), jadi bisa dikirim tanpa membuat token baru. */
  siapKirim: boolean;
  /** Masih ada token yang belum dipakai (boleh dibuatkan token baru). */
  adaBelumDipakai: boolean;
}

const hariIni = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const galatDari = (galat: unknown): string[] => {
  const rincian = (galat as { error?: { galat?: unknown } })?.error?.galat;
  return Array.isArray(rincian) ? rincian.map(String) : [pesanGalat(galat)];
};

/**
 * Token dan jadwal. Dua mode sesi:
 * - Individu: token per peserta per tes, undangan per peserta lewat Outlook (mailto).
 * - Serentak: satu token per tes dengan kuota, email token ke satu penerima (PIC); peserta masuk dengan nama saja.
 * Token mentah hanya ada sesaat setelah dibuat; setelah halaman dimuat ulang, kirim ulang = buat token baru.
 */
@Component({
  selector: 'app-admin-token',
  imports: [Catatan],
  templateUrl: './admin-token.html',
})
export class AdminToken implements OnInit {
  private readonly api = inject(ApiAdmin);
  private readonly sesiAdmin = inject(AdminSesi);

  protected readonly daftarTes = DAFTAR_TES;
  protected readonly label = LABEL_TES;
  protected readonly labelStatus = LABEL_STATUS;
  protected readonly labelKelompok = LABEL_STATUS_KELOMPOK;
  protected readonly kuotaMaks = KUOTA_MAKS;
  protected readonly persen = persenKuota;
  protected readonly tesLabel = (t: JenisTes): string => LABEL_TES[t];
  protected readonly jadwalSingkat = jadwalSingkat;

  // ----- form buat sesi -----
  protected readonly modeBaru = signal<ModeSesi>('INDIVIDU');
  protected readonly namaSesi = signal('');
  protected readonly jadwal = signal<Record<JenisTes, IsianJadwal>>({
    TIU5: { aktif: true, tanggal: hariIni(), buka: '08:00', tutup: '09:00' },
    TIU6: { aktif: false, tanggal: hariIni(), buka: '09:30', tutup: '10:30' },
    KORAN: { aktif: false, tanggal: hariIni(), buka: '11:00', tutup: '12:00' },
  });
  protected readonly pesertaTeks = signal('');
  protected readonly kuotaTeks = signal('');
  protected readonly emailPenerima = signal('');
  /** Template bawaan per mode; diubah admin bila "Ubah template" dibuka. */
  private readonly templateMode = signal<Record<ModeSesi, Template>>({
    INDIVIDU: { subjek: '', isi: '' },
    KELOMPOK: { subjek: '', isi: '' },
  });
  protected readonly template = computed(() => this.templateMode()[this.modeBaru()]);
  protected readonly ubahTemplateBaru = signal(false);
  protected readonly membuat = signal(false);
  protected readonly galatBuat = signal<string[]>([]);
  protected readonly pesan = signal('');

  // ----- sesi terpilih -----
  protected readonly daftarSesi = signal<SesiRingkas[]>([]);
  protected readonly sesiId = signal<number | null>(null);
  protected readonly detail = signal<DetailSesi | null>(null);
  protected readonly galat = signal('');
  protected readonly pratinjauEmail = signal<string | null>(null);

  // ----- sesi serentak terpilih -----
  protected readonly kelompokDipilih = signal<KelompokAdmin | null>(null);
  protected readonly pesertaKelompok = signal<PesertaKelompok[]>([]);
  protected readonly ubahNamaId = signal<number | null>(null);
  protected readonly namaBaru = signal('');

  private readonly undanganMemori = computed(() => {
    const id = this.sesiId();
    return id === null ? new Map<string, Undangan>() : this.sesiAdmin.undanganSesi(id);
  });

  protected readonly memoriKelompok = computed(() => {
    const id = this.sesiId();
    return id === null ? { token: new Map<number, string>(), email: null } : this.sesiAdmin.kelompokSesi(id);
  });

  protected readonly barisUndangan = computed<BarisUndangan[]>(() => {
    const d = this.detail();
    if (!d) return [];
    const memori = this.undanganMemori();
    const per = new Map<string, BarisUndangan>();
    for (const u of d.ujian) {
      if (!u.email) continue;
      const b = per.get(u.email) ?? {
        email: u.email,
        nama: u.nama,
        tes: [],
        dikirimPada: null,
        siapKirim: memori.has(u.email),
        adaBelumDipakai: false,
      };
      b.tes.push(u.jenis_tes);
      if (u.undangan_dikirim_pada && (!b.dikirimPada || u.undangan_dikirim_pada > b.dikirimPada)) b.dikirimPada = u.undangan_dikirim_pada;
      if (u.status === 'BELUM_DIPAKAI') b.adaBelumDipakai = true;
      per.set(u.email, b);
    }
    return [...per.values()];
  });

  /** Undangan berikutnya yang siap dikirim dan belum dibuka. */
  protected readonly belumTerkirim = computed(() => this.barisUndangan().filter((b) => b.siapKirim && !b.dikirimPada));

  protected readonly pratinjau = computed<{ kepada: string; subjek: string; isi: string } | null>(() => {
    const d = this.detail();
    if (d?.mode === 'KELOMPOK') {
      const e = this.memoriKelompok().email;
      if (e) return { kepada: e.email, subjek: e.subjek, isi: e.isi };
      return { kepada: d.email_penerima ?? '[email penerima]', subjek: d.template_subjek, isi: d.template_isi };
    }
    const memori = this.undanganMemori();
    const pilih = this.pratinjauEmail();
    const u = (pilih && memori.get(pilih)) || memori.values().next().value;
    if (u) return { kepada: u.email, subjek: u.subjek, isi: u.isi };
    return d ? { kepada: '[email peserta]', subjek: d.template_subjek, isi: d.template_isi } : null;
  });

  /** Waktu email token kelompok terakhir dibuka (sama untuk semua token di sesi). */
  protected readonly emailKelompokDikirim = computed(() => {
    const waktu = (this.detail()?.kelompok ?? []).map((k) => k.email_dikirim_pada).filter((w): w is string => !!w);
    return waktu.sort().at(-1) ?? null;
  });

  async ngOnInit(): Promise<void> {
    try {
      const [individu, kelompok] = await Promise.all([
        this.api.templateBawaan('INDIVIDU'),
        this.api.templateBawaan('KELOMPOK'),
        this.muatDaftar(),
      ]);
      this.templateMode.set({ INDIVIDU: individu, KELOMPOK: kelompok });
      const pertama = this.daftarSesi()[0];
      if (pertama) await this.pilihSesi(pertama.id);
    } catch (galat) {
      this.galat.set(pesanGalat(galat));
    }
  }

  // ----- form -----

  protected gantiMode(mode: ModeSesi): void {
    this.modeBaru.set(mode);
    this.galatBuat.set([]);
  }

  protected ubahTemplate(kolom: keyof Template, nilai: string): void {
    const mode = this.modeBaru();
    this.templateMode.update((t) => ({ ...t, [mode]: { ...t[mode], [kolom]: nilai } }));
  }

  protected ubahJadwal(tes: JenisTes, kolom: keyof IsianJadwal, nilai: string | boolean): void {
    this.jadwal.update((j) => ({ ...j, [tes]: { ...j[tes], [kolom]: nilai } }));
  }

  protected nilai(e: Event): string {
    return (e.target as HTMLInputElement | HTMLTextAreaElement).value;
  }

  protected centang(e: Event): boolean {
    return (e.target as HTMLInputElement).checked;
  }

  /** Bagian Templat email (details) terbuka atau tertutup. */
  protected terbuka(e: Event): boolean {
    return (e.target as HTMLDetailsElement).open;
  }

  protected async buatSesi(e: Event): Promise<void> {
    e.preventDefault();
    this.pesan.set('');
    const galat: string[] = [];
    if (!this.namaSesi().trim()) galat.push('Nama sesi wajib diisi.');
    const jadwal = DAFTAR_TES.filter((t) => this.jadwal()[t].aktif).map((t) => {
      const j = this.jadwal()[t];
      if (!j.tanggal || !j.buka || !j.tutup) galat.push(`${LABEL_TES[t]}: tanggal dan jam wajib diisi.`);
      else if (j.tutup <= j.buka) galat.push(`${LABEL_TES[t]}: waktu tutup harus setelah waktu buka.`);
      return { tes: t, tanggal: j.tanggal, waktu_buka: j.buka, waktu_tutup: j.tutup };
    });
    if (jadwal.length === 0) galat.push('Pilih minimal satu tes.');
    const template = this.ubahTemplateBaru() ? this.template() : null;

    if (this.modeBaru() === 'KELOMPOK') {
      const kuota = uraiKuota(this.kuotaTeks());
      const email = uraiEmail(this.emailPenerima());
      if (kuota === null) galat.push(`Jumlah peserta (kuota) harus bilangan bulat 1 sampai ${KUOTA_MAKS}.`);
      if (email === null) galat.push('Email penerima token tidak valid.');
      this.galatBuat.set(galat);
      if (galat.length > 0) return;
      await this.kirimBuat(async () => {
        const hasil = await this.api.buatSesiKelompok({
          nama_sesi: this.namaSesi().trim(),
          kuota: kuota!,
          email_penerima: email!,
          jadwal,
          template,
        });
        this.sesiAdmin.simpanKelompok(hasil.sesi_id, hasil.token, hasil.email);
        this.kuotaTeks.set('');
        this.pesan.set(
          `Sesi serentak dibuat: ${hasil.token.length} token, kuota ${kuota} per tes. Kirim email token sekarang: token hanya tersedia selama halaman ini terbuka.`,
        );
        return hasil.sesi_id;
      });
      return;
    }

    const p = uraiPeserta(this.pesertaTeks());
    galat.push(...p.galat);
    if (p.peserta.length === 0 && p.galat.length === 0) galat.push('Isi minimal satu email peserta.');
    this.galatBuat.set(galat);
    if (galat.length > 0) return;
    await this.kirimBuat(async () => {
      const hasil = await this.api.buatSesi({ nama_sesi: this.namaSesi().trim(), jadwal, peserta: p.peserta, template });
      this.sesiAdmin.simpanUndangan(hasil.sesi_id, hasil.undangan);
      this.pesertaTeks.set('');
      this.pesan.set(
        `Sesi dibuat dengan ${hasil.undangan.length} peserta. Kirim undangan sekarang: token hanya tersedia selama halaman ini terbuka.`,
      );
      return hasil.sesi_id;
    });
  }

  private async kirimBuat(buat: () => Promise<number>): Promise<void> {
    this.membuat.set(true);
    try {
      const sesiId = await buat();
      this.namaSesi.set('');
      await this.muatDaftar();
      await this.pilihSesi(sesiId);
    } catch (galat) {
      this.galatBuat.set(galatDari(galat));
    } finally {
      this.membuat.set(false);
    }
  }

  // ----- sesi terpilih -----

  private async muatDaftar(): Promise<void> {
    this.daftarSesi.set((await this.api.daftarSesi()).sesi);
  }

  protected async pilihSesi(id: number): Promise<void> {
    this.sesiId.set(id);
    this.pratinjauEmail.set(null);
    this.kelompokDipilih.set(null);
    this.pesertaKelompok.set([]);
    await this.muatDetail();
  }

  private async muatDetail(): Promise<void> {
    const id = this.sesiId();
    if (id === null) return;
    try {
      const d = await this.api.detailSesi(id);
      this.detail.set(d);
      // Segarkan baris kelompok yang sedang dibuka (kuota, terpakai, status).
      const k = this.kelompokDipilih();
      if (k) this.kelompokDipilih.set(d.kelompok.find((x) => x.kelompok_id === k.kelompok_id) ?? null);
      this.galat.set('');
    } catch (galat) {
      this.galat.set(pesanGalat(galat));
    }
  }

  /** Token mentah sebuah ujian, bila masih ada di memori. */
  protected tokenDari(ujianId: number): string | null {
    for (const u of this.undanganMemori().values()) {
      const t = u.token.find((x) => x.ujian_id === ujianId);
      if (t) return t.token;
    }
    return null;
  }

  /**
   * Kirim undangan: buka email di Outlook (mailto), lalu tandai terkirim.
   * Bila token mentah sudah tidak ada di memori, buat token baru dulu (token lama yang belum dipakai tidak berlaku lagi).
   */
  protected async kirim(b: BarisUndangan): Promise<void> {
    const id = this.sesiId();
    if (id === null) return;
    this.galat.set('');
    try {
      let u = this.undanganMemori().get(b.email);
      if (!u) {
        const ok = confirm(
          `Token untuk ${b.email} tidak lagi tersedia di halaman ini. Buat token baru? Token lama yang belum dipakai tidak berlaku lagi.`,
        );
        if (!ok) return;
        u = (await this.api.tokenBaru(id, b.email)).undangan;
        this.sesiAdmin.simpanUndangan(id, [u]);
      }
      this.pratinjauEmail.set(u.email);
      window.location.href = u.mailto;
      await this.api.tandaiDikirim(id, b.email);
      await this.muatDetail();
    } catch (galat) {
      this.galat.set(pesanGalat(galat));
    }
  }

  /** Browser memblokir banyak mailto sekaligus, jadi undangan dibuka satu per satu per klik. */
  protected async kirimBerikutnya(): Promise<void> {
    const b = this.belumTerkirim()[0];
    if (b) await this.kirim(b);
  }

  protected async cabut(ujianId: number, siapa: string, tes: JenisTes): Promise<void> {
    if (!confirm(`Cabut token ${LABEL_TES[tes]} untuk ${siapa}? Token tidak bisa dipakai lagi.`)) return;
    try {
      await this.api.cabut(ujianId);
      await this.muatDetail();
    } catch (galat) {
      this.galat.set(pesanGalat(galat));
    }
  }

  protected bisaDicabut(status: string): boolean {
    return status === 'BELUM_DIPAKAI' || status === 'BERJALAN';
  }

  // ----- sesi serentak -----

  protected tokenKelompok(kelompokId: number): string | null {
    return this.memoriKelompok().token.get(kelompokId) ?? null;
  }

  protected async lihatPeserta(k: KelompokAdmin): Promise<void> {
    this.kelompokDipilih.set(k);
    this.ubahNamaId.set(null);
    await this.muatPeserta();
  }

  private async muatPeserta(): Promise<void> {
    const k = this.kelompokDipilih();
    if (!k) return;
    try {
      this.pesertaKelompok.set((await this.api.pesertaKelompok(k.kelompok_id)).peserta);
    } catch (galat) {
      this.galat.set(pesanGalat(galat));
    }
  }

  protected async tambahKuota(k: KelompokAdmin): Promise<void> {
    this.galat.set('');
    try {
      const { kuota } = await this.api.tambahKuota(k.kelompok_id);
      this.pesan.set(`Kuota ${LABEL_TES[k.tes]} menjadi ${kuota}.`);
      await this.muatDetail();
    } catch (galat) {
      this.galat.set(pesanGalat(galat));
    }
  }

  protected async tokenBaruKelompok(k: KelompokAdmin): Promise<void> {
    const id = this.sesiId();
    if (id === null) return;
    const ok = confirm(
      `Buat token baru untuk ${LABEL_TES[k.tes]}? Token lama langsung tidak berlaku. Kuota dan peserta yang sudah masuk tidak berubah.`,
    );
    if (!ok) return;
    this.galat.set('');
    try {
      const hasil = await this.api.tokenBaruKelompok(k.kelompok_id);
      this.sesiAdmin.simpanKelompok(id, [hasil.token], hasil.email);
      this.pesan.set(`Token baru ${LABEL_TES[k.tes]}: ${hasil.token.token}. Kirim email token agar penerima mendapat token ini.`);
      await this.muatDetail();
    } catch (galat) {
      this.galat.set(pesanGalat(galat));
    }
  }

  protected async cabutKelompok(k: KelompokAdmin): Promise<void> {
    const ok = confirm(
      `Cabut token ${LABEL_TES[k.tes]}? Peserta baru tidak bisa masuk lagi. Peserta yang sudah masuk tetap dapat menyelesaikan tes.`,
    );
    if (!ok) return;
    this.galat.set('');
    try {
      await this.api.cabutKelompok(k.kelompok_id);
      await this.muatDetail();
    } catch (galat) {
      this.galat.set(pesanGalat(galat));
    }
  }

  /** Buka email token di Outlook (mailto) untuk penerima, lalu tandai terkirim. */
  protected async kirimEmailKelompok(): Promise<void> {
    const id = this.sesiId();
    const e = this.memoriKelompok().email;
    if (id === null || !e) return;
    this.galat.set('');
    try {
      window.location.href = e.mailto;
      await this.api.tandaiEmailKelompok(id);
      await this.muatDetail();
    } catch (galat) {
      this.galat.set(pesanGalat(galat));
    }
  }

  protected mulaiUbahNama(p: PesertaKelompok): void {
    this.ubahNamaId.set(p.ujian_id);
    this.namaBaru.set(p.nama);
  }

  protected async simpanNama(p: PesertaKelompok): Promise<void> {
    const nama = this.namaBaru().trim();
    if (nama.length < 2 || nama.length > 100) {
      this.galat.set('Nama harus 2 sampai 100 karakter.');
      return;
    }
    this.galat.set('');
    try {
      await this.api.ubahNama(p.ujian_id, nama);
      this.ubahNamaId.set(null);
      await this.muatPeserta();
    } catch (galat) {
      this.galat.set(pesanGalat(galat));
    }
  }
}
