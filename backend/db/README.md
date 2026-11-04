# Skrip database

Database `BA` dipakai bersama proyek lain. Tabel proyek ini ada di skema `dbo` dengan prefix `HCIS_Psikotes_`:

| Tabel | Isi |
| --- | --- |
| `dbo.HCIS_Psikotes_Ujian` | sesi, peserta, token (hash), waktu, hasil |
| `dbo.HCIS_Psikotes_Jawaban` | jawaban mentah per nomor soal |
| `dbo.HCIS_Psikotes_Admin` | akun admin HC (hash password, hash sesi login) |
| `dbo.HCIS_Psikotes_Sesi` | sesi tes, mode (individu/kelompok), template undangan email; sejak `db/09` juga email penerima token kelompok (data pribadi PIC, ikut retensi 4 bulan) |
| `dbo.HCIS_Psikotes_Kelompok` | token kelompok per tes (hash, kuota, terpakai, jadwal, dicabut), sejak `db/09`; tanpa data pribadi |

Constraint dan index juga berprefix `HCIS_Psikotes_` supaya tidak bentrok dengan objek lain. Kolom memakai huruf kecil dengan garis bawah (snake_case).

Skrip dijalankan **manual oleh pemilik proyek** lewat SSMS. AI dan aplikasi tidak menjalankan DDL.

Urutan:
1. `02_buat_tabel_ujian_jawaban.sql`
2. `03_buat_tabel_admin.sql`
3. `04_tambah_kolom_sesi_admin.sql` (Part 1: kolom `sesi_hash`, `sesi_dibuat`, `sesi_aktif_terakhir` dan indeks unik terfilter `UX_HCIS_Psikotes_Admin_SesiHash`)
4. `05_buat_tabel_sesi.sql` (Part 3: tabel `HCIS_Psikotes_Sesi` berisi data sesi dan template undangan, tanpa data pribadi; kolom `sesi_id`, `sesi_peserta_hash`, `sesi_peserta_aktif` di tabel ujian). Bila hak akun aplikasi diberikan per tabel, minta IT memberi SELECT, INSERT, UPDATE pada tabel baru ini.
5. `06_tambah_waktu_jawaban.sql` (Part 4: kolom `waktu_ms` di tabel jawaban, milidetik sejak tes dimulai, hanya untuk Koran)
6. `07_tambah_kolom_hasil.sql` (Part 5: kolom `n_koran` dan `ringkasan_interval` (JSON 22 interval) di tabel ujian; tanpa tabel baru, ikut retensi 4 bulan)
7. `08_tambah_undangan_dikirim.sql` (Part 8: kolom `undangan_dikirim_pada` di tabel ujian; diisi saat HC membuka undangan di Outlook)
8. `09_sesi_kelompok.sql` (Part 8b, sudah dijalankan 4 November 2026: tabel `HCIS_Psikotes_Kelompok`, kolom `kelompok_id` di ujian, `mode` dan `email_penerima` di sesi; Bagian 2 melonggarkan `email` dan `token_hash` di ujian lewat DROP CONSTRAINT/INDEX lalu indeks unik terfilter, dalam satu transaksi. Struktur saja, tanpa menghapus data.)
9. `10_tambah_persetujuan.sql` (Part 8c, sudah dijalankan 4 November 2026: kolom `persetujuan_pada` dan `persetujuan_versi` di tabel ujian, bukti peserta memilih "Saya Setuju"; boleh NULL untuk baris lama, ikut retensi 4 bulan)

Semua skrip diawali `USE BA;`, aman dijalankan ulang, dan tidak memuat DROP atau TRUNCATE.

Setelah menjalankan, cek dari folder `backend`:
```
npm run db:cek
```
Hasil yang diharapkan: `HCIS_Psikotes_Admin, HCIS_Psikotes_Jawaban, HCIS_Psikotes_Ujian`.

Catatan:
- `skor_akhir` belum diberi batasan rentang karena rumusnya belum dikonfirmasi HC.
- Penghapusan otomatis data lebih dari 3 bulan dibuat di Part 10. Hapus baris `HCIS_Psikotes_Jawaban` dulu, baru `HCIS_Psikotes_Ujian`, karena ada foreign key.
