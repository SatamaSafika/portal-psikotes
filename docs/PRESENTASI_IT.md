# Portal Psikotes: bahan presentasi untuk tim IT

Draf, 15 November 2026. Isi diambil dari kode dan dokumen di repositori. Hal yang belum pasti ditandai "perlu verifikasi" atau "belum ada".

---

## 1. Ringkasan

Portal web untuk tes psikotes rekrutmen yang diminta HC. Ada tiga tes: TIU 5, TIU 6, dan Tes Koran (Kraepelin).

- Peserta masuk dengan token, mengerjakan tes di browser, lalu jawabannya dinilai otomatis di server.
- Admin HC membuat sesi tes, mengirim token, memantau peserta, melihat hasil dan grafik, lalu mengekspor laporan.
- Peserta tidak pernah melihat skor.
- Tampilan tidak memuat nama atau logo perusahaan (permintaan HC). Semua teks netral dengan nama "Portal Psikotes".

Status: fitur inti selesai dan sudah diuji pemilik proyek dengan data dummy. Belum dipasang di server produksi.

---

## 2. Pengguna dan alur

### Peserta (tanpa akun)
1. Memilih tes di halaman awal. Di sisi peserta, nama tes disamarkan menjadi Tes 1 (Koran), Tes 2 (TIU 5), dan Tes 3 (TIU 6).
2. Verifikasi dalam dua langkah:
   - Langkah 1: memasukkan token.
   - Langkah 2: menyetujui teks persetujuan, lalu mengisi identitas (nama saja, atau nama dan email).
3. Membaca instruksi dan mengerjakan latihan (2 soal, kuncinya langsung ditampilkan).
4. Mengerjakan tes dengan timer dari server, lalu mengirim. Kalau waktu habis, jawaban terkirim otomatis.

### Admin HC (satu peran, akun dibuat lewat skrip, tanpa pendaftaran mandiri)
- **Overview:** peserta yang sedang mengerjakan, selesai hari ini, total selesai, dan jadwal hari ini.
- **Token dan jadwal:** membuat sesi, mengirim undangan, mencabut token, membuat token baru, menambah kuota.
- **Hasil dan laporan:** review per peserta, Laporan Peserta (cetak PDF), detail jawaban, grafik Koran, dan ekspor Excel (.xlsx).

### Dua mode sesi
- **Individu:** satu token per peserta per tes. Token terikat email, sekali pakai, dan hanya berlaku sesuai jadwal.
- **Serentak (kelompok):** satu token per tes dengan kuota (1 sampai 1000 orang), untuk tes massal yang diawasi di tempat. Token dikirim ke email PIC atau pengawas. Peserta hanya mengisi nama.

---

## 3. Arsitektur dan stack

```
Browser (Angular SPA)  --HTTPS-->  API Express (Node)  --TDS-->  SQL Server 2024 (database BA)
                                          |
                                          +-- berkas lokal di server: config/*.json dan bank/<versi>/ (soal, gambar, kunci)
```

| Bagian | Teknologi | Versi terpasang |
| --- | --- | --- |
| Runtime | Node.js LTS | 24.22 |
| Frontend | Angular (standalone, signals, tanpa SSR), TypeScript | Angular 22.2, TS 6.0 |
| Backend | Express, TypeScript | Express 5.3, TS 7.0 |
| Driver DB | `mssql` (tedious), query berparameter, connection pool (maks 10) | 12.7 |
| Database | SQL Server perusahaan, database `BA` (dipakai bersama) | 2024 |
| Dependensi backend lain | `argon2`, `helmet`, `cors`, `express-rate-limit`, `dotenv` | |

- Tidak memakai ORM. Keputusan ORM menunggu arahan IT.
- Tidak memakai Ionic. Bisa ditambahkan bila sistem besar mewajibkannya.
- Struktur backend dibagi per modul: `token`, `tes`, `skoring`, `hasil`, `admin`. Skoring terpisah dari rute.
- Saat development, frontend memakai proxy `/api` ke backend. Di produksi, frontend dan API sebaiknya berada di satu origin (lihat bagian 7).

---

## 4. Database

### Aturan pakai
- Hanya 5 tabel `dbo.HCIS_Psikotes_*` di database `BA`. Tidak membaca atau mengubah tabel lain.
- Nama kolom memakai PascalCase sesuai revisi IT 13 November 2026. Nama constraint dan indeks juga berprefix `HCIS_Psikotes_`.
- Struktur dibuat oleh `backend/db/11_bangun_ulang_pascalcase.sql`, yang dijalankan manual lewat SSMS. Tabel dibangun ulang pada 15 November 2026 dan kini kosong dari data uji coba. Aplikasi tidak pernah menjalankan DDL.

### Tabel

