import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { JenisTes } from '../core/model';
import type {
  BarisHasil,
  CatatanHc,
  DetailSesi,
  EmailKelompok,
  JadwalTes,
  JawabanNomor,
  ModeSesi,
  PesertaKelompok,
  Ringkasan,
  SesiRingkas,
  Template,
  TokenKelompokBaru,
  Undangan,
} from './admin-model';

const DASAR = '/api/admin';

/** Akses API admin HC. Cookie sesi admin dikirim otomatis (satu origin lewat proksi /api). */
@Injectable({ providedIn: 'root' })
export class ApiAdmin {
  private readonly http = inject(HttpClient);
  private get<T>(rute: string, params?: HttpParams): Promise<T> {
    return firstValueFrom(this.http.get<T>(`${DASAR}${rute}`, { params }));
  }
  private post<T>(rute: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.post<T>(`${DASAR}${rute}`, body));
  }

  masuk(username: string, password: string): Promise<{ username: string }> {
    return this.post('/login', { username, password });
  }
  keluar(): Promise<void> {
    return this.post('/logout', {});
  }
  saya(): Promise<{ username: string }> {
    return this.get('/saya');
  }

  ringkasan(): Promise<Ringkasan> {
    return this.get('/ringkasan');
  }

  daftarSesi(): Promise<{ sesi: SesiRingkas[] }> {
    return this.get('/sesi');
  }
  detailSesi(id: number): Promise<DetailSesi> {
    return this.get(`/sesi/${id}`);
  }
  buatSesi(data: {
    nama_sesi: string;
    jadwal: JadwalTes[];
    peserta: { email: string; nama: string | null }[];
    template: Template | null;
  }): Promise<{ sesi_id: number; undangan: Undangan[] }> {
    return this.post('/sesi', data);
  }
  templateBawaan(mode: ModeSesi = 'INDIVIDU'): Promise<Template> {
    return this.get('/template-bawaan', mode === 'KELOMPOK' ? new HttpParams().set('mode', 'kelompok') : undefined);
  }
  tokenBaru(sesiId: number, email: string): Promise<{ undangan: Undangan }> {
    return this.post(`/sesi/${sesiId}/token-baru`, { email });
  }
  tandaiDikirim(sesiId: number, email: string): Promise<void> {
    return this.post(`/sesi/${sesiId}/undangan-dikirim`, { email });
  }
  cabut(ujianId: number): Promise<void> {
    return this.post(`/ujian/${ujianId}/cabut`, {});
  }

  // ----- sesi serentak (token kelompok) -----
  buatSesiKelompok(data: {
    nama_sesi: string;
    kuota: number;
    email_penerima: string;
    jadwal: JadwalTes[];
    template: Template | null;
  }): Promise<{ sesi_id: number; token: TokenKelompokBaru[]; email: EmailKelompok }> {
    return this.post('/sesi-kelompok', data);
  }
  pesertaKelompok(kelompokId: number): Promise<{ peserta: PesertaKelompok[] }> {
    return this.get(`/kelompok/${kelompokId}/peserta`);
  }
  tambahKuota(kelompokId: number): Promise<{ kuota: number }> {
    return this.post(`/kelompok/${kelompokId}/tambah-kuota`, {});
  }
  tokenBaruKelompok(kelompokId: number): Promise<{ token: TokenKelompokBaru; email: EmailKelompok | null }> {
    return this.post(`/kelompok/${kelompokId}/token-baru`, {});
  }
  cabutKelompok(kelompokId: number): Promise<void> {
    return this.post(`/kelompok/${kelompokId}/cabut`, {});
  }
  tandaiEmailKelompok(sesiId: number): Promise<void> {
    return this.post(`/sesi/${sesiId}/email-kelompok-dikirim`, {});
  }
  ubahNama(ujianId: number, nama: string): Promise<{ nama: string }> {
    return firstValueFrom(this.http.put<{ nama: string }>(`${DASAR}/ujian/${ujianId}/nama`, { nama }));
  }

  /** Filter jenis tes dan tanggal diterapkan di layar per peserta, supaya laporan tetap memuat semua tesnya. */
  hasil(sesi: string): Promise<{ hasil: BarisHasil[]; interval_detik: number; terpotong: boolean }> {
    return this.get('/hasil', sesi ? new HttpParams().set('sesi', sesi) : undefined);
  }
  jawabanUjian(ujianId: number): Promise<{ jenis_tes: JenisTes; jawaban: JawabanNomor[] }> {
    return this.get(`/ujian/${ujianId}/jawaban`);
  }
  /** Simpan catatan HC ke semua tes satu Laporan Peserta. Teks kosong menghapus catatan. */
  simpanCatatan(ujianId: number[], catatan: string): Promise<CatatanHc> {
    return this.post('/hasil/catatan', { ujian_id: ujianId, catatan });
  }
}
