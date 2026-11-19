# Portal Psikotes

Aplikasi web untuk menyelenggarakan psikotes daring: Tes Intelegensi Umum (TIU 5 dan TIU 6) serta Tes Koran (Kraepelin). Peserta mengerjakan tes dengan token, server menilai otomatis, dan admin HC memantau, meninjau, serta mengekspor hasil dari satu dashboard.

> Repositori privat untuk penggunaan internal. Soal, kunci jawaban, kredensial, dan data peserta tidak pernah disimpan di repositori ini.

## Fitur

**Portal peserta**
- Masuk dengan token, dalam dua mode:
  - Individu: token sekali pakai per tes, terikat email.
  - Serentak: satu token kelompok per tes dengan kuota, peserta cukup mengisi nama.
- Persetujuan peserta sebelum tes dimulai. Waktu dan versi teks persetujuan dicatat.
- Instruksi dan soal latihan dengan umpan balik untuk setiap tes.
- Timer dari server, simpan otomatis, dan kirim otomatis saat waktu habis.
- TIU 5 dan TIU 6: urutan soal acak per peserta. Soal boleh dilewati dan jawaban boleh diubah sebelum dikirim.
- Tes Koran: 13 halaman x 4 lajur. Setiap angka langsung terkunci, dikerjakan berurutan, dan urutannya ditegakkan di server.
- Peserta tidak pernah melihat skor.

**Dashboard HC**
- Overview: jumlah peserta sedang mengerjakan, selesai hari ini, dan total selesai.
- Pembuatan sesi dengan jadwal per tes, undangan email dari template yang bisa disunting, pencabutan token, dan pengelolaan kuota.
- Hasil per peserta: skor mentah, kategori, dan skor akhir. Tes Koran dilengkapi grafik kinerja per interval 26 detik.
- Laporan Peserta siap cetak (A4), detail jawaban per nomor, ekspor Excel (`.xlsx`), dan ekspor PDF.

## Teknologi

| Lapisan | Teknologi |
| --- | --- |
| Frontend | Angular 22 (komponen standalone, signals), TypeScript, SCSS, Vitest |
| Backend | Node.js 24 LTS, Express 5, TypeScript |
| Database | Microsoft SQL Server, driver `mssql` dengan kueri berparameter |
| Keamanan | argon2id (sandi admin), Helmet, pembatasan laju, cookie sesi `HttpOnly` dan `SameSite=Strict` |

## Struktur repositori

```
backend/
  src/modules/     token, tes, skoring, hasil, admin
  config/          aturan tes, skoring, retensi, template email, teks persetujuan
  db/              skrip SQL tabel (dijalankan manual oleh pengelola database)
  scripts/         skrip operasional: buat admin, cek koneksi, impor dan periksa bank soal, hitung ulang
  test/            tes otomatis (data dummy)
  bank/            bank soal dan kunci (tidak dilacak git)
frontend/
  src/app/         halaman peserta, Tes Koran, dashboard HC (dimuat terpisah)
  src/styles/      token desain dan gaya per area
DEPLOY.md          panduan paket deploy dan server
```

## Memulai (pengembangan)

Prasyarat:
- Node.js 24 LTS.
- Akses ke SQL Server dengan tabel yang sudah dibuat (lihat [backend/db/README.md](backend/db/README.md)).
- Bank soal di `backend/bank/v1/`, yang diperoleh dari pemilik proyek.

```bash
# Backend: http://localhost:3000/api/health
cd backend
npm install
cp .env.example .env      # isi koneksi database; jangan di-commit
npm run db:cek            # uji koneksi
npm run admin:buat        # akun admin HC pertama
npm run dev

# Frontend: http://localhost:4200 (admin di /admin)
cd frontend
npm install
npm start
```

## Pengujian

```bash
cd backend  && npm test   # skoring, token, pengerjaan, koreksi, hasil, sesi serentak
cd frontend && npm test   # timer, antrean simpan, navigasi, Tes Koran, ekspor Excel
```

## Konfigurasi

Aturan bisnis disimpan sebagai konfigurasi di `backend/config/`, bukan ditulis langsung di kode:

| Berkas | Isi |
| --- | --- |
| `skoring.json` | Durasi tes, ambang kategori dan skor akhir, interval Tes Koran, masa simpan data |
| `tes.json` | Jumlah soal, susunan Tes Koran, versi bank aktif, toleransi waktu |
| `undangan.json`, `undangan-kelompok.json` | Template email bawaan |
| `persetujuan.json` | Teks persetujuan peserta beserta versinya |

Perubahan aturan skoring dapat diterapkan ulang ke hasil lama dengan `npm run hasil:hitung-ulang`, karena jawaban mentah disimpan.

## Keamanan dan data

- Kunci jawaban, penilaian, dan perhitungan waktu hanya ada di server. Kunci tidak pernah dikirim ke browser.
- Token disimpan sebagai hash. Token mentah hanya tampil sekali saat dibuat.
- Tidak ada pendaftaran mandiri admin. Login admin dibatasi percobaannya dan dikunci sementara setelah gagal berulang.
- Masa simpan data: jawaban mentah 3 bulan, seluruh data peserta 4 bulan setelah tanggal tes.
- Berkas rahasia (`backend/.env`, `backend/bank/`, `materi_rahasia/`) diabaikan git dan dipindahkan secara manual.

## Deploy

Paket deploy dibuat dengan `git archive`. Berkas yang tidak ikut paket ditandai di `.gitattributes`. Isi paket, berkas yang disalin manual, variabel lingkungan, dan pengaturan web server ada di [DEPLOY.md](DEPLOY.md).

## Dokumentasi lanjutan

- [backend/README.md](backend/README.md): variabel lingkungan, perintah, dan rute API.
- [backend/db/README.md](backend/db/README.md): skrip database.
- [frontend/README.md](frontend/README.md): struktur dan aturan tampilan.

## Pengembang

Satama Safika
