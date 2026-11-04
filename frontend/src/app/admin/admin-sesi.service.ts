import { Injectable, signal } from '@angular/core';
import type { EmailKelompok, Undangan } from './admin-model';

/** Token kelompok mentah dan email terakhir untuk penerima, per sesi serentak. */
export interface MemoriKelompok {
  /** kelompok_id -> token mentah. */
  token: ReadonlyMap<number, string>;
  /** Email terakhir yang dibuat (saat sesi dibuat atau token baru). */
  email: EmailKelompok | null;
}

/**
 * Keadaan admin selama aplikasi terbuka.
 * Undangan berisi token mentah yang hanya ada sesaat setelah dibuat (database hanya menyimpan hash),
 * jadi disimpan di memori saja: hilang bila halaman dimuat ulang atau admin keluar. Tidak disimpan di browser storage.
 */
@Injectable({ providedIn: 'root' })
export class AdminSesi {
  readonly username = signal<string | null>(null);
  /** sesi_id -> email -> undangan dengan token mentah. */
  private readonly undangan = signal<ReadonlyMap<number, ReadonlyMap<string, Undangan>>>(new Map());
  /** sesi_id -> token kelompok mentah (sesi serentak). */
  private readonly kelompok = signal<ReadonlyMap<number, MemoriKelompok>>(new Map());

  undanganSesi(sesiId: number): ReadonlyMap<string, Undangan> {
    return this.undangan().get(sesiId) ?? new Map();
  }

  simpanUndangan(sesiId: number, daftar: Undangan[]): void {
    const semua = new Map(this.undangan());
    const sesi = new Map(semua.get(sesiId) ?? []);
    for (const u of daftar) sesi.set(u.email, u);
    semua.set(sesiId, sesi);
    this.undangan.set(semua);
  }

  kelompokSesi(sesiId: number): MemoriKelompok {
    return this.kelompok().get(sesiId) ?? { token: new Map(), email: null };
  }

  /** Simpan token kelompok mentah. Token baru menggantikan token lama untuk kelompok yang sama. */
  simpanKelompok(sesiId: number, token: { kelompok_id: number; token: string }[], email: EmailKelompok | null): void {
    const semua = new Map(this.kelompok());
    const lama = this.kelompokSesi(sesiId);
    const peta = new Map(lama.token);
    for (const t of token) peta.set(t.kelompok_id, t.token);
    semua.set(sesiId, { token: peta, email: email ?? lama.email });
    this.kelompok.set(semua);
  }

  /** Lupakan semua token mentah (saat keluar). */
  bersihkan(): void {
    this.undangan.set(new Map());
    this.kelompok.set(new Map());
    this.username.set(null);
  }
}
