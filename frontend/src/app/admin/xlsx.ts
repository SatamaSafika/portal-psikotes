// Pembuat berkas Excel (.xlsx) kecil tanpa dependensi: SpreadsheetML di dalam ZIP tanpa kompresi.
// Mendukung: beberapa lembar, baris judul bergaya, AutoFilter, freeze baris judul, lebar kolom otomatis,
// format tanggal dan tanggal-jam, angka. Teks disimpan sebagai inline string (aman dari formula: tidak ada '=' yang dievaluasi).

export type JenisKolom = 'teks' | 'angka' | 'tanggal' | 'tanggal-jam';

export interface Kolom {
  judul: string;
  jenis?: JenisKolom;
}

export type Nilai = string | number | null | undefined;

export interface Lembar {
  nama: string;
  kolom: Kolom[];
  baris: Nilai[][];
}

// ---------- ZIP (metode simpan, tanpa kompresi) ----------

const TABEL_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of data) c = TABEL_CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** ZIP sederhana: nama berkas UTF-8, tanpa kompresi, tanggal tetap 1 Januari 1980. */
export function buatZip(berkas: { nama: string; isi: Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder();
  const bagian: Uint8Array[] = [];
  const pusat: Uint8Array[] = [];
  let posisi = 0;
  for (const f of berkas) {
    const nama = enc.encode(f.nama);
    const crc = crc32(f.isi);
    const lokal = new DataView(new ArrayBuffer(30));
    lokal.setUint32(0, 0x04034b50, true);
    lokal.setUint16(4, 20, true);
    lokal.setUint16(6, 0x0800, true); // nama UTF-8
    lokal.setUint16(8, 0, true); // simpan
    lokal.setUint16(10, 0, true);
    lokal.setUint16(12, 0x21, true); // 1980-01-01
    lokal.setUint32(14, crc, true);
    lokal.setUint32(18, f.isi.length, true);
    lokal.setUint32(22, f.isi.length, true);
    lokal.setUint16(26, nama.length, true);
    lokal.setUint16(28, 0, true);
    bagian.push(new Uint8Array(lokal.buffer), nama, f.isi);

    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x0800, true);
    c.setUint16(10, 0, true);
    c.setUint16(12, 0, true);
    c.setUint16(14, 0x21, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, f.isi.length, true);
    c.setUint32(24, f.isi.length, true);
    c.setUint16(28, nama.length, true);
    c.setUint32(42, posisi, true);
    pusat.push(new Uint8Array(c.buffer), nama);
    posisi += 30 + nama.length + f.isi.length;
  }
  const ukuranPusat = pusat.reduce((a, b) => a + b.length, 0);
  const akhir = new DataView(new ArrayBuffer(22));
  akhir.setUint32(0, 0x06054b50, true);
  akhir.setUint16(8, berkas.length, true);
  akhir.setUint16(10, berkas.length, true);
  akhir.setUint32(12, ukuranPusat, true);
  akhir.setUint32(16, posisi, true);
  const semua = [...bagian, ...pusat, new Uint8Array(akhir.buffer)];
  const hasil = new Uint8Array(semua.reduce((a, b) => a + b.length, 0));
  let i = 0;
  for (const s of semua) {
    hasil.set(s, i);
    i += s.length;
  }
  return hasil;
}

// ---------- SpreadsheetML ----------

