// Isi workbook laporan hasil (Excel .xlsx): rekap per peserta, detail per jenis tes, dan keterangan ekspor.
// Data sama dengan yang tampil di halaman Hasil dan laporan (sudah mengikuti filter aktif). Tanpa kunci jawaban.
import { DAFTAR_TES, LABEL_TES, type JenisTes } from '../core/model';
import { LABEL_STATUS, type BarisHasil, type PesertaHasil } from './admin-model';
import type { Kolom, Lembar, Nilai } from './xlsx';

export interface KeteranganEkspor {
  /** "2026-11-09 14:30:00" waktu ekspor (jam komputer admin). */
  waktu: string;
  jenis: JenisTes | '';
  sesi: string;
  tanggal: string;
  /** Teks Cari nama di halaman Hasil (kosong = tanpa filter nama). */
  cari?: string;
}

const mode = (p: { mode: string }): string => (p.mode === 'KELOMPOK' ? 'Serentak' : 'Individu');
const tes = (p: PesertaHasil, j: JenisTes): BarisHasil | undefined => p.tes.find((t) => t.jenis_tes === j);

/** Catatan per baris rekap: hal yang perlu diperhatikan HC. */
function catatan(p: PesertaHasil): string {
  const c: string[] = [];
  if (p.nama_sama) c.push('Nama sama untuk tes yang sama di sesi ini, tidak digabung');
  const habis = p.tes.filter((t) => t.status === 'WAKTU_HABIS').map((t) => LABEL_TES[t.jenis_tes]);
  if (habis.length > 0) c.push(`Waktu habis: ${habis.join(', ')}`);
  return c.join('; ');
}

function lembarRekap(peserta: PesertaHasil[]): Lembar {
  const kolom: Kolom[] = [
    { judul: 'Nama' },
    { judul: 'Email' },
    { judul: 'Sesi' },
    { judul: 'Mode' },
    { judul: 'Tanggal tes', jenis: 'tanggal' },
    { judul: 'Tes diikuti' },
    { judul: 'TIU 5 Benar', jenis: 'angka' },
    { judul: 'TIU 5 Kategori' },
    { judul: 'TIU 5 Skor akhir', jenis: 'angka' },
    { judul: 'TIU 6 Benar', jenis: 'angka' },
    { judul: 'TIU 6 Kategori' },
    { judul: 'TIU 6 Skor akhir', jenis: 'angka' },
    { judul: 'Koran Benar', jenis: 'angka' },
    { judul: 'Koran N', jenis: 'angka' },
    { judul: 'Koran Kategori' },
    { judul: 'Koran Skor akhir', jenis: 'angka' },
    { judul: 'Persetujuan', jenis: 'tanggal-jam' },
    { judul: 'Catatan' },
  ];
  const baris = peserta.map((p): Nilai[] => {
    const t5 = tes(p, 'TIU5');
    const t6 = tes(p, 'TIU6');
    const k = tes(p, 'KORAN');
    const setuju = p.tes.map((t) => t.persetujuan_pada).filter((x): x is string => !!x).sort()[0] ?? null;
    return [
      p.nama,
      p.email,
      p.nama_sesi,
      mode(p),
      p.tanggal[0] ?? null,
      p.tes.map((t) => LABEL_TES[t.jenis_tes]).join(', '),
      t5?.jumlah_benar,
      t5?.kategori,
      t5?.skor_akhir,
      t6?.jumlah_benar,
      t6?.kategori,
      t6?.skor_akhir,
      k?.jumlah_benar,
      k?.n_koran,
      k?.kategori,
      k?.skor_akhir,
      setuju,
      catatan(p),
    ];
  });
  return { nama: 'Rekap Peserta', kolom, baris };
}

function lembarTes(jenis: JenisTes, peserta: PesertaHasil[]): Lembar {
  const koran = jenis === 'KORAN';
  const kolom: Kolom[] = [
    { judul: 'Nama' },
    { judul: 'Email' },
    { judul: 'Sesi' },
    { judul: 'Mode' },
    { judul: 'Tanggal tes', jenis: 'tanggal' },
    { judul: 'Status' },
    { judul: 'Selesai pada', jenis: 'tanggal-jam' },
    { judul: koran ? 'Dikerjakan' : 'Dijawab', jenis: 'angka' },
    { judul: 'Benar', jenis: 'angka' },
    { judul: 'Salah', jenis: 'angka' },
    ...(koran ? [{ judul: 'N (benar / 22)', jenis: 'angka' as const }] : []),
    { judul: 'Kategori' },
    { judul: 'Skor akhir', jenis: 'angka' },
    { judul: 'Persetujuan', jenis: 'tanggal-jam' },
    { judul: 'Versi persetujuan' },
  ];
  const baris = peserta.flatMap((p) =>
    p.tes
      .filter((t) => t.jenis_tes === jenis)
      .map((t): Nilai[] => [
        p.nama,
        t.email,
        t.nama_sesi,
        mode(t),
        t.tanggal,
        LABEL_STATUS[t.status] ?? t.status,
        t.selesai_pada,
        t.jumlah_dijawab,
        t.jumlah_benar,
        t.jumlah_salah,
        ...(koran ? [t.n_koran] : []),
        t.kategori ?? 'Belum dihitung',
        t.skor_akhir,
        t.persetujuan_pada,
        t.persetujuan_versi,
      ]),
  );
  return { nama: LABEL_TES[jenis].replace(' / ', ' - '), kolom, baris };
}

function lembarKeterangan(peserta: PesertaHasil[], k: KeteranganEkspor): Lembar {
  return {
    nama: 'Keterangan',
    kolom: [{ judul: 'Keterangan' }, { judul: 'Nilai' }],
    baris: [
      ['Diekspor pada', k.waktu],
      ['Filter jenis tes', k.jenis ? LABEL_TES[k.jenis] : 'Semua tes'],
      ['Filter sesi', k.sesi || 'Semua sesi'],
      ['Filter tanggal tes', k.tanggal || 'Semua tanggal'],
      ['Filter nama', k.cari?.trim() || 'Semua nama'],
      ['Jumlah peserta', peserta.length],
      ['Isi', 'Hanya tes yang sudah selesai. Satu baris rekap per peserta per sesi.'],
      ['Skoring', 'Kategori dan skor akhir mengikuti aturan skoring yang dikonfirmasi HC. Koran: N = benar / 22, dibulatkan.'],
      ['Kerahasiaan', 'Dokumen internal HC. Berisi data pribadi peserta; data dihapus dari sistem 4 bulan setelah tanggal tes.'],
    ],
  };
}

/**
 * Lembar-lembar workbook. Rekap memuat semua tes peserta yang lolos filter; lembar detail hanya untuk jenis tes
 * yang dipilih (atau semua jenis yang punya data bila filter jenis kosong).
 */
export function lembarLaporan(peserta: PesertaHasil[], k: KeteranganEkspor): Lembar[] {
  const jenis = DAFTAR_TES.filter((j) => (k.jenis ? j === k.jenis : peserta.some((p) => tes(p, j))));
  return [lembarRekap(peserta), ...jenis.map((j) => lembarTes(j, peserta)), lembarKeterangan(peserta, k)];
}
