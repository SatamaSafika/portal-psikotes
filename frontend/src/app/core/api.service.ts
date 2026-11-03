import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { JawabanKoran, SoalKoran } from './koran';
import type { DataLatihan, HasilPeriksa, InfoUjian, JawabanTersimpan, JenisTes, SoalPublik } from './model';

const DASAR = '/api/peserta';

/** Akses API peserta. Cookie sesi peserta dikirim otomatis (satu origin lewat proksi /api). */
@Injectable({ providedIn: 'root' })
export class ApiPeserta {
  private readonly http = inject(HttpClient);

  masuk(data: { email: string; token: string; jenis_tes: JenisTes; nama: string }): Promise<{ jenis_tes: JenisTes }> {
    return firstValueFrom(this.http.post<{ jenis_tes: JenisTes }>(`${DASAR}/masuk`, data));
  }

  saya(): Promise<InfoUjian> {
    return firstValueFrom(this.http.get<InfoUjian>(`${DASAR}/saya`));
  }

  mulai(): Promise<InfoUjian> {
    return firstValueFrom(this.http.post<InfoUjian>(`${DASAR}/mulai`, {}));
  }

  latihan(): Promise<DataLatihan> {
    return firstValueFrom(this.http.get<DataLatihan>(`${DASAR}/latihan`));
  }

  periksaLatihan(nomor: number, jawaban: string | string[]): Promise<HasilPeriksa> {
    return firstValueFrom(this.http.post<HasilPeriksa>(`${DASAR}/latihan/periksa`, { nomor, jawaban }));
  }

  soal(): Promise<{ soal: SoalPublik[] }> {
    return firstValueFrom(this.http.get<{ soal: SoalPublik[] }>(`${DASAR}/soal`));
  }

  soalKoran(): Promise<SoalKoran> {
    return firstValueFrom(this.http.get<SoalKoran>(`${DASAR}/soal`));
  }

  /** Koran: kiriman berurutan dengan waktu_ms. */
  simpanKoran(jawaban: JawabanKoran[]): Promise<{ nomor_terakhir: number }> {
    return firstValueFrom(this.http.post<{ nomor_terakhir: number }>(`${DASAR}/koran`, { jawaban }));
  }

  jawaban(): Promise<{ jawaban: JawabanTersimpan[] }> {
    return firstValueFrom(this.http.get<{ jawaban: JawabanTersimpan[] }>(`${DASAR}/jawaban`));
  }

  simpanJawaban(jawaban: JawabanTersimpan[]): Promise<void> {
    return firstValueFrom(this.http.put<void>(`${DASAR}/jawaban`, { jawaban }));
  }

  kirim(): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${DASAR}/kirim`, {}));
  }

  gambarUrl(nama: string): string {
    return `${DASAR}/gambar/${encodeURIComponent(nama)}`;
  }
}

/** Kode status HTTP dari galat, 0 bila tidak terhubung ke server. */
export function statusGalat(galat: unknown): number {
  return galat instanceof HttpErrorResponse ? galat.status : 0;
}

/** Pesan galat yang aman ditampilkan: pesan dari server bila ada, atau pesan umum. */
export function pesanGalat(galat: unknown): string {
  if (galat instanceof HttpErrorResponse) {
    if (galat.status === 0) return 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
    const pesan = (galat.error as { pesan?: unknown } | null)?.pesan;
    if (typeof pesan === 'string') return pesan;
  }
  return 'Terjadi kendala. Coba lagi, atau hubungi tim HC.';
}
