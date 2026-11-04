import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { JenisTes } from '../core/model';
import type {
  BarisHasil,
  DetailSesi,
  JadwalTes,
  JawabanNomor,
  Ringkasan,
  SesiRingkas,
  Template,
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
  templateBawaan(): Promise<Template> {
    return this.get('/template-bawaan');
  }
  simpanTemplate(sesiId: number, t: Template): Promise<void> {
    return firstValueFrom(this.http.put<void>(`${DASAR}/sesi/${sesiId}/template`, t));
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

  hasil(filter: { jenis: JenisTes | ''; sesi: string; tanggal: string }): Promise<{ hasil: BarisHasil[] }> {
    let p = new HttpParams();
    if (filter.jenis) p = p.set('jenis', filter.jenis);
    if (filter.sesi) p = p.set('sesi', filter.sesi);
    if (filter.tanggal) p = p.set('tanggal', filter.tanggal);
    return this.get('/hasil', p);
  }
  jawabanUjian(ujianId: number): Promise<{ jenis_tes: JenisTes; jawaban: JawabanNomor[] }> {
    return this.get(`/ujian/${ujianId}/jawaban`);
  }
}
