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
src/config/         pembacaan konfigurasi .env
src/db/             pool koneksi SQL Server bersama
src/middleware/     helmet, CORS, batas laju, penanganan galat
src/modules/        token, tes, skoring, hasil, admin
scripts/            skrip bantu (cek-db, buat-admin)
db/                 skrip SQL tabel HCIS_Psikotes_* (dijalankan manual lewat SSMS)
config/             konfigurasi tes dan skoring (tidak rahasia)
bank/               bank soal dan kunci (diabaikan git)
```

## Catatan keamanan
`npm audit` melaporkan kerentanan tinggi pada `@azure/msal-node` (lewat `mssql` → `tedious` → `@azure/identity`). Celahnya ada di alur login Azure AD, sedangkan proyek ini memakai login SQL. Tinjau ulang di Part 9 atau saat `mssql` merilis versi baru.
