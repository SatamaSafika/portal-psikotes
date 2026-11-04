import { Injectable, signal } from '@angular/core';
import type { Undangan } from './admin-model';

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

  /** Lupakan semua token mentah (saat keluar). */
  bersihkan(): void {
    this.undangan.set(new Map());
    this.username.set(null);
  }
}
