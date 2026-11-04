import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { pesanGalat } from '../core/api.service';
import { DAFTAR_TES, LABEL_TES, type JenisTes } from '../core/model';
import { uraiPeserta } from './admin-alat';
import { ApiAdmin } from './admin-api.service';
import { LABEL_STATUS, type DetailSesi, type SesiRingkas, type Template, type Undangan } from './admin-model';
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

/**
 * Token dan jadwal: buat sesi (jadwal per tes), kirim undangan lewat Outlook (mailto), status token, cabut.
 * Token mentah hanya ada sesaat setelah dibuat; setelah halaman dimuat ulang, kirim ulang = buat token baru.
 */
@Component({
  selector: 'app-admin-token',
  templateUrl: './admin-token.html',
})
export class AdminToken implements OnInit {
  private readonly api = inject(ApiAdmin);
  private readonly sesiAdmin = inject(AdminSesi);

  protected readonly daftarTes = DAFTAR_TES;
  protected readonly label = LABEL_TES;
  protected readonly labelStatus = LABEL_STATUS;
  protected readonly tesLabel = (t: JenisTes): string => LABEL_TES[t];

  // ----- form buat sesi -----
  protected readonly namaSesi = signal('');
  protected readonly jadwal = signal<Record<JenisTes, IsianJadwal>>({
    TIU5: { aktif: true, tanggal: hariIni(), buka: '08:00', tutup: '09:00' },
    TIU6: { aktif: false, tanggal: hariIni(), buka: '09:30', tutup: '10:30' },
    KORAN: { aktif: false, tanggal: hariIni(), buka: '11:00', tutup: '12:00' },
  });
  protected readonly pesertaTeks = signal('');
  protected readonly template = signal<Template>({ subjek: '', isi: '' });
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
  protected readonly ubahTemplateSesi = signal(false);
  protected readonly templateSesi = signal<Template>({ subjek: '', isi: '' });

  private readonly undanganMemori = computed(() => {
    const id = this.sesiId();
    return id === null ? new Map<string, Undangan>() : this.sesiAdmin.undanganSesi(id);
  });

  protected readonly barisUndangan = computed<BarisUndangan[]>(() => {
    const d = this.detail();
    if (!d) return [];
    const memori = this.undanganMemori();
    const per = new Map<string, BarisUndangan>();
    for (const u of d.ujian) {
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
    const memori = this.undanganMemori();
    const pilih = this.pratinjauEmail();
    const u = (pilih && memori.get(pilih)) || memori.values().next().value;
    if (u) return { kepada: u.email, subjek: u.subjek, isi: u.isi };
    const d = this.detail();
    return d ? { kepada: '[email peserta]', subjek: d.template_subjek, isi: d.template_isi } : null;
  });

  async ngOnInit(): Promise<void> {
    try {
      const [t] = await Promise.all([this.api.templateBawaan(), this.muatDaftar()]);
      this.template.set(t);
      const pertama = this.daftarSesi()[0];
      if (pertama) await this.pilihSesi(pertama.id);
    } catch (galat) {
      this.galat.set(pesanGalat(galat));
    }
  }

  // ----- form -----

  protected ubahJadwal(tes: JenisTes, kolom: keyof IsianJadwal, nilai: string | boolean): void {
    this.jadwal.update((j) => ({ ...j, [tes]: { ...j[tes], [kolom]: nilai } }));
  }

  protected nilai(e: Event): string {
    return (e.target as HTMLInputElement | HTMLTextAreaElement).value;
  }

  protected centang(e: Event): boolean {
    return (e.target as HTMLInputElement).checked;
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
    const p = uraiPeserta(this.pesertaTeks());
    galat.push(...p.galat);
    if (p.peserta.length === 0 && p.galat.length === 0) galat.push('Isi minimal satu email peserta.');
    this.galatBuat.set(galat);
    if (galat.length > 0) return;

    this.membuat.set(true);
    try {
      const hasil = await this.api.buatSesi({
        nama_sesi: this.namaSesi().trim(),
        jadwal,
        peserta: p.peserta,
        template: this.ubahTemplateBaru() ? this.template() : null,
      });
      this.sesiAdmin.simpanUndangan(hasil.sesi_id, hasil.undangan);
      this.namaSesi.set('');
      this.pesertaTeks.set('');
      this.pesan.set(
        `Sesi dibuat dengan ${hasil.undangan.length} peserta. Kirim undangan sekarang: token hanya tersedia selama halaman ini terbuka.`,
      );
      await this.muatDaftar();
      await this.pilihSesi(hasil.sesi_id);
    } catch (galat) {
      const rincian = (galat as { error?: { galat?: unknown } })?.error?.galat;
      this.galatBuat.set(Array.isArray(rincian) ? rincian.map(String) : [pesanGalat(galat)]);
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
    this.ubahTemplateSesi.set(false);
    await this.muatDetail();
  }

  private async muatDetail(): Promise<void> {
    const id = this.sesiId();
    if (id === null) return;
    try {
      const d = await this.api.detailSesi(id);
      this.detail.set(d);
      this.templateSesi.set({ subjek: d.template_subjek, isi: d.template_isi });
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

  protected async cabut(ujianId: number, email: string, tes: JenisTes): Promise<void> {
    if (!confirm(`Cabut token ${LABEL_TES[tes]} untuk ${email}? Token tidak bisa dipakai lagi.`)) return;
    try {
      await this.api.cabut(ujianId);
      await this.muatDetail();
    } catch (galat) {
      this.galat.set(pesanGalat(galat));
    }
  }

  protected async simpanTemplateSesi(): Promise<void> {
    const id = this.sesiId();
    if (id === null) return;
    try {
      await this.api.simpanTemplate(id, this.templateSesi());
      this.ubahTemplateSesi.set(false);
      await this.muatDetail();
      this.pesan.set('Template sesi disimpan. Berlaku untuk undangan yang dibuat berikutnya (token baru atau peserta baru).');
    } catch (galat) {
      const rincian = (galat as { error?: { galat?: unknown } })?.error?.galat;
      this.galat.set(Array.isArray(rincian) ? rincian.join(' ') : pesanGalat(galat));
    }
  }

  protected bisaDicabut(status: string): boolean {
    return status === 'BELUM_DIPAKAI' || status === 'BERJALAN';
  }
}
