# Backend (Express + TypeScript)

## Persiapan
1. Salin `.env.example` menjadi `.env`, lalu isi nilainya. Jangan commit `.env`.
2. `npm install`

Variabel yang dibaca kode:

| Nama | Isi |
| --- | --- |
| `PORT` | Port API, bawaan 3000 |
| `DB_HOST` | Alamat server SQL Server |
| `DB_PORT` | Port SQL Server |
| `DB_NAME` | Nama database, yaitu `BA` |
| `DB_USER`, `DB_PASSWORD` | Akun database |
| `DB_ENCRYPT` | `true` atau `false`, bawaan `true` |
| `DB_TRUST_CERT` | `true` bila server memakai sertifikat sendiri (self-signed), bawaan `false` |
| `NODE_ENV` | `production` di server produksi (cookie sesi diberi `Secure`, butuh HTTPS) |
| `CORS_ORIGIN` | Origin frontend yang diizinkan, dipisah koma, bawaan `http://localhost:4200` |
| `TRUST_PROXY` | `true` atau jumlah proxy bila API di belakang reverse proxy, bawaan `false` |
| `LOGIN_MAKS_GAGAL` | Jumlah salah kata sandi sebelum akun dikunci, bawaan 5 |
| `LOGIN_KUNCI_MENIT` | Lama akun dikunci, bawaan 15 menit |
| `PORTAL_URL` | Alamat portal peserta untuk tautan di undangan email, bawaan `http://localhost:4200` |

## Perintah
- `npm run dev`: jalankan API dengan muat ulang otomatis. Cek di http://localhost:3000/api/health
- `npm run db:cek`: uji koneksi database (hanya SELECT). Mencetak nama database dan tabel berprefix `HCIS_Psikotes_`.
- `npm run admin:buat`: buat akun admin HC. Kata sandi diketik di prompt tersembunyi (minimal 12 karakter), tidak pernah lewat argumen. Username yang sudah ada tidak ditimpa.
- `npm run bank:impor -- --periksa`: periksa bahan di `materi_rahasia/mentah` tanpa menulis apa pun.
- `npm run bank:impor`: periksa lalu tulis `bank/v1/` (`soal.json`, `koran.json`, `gambar/`). Menolak bila `bank/v1` sudah ada. Pilihan: `--versi v2`, `--sumber <folder>`.
- `npm run bank:periksa`: muat bank yang sudah terimpor lewat pembaca server, cetak jumlah dan sidik jari.
- `npm run buat-koran`: buat angka Tes Koran baru (sekali per versi bank) ke `materi_rahasia/mentah/koran.json`. Susunan dari `config/tes.json`. Tidak menimpa berkas yang ada.
- `npm test`: tes otomatis (data dummy saja).

Semua skrip bank hanya mencetak nama berkas, nomor, jumlah, dan sidik jari. Kunci, penjelasan, instruksi, dan angka Koran tidak pernah dicetak.

## Sesi, token, dan undangan
Rute admin (wajib login admin):

| Rute | Hasil |
| --- | --- |
| `POST /api/admin/sesi` | Buat sesi: `nama_sesi`, `jadwal` (daftar `{ tes, tanggal, waktu_buka, waktu_tutup }`, satu per tes, `tes` = `TIU5`/`TIU6`/`KORAN`, tanggal YYYY-MM-DD, jam HH:MM), `peserta` (`email`, `nama` opsional), `template` opsional. Respons berisi token dan undangan siap kirim per peserta (subjek, isi, tautan `mailto`). **Token mentah hanya tampil di respons ini.** |
| `GET /api/admin/sesi`, `GET /api/admin/sesi/:id` | Daftar sesi dan status token per peserta. Tanpa token. |
| `PUT /api/admin/sesi/:id/template` | Simpan template undangan untuk sesi itu (`subjek`, `isi`). |
| `POST /api/admin/sesi/:id/peserta` | Tambah peserta ke sesi. Respons berisi token dan undangan. |
| `POST /api/admin/sesi/:id/token-baru` | Body `{ "email" }`. Ganti semua token yang belum dipakai milik email itu; token lama langsung tidak berlaku. |
| `POST /api/admin/ujian/:id/cabut` | Cabut token yang belum selesai. |

Rute peserta:

| Rute | Hasil |
| --- | --- |
| `POST /api/peserta/masuk` | Body `{ "email", "token" }`. Token sekali pakai, harus di dalam jam sesi. Berhasil: cookie `psikotes_peserta`. |
| `GET /api/peserta/saya` | Jenis tes, status, durasi, sisa waktu menurut jam server. |
| `POST /api/peserta/mulai` | Tulis `mulai_pada` dan `batas_selesai` di server. Aman diulang. |

