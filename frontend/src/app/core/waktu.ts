// Hitung mundur berdasarkan sisa waktu dari server, bukan jam peserta.
// Jam browser hanya dipakai untuk mengukur selang sejak sisa waktu terakhir diterima.

/** "mm:ss", tidak pernah negatif. */
export function formatSisa(detik: number): string {
  const d = Math.max(0, Math.floor(detik));
  return `${String(Math.floor(d / 60)).padStart(2, '0')}:${String(d % 60).padStart(2, '0')}`;
}

/** "10 menit", "7 menit 20 detik". */
export function formatDurasi(detik: number): string {
  const m = Math.floor(detik / 60);
  const s = detik % 60;
  if (m === 0) return `${s} detik`;
  return s === 0 ? `${m} menit` : `${m} menit ${s} detik`;
}

export class HitungMundur {
  private akhirMs: number;

  /** sisaDetik dari server, diterimaMs = performance.now() saat respons diterima. */
  constructor(sisaDetik: number, diterimaMs: number) {
    this.akhirMs = diterimaMs + sisaDetik * 1000;
  }

  /** Menyamakan ulang dengan sisa waktu terbaru dari server. */
  sinkron(sisaDetik: number, diterimaMs: number): void {
    this.akhirMs = diterimaMs + sisaDetik * 1000;
  }

  /** Sisa detik (dibulatkan ke atas) pada saat sekarangMs. */
  sisa(sekarangMs: number): number {
    return Math.max(0, Math.ceil((this.akhirMs - sekarangMs) / 1000));
  }
}
