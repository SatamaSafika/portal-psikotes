import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { PengerjaanService } from './pengerjaan.service';

/** Halaman /tes/** hanya untuk peserta dengan sesi yang berlaku. Tanpa sesi kembali ke halaman awal. */
export const sesiPesertaGuard: CanActivateFn = async () => {
  const pengerjaan = inject(PengerjaanService);
  const router = inject(Router);
  try {
    await pengerjaan.muatInfo();
    return true;
  } catch {
    return router.parseUrl('/');
  }
};
