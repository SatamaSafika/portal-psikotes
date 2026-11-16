# Deploy Portal Psikotes

Berkas ini hanya ada di repo, tidak ikut ke paket deploy.

## 1. Membuat paket deploy
Dari akar repo, pada commit atau tag yang akan dirilis:

```
git archive --format=zip -o portal-psikotes-<versi>.zip <tag-atau-cabang>
```

Paket hanya berisi berkas yang dilacak git, **dikurangi** yang bertanda `export-ignore` di `.gitattributes`. Berkas rahasia (bank soal, `.env`) dan dokumen internal tidak pernah ada di paket, karena tidak ada di repo.

## 2. Isi paket

```
backend/
  package.json, package-lock.json, tsconfig.json
  config/        persetujuan, skoring (durasi, kategori, retensi), tes, template undangan
  src/           kode API
  scripts/       skrip operasional: buat-admin, cek-db, hitung-ulang, periksa-bank
  bank/.gitkeep  folder kosong, diisi manual (lihat bagian 3)
frontend/
  package.json, package-lock.json, angular.json, tsconfig.json, tsconfig.app.json
  public/, src/  kode Angular (tanpa tes unit)
```

Tidak ikut paket:
- Tes otomatis (`backend/test`, `*.spec.ts`).
- Skrip SQL (`backend/db`), yang dijalankan terpisah oleh pengelola database.
- `backend/.env.example`.
- Skrip `buat-koran` (membuat angka Koran baru berarti mengganti kunci) dan `impor-bank` (butuh bahan mentah yang tidak ada di server).
- Skrip uji, README, dan alat pengembang (proxy dev, prettier, editorconfig, pengaturan AI).

## 3. Berkas yang disalin MANUAL ke server (tidak lewat git, email, atau chat)

| Berkas | Letak di server | Keterangan |
| --- | --- | --- |
| `bank/v1/` (`soal.json`, `koran.json`, `gambar/`) | `backend/bank/v1/` | Soal dan kunci. Wajib ada, karena koreksi berjalan di server. Dari pemilik proyek |
| `.env` | `backend/.env` | Dibuat langsung di server |

- Kedua berkas itu hanya boleh dibaca akun layanan aplikasi, dan tidak boleh berada di folder yang dilayani web server.
- `bank/v1/koran.json` wajib dicadangkan. Angkanya dibuat acak sekali, dan kunci Koran bergantung padanya.
- Bahan mentah soal **tidak** ke server.

Variabel `.env`:

| Variabel | Isi |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Koneksi SQL Server |
| `DB_ENCRYPT`, `DB_TRUST_CERT` | Enkripsi koneksi (bawaan: encrypt `true`, trust cert `false`) |
| `NODE_ENV` | `production`: cookie hanya lewat HTTPS, durasi uji coba dimatikan |
| `PORT` | Port API (bawaan 3000), hanya diakses web server |
| `CORS_ORIGIN` | Alamat publik portal |
| `PORTAL_URL` | Alamat publik portal, dipakai di email undangan |
| `TRUST_PROXY` | Jumlah proxy di depan API, supaya batas percobaan per IP memakai IP asli peserta |

`DURASI_UJI_DETIK` tidak diisi di server.

## 4. Build dan menjalankan
Butuh Node 24 LTS.

```
cd backend
npm ci
npm run build                        # hasil: dist/src (API) dan dist/scripts (skrip operasional)
npm prune --omit=dev
node dist/scripts/cek-db.js          # uji koneksi
node dist/scripts/periksa-bank.js    # bank terbaca
node dist/scripts/buat-admin.js      # akun admin HC (sandi diketik tersembunyi)
npm start                            # node dist/src/server.js, jalankan sebagai layanan

cd ../frontend
npm ci
npx ng build                         # hasil: dist/portal-psikotes-web/browser/
```

## 5. Web server
- **HTTPS wajib.** Dalam produksi, cookie login hanya terkirim lewat HTTPS.
- **Satu domain:**
  - Web server melayani `frontend/dist/portal-psikotes-web/browser/`.
  - Web server meneruskan `/api/` ke `http://127.0.0.1:<PORT>`.
  - Route lain yang tidak cocok dengan berkas dikembalikan ke `index.html` (route Angular).
  - Alasannya, cookie memakai `SameSite=Strict` dengan path `/api`.
- Hanya port 443 (dan 80 untuk pengalihan ke HTTPS) yang terbuka ke publik. Port API dan database tidak terbuka.
- Zona waktu server database WIB. Jadwal tes dan batas waktu dihitung dari jam database.

## 6. Database
Tabel dibuat sekali oleh pengelola database dengan skrip `backend/db/11_bangun_ulang_pascalcase.sql` dari repo, bukan dari paket. Akun aplikasi butuh SELECT, INSERT, UPDATE, DELETE pada tabel `dbo.HCIS_Psikotes_*`, tanpa hak DDL.
