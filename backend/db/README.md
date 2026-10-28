# Skrip database

Database `BA` dipakai bersama proyek lain. Tabel proyek ini ada di skema `dbo` dengan prefix `HCIS_Psikotes_`:

| Tabel | Isi |
| --- | --- |
| `dbo.HCIS_Psikotes_Ujian` | sesi, peserta, token (hash), waktu, hasil |
| `dbo.HCIS_Psikotes_Jawaban` | jawaban mentah per nomor soal |
| `dbo.HCIS_Psikotes_Admin` | akun admin HC (hash password) |

Constraint dan index juga berprefix `HCIS_Psikotes_` supaya tidak bentrok dengan objek lain. Kolom memakai huruf kecil dengan garis bawah (snake_case).

Skrip dijalankan **manual oleh pemilik proyek** lewat SSMS. AI dan aplikasi tidak menjalankan DDL.

Urutan:
1. `02_buat_tabel_ujian_jawaban.sql`
2. `03_buat_tabel_admin.sql`

Kedua skrip diawali `USE BA;`, aman dijalankan ulang, dan tidak memuat DROP atau TRUNCATE.

Setelah menjalankan, cek dari folder `backend`:
```
npm run db:cek
```
Hasil yang diharapkan: `HCIS_Psikotes_Admin, HCIS_Psikotes_Jawaban, HCIS_Psikotes_Ujian`.

Catatan:
- `skor_akhir` belum diberi batasan rentang karena rumusnya belum dikonfirmasi HC.
- Penghapusan otomatis data lebih dari 3 bulan dibuat di Part 10. Hapus baris `HCIS_Psikotes_Jawaban` dulu, baru `HCIS_Psikotes_Ujian`, karena ada foreign key.
