// Angka latihan Tes Koran. Bukan rahasia, tidak dikirim ke database.
// Kunci tiap kotak = digit terakhir dari jumlah dua angka bersebelahan,
// dihitung di browser saat latihan.
export const LATIHAN_KORAN = {
  contoh1: [2, 3, 1, 4, 3],        // semua hasil 9 atau kurang
  contoh2: [9, 5, 8, 7, 9, 6],     // semua hasil 10 atau lebih
  ujiCoba: [4, 3, 8, 6, 7, 9, 2],  // campuran
  ujiCoba2: [5, 8, 2, 9, 4, 1, 7], // lajur uji coba kedua (hanya latihan), campuran
};

/** Lajur uji coba berurutan: selesaikan lajur pertama, lalu lajur kedua (sama seperti tes). */
export const LAJUR_UJI_COBA = [LATIHAN_KORAN.ujiCoba, LATIHAN_KORAN.ujiCoba2];

export const kunciKoran = (angka: number[]) =>
  angka.slice(0, -1).map((n, i) => (n + angka[i + 1]) % 10);