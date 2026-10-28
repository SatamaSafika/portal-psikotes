# Skrip database

Dijalankan **manual oleh pemilik proyek** lewat SSMS, hanya di database khusus proyek ini. AI dan aplikasi tidak menjalankan DDL.

Urutan:
1. `02_buat_skema_psikotes_2tabel.sql`: skema `psikotes`, tabel `ujian` dan `jawaban`.
2. `03_buat_tabel_admin.sql`: tabel `admin`.

Sebelum menjalankan:
- Pastikan database aktif di SSMS adalah database proyek (`USE <nama_database>` atau pilih di kotak database), bukan `master` atau database lain.
- Kedua skrip aman dijalankan ulang dan tidak memuat DROP atau TRUNCATE.

Setelah menjalankan, cek dari folder `backend`:
```
npm run db:cek
```
Hasil yang diharapkan: skema psikotes ada, dengan tabel `admin`, `jawaban`, dan `ujian`.

Catatan:
- `skor_akhir` belum diberi batasan rentang karena rumusnya belum dikonfirmasi HC.
- Penghapusan otomatis data lebih dari 3 bulan dibuat di Part 10. Hapus baris `jawaban` dulu, baru `ujian`, karena ada foreign key.
