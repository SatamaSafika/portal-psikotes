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
| `DURASI_UJI_DETIK` | Hanya untuk pengujian: memperpendek durasi semua tes (detik). Diabaikan bila `NODE_ENV=production`. Kosongkan setelah uji. |

## Perintah
- `npm run dev`: jalankan API dengan muat ulang otomatis. Cek di http://localhost:3000/api/health
- `npm run db:cek`: uji koneksi database (hanya SELECT). Mencetak nama database dan tabel berprefix `HCIS_Psikotes_`.
- `npm run admin:buat`: buat akun admin HC. Kata sandi diketik di prompt tersembunyi (minimal 5 karakter, keputusan pemilik proyek 12 November 2026; tinjau sebelum produksi), tidak pernah lewat argumen. Username yang sudah ada tidak ditimpa.
- `npm run bank:impor -- --periksa`: periksa bahan di `materi_rahasia/mentah` tanpa menulis apa pun.
- `npm run bank:impor`: periksa lalu tulis `bank/v1/` (`soal.json`, `koran.json`, `gambar/`). Menolak bila `bank/v1` sudah ada. Pilihan: `--versi v2`, `--sumber <folder>`.
- `npm run bank:periksa`: muat bank yang sudah terimpor lewat pembaca server, cetak jumlah dan sidik jari.
- `npm run buat-koran`: buat angka Tes Koran baru (sekali per versi bank) ke `materi_rahasia/mentah/koran.json`. Susunan dari `config/tes.json`. Tidak menimpa berkas yang ada.
- `npm test`: tes otomatis (data dummy saja).
- `npm run uji:kelompok`: uji sesi serentak dengan database (data dummy "Uji Kuota ..."): 100 klaim paralel pada kuota 50, di luar jadwal, tes lain, tambah kuota, 100 salah ketik lewat HTTP, token baru, cabut, ubah nama. Jalankan `npm run dev` di terminal lain dulu (pilihan `-- --api <url>`). Setiap kali jalan membuat satu sesi uji baru; tidak mencetak token.

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
| `POST /api/peserta/token` | Langkah 1 verifikasi. Body `{ "token", "jenis_tes" }`. Balasan `{ "mode": "INDIVIDU" | "KELOMPOK" }` bila token berlaku untuk tes itu sekarang; token tidak dipakai. Gagal: 401 dengan pesan seragam. Dibatasi 300 gagal per 15 menit per IP (yang berhasil tidak dihitung). |
| `POST /api/peserta/masuk-kelompok` | Langkah 2 sesi serentak. Body `{ "token", "jenis_tes", "nama" }` (nama 2 sampai 100 karakter). Klaim satu kursi kuota secara atomik dan membuat catatan ujian sendiri. Berhasil: cookie `psikotes_peserta`. |
| `POST /api/peserta/masuk` | Langkah 2 individu. Body `{ "email", "token", "jenis_tes"?, "nama"? }`. Token sekali pakai, harus di dalam jam sesi. `jenis_tes` (tes yang dipilih di halaman awal) harus sama dengan tes token; bila beda ditolak dan token tidak terpakai. `nama` disimpan hanya bila HC belum mengisi nama. Berhasil: cookie `psikotes_peserta`. |
| `GET /api/peserta/saya` | Jenis tes, nama (atau email bila kosong), status, durasi, jumlah soal (`jumlah_soal`, `jumlah_nomor`, `jumlah_halaman` untuk Koran), sisa waktu dan `berjalan_ms` menurut jam server. |
| `POST /api/peserta/mulai` | Tulis `mulai_pada` dan `batas_selesai` di server. Aman diulang. |

- Satu token per tes, dan setiap tes punya jadwal (tanggal, jam buka, jam tutup) sendiri, sama untuk semua peserta sesi itu. Jadwal disimpan per token di tabel ujian; kolom tanggal dan jam di tabel sesi hanya ringkasan hari pertama. Peserta tambahan mengikuti jadwal yang sudah ada.
- Satu email undangan per peserta memuat semua tokennya, masing-masing dengan jadwal tesnya.
- Template bawaan ada di `config/undangan.json` (netral). Suntingan HC disimpan per sesi; wajib memuat `{daftar_token}`. Penanda: `{nama}`, `{tautan}`, `{daftar_token}` (berisi nama tes, jadwal, dan token tiap tes).
- Pengiriman lewat tautan `mailto` (membuka aplikasi email bawaan Windows). HC memakai Outlook desktop: atur MAILTO ke Outlook di Pengaturan > Aplikasi > Aplikasi default, kalau tidak tautan bisa terbuka di browser. Pengiriman otomatis lewat SMTP menyusul bila IT menyediakan akun.
- Jadwal dibandingkan dengan jam server database. Peserta harus masuk dan mulai di dalam jadwal tesnya; durasi tes tidak dipotong jam tutup (keputusan sementara, menunggu konfirmasi HC).
- Versi bank untuk sesi baru: `bank_aktif` di `config/tes.json`.