| Tabel | Isi | Data pribadi |
| --- | --- | --- |
| `HCIS_Psikotes_Admin` | Akun admin HC: hash password (argon2), hash sesi login, penguncian | Username |
| `HCIS_Psikotes_Sesi` | Sesi tes, mode (INDIVIDU/KELOMPOK), template email, email PIC | Email PIC |
| `HCIS_Psikotes_Kelompok` | Token kelompok per tes: hash token, kuota, terpakai, jadwal, dicabut | Tidak ada |
| `HCIS_Psikotes_Ujian` | Satu baris = satu peserta x satu tes: identitas, hash token, status, waktu server, hasil, ringkasan grafik Koran (JSON), bukti persetujuan | Nama, email |
| `HCIS_Psikotes_Jawaban` | Jawaban mentah per nomor soal (+ waktu milidetik untuk Koran) | Tidak langsung |

Relasi:
- `Jawaban.UjianId` → `Ujian.Id`
- `Ujian.SesiId` → `Sesi.Id`
- `Ujian.KelompokId` → `Kelompok.Id`
- `Kelompok.SesiId` → `Sesi.Id`
- `Sesi.DibuatOleh` → `Admin.Id`

Batasan penting:
- CHECK pada jenis tes, status, mode, jadwal (jam tutup > jam buka), kuota, dan JSON valid.
- Indeks unik terfilter pada hash token dan hash sesi.
- Satu email hanya bisa ikut satu kali per tes per sesi.

### Yang dibutuhkan dari IT
- Hak akun saat ini: CREATE, INSERT, DROP, DELETE, SELECT. Aplikasi juga **wajib punya UPDATE**. Tanpa UPDATE, login, mulai tes, simpan jawaban, dan simpan hasil akan gagal.
- Untuk produksi, kami usulkan akun dipisah:
  - Akun aplikasi: SELECT, INSERT, UPDATE, DELETE, hanya pada 5 tabel ini, tanpa CREATE dan DROP. DELETE diperlukan untuk penghapusan data terjadwal.
  - Perubahan struktur: lewat akun pemilik proyek atau IT.
- Koneksi dari server aplikasi ke SQL Server: port, firewall, enkripsi (`DB_ENCRYPT`), dan sertifikat (`DB_TRUST_CERT`).
- Jadwal backup, dan berapa lama backup disimpan (lihat bagian 6).

---

## 5. Keamanan

### Login admin
- Password di-hash dengan argon2. Akun hanya dibuat lewat `npm run admin:buat` di terminal (password diketik tersembunyi).
- Akun dikunci 15 menit setelah 5 kali salah. Ada juga batas 10 percobaan login per 15 menit per IP.
- Pesan gagal selalu sama, apa pun sebabnya.
- Sesi berupa cookie `HttpOnly`, `SameSite=Strict`, dan `Secure` di produksi. Yang disimpan di DB hanya hash SHA-256 dari token sesi.
- Satu sesi per admin. Sesi berakhir setelah 30 menit tanpa aktivitas atau 8 jam sejak login.
- **Perlu ditinjau sebelum produksi:** panjang password minimum saat ini 5 karakter (keputusan pemilik proyek 12 November 2026).

### Token peserta
- Token individu: 20 karakter acak (sekitar 100 bit), sekali pakai, terikat email, hanya berlaku di dalam jadwal.
- Token kelompok: 10 karakter, dengan kuota yang diklaim secara atomik dalam satu transaksi.
- Di database hanya tersimpan hash token. Token mentah hanya tampil sekali ke admin saat dibuat.
- Percobaan token gagal dibatasi per IP.

### Integritas tes
- Kunci jawaban dan perhitungan waktu hanya ada di server. Respons API tidak pernah berisi kunci atau skor untuk peserta.
- Mulai, batas selesai, dan penutupan tes memakai jam server database (`SYSDATETIME`).
- Jawaban yang datang setelah batas waktu (ditambah toleransi 5 detik) ditolak.
- Tes Koran ditegakkan di server: hanya menerima nomor berikutnya, satu digit, dan waktu yang tidak mundur. Lompat nomor, mengubah jawaban, atau kotak kosong ditolak.
- Gambar soal hanya bisa diambil oleh peserta dengan sesi aktif untuk tes itu.

### Lapisan HTTP
- `helmet` untuk header keamanan, CORS hanya untuk origin terdaftar, dan `x-powered-by` dimatikan.
- Respons API diberi `Cache-Control: no-store`.
- Batas laju:
  - 300 permintaan per 15 menit per IP untuk `/api`.
  - 600 permintaan per 15 menit per peserta untuk rute pengerjaan. Kuncinya peserta, bukan IP, karena peserta di satu kantor bisa berbagi IP.
- Ukuran body JSON dibatasi (10 KB, dan 200 KB untuk membuat sesi).