/** Escape XML dan buang karakter kontrol yang tidak sah di XML. */
export function escXml(s: string): string {
  return s
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Nama kolom Excel dari indeks 0: 0 -> A, 25 -> Z, 26 -> AA. */
export function namaKolom(i: number): string {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

/**
 * "2026-11-10" atau "2026-11-10 08:15:00" menjadi nomor seri tanggal Excel (hari sejak 30 Desember 1899),
 * tanpa zona waktu: nilai yang tertulis di database ditampilkan apa adanya. Null bila tidak sah.
 */
export function seriTanggal(teks: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(teks.trim());
  if (!m) return null;
  const [, th, bl, hr, j = '0', mn = '0', dt = '0'] = m;
  const hari = (Date.UTC(+th, +bl - 1, +hr) - Date.UTC(1899, 11, 30)) / 86_400_000;
  return hari + (+j * 3600 + +mn * 60 + +dt) / 86_400;
}

/** Nama lembar Excel: maksimal 31 karakter, tanpa : \ / ? * [ ]. */
export function namaLembar(nama: string): string {
  return nama.replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 31) || 'Lembar';
}

// Indeks gaya di styles.xml: 0 biasa, 1 judul, 2 tanggal, 3 tanggal-jam, 4 angka.
const GAYA: Record<JenisKolom | 'judul', number> = { teks: 0, judul: 1, tanggal: 2, 'tanggal-jam': 3, angka: 4 };

function sel(ref: string, nilai: Nilai, jenis: JenisKolom): string {
  if (nilai === null || nilai === undefined || nilai === '') return '';
  if (jenis === 'tanggal' || jenis === 'tanggal-jam') {
    const seri = typeof nilai === 'number' ? nilai : seriTanggal(nilai);
    if (seri !== null) return `<c r="${ref}" s="${GAYA[jenis]}"><v>${seri}</v></c>`;
  }
  if (typeof nilai === 'number' && Number.isFinite(nilai)) return `<c r="${ref}" s="${GAYA.angka}"><v>${nilai}</v></c>`;
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escXml(String(nilai))}</t></is></c>`;
}

/** Lebar kolom dari isi terpanjang (karakter), dibatasi 10 sampai 50. */
export function lebarKolom(l: Lembar): number[] {
  return l.kolom.map((k, i) => {
    const jenis = k.jenis ?? 'teks';
    const isi = l.baris.map((b) => {
      const v = b[i];
      if (v === null || v === undefined) return 0;
      if (jenis === 'tanggal') return 12;
      if (jenis === 'tanggal-jam') return 17;
      return String(v).length;
    });
    return Math.min(50, Math.max(10, k.judul.length + 2, ...isi.map((n) => n + 2)));
  });
}

function xmlLembar(l: Lembar): string {
  const terakhir = namaKolom(Math.max(0, l.kolom.length - 1));
  const lebar = lebarKolom(l);
  const kolom = lebar.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');
  const judul = l.kolom.map((k, i) => `<c r="${namaKolom(i)}1" t="inlineStr" s="${GAYA.judul}"><is><t>${escXml(k.judul)}</t></is></c>`).join('');
  const baris = l.baris
    .map((b, r) => `<row r="${r + 2}">${l.kolom.map((k, i) => sel(`${namaKolom(i)}${r + 2}`, b[i], k.jenis ?? 'teks')).join('')}</row>`)
    .join('');
  const ref = `A1:${terakhir}${l.baris.length + 1}`;
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<dimension ref="${ref}"/>` +
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' +
    '<selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>' +
    '<sheetFormatPr defaultRowHeight="15"/>' +
    `<cols>${kolom}</cols>` +
    `<sheetData><row r="1" ht="22" customHeight="1">${judul}</row>${baris}</sheetData>` +
    `<autoFilter ref="${ref}"/>` +
    '</worksheet>'
  );
}

const GAYA_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<numFmts count="2"><numFmt numFmtId="164" formatCode="dd mmm yyyy"/><numFmt numFmtId="165" formatCode="dd mmm yyyy hh:mm"/></numFmts>' +
  '<fonts count="2"><font><sz val="11"/><color rgb="FF25364A"/><name val="Calibri"/><family val="2"/></font>' +
  '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font></fonts>' +
  '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FF193F69"/><bgColor indexed="64"/></patternFill></fill></fills>' +
  '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' +
  '<border><left/><right/><top/><bottom style="medium"><color rgb="FFCB642B"/></bottom><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="5">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">' +
  '<alignment vertical="center" wrapText="1"/></xf>' +
  '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="left"/></xf>' +
  '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="left"/></xf>' +
  '<xf numFmtId="1" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '</cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  '</styleSheet>';

/** Workbook .xlsx dari beberapa lembar. Nama lembar yang sama diberi akhiran angka. */
export function buatXlsx(daftar: Lembar[]): Uint8Array {
  const enc = new TextEncoder();
  const terpakai = new Set<string>();
  const nama = daftar.map((l) => {
    const dasar = namaLembar(l.nama);
    let n = dasar;
    for (let i = 2; terpakai.has(n.toLowerCase()); i++) n = `${dasar.slice(0, 28)} ${i}`;
    terpakai.add(n.toLowerCase());
    return n;
  });
  const sheets = nama.map((n, i) => `<sheet name="${escXml(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('');
  const filter = daftar
    .map((l, i) => {
      const ref = `'${n(nama[i])}'!$A$1:$${namaKolom(Math.max(0, l.kolom.length - 1))}$${l.baris.length + 1}`;
      return `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">${escXml(ref)}</definedName>`;
    })
    .join('');
  const relLembar = nama
    .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
    .join('');
  const berkas: { nama: string; isi: string }[] = [
    {
      nama: '[Content_Types].xml',
      isi:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        nama
          .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
          .join('') +
        '</Types>',
    },
    {
      nama: '_rels/.rels',
      isi:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>',
    },
    {
      nama: 'xl/workbook.xml',
      isi:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        `<sheets>${sheets}</sheets><definedNames>${filter}</definedNames></workbook>`,
    },
    {
      nama: 'xl/_rels/workbook.xml.rels',
      isi:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        relLembar +
        `<Relationship Id="rId${nama.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
        '</Relationships>',
    },
    { nama: 'xl/styles.xml', isi: GAYA_XML },
    ...daftar.map((l, i) => ({ nama: `xl/worksheets/sheet${i + 1}.xml`, isi: xmlLembar(l) })),
  ];
  return buatZip(berkas.map((b) => ({ nama: b.nama, isi: enc.encode(b.isi) })));
}

/** Nama lembar di rujukan rumus: tanda petik tunggal digandakan. */
function n(nama: string): string {
  return nama.replace(/'/g, "''");
}

/** Unduh workbook di browser. */
export function unduhXlsx(namaBerkas: string, data: Uint8Array): void {
  const blob = new Blob([data as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = namaBerkas;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