### Sesi serentak (token kelompok, `db/09`)
| Rute | Hasil |
| --- | --- |
| `POST /api/admin/sesi-kelompok` | `nama_sesi`, `kuota` (1 sampai 1000), `email_penerima`, `jadwal` (1 sampai 3 tes), `template` opsional. Satu token 10 karakter (`XXXXX-XXXXX`) per tes. Respons berisi token dan satu email untuk penerima. **Token mentah hanya tampil di respons ini.** |
| `GET /api/admin/kelompok/:id/peserta` | Peserta yang sudah masuk, urut nama, dengan tanda `nama_kembar` |
| `POST /api/admin/kelompok/:id/tambah-kuota` | Kuota +1 (ditolak bila dicabut atau sudah 1000) |
| `POST /api/admin/kelompok/:id/token-baru` | Ganti token; kuota, terpakai, dan peserta yang sudah masuk tidak berubah. Respons berisi token baru dan email berisi token itu saja. |
| `POST /api/admin/kelompok/:id/cabut` | Tolak klaim baru; peserta yang sudah masuk tetap lanjut |
| `POST /api/admin/sesi/:id/email-kelompok-dikirim` | Tandai email token sudah dibuka di aplikasi email |
| `PUT /api/admin/ujian/:id/nama` | Body `{ "nama" }`. Koreksi nama peserta |
| `GET /api/admin/template-bawaan?mode=kelompok` | Template email bawaan sesi serentak (`config/undangan-kelompok.json`). Penanda: `{nama_sesi}`, `{kuota}`, `{tautan}`, `{daftar_token}`. |

- Persetujuan peserta (`db/10`, `config/persetujuan.json`): balasan `/api/peserta/token` memuat teks persetujuan. `/masuk` dan `/masuk-kelompok` wajib menyertakan `"setuju": true` dan `"persetujuan_versi"` sesuai teks yang berlaku; tanpa itu 400, versi usang 409, dan token tidak terpakai. Waktu dan versi disimpan di catatan ujian. Mengubah teks = naikkan `versi` (maksimal 20 karakter).
- Token individu (20 karakter) dan kelompok (10 karakter) dibedakan dari panjangnya. Huruf besar/kecil, spasi, dan tanda hubung diabaikan.
- Satu peserta serentak = satu catatan ujian dengan timer sendiri, tanpa email dan tanpa token sendiri. Penutupan otomatis, koreksi, dan hasil sama dengan individu.
- Sesi serentak tidak bisa ditambah peserta individu atau dibuatkan token individu (409).

## Pengerjaan
Rute peserta (wajib sesi peserta):

| Rute | Kapan | Hasil |
| --- | --- | --- |
| `GET /api/peserta/latihan` | selama sesi | Instruksi dan latihan, tanpa kunci |
| `POST /api/peserta/latihan/periksa` | selama sesi | Body `{ nomor, jawaban }` (TIU 5: `"1"`-`"5"`; TIU 6: daftar 5 `"B"`/`"S"`). Balasan: benar/salah dan kunci; penjelasan hanya TIU 5. Jawaban kosong ditolak. |
| `GET /api/peserta/soal` | setelah mulai, sebelum waktu habis | Soal tanpa kunci; Koran: angka per lajur. TIU 5 dan TIU 6: urutan tampil acak per catatan ujian (tetap sama setiap dimuat, `modules/tes/acak.ts`); setiap soal membawa nomor aslinya, dan jawaban disimpan dengan nomor asli. |
| `GET /api/peserta/gambar/:nama` | latihan selama sesi; soal setelah mulai | Hanya gambar milik jenis tes peserta |
| `GET /api/peserta/jawaban` | setelah mulai | Jawaban tersimpan (tanpa waktu) |
| `PUT /api/peserta/jawaban` | setelah mulai, sebelum waktu habis | TIU 5/6: `{ jawaban: [{ nomor, jawaban }] }`, `jawaban` null = kosong. TIU 6 nomor datar `(soal - 1) x 5 + butir`. |
| `POST /api/peserta/koran` | setelah mulai, sebelum waktu habis | `{ jawaban: [{ nomor, jawaban, waktu_ms }] }` |
| `POST /api/peserta/kirim` | setelah mulai | Selesai (`DIKIRIM`), sesi peserta ditutup |