### Data dan kode
- Semua query SQL berparameter.
- Kredensial hanya ada di `backend/.env`, yang tidak masuk repo.
- Soal, kunci, dan data peserta tidak ada di repo.
- Log tidak mencetak password, token, atau data peserta.

### Catatan audit
- `npm audit` melaporkan kerentanan tinggi di `@azure/msal-node` (dependensi tidak langsung lewat `mssql` → `tedious`). Celahnya ada di alur login Azure AD, sedangkan platform ini memakai login SQL. Tetap perlu ditinjau.

---

## 6. Data pribadi dan retensi

Aturan dari HC (disampaikan lisan lewat pemilik proyek, belum ada dokumen tertulis):
- Jawaban mentah dihapus 3 bulan setelah tanggal tes.
- Seluruh data peserta (identitas, email, token, hasil, ringkasan) dihapus 4 bulan setelah tanggal tes.
- Hanya admin HC yang boleh melihat hasil dan mencari identitas.

Yang sudah ada:
- Ringkasan grafik Koran disimpan di tabel Ujian, jadi grafik tetap bisa dibuka setelah jawaban mentah terhapus.
- Bukti persetujuan peserta (waktu dan versi teks) disimpan per catatan ujian.

**Belum ada: job penghapusan otomatis.** Rencananya dibuat bersama IT dengan dua pilihan: job di aplikasi atau SQL Agent job. Perlu diputuskan, dan perlu akun dengan hak DELETE.

Pertanyaan untuk IT: data yang sudah dihapus masih ada di backup. Berapa lama backup disimpan?

---

## 7. Deploy dan operasional

### Build dan jalan
- **Backend:** `npm ci`, lalu `npm run build`, lalu `npm start` (port bawaan 3000). Butuh Node 24 LTS.
- **Frontend:** `npm ci`, lalu `npm run build`. Hasilnya berkas statis di `frontend/dist/`, yang bisa disajikan oleh web server atau reverse proxy.
- **Saran:** frontend dan `/api` di satu domain di belakang reverse proxy dengan HTTPS. Cookie sesi bergantung pada satu origin dan `SameSite=Strict`.

### Variabel lingkungan (`backend/.env`, hanya nama, tanpa nilai)
- **Database:** `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_ENCRYPT`, `DB_TRUST_CERT`
- **Aplikasi:** `PORT`, `NODE_ENV=production` (wajib di produksi), `CORS_ORIGIN`, `TRUST_PROXY` (diisi bila di belakang reverse proxy), `PORTAL_URL` (alamat portal untuk email)
- **Login:** `LOGIN_MAKS_GAGAL`, `LOGIN_KUNCI_MENIT`
- **Khusus uji:** `DURASI_UJI_DETIK` harus kosong di produksi (otomatis diabaikan bila `NODE_ENV=production`).

### Berkas yang wajib ada di server tetapi tidak ada di repo
- `backend/bank/<versi>/`: soal, gambar, kunci, dan angka Koran. Ini rahasia, perlu dipindahkan ke server dengan aman dan **dicadangkan**. Angka Koran dibuat sekali dan tidak boleh berubah, karena kuncinya bergantung pada angka itu.
- `backend/.env`.

### Konfigurasi (di repo, tidak rahasia)
- `backend/config/`: `tes.json` (durasi, jumlah soal, bank aktif), `skoring.json` (ambang kategori dan interval Koran), template email, dan teks persetujuan.
- Server menolak berjalan bila konfigurasi tidak valid.

### Proses latar
- Setiap 15 detik di dalam proses API: menutup ujian yang waktunya habis, menandai token kedaluwarsa, dan menghitung hasil yang tertunda.

### Batasan saat ini
- Dirancang untuk **satu instance**. Penghitung batas laju disimpan di memori proses. Kalau dijalankan di beberapa instance atau container, batas laju terbagi per instance dan perlu store bersama, misalnya Redis. Proses latar sendiri aman dijalankan ganda karena memakai `UPDATE` bersyarat.

### Pemantauan
- `GET /api/health` untuk health check.
- `npm run db:cek` untuk menguji koneksi DB (hanya SELECT).

---

## 8. Email undangan

- Saat ini memakai tautan `mailto`. Tombol di dashboard membuka Outlook HC dengan email yang sudah terisi, satu email per klik. Belum ada pengiriman otomatis.
- Untuk kirim massal dibutuhkan **akun SMTP dari IT** (rencananya memakai `nodemailer`).
- Perlu diputuskan: nama pengirim dan domain pengirim. Ini perlu dicek karena UI dibuat netral tanpa nama perusahaan.

---

## 9. Ringkasan API

Semua rute ada di bawah `/api`. Rute admin wajib cookie admin, rute pengerjaan wajib cookie peserta.

