import type { Routes } from '@angular/router';
import { adminGuard } from './admin/admin.guard';
import { sesiPesertaGuard } from './core/sesi.guard';
import { BelumTersedia } from './halaman/belum-tersedia';
import { Instruksi } from './halaman/instruksi';
import { Kerjakan } from './halaman/kerjakan';
import { Kirim } from './halaman/kirim';
import { Landing } from './halaman/landing';
import { Latihan } from './halaman/latihan';
import { PilihTes } from './halaman/pilih-tes';
import { Selesai } from './halaman/selesai';
import { Verifikasi } from './halaman/verifikasi';

// Judul tab netral "Portal Psikotes" (tanpa nama perusahaan).
export const routes: Routes = [
  { path: '', pathMatch: 'full', component: Landing, title: 'Portal Psikotes' },
  { path: 'operator', component: PilihTes, title: 'Portal Psikotes' },
  { path: 'belum-tersedia', component: BelumTersedia, title: 'Belum tersedia · Portal Psikotes' },
  // Tautan di undangan yang terkirim sebelum 25 November 2026.
  { path: 'masuk', pathMatch: 'full', redirectTo: 'operator' },
  { path: 'masuk/:tes', component: Verifikasi, title: 'Verifikasi · Portal Psikotes' },
  {
    path: 'tes',
    canActivate: [sesiPesertaGuard],
    children: [
      { path: 'instruksi', component: Instruksi, title: 'Instruksi · Portal Psikotes' },
      { path: 'latihan', component: Latihan, title: 'Latihan · Portal Psikotes' },
      { path: 'kerjakan', component: Kerjakan, title: 'Tes · Portal Psikotes' },
      { path: 'kirim', component: Kirim, title: 'Kirim jawaban · Portal Psikotes' },
      { path: '', pathMatch: 'full', redirectTo: 'instruksi' },
    ],
  },
  { path: 'selesai', component: Selesai, title: 'Selesai · Portal Psikotes' },
  // Dashboard HC: hanya admin, dimuat terpisah (peserta tidak mengunduh kode admin).
  // Halaman peserta tidak menautkan ke sini.
  { path: 'admin/masuk', loadComponent: () => import('./admin/admin-masuk').then((m) => m.AdminMasuk), title: 'Masuk · Dashboard HC' },
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin-tata-letak').then((m) => m.AdminTataLetak),
    canActivate: [adminGuard],
    children: [
      { path: '', loadComponent: () => import('./admin/admin-overview').then((m) => m.AdminOverview), title: 'Overview · Dashboard HC' },
      { path: 'token', loadComponent: () => import('./admin/admin-token').then((m) => m.AdminToken), title: 'Token dan jadwal · Dashboard HC' },
      { path: 'hasil', loadComponent: () => import('./admin/admin-hasil').then((m) => m.AdminHasil), title: 'Hasil dan laporan · Dashboard HC' },
    ],
  },
  { path: '**', redirectTo: '' },
];
