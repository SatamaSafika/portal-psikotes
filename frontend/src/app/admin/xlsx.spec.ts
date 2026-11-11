// Data DUMMY (domain contoh.test).
import type { BarisHasil } from './admin-model';
import { kelompokkanPeserta } from './admin-alat';
import { lembarLaporan } from './laporan-excel';
import { buatXlsx, buatZip, crc32, escXml, lebarKolom, namaKolom, namaLembar, seriTanggal } from './xlsx';

const teks = (b: Uint8Array): string => new TextDecoder().decode(b);

/** Ambil isi berkas dari ZIP tanpa kompresi buatan buatZip. */
function bacaZip(zip: Uint8Array): Map<string, string> {
  const v = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const hasil = new Map<string, string>();
  for (let i = 0; v.getUint32(i, true) === 0x04034b50; ) {
    const ukuran = v.getUint32(i + 18, true);
    const panjangNama = v.getUint16(i + 26, true);
    const nama = teks(zip.subarray(i + 30, i + 30 + panjangNama));
    hasil.set(nama, teks(zip.subarray(i + 30 + panjangNama, i + 30 + panjangNama + ukuran)));
    i += 30 + panjangNama + ukuran;
  }
  return hasil;
}

describe('xlsx: bagian dasar', () => {
  it('CRC32 sesuai nilai baku', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  it('nama kolom, nama lembar, escape XML', () => {
    expect([0, 25, 26, 27, 701, 702].map(namaKolom)).toEqual(['A', 'Z', 'AA', 'AB', 'ZZ', 'AAA']);
    expect(namaLembar('Tes Koran / Kraepelin [x]')).toBe('Tes Koran   Kraepelin  x');
    expect(namaLembar('x'.repeat(40)).length).toBe(31);
    expect(escXml('<a & "b">\u0001')).toBe('&lt;a &amp; &quot;b&quot;&gt;');
  });

  it('tanggal menjadi nomor seri Excel tanpa zona waktu', () => {
    expect(seriTanggal('1900-03-01')).toBe(61);
    expect(seriTanggal('2026-11-10')).toBe(46336);
    expect(seriTanggal('2026-11-10 12:00:00')).toBe(46336.5);
    expect(seriTanggal('bukan tanggal')).toBeNull();
  });

  it('ZIP: tanda tangan, jumlah berkas, isi utuh', () => {
    const zip = buatZip([{ nama: 'a.txt', isi: new TextEncoder().encode('halo') }]);
    expect(new DataView(zip.buffer).getUint32(0, true)).toBe(0x04034b50);
    expect(bacaZip(zip).get('a.txt')).toBe('halo');
  });
});

describe('xlsx: workbook', () => {
  const lembar = [
    {
      nama: 'Uji',
      kolom: [{ judul: 'Nama' }, { judul: 'Tanggal', jenis: 'tanggal' as const }, { judul: 'Skor', jenis: 'angka' as const }],
      baris: [
        ['=SUM(A1)', '2026-11-10', 4],
        ['Peserta <Dua>', null, null],
      ],
    },
  ];
  const isi = bacaZip(buatXlsx(lembar));
  const sheet = isi.get('xl/worksheets/sheet1.xml')!;

  it('memuat bagian wajib workbook', () => {
    for (const b of ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml']) {
      expect(isi.has(b)).toBe(true);
    }
  });

  it('judul beku, AutoFilter, tanggal dan angka bertipe', () => {
    expect(sheet).toContain('state="frozen"');
    expect(sheet).toContain('<autoFilter ref="A1:C3"/>');
    expect(sheet).toContain('<c r="B2" s="2"><v>46336</v></c>');
    expect(sheet).toContain('<c r="C2" s="4"><v>4</v></c>');
  });

  it('teks berawalan = disimpan sebagai teks, bukan rumus; karakter XML di-escape', () => {
    expect(sheet).toContain('<t xml:space="preserve">=SUM(A1)</t>');
    expect(sheet).not.toContain('<f>');
    expect(sheet).toContain('Peserta &lt;Dua&gt;');
  });

  it('lebar kolom mengikuti isi terpanjang, dibatasi', () => {
    // "Peserta <Dua>" 13 + 2; tanggal 12 + 2; minimal 10.
    expect(lebarKolom(lembar[0])).toEqual([15, 14, 10]);
  });
});

describe('isi laporan Excel', () => {
  const baris = (ujian_id: number, jenis_tes: BarisHasil['jenis_tes'], ubah: Partial<BarisHasil>): BarisHasil => ({
    ujian_id, sesi_id: 1, nama_sesi: 'Sesi Uji', tanggal: '2026-11-10', jenis_tes, mode: 'INDIVIDU', email: 'satu@contoh.test',
    nama: 'Peserta Satu', status: 'DIKIRIM', selesai_pada: '2026-11-10 09:00:00', jumlah_benar: 22, jumlah_salah: 8,
    jumlah_dijawab: 30, n_koran: null, kategori: 'Baik', skor_akhir: 4, ringkasan_interval: null,
    persetujuan_pada: '2026-11-10 08:50:00', persetujuan_versi: '2026-11-04', ...ubah,
  });
  const peserta = kelompokkanPeserta([
    baris(1, 'TIU5', {}),
    baris(2, 'KORAN', { jumlah_benar: 252, jumlah_salah: 12, jumlah_dijawab: 264, n_koran: 11, kategori: 'Rata-Rata', skor_akhir: 3, status: 'WAKTU_HABIS' }),
  ]);
  const ket = { waktu: '2026-11-10 10:00:00', jenis: '' as const, sesi: '', tanggal: '' };

  it('rekap satu baris per peserta, detail hanya jenis yang ada, plus keterangan', () => {
    const l = lembarLaporan(peserta, ket);
    expect(l.map((x) => x.nama)).toEqual(['Rekap Peserta', 'TIU 5', 'Tes Koran - Kraepelin', 'Keterangan']);
    const rekap = l[0];
    expect(rekap.baris.length).toBe(1);
    const nilai = (judul: string) => rekap.baris[0][rekap.kolom.findIndex((k) => k.judul === judul)];
    expect(nilai('TIU 5 Kategori')).toBe('Baik');
    expect(nilai('TIU 6 Benar')).toBeUndefined();
    expect(nilai('Koran N')).toBe(11);
    expect(nilai('Catatan')).toBe('Waktu habis: Tes Koran / Kraepelin');
  });

  it('filter jenis tes: hanya lembar detail jenis itu', () => {
    const l = lembarLaporan(peserta, { ...ket, jenis: 'KORAN' });
    expect(l.map((x) => x.nama)).toEqual(['Rekap Peserta', 'Tes Koran - Kraepelin', 'Keterangan']);
    expect(l[1].kolom.some((k) => k.judul.startsWith('N'))).toBe(true);
    expect(l[1].baris[0][5]).toBe('Selesai (waktu habis)');
  });
});