- **Admin, login:**
  - `POST /admin/login`, `POST /admin/logout`, `GET /admin/saya`
- **Admin, sesi individu:**
  - `POST /admin/sesi`, `GET /admin/sesi`, `GET /admin/sesi/:id`
  - `PUT /admin/sesi/:id/template`
  - `POST /admin/sesi/:id/peserta`, `POST /admin/sesi/:id/token-baru`
  - `POST /admin/sesi/:id/undangan-dikirim`, `POST /admin/ujian/:id/cabut`
  - `GET /admin/template-bawaan`
- **Admin, sesi serentak:**
  - `POST /admin/sesi-kelompok`
  - `GET /admin/kelompok/:id/peserta`
  - `POST /admin/kelompok/:id/tambah-kuota`, `POST /admin/kelompok/:id/token-baru`, `POST /admin/kelompok/:id/cabut`
  - `POST /admin/sesi/:id/email-kelompok-dikirim`, `PUT /admin/ujian/:id/nama`
- **Admin, hasil:**
  - `GET /admin/ringkasan`, `GET /admin/hasil`, `GET /admin/ujian/:id/jawaban`
- **Peserta, masuk:**
  - `POST /peserta/token`, `POST /peserta/masuk`, `POST /peserta/masuk-kelompok`
  - `GET /peserta/saya`, `POST /peserta/mulai`
- **Peserta, pengerjaan:**
  - `GET /peserta/latihan`, `POST /peserta/latihan/periksa`
  - `GET /peserta/soal`, `GET /peserta/gambar/:nama`
  - `GET /peserta/jawaban`, `PUT /peserta/jawaban`
  - `POST /peserta/koran`, `POST /peserta/kirim`

Rincian lengkap ada di `backend/README.md`.

---

## 10. Aturan tes dan skoring (ringkas)

| Tes | Durasi | Jumlah | Skor |
| --- | --- | --- | --- |
| TIU 5 | 10 menit | 30 soal pilihan angka | Jumlah benar, lalu kategori, lalu skor akhir 1 sampai 5 |
| TIU 6 | 10 menit | 40 butir B/S (8 gambar x 5) | Jumlah benar per butir, lalu kategori, lalu skor 1 sampai 5 |
| Koran | 9 menit 32 detik (572 detik) | 13 halaman x 4 lajur x 20 angka (988 penjumlahan) | N = benar / 22, dibulatkan (bilangan bulat), lalu kategori, lalu skor 1 sampai 5. Ada grafik 22 interval x 26 detik |

- Tanpa penalti. Jawaban mentah selalu disimpan, jadi skor bisa dihitung ulang (`npm run hasil:hitung-ulang`) bila aturan berubah.
- Ambang kategori ada di `config/skoring.json`, bukan di kode.
- Urutan soal TIU 5 dan TIU 6 diacak per peserta. Angka Koran sama untuk semua peserta (keputusan HC).

---

## 11. Pengujian

- **Backend:** 109 tes otomatis (`node:test`, data dummy), mencakup skoring, nilai batas kategori, interval Koran, validasi token dan jawaban, persetujuan, dan pengacakan.
- **Frontend:** tes unit Vitest untuk timer, antrean simpan otomatis, dan logika Koran.
- **Uji database sesi serentak** (`npm run uji:kelompok`): 100 klaim paralel pada kuota 50 menghasilkan tepat 50 peserta.
- Uji manual alur lengkap oleh pemilik proyek di kantor dengan data dummy.
- **Belum:** daftar uji keamanan menyeluruh dan gladi demo (Part 9), uji di laptop peserta 1366 x 768, uji beban, dan uji pembaca layar.

---

## 12. Hal terbuka, mohon arahan IT

1. **Server dan domain produksi:** cara deploy (VM atau container), HTTPS, dan reverse proxy.
2. **Integrasi ke sistem besar:** dijadikan modul di repo sistem besar, atau layanan terpisah lewat API?
3. **Login admin:** tetap akun sendiri, atau memakai SSO / tabel user perusahaan?
4. **Standar perusahaan:** versi Angular, Node, dan Express, penggunaan Ionic, ORM, serta konvensi penamaan lain di luar PascalCase kolom.
5. **Akun DB aplikasi** dengan hak terbatas (lihat bagian 4).
6. **Job penghapusan data** 3 dan 4 bulan, serta masa simpan backup.
7. **Akun SMTP**, nama pengirim, dan domain email.
8. **Penyimpanan dan backup bank soal** di server.
9. **Kebijakan password admin** (minimum panjang).
10. **Penanganan kerentanan dependensi** `mssql` / `@azure/msal-node`.

Catatan: aturan HC disampaikan lisan lewat pemilik proyek dan belum berupa dokumen tertulis.
