export interface BarisCsv {
  /** Nomor baris di berkas tempat baris ini mulai (mulai dari 1). */
  nomor: number;
  kolom: string[];
}

/**
 * Parser CSV kecil (RFC 4180): pemisah koma, nilai boleh dibungkus tanda kutip,
 * "" di dalam kutipan berarti satu tanda kutip, baris baru di dalam kutipan diperbolehkan.
 * BOM di awal dibuang, akhir baris CRLF atau LF. Baris kosong dilewati.
 */
export function uraiCsv(teks: string): BarisCsv[] {
  const hasil: BarisCsv[] = [];
  const s = teks.charCodeAt(0) === 0xfeff ? teks.slice(1) : teks;

  let kolom: string[] = [];
  let nilai = '';
  let dalamKutip = false;
  let barisSekarang = 1;
  let barisMulai = 1;

  const tutupBaris = (): void => {
    kolom.push(nilai);
    if (!(kolom.length === 1 && kolom[0] === '')) hasil.push({ nomor: barisMulai, kolom });
    kolom = [];
    nilai = '';
  };

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (dalamKutip) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          nilai += '"';
          i++;
        } else {
          dalamKutip = false;
        }
      } else {
        if (c === '\n') barisSekarang++;
        nilai += c;
      }
      continue;
    }
    if (c === '"' && nilai === '') {
      dalamKutip = true;
    } else if (c === ',') {
      kolom.push(nilai);
      nilai = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      tutupBaris();
      barisSekarang++;
      barisMulai = barisSekarang;
    } else {
      nilai += c;
    }
  }
  if (dalamKutip) throw new Error(`Tanda kutip tidak ditutup (mulai baris ${barisMulai})`);
  if (nilai !== '' || kolom.length > 0) tutupBaris();
  return hasil;
}
