# Frontend (Angular)

Angular 22, komponen standalone, sinyal, tanpa SSR. Butuh Node 24 LTS.
Tampilan mengikuti prototipe UI v50. Semua teks dan aset yang tampil ke peserta dan admin bersifat netral, tanpa nama dan logo perusahaan.

## Menjalankan
1. Backend berjalan di `http://localhost:3000` (`npm run dev` di folder `backend`).
2. Di folder ini: `npm install` (sekali), lalu `npm start`.
3. Buka `http://localhost:4200`. Permintaan `/api` diteruskan ke backend lewat `proxy.conf.json`, jadi cookie sesi tetap satu origin.

Perintah lain: `npm run build` (hasil di `dist/`), `npm test` (tes unit Vitest).

## Struktur
```
src/app/admin/        dashboard HC di /admin (dimuat terpisah): login, overview, token dan jadwal, hasil, grafik SVG
src/app/bersama/      komponen tampilan bersama: tanda produk, ilustrasi SVG, chip Catatan (tooltip), avatar inisial
src/app/core/         akses API, keadaan pengerjaan, hitung mundur, antrean simpan otomatis, navigasi, ikon Lucide
src/app/halaman/      pilih tes, verifikasi, instruksi, latihan, kerjakan, kirim, selesai
src/app/tata-letak/   header (stepper) dan footer netral
src/app/koran/        Tes Koran: lajur, latihan (contoh 1, contoh 2, uji coba; bahan di latihan.ts), layar tes
src/styles.scss       memuat gaya per area di src/styles/ (prototipe v50)
src/styles/           _token (warna, bentuk, font), _dasar, _komponen, _peserta, _tes, _admin, _laporan (cetak A4)
```

## Gaya tampilan (prototipe v50)
- Warna, radius, bayangan, dan font hanya lewat variabel di `src/styles/_token.scss`. Beberapa warna lebih gelap dari prototipe supaya lolos kontras WCAG AA (alasan di komentar berkas itu).
- Halaman tes (`app-kerjakan`) tetap tenang: efek hover dan animasi dimatikan di `_tes.scss`. Jangan menambah efek di sana.
- Efek gerak mati bila pengguna memilih `prefers-reduced-motion`.
- Penjelasan panjang di dashboard HC memakai `<app-catatan>`; teksnya tetap ada dan bisa dibuka dengan keyboard.

## Aturan yang dijaga di front-end
- Kunci soal tidak pernah ada di browser. Kunci latihan TIU baru diminta ke server setelah peserta menjawab.
- Timer dihitung dari sisa waktu server dan disinkronkan ulang tiap 30 detik. Saat habis, jawaban dikirim otomatis.
- Jawaban TIU disimpan otomatis (jeda singkat, dicoba lagi bila gagal). Kirim manual hanya bila semua jawaban tersimpan.
- Peserta tidak pernah melihat skor.
- Koran: hanya satu kotak aktif (satu-satunya `<input>`), satu angka langsung terkunci tanpa Enter, halaman berganti otomatis, tidak bisa kembali atau melompat. Susunan halaman, lajur, dan angka selalu dari server. `waktu_ms` tiap jawaban dari waktu berjalan server, tidak pernah mundur; jawaban dikirim berurutan.
