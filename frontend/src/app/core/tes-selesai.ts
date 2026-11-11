import { Injectable, signal } from '@angular/core';
import { DAFTAR_TES, type JenisTes } from './model';

const KUNCI = 'psikotes_tes_selesai';

/** Isi sessionStorage yang sah saja: daftar jenis tes yang dikenal, tanpa duplikat. */
export function uraiTesSelesai(mentah: string | null): JenisTes[] {
  try {
    const data: unknown = JSON.parse(mentah ?? '[]');
    if (!Array.isArray(data)) return [];
    return DAFTAR_TES.filter((t) => data.includes(t));
  } catch {
    return [];
  }
}

/**
 * Tes yang sudah dikirim dari tab browser ini, untuk penanda "Selesai" di halaman pemilihan tes.
 * Hanya penanda tampilan: aturan sekali pakai tetap ditegakkan server (token tidak bisa dipakai ulang).
 * Disimpan di sessionStorage (hilang saat tab atau browser ditutup), bukan localStorage, karena di ruang tes
 * satu komputer bisa dipakai bergantian; peserta berikutnya tetap bisa masuk dengan tokennya sendiri.
 * Tidak memuat identitas peserta.
 */
@Injectable({ providedIn: 'root' })
export class TesSelesai {
  readonly daftar = signal<JenisTes[]>(this.baca());

  catat(jenis: JenisTes): void {
    const baru = DAFTAR_TES.filter((t) => t === jenis || this.daftar().includes(t));
    this.daftar.set(baru);
    try {
      sessionStorage.setItem(KUNCI, JSON.stringify(baru));
    } catch {
      // Penyimpanan diblokir: penanda hanya berlaku sampai halaman dimuat ulang.
    }
  }

  /** Untuk peserta berikutnya di komputer yang sama. */
  lupakan(): void {
    this.daftar.set([]);
    try {
      sessionStorage.removeItem(KUNCI);
    } catch {
      // Abaikan.
    }
  }

  private baca(): JenisTes[] {
    try {
      return uraiTesSelesai(sessionStorage.getItem(KUNCI));
    } catch {
      return [];
    }
  }
}