- Koran ketat satu per satu: kiriman harus melanjutkan tepat dari nomor terakhir (nomor datar `(lajur - 1) x 19 + kotak`, 1 sampai 988), satu digit per kotak, `waktu_ms` tidak mundur, di bawah durasi, dan tidak lebih besar dari waktu berjalan menurut server (`berjalan_ms` di `/saya`) ditambah `toleransi_waktu_ms`. Satu pelanggaran menolak seluruh kiriman.
- Jawaban diterima sampai `batas_selesai` + `toleransi_kirim_detik` (5 detik, di `config/tes.json`).
- Setiap 15 detik server menutup otomatis: ujian yang lewat batas menjadi `WAKTU_HABIS` (terkirim otomatis, jawaban tersimpan tetap dinilai); token yang jadwalnya lewat tanpa pernah mulai menjadi `KEDALUWARSA`.
- Rute peserta dibatasi 600 permintaan per 15 menit per peserta (bukan per IP, karena peserta kantor berbagi IP).

## Koreksi dan hasil
- Hasil dihitung otomatis saat ujian dikirim, dan setiap 15 detik untuk ujian `DIKIRIM`/`WAKTU_HABIS` yang belum punya hasil. Peserta tidak bisa melihat hasil.
- Skor mentah = jumlah benar, tanpa penalti. TIU 6 per butir. Koran: kunci = digit terakhir dari jumlah dua angka bersebelahan; N = benar / 22 dibulatkan setengah ke atas (bilangan bulat); kategori Koran memakai N.
- Koran: ringkasan `interval_detik` (26 detik, `config/skoring.json`) = 22 interval `{ dikerjakan, benar, salah }`, disimpan di kolom `ringkasan_interval`. Jawaban dengan waktu pada atau setelah durasi Koran (572 detik) tidak dihitung di skor maupun interval.
- Admin melihat hasil per token di `GET /api/admin/sesi/:id` (benar, salah, dijawab, N, kategori, skor akhir, ringkasan interval, versi aturan, `undangan_dikirim_pada`).

## Dashboard HC (rute admin tambahan, wajib login admin)
| Rute | Hasil |
| --- | --- |
| `GET /api/admin/ringkasan` | Total peserta selesai (data tersimpan), selesai hari ini, sedang mengerjakan (timer berjalan), semua per orang per sesi, dan jadwal hari ini (menurut jam server) |
| `GET /api/admin/hasil?jenis=&sesi=&tanggal=` | Hasil ujian yang sudah selesai, filter opsional, maksimal 5000 baris. Balasan: `hasil`, `interval_detik`, `terpotong` |
| `GET /api/admin/ujian/:id/jawaban` | Jawaban per nomor dengan `benar` (true/false/null), tanpa kunci |
| `GET /api/admin/template-bawaan` | Template email bawaan untuk diedit sebelum membuat sesi |
| `POST /api/admin/sesi/:id/undangan-dikirim` | Body `{ "email" }`. Tandai undangan peserta sudah dibuka di aplikasi email (`db/08`) |
- `npm run hasil:hitung-ulang` (atau `-- --sesi <id>`): hitung ulang dari jawaban mentah dengan `skoring.json` terbaru. Ujian yang jawaban mentahnya sudah terhapus (retensi 3 bulan) dilewati, hasil lama tetap.

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

- Sesi disimpan sebagai hash SHA-256 di kolom `SesiHash` tabel admin. Satu sesi per admin: login baru mengganti sesi lama. Berakhir setelah 30 menit tanpa aktivitas atau 8 jam sejak login.
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
scripts/            skrip bantu (cek-db, buat-admin, impor-bank, periksa-bank, buat-koran, hitung-ulang)
test/               tes otomatis (node:test, data dummy)
db/                 skrip SQL tabel HCIS_Psikotes_* (dijalankan manual lewat SSMS)
config/             konfigurasi tes dan skoring (tidak rahasia)
bank/               bank soal dan kunci (diabaikan git)
```

## Catatan keamanan
`npm audit` (16 November 2026): 0 kerentanan. Kerentanan tinggi sebelumnya pada `@azure/msal-node` (lewat `mssql` → `tedious` → `@azure/identity`) sudah diperbaiki dengan `npm audit fix`.
