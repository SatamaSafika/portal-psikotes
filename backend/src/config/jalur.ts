import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Folder backend dicari dengan naik dari lokasi berkas ini sampai ketemu config/skoring.json.
 * Berlaku sama saat dijalankan dengan tsx (src/) maupun hasil build (dist/src/).
 */
function cariAkarBackend(): string {
  let folder = dirname(fileURLToPath(import.meta.url));
  for (;;) {
    if (existsSync(join(folder, 'package.json')) && existsSync(join(folder, 'config', 'skoring.json'))) {
      return folder;
    }
    const atas = dirname(folder);
    if (atas === folder) throw new Error('Folder backend tidak ditemukan');
    folder = atas;
  }
}

export const AKAR_BACKEND = cariAkarBackend();
export const FOLDER_CONFIG = join(AKAR_BACKEND, 'config');
export const FOLDER_BANK = join(AKAR_BACKEND, 'bank');
/** Bahan mentah bank soal (diabaikan git). Hanya dibaca oleh skrip impor. */
export const FOLDER_MENTAH = join(AKAR_BACKEND, '..', 'materi_rahasia', 'mentah');
