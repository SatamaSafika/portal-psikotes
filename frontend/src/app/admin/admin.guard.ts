import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { ApiAdmin } from './admin-api.service';
import { AdminSesi } from './admin-sesi.service';

/** Dashboard hanya untuk admin HC yang sudah login. */
export const adminGuard: CanActivateFn = async () => {
  // inject() hanya boleh sebelum await.
  const api = inject(ApiAdmin);
  const sesi = inject(AdminSesi);
  const router = inject(Router);
  try {
    sesi.username.set((await api.saya()).username);
    return true;
  } catch {
    return router.parseUrl('/admin/masuk');
  }
};
