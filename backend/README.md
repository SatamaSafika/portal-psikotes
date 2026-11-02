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
