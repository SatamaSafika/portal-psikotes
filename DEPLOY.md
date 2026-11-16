# Panduan Deploy Portal Psikotes

Panduan untuk memasang Portal Psikotes di server produksi. Berkas ini hanya ada di repo dan tidak ikut paket deploy.

Butir bertanda **[Keputusan IT]** belum ditetapkan dan perlu disepakati sebelum go-live.

## Daftar isi
1. [Arsitektur](#1-arsitektur)
2. [Prasyarat](#2-prasyarat)
3. [Membuat paket deploy](#3-membuat-paket-deploy)
4. [Susunan folder di server](#4-susunan-folder-di-server)
5. [Berkas rahasia yang disalin manual](#5-berkas-rahasia-yang-disalin-manual)
6. [Variabel lingkungan](#6-variabel-lingkungan-backendenv)
7. [Database](#7-database)
8. [Build dan pemasangan](#8-build-dan-pemasangan)
9. [Menjalankan API sebagai layanan](#9-menjalankan-api-sebagai-layanan)
10. [Web server dan HTTPS](#10-web-server-dan-https)
11. [Pemeriksaan setelah pemasangan](#11-pemeriksaan-setelah-pemasangan)
12. [Operasional](#12-operasional)
13. [Pembaruan dan rollback](#13-pembaruan-dan-rollback)
14. [Cadangan](#14-cadangan)
15. [Batasan yang diketahui](#15-batasan-yang-diketahui)
16. [Daftar periksa go-live](#16-daftar-periksa-go-live)

---

## 1. Arsitektur

```
Peserta / Admin HC (browser)
        │ HTTPS 443
        ▼
Web server (IIS atau nginx) ── melayani berkas statis frontend (Angular)
        │ /api/*  → http://127.0.0.1:3000
        ▼
API Node.js (Express) ── membaca backend/config/*.json dan backend/bank/v1/
        │ TDS 1433 (atau port yang ditentukan IT)
        ▼
SQL Server, database BA, tabel dbo.HCIS_Psikotes_* (5 tabel)
```

- Frontend dan API berada di **satu domain**. Cookie sesi memakai `SameSite=Strict`, `HttpOnly`, path `/api`, dan `Secure` di produksi.
- API menjalankan pekerjaan latar setiap 15 detik di prosesnya sendiri: menutup ujian yang waktunya habis, menandai token kedaluwarsa, dan menghitung hasil yang tertunda. Tidak perlu penjadwal terpisah untuk ini.
- Kunci jawaban dan penilaian hanya ada di server API, dan tidak pernah dikirim ke browser.

## 2. Prasyarat

| Komponen | Kebutuhan |
| --- | --- |
| Node.js | 24 LTS (dikembangkan dan diuji dengan 24.22) |
| Web server | IIS 10 dengan URL Rewrite dan Application Request Routing (ARR), atau nginx |
| Sertifikat TLS | Untuk domain portal **[Keputusan IT]** |
| SQL Server | Akses dari server aplikasi ke database `BA` |
| Akun database | SELECT, INSERT, UPDATE, DELETE pada 5 tabel `dbo.HCIS_Psikotes_*`. Tanpa hak DDL untuk akun aplikasi |
| Akses internet saat build | Untuk `npm ci` (registry npm), atau mirror internal |
| Sumber daya | Satu instance cukup untuk pemakaian normal (100 sampai 200 peserta serentak). Belum diuji beban |

## 3. Membuat paket deploy

Dikerjakan pengembang, dari akar repo, pada tag rilis:

```bash
git tag v1.0.0
git archive --format=zip -o portal-psikotes-v1.0.0.zip v1.0.0
```

Paket hanya berisi berkas yang dilacak git, dikurangi berkas bertanda `export-ignore` di `.gitattributes`.

**Ikut paket**

```
backend/
  package.json, package-lock.json, tsconfig.json
  config/        skoring (durasi, kategori, retensi), tes, template email, teks persetujuan
  src/           kode API
  scripts/       buat-admin, cek-db, hitung-ulang, periksa-bank
  bank/.gitkeep  folder kosong, diisi manual (bagian 5)
frontend/
  package.json, package-lock.json, angular.json, tsconfig.json, tsconfig.app.json
  public/, src/  kode Angular (tanpa tes unit)
```

**Tidak ikut paket**

| Berkas | Alasan |
| --- | --- |
| `backend/test/`, `frontend/**/*.spec.ts`, `tsconfig.spec.json` | Tes otomatis, hanya untuk pengembangan |
| `backend/db/` | Skrip SQL dijalankan terpisah oleh pengelola database (bagian 7) |
| `backend/scripts/buat-koran.ts` | Membuat angka Koran baru = mengganti kunci. Tidak boleh ada di server |
| `backend/scripts/impor-bank.ts` | Membutuhkan bahan mentah soal, yang tidak ada di server |
| `backend/scripts/uji-*` | Skrip uji pengembangan |
| `backend/.env.example`, README, `DEPLOY.md` | Dokumentasi |
| `proxy.conf.json`, `.prettierrc`, `.editorconfig` | Alat pengembangan |

## 4. Susunan folder di server

Contoh `D:\apps\portal-psikotes\` (Windows) atau `/srv/portal-psikotes/` (Linux):

```
portal-psikotes/
  backend/
    .env                  dibuat di server (bagian 6)
    bank/v1/              disalin manual (bagian 5)
    config/
    dist/                 hasil build API dan skrip operasional
    node_modules/
    package.json
  frontend-web/           isi frontend/dist/portal-psikotes-web/browser/
```

- API mencari folder `config/` dan `bank/` dengan naik dari lokasi `dist/` sampai menemukan `package.json` dan `config/skoring.json`. Jadi `dist/`, `config/`, `bank/`, dan `package.json` harus berada dalam satu folder `backend/`.
- Folder web server hanya `frontend-web/`. Folder `backend/` **tidak boleh** berada di bawah root web.

Hak akses:

| Folder atau berkas | Akun layanan API | Web server | Lainnya |
| --- | --- | --- | --- |
| `backend/.env` | baca | tidak ada | tidak ada |
| `backend/bank/` | baca | tidak ada | tidak ada |
| `backend/` lainnya | baca | tidak ada | admin server |
| `frontend-web/` | tidak perlu | baca | admin server |

## 5. Berkas rahasia yang disalin manual

Berkas ini tidak ada di repo maupun paket, dan **tidak boleh dikirim lewat git, email, atau chat**.

| Berkas | Letak | Diserahkan oleh | Keterangan |
| --- | --- | --- | --- |
| `bank/v1/soal.json` | `backend/bank/v1/` | Pemilik proyek | Soal, instruksi, dan kunci TIU 5 dan TIU 6 |
| `bank/v1/koran.json` | `backend/bank/v1/` | Pemilik proyek | Angka Tes Koran. Dibuat acak sekali, dan kunci Koran bergantung padanya |
| `bank/v1/gambar/` | `backend/bank/v1/` | Pemilik proyek | Gambar soal dan latihan |
| `.env` | `backend/` | IT | Kredensial database dan pengaturan (bagian 6) |

- Pemindahan dilakukan langsung ke server, misalnya lewat media terenkripsi atau berbagi folder internal dengan akses terbatas. Salinan sementara dihapus setelah selesai **[Keputusan IT]**.
- Setelah disalin, periksa dengan `node dist/scripts/periksa-bank.js` (bagian 8). Skrip hanya mencetak jumlah dan sidik jari, tanpa isi soal atau kunci.
- Bahan mentah soal **tidak** dipasang di server. Pemilik proyek menyimpannya sebagai arsip.

## 6. Variabel lingkungan (`backend/.env`)

| Variabel | Wajib | Bawaan | Isi produksi |
| --- | --- | --- | --- |
| `DB_HOST` | ya | | Alamat SQL Server |
| `DB_PORT` | ya | | Port SQL Server |
| `DB_NAME` | ya | | `BA` |
| `DB_USER`, `DB_PASSWORD` | ya | | Akun aplikasi (bagian 7) |
| `DB_ENCRYPT` | | `true` | `true` |
| `DB_TRUST_CERT` | | `false` | `false`. Isi `true` hanya bila SQL Server memakai sertifikat self-signed |
| `NODE_ENV` | ya | | `production`: cookie hanya lewat HTTPS, durasi uji dimatikan |
| `PORT` | | `3000` | Port API, hanya diakses web server lokal |
| `CORS_ORIGIN` | ya | `http://localhost:4200` | Alamat publik portal, misalnya `https://psikotes.contoh.id`. Boleh beberapa, dipisah koma |
| `PORTAL_URL` | ya | `http://localhost:4200` | Alamat publik portal untuk tautan di email undangan. Harus diawali `https://` |
| `TRUST_PROXY` | ya | `false` | `1` bila ada satu reverse proxy (IIS atau nginx) di depan API. Tambah sesuai jumlah proxy atau load balancer. Tanpa ini, batas percobaan per IP menganggap semua peserta datang dari satu IP |
| `LOGIN_MAKS_GAGAL` | | `5` | Jumlah salah sandi sebelum akun admin dikunci |
| `LOGIN_KUNCI_MENIT` | | `15` | Lama penguncian akun admin |
| `DURASI_UJI_DETIK` | **jangan diisi** | | Hanya untuk pengujian. Diabaikan bila `NODE_ENV=production` |

API menolak berjalan bila variabel wajib kosong, `PORTAL_URL` tidak valid, atau konfigurasi `config/*.json` tidak valid.

## 7. Database

Dikerjakan pengelola database, satu kali, sebelum aplikasi dijalankan.

1. **Buat tabel.** Jalankan `backend/db/11_bangun_ulang_pascalcase.sql` dari repo (tidak ada di paket) lewat SSMS, di database `BA`.
   - Skrip membuat 5 tabel, 10 CHECK constraint, dan 4 indeks terfilter, semuanya berprefix `HCIS_Psikotes_`.
   - Bila tabel sudah ada, skrip **menghapus dan membangun ulang** tabel. Itu hanya berjalan setelah `@konfirmasi = N'HAPUS'` diisi.
   - Bagian 2 skrip berisi kueri pemeriksaan: 5 tabel, 74 kolom, 10 CHECK, 4 indeks terfilter.
   - Database yang sekarang sudah memiliki tabel ini. Langkah ini hanya untuk database baru.
2. **Hak akun aplikasi:** SELECT, INSERT, UPDATE, DELETE pada:
   - `dbo.HCIS_Psikotes_Admin`
   - `dbo.HCIS_Psikotes_Sesi`
   - `dbo.HCIS_Psikotes_Kelompok`
   - `dbo.HCIS_Psikotes_Ujian`
   - `dbo.HCIS_Psikotes_Jawaban`

   Tanpa CREATE, ALTER, DROP. Akun saat ini masih punya CREATE dan DROP; usulannya dipisah untuk produksi **[Keputusan IT]**. Bila hak diberikan per tabel dan tabel dibangun ulang, hak harus diberikan lagi.
3. **Zona waktu.** Jadwal tes, batas waktu, dan penutupan otomatis memakai jam server database (`SYSDATETIME()`). Server database harus berjalan di WIB. Cek dengan `node dist/scripts/cek-db.js`.
4. **Data uji.** Tabel saat ini berisi data uji dari pengujian dan gladi. Bersihkan sebelum dipakai peserta sungguhan, dengan persetujuan pemilik proyek.
5. **Jaringan.** Port SQL Server hanya dibuka untuk server aplikasi, dengan koneksi terenkripsi.

## 8. Build dan pemasangan

```bash
# 1. Ekstrak paket ke folder kerja, misalnya D:\apps\portal-psikotes

# 2. Backend
cd backend
npm ci                               # butuh dependensi dev untuk build
npm run build                        # hasil: dist/src (API) dan dist/scripts (skrip operasional)
npm prune --omit=dev                 # buang dependensi dev setelah build

# 3. Salin bank/v1/ dan buat .env (bagian 5 dan 6), lalu periksa:
node dist/scripts/cek-db.js          # koneksi, nama database, daftar tabel, jam server
node dist/scripts/periksa-bank.js    # jumlah soal dan sidik jari bank

# 4. Akun admin HC pertama (sandi diketik tersembunyi, tidak lewat argumen)
node dist/scripts/buat-admin.js

# 5. Frontend
cd ../frontend
npm ci
npx ng build                         # hasil: dist/portal-psikotes-web/browser/
# salin isi folder browser/ ke frontend-web/ (bagian 4)
```

- Build juga boleh dikerjakan di mesin lain atau di CI dengan Node 24. Hasil `backend/dist`, `backend/node_modules` (setelah prune), dan `frontend/dist` lalu disalin ke server.
- `argon2` memakai modul native. Bila build dikerjakan di mesin lain, sistem operasinya harus sama dengan server, atau jalankan `npm ci` di server.

## 9. Menjalankan API sebagai layanan

Perintah jalan: `node dist/src/server.js` (sama dengan `npm start`), dari folder `backend/`. Layanan harus menyala otomatis saat server boot dan menyala ulang bila proses berhenti **[Keputusan IT: alat yang dipakai]**.

**Windows, dengan NSSM**

```bat
nssm install PortalPsikotesApi "C:\Program Files\nodejs\node.exe" "dist\src\server.js"
nssm set PortalPsikotesApi AppDirectory D:\apps\portal-psikotes\backend
nssm set PortalPsikotesApi AppStdout D:\logs\portal-psikotes\api.log
nssm set PortalPsikotesApi AppStderr D:\logs\portal-psikotes\api-error.log
nssm set PortalPsikotesApi AppRotateFiles 1
nssm set PortalPsikotesApi ObjectName ".\svc-psikotes" "<sandi akun layanan>"
nssm start PortalPsikotesApi
```

**Linux, dengan systemd**

```ini
[Unit]
Description=Portal Psikotes API
After=network.target

[Service]
WorkingDirectory=/srv/portal-psikotes/backend
ExecStart=/usr/bin/node dist/src/server.js
User=svc-psikotes
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Catatan:
- Jalankan dengan akun layanan khusus yang hanya bisa membaca folder `backend/`.
- API mendengarkan di `PORT` pada semua antarmuka jaringan. Firewall harus menutup port itu dari luar, sehingga hanya web server lokal yang bisa mengaksesnya.
- `.env` dibaca dari folder kerja (`backend/`), jadi folder kerja layanan harus `backend/`.
- Saat dihentikan (SIGINT atau SIGTERM), API menutup koneksi HTTP dan pool database dengan rapi.

## 10. Web server dan HTTPS

Aturan yang harus dipenuhi:
1. HTTPS untuk semua permintaan. HTTP 80 hanya untuk mengalihkan ke HTTPS.
2. `/api/*` diteruskan ke `http://127.0.0.1:3000/api/*` dengan header `X-Forwarded-For` dan `X-Forwarded-Proto`.
3. Berkas statis dilayani dari `frontend-web/`.
4. Route lain yang bukan berkas, misalnya `/admin` dan `/masuk/KORAN`, dikembalikan ke `index.html` (route Angular).
5. `index.html` tidak di-cache (`Cache-Control: no-cache`). Berkas `.js` dan `.css` sudah ber-hash, jadi boleh di-cache lama.

**IIS** (butuh modul URL Rewrite dan ARR, dengan proxy ARR diaktifkan di level server). Taruh `web.config` di `frontend-web/`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="HTTPS" stopProcessing="true">
          <match url="(.*)" />
          <conditions><add input="{HTTPS}" pattern="off" /></conditions>
          <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
        </rule>
        <rule name="API" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://127.0.0.1:3000/api/{R:1}" />
        </rule>
        <rule name="SPA" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <remove fileExtension=".json" />
      <mimeMap fileExtension=".json" mimeType="application/json" />
    </staticContent>
  </system.webServer>
  <location path="index.html">
    <system.webServer>
      <httpProtocol>
        <customHeaders><add name="Cache-Control" value="no-cache" /></customHeaders>
      </httpProtocol>
    </system.webServer>
  </location>
</configuration>
```

Di IIS Manager, aktifkan *Application Request Routing → Server Proxy Settings → Enable proxy* dan *Preserve client IP in the following header: X-Forwarded-For*.

**nginx**

```nginx
server {
    listen 80;
    server_name psikotes.contoh.id;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name psikotes.contoh.id;
    ssl_certificate     /etc/ssl/psikotes/fullchain.pem;
    ssl_certificate_key /etc/ssl/psikotes/privkey.pem;

    root /srv/portal-psikotes/frontend-web;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /index.html {
        add_header Cache-Control "no-cache";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Untuk kedua web server, `CORS_ORIGIN` dan `PORTAL_URL` di `.env` diisi alamat publik yang sama, misalnya `https://psikotes.contoh.id`, dan `TRUST_PROXY=1`.

## 11. Pemeriksaan setelah pemasangan

| No | Pemeriksaan | Hasil yang diharapkan |
| --- | --- | --- |
| 1 | `https://<domain>/api/health` | HTTP 200 berisi JSON |
| 2 | `http://<domain>/` | Dialihkan ke HTTPS |
| 3 | `https://<domain>/` | Halaman pilih tes tampil |
| 4 | `https://<domain>/admin`, lalu muat ulang halaman | Halaman masuk admin tampil, bukan 404 |
| 5 | Login admin | Berhasil. Cookie `psikotes_admin` bertanda `Secure`, `HttpOnly`, `SameSite=Strict` |
| 6 | Buat sesi individu dengan satu peserta uji | Token dan undangan terbentuk. Tautan di email memakai `PORTAL_URL` |
| 7 | Peserta uji masuk, mengerjakan satu tes, lalu kirim | Hasil muncul di menu Hasil admin |
| 8 | `https://<domain>/api/peserta/gambar/x` tanpa sesi | Ditolak (401) |
| 9 | Akses langsung ke `http://<ip-server>:3000` dari luar | Tertutup oleh firewall |
| 10 | Log layanan | Tidak memuat sandi, token, email, atau nama peserta |

Data uji dari pemeriksaan ini dibersihkan sebelum go-live.

## 12. Operasional

**Skrip operasional**, dijalankan dari `backend/` dengan `.env` yang sama:

| Perintah | Fungsi |
| --- | --- |
| `node dist/scripts/cek-db.js` | Uji koneksi, cetak database, tabel, dan jam server (hanya SELECT) |
| `node dist/scripts/periksa-bank.js` | Periksa bank soal terpasang (jumlah dan sidik jari) |
| `node dist/scripts/buat-admin.js` | Tambah akun admin HC. Username yang sudah ada tidak ditimpa |
| `node dist/scripts/hitung-ulang.js` | Hitung ulang hasil dari jawaban mentah setelah `config/skoring.json` berubah. Pilihan: `--sesi <id>` |

**Log.** API menulis ke stdout dan stderr: baris mulai, peringatan konfigurasi, dan galat pekerjaan latar (hanya nomor atau pesan galat, tanpa data peserta). Lokasi dan rotasi log diatur oleh pengelola layanan (bagian 9) **[Keputusan IT]**.

**Pemantauan.** Gunakan `GET /api/health` untuk memastikan proses API hidup. Endpoint ini tidak memeriksa koneksi database. Untuk database, pantau galat "Tutup otomatis gagal" di log.

**Penghapusan data terjadwal.** Jawaban mentah dihapus 3 bulan, dan seluruh data peserta 4 bulan setelah tanggal tes. Skripnya belum dibuat; rencana sudah disusun dan menunggu keputusan IT (cara jalan, akun, lokasi log) **[Keputusan IT]**.

**Akun admin.**
- Satu peran. Tidak ada pendaftaran mandiri dan tidak ada reset sandi dari halaman.
- Untuk mengganti sandi atau membuka kunci akun, hubungi pengembang **[Keputusan IT: prosedur]**.
- Panjang minimum sandi saat ini 5 karakter dan perlu ditinjau sebelum produksi.

## 13. Pembaruan dan rollback

**Rilis kode baru**
1. Buat paket dari tag baru (bagian 3), lalu build (bagian 8) di folder baru, misalnya `releases/v1.1.0/`.
2. Salin `.env` dan `bank/` dari rilis lama ke rilis baru, atau arahkan ke lokasi bersama.
3. Hentikan layanan, alihkan folder kerja ke rilis baru, lalu jalankan layanan.
   - Ujian yang sedang berjalan tidak hilang, karena jawaban tersimpan di database dan timer dihitung dari jam database.
   - Lakukan di luar jadwal tes. Peserta yang sedang menyimpan jawaban bisa gagal sesaat, dan browser akan mencoba lagi.
4. Jalankan pemeriksaan bagian 11 nomor 1, 3, 4, dan 5.

**Rollback.** Hentikan layanan, kembalikan folder kerja ke rilis sebelumnya, lalu jalankan lagi. Ini aman selama struktur database tidak berubah di antara kedua rilis.

**Perubahan aturan skoring.** Ubah `config/skoring.json`, jalankan ulang layanan (konfigurasi divalidasi saat mulai), lalu jalankan `hitung-ulang.js`. Hasil lama yang jawaban mentahnya sudah terhapus (lebih dari 3 bulan) tidak berubah.

**Bank soal baru.**
1. Pemilik proyek mengimpor bahan baru sebagai `bank/v2/` di komputer pengembang, lalu menyalinnya ke server (bagian 5).
2. Ubah `bank_aktif` di `config/tes.json` menjadi `v2`, lalu jalankan ulang layanan.
3. Sesi baru memakai `v2`. Sesi lama tetap memakai versi yang tercatat di barisnya.
4. **Jangan hapus `bank/v1/`** selama masih ada data ujian bertanda `v1`, karena koreksi dan detail jawaban membacanya.

**Perubahan struktur database** selalu lewat skrip SQL yang ditinjau dan dijalankan pengelola database, bukan oleh aplikasi.

## 14. Cadangan

| Data | Cara | Catatan |
| --- | --- | --- |
| Database (5 tabel) | Ikut cadangan database `BA` | Data yang sudah dihapus tetap ada di cadangan sampai kedaluwarsa. Berapa lama cadangan disimpan? **[Keputusan IT]** |
| `backend/bank/` | Cadangan terenkripsi, di luar server | **Wajib.** Bila `koran.json` hilang, kunci Koran tidak bisa dibuat ulang |
| `backend/config/` | Ada di repo | Perubahan di server harus dikembalikan ke repo |
| `backend/.env` | Disimpan IT di brankas kredensial | Tidak dicadangkan bersama berkas aplikasi |

## 15. Batasan yang diketahui

- **Satu instance.** Penghitung batas laju disimpan di memori proses. Bila API dijalankan lebih dari satu instance, batas laju terbagi per instance dan perlu store bersama, misalnya Redis. Pekerjaan latar aman dijalankan ganda karena memakai UPDATE bersyarat.
- **Email undangan** masih lewat tautan `mailto`, satu email per klik dari Outlook HC. Kirim massal membutuhkan akun SMTP **[Keputusan IT]**.
- **Belum diuji:** uji beban, browser di laptop peserta kantor (1366 x 768), dan pembaca layar.

## 16. Daftar periksa go-live

**Server dan jaringan**
- [ ] Domain dan sertifikat TLS siap; HTTP dialihkan ke HTTPS.
- [ ] Node 24 LTS terpasang; API berjalan sebagai layanan dengan akun khusus dan menyala ulang otomatis.
- [ ] Port API dan port SQL Server tertutup dari luar.

**Aplikasi**
- [ ] Web server meneruskan `/api/`, dan fallback ke `index.html` berjalan.
- [ ] `.env` lengkap: `NODE_ENV=production`, `CORS_ORIGIN`, `PORTAL_URL`, `TRUST_PROXY`, dan `DURASI_UJI_DETIK` kosong.
- [ ] `bank/v1/` terpasang, `periksa-bank.js` lolos, dan cadangan bank tersimpan terpisah.
- [ ] Hak baca `.env` dan `bank/` hanya untuk akun layanan.

**Database**
- [ ] Akun database aplikasi tanpa hak DDL.
- [ ] Zona waktu database WIB (`cek-db.js`).
- [ ] Data uji dibersihkan (persetujuan pemilik proyek).

**Akun dan verifikasi**
- [ ] Akun admin HC produksi dibuat dengan sandi kuat.
- [ ] Pemeriksaan bagian 11 lolos.

**Kebijakan**
- [ ] Rencana penghapusan data terjadwal dan masa simpan cadangan disepakati.