- Satu token per tes, dan setiap tes punya jadwal (tanggal, jam buka, jam tutup) sendiri, sama untuk semua peserta sesi itu. Jadwal disimpan per token di tabel ujian; kolom tanggal dan jam di tabel sesi hanya ringkasan hari pertama. Peserta tambahan mengikuti jadwal yang sudah ada.
- Satu email undangan per peserta memuat semua tokennya, masing-masing dengan jadwal tesnya.
- Template bawaan ada di `config/undangan.json` (netral). Suntingan HC disimpan per sesi; wajib memuat `{daftar_token}`. Penanda: `{nama}`, `{tautan}`, `{daftar_token}` (berisi nama tes, jadwal, dan token tiap tes).
- Pengiriman lewat tautan `mailto` (membuka aplikasi email bawaan Windows). HC memakai Outlook desktop: atur MAILTO ke Outlook di Pengaturan > Aplikasi > Aplikasi default, kalau tidak tautan bisa terbuka di browser. Pengiriman otomatis lewat SMTP menyusul bila IT menyediakan akun.
- Jadwal dibandingkan dengan jam server database. Peserta harus masuk dan mulai di dalam jadwal tesnya; durasi tes tidak dipotong jam tutup (keputusan sementara, menunggu konfirmasi HC).
- Versi bank untuk sesi baru: `bank_aktif` di `config/tes.json`.

## Bank soal
Bahan di `materi_rahasia/mentah/`:
- `kunci.csv` dengan header `tes,jenis,soal,butir,kunci,penjelasan`. `tes` = `TIU5`/`TIU6`, `jenis` = `latihan`/`soal`. TIU 5: `butir` kosong, kunci 1 sampai 5. TIU 6: `butir` 1 sampai 5, kunci `B`/`S`. Penjelasan hanya untuk latihan TIU 5 (wajib di sana). Pada soal TIU 5, latihan TIU 6, dan soal TIU 6 penjelasan diabaikan dengan peringatan.
- `latihan-tiu5-NN.png`, `tiu5-NN.png`, `latihan-tiu6-NN.png`, `tiu6-NN.png` (NN dua digit, mulai 01).
- `instruksi_tiu5.txt`, `instruksi_tiu6.txt`, `koran.json`.

Jumlah yang diharapkan diambil dari `config/tes.json`. Durasi dan aturan skor ada di `config/skoring.json`, diperiksa saat server mulai (kategori harus menyambung tanpa celah atau tumpang tindih).

## Login admin
| Rute | Hasil |
| --- | --- |
| `POST /api/admin/login` body JSON `{ "username", "password" }` | 200 + cookie `psikotes_admin` (HttpOnly, SameSite=Strict), atau 401 |
| `POST /api/admin/logout` | 204, sesi dihapus |
| `GET /api/admin/saya` | 200 `{ username }` bila sesi sah, atau 401 |

- Sesi disimpan sebagai hash SHA-256 di kolom `sesi_hash` tabel admin (skrip `db/04`). Satu sesi per admin: login baru mengganti sesi lama. Berakhir setelah 30 menit tanpa aktivitas atau 8 jam sejak login.
- Pesan login gagal selalu sama, baik akun tidak ada, salah kata sandi, nonaktif, maupun terkunci.
- Batas laju: 300 permintaan per 15 menit per IP untuk `/api`, 10 percobaan login per 15 menit per IP.
- `npm run build`, lalu `npm start`: build dan jalankan versi produksi.

## Struktur
```
src/app.ts          aplikasi Express dan rute
src/server.ts       titik masuk
src/config/         pembacaan .env, tes.json, skoring.json
src/db/             pool koneksi SQL Server bersama
src/lib/            utilitas kecil (parser CSV)
src/middleware/     helmet, CORS, batas laju, penanganan galat
src/modules/        token, tes (pembaca bank soal), skoring, hasil, admin
scripts/            skrip bantu (cek-db, buat-admin, impor-bank, periksa-bank, buat-koran)
test/               tes otomatis (node:test, data dummy)
db/                 skrip SQL tabel HCIS_Psikotes_* (dijalankan manual lewat SSMS)
config/             konfigurasi tes dan skoring (tidak rahasia)
bank/               bank soal dan kunci (diabaikan git)
```

## Catatan keamanan
`npm audit` melaporkan kerentanan tinggi pada `@azure/msal-node` (lewat `mssql` → `tedious` → `@azure/identity`). Celahnya ada di alur login Azure AD, sedangkan proyek ini memakai login SQL. Tinjau ulang di Part 9 atau saat `mssql` merilis versi baru.
