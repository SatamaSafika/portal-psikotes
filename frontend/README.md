# Frontend (Angular)

Angular 22, komponen standalone, sinyal, tanpa SSR. Butuh Node 24 LTS (lihat `docs/VERSI.md`).
Acuan tampilan dan perilaku: `docs/prototipe/PROTOTIPE_SPEC.md`. Tanpa nama dan logo perusahaan (CLAUDE.md aturan keras 10).

## Menjalankan
1. Backend berjalan di `http://localhost:3000` (`npm run dev` di folder `backend`).
2. Di folder ini: `npm install` (sekali), lalu `npm start`.
3. Buka `http://localhost:4200`. Permintaan `/api` diteruskan ke backend lewat `proxy.conf.json`, jadi cookie sesi tetap satu origin.

Perintah lain: `npm run build` (hasil di `dist/`), `npm test` (tes unit Vitest).

## Struktur
```
src/app/core/         akses API, keadaan pengerjaan, hitung mundur, antrean simpan otomatis, navigasi
src/app/halaman/      pilih tes, verifikasi, instruksi, latihan, kerjakan, kirim, selesai
src/app/tata-letak/   header (stepper) dan footer netral
src/app/koran/        Tes Koran: lajur, latihan (contoh 1, contoh 2, uji coba; bahan di latihan.ts), layar tes
src/styles.scss       token desain dari prototipe (warna, kartu, tombol)
```

## Aturan yang dijaga di front-end
- Kunci soal tidak pernah ada di browser. Kunci latihan TIU baru diminta ke server setelah peserta menjawab.
- Timer dihitung dari sisa waktu server dan disinkronkan ulang tiap 30 detik. Saat habis, jawaban dikirim otomatis.
- Jawaban TIU disimpan otomatis (jeda singkat, dicoba lagi bila gagal). Kirim manual hanya bila semua jawaban tersimpan.
- Peserta tidak pernah melihat skor.
- Koran: hanya satu kotak aktif (satu-satunya `<input>`), Enter mengunci, tidak bisa kembali atau melompat. Susunan halaman, lajur, dan angka selalu dari server. `waktu_ms` tiap jawaban dari waktu berjalan server, tidak pernah mundur; jawaban dikirim berurutan.
