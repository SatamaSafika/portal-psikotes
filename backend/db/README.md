# Skrip database

Database `BA` dipakai bersama proyek lain. Tabel proyek ini ada di skema `dbo` dengan prefix `HCIS_Psikotes_`:

| Tabel | Isi |
| --- | --- |
| `dbo.HCIS_Psikotes_Ujian` | sesi, peserta, token (hash), waktu, hasil |
| `dbo.HCIS_Psikotes_Jawaban` | jawaban mentah per nomor soal |
| `dbo.HCIS_Psikotes_Admin` | akun admin HC (hash password, hash sesi login) |
| `dbo.HCIS_Psikotes_Sesi` | sesi tes, mode (individu/kelompok), template undangan email; sejak `db/09` juga email penerima token kelompok (data pribadi PIC, ikut retensi 4 bulan) |
| `dbo.HCIS_Psikotes_Kelompok` | token kelompok per tes (hash, kuota, terpakai, jadwal, dicabut), sejak `db/09`; tanpa data pribadi |

Constraint dan index juga berprefix `HCIS_Psikotes_` supaya tidak bentrok dengan objek lain. Kolom memakai PascalCase (`Id`, `NamaSesi`, `TokenHash`), sesuai revisi tim IT 13 November 2026. Di kode backend, hasil query di-alias kembali ke snake_case (`NamaSesi AS nama_sesi`) supaya tipe TypeScript dan API ke frontend tidak berubah.

Skrip dijalankan **manual oleh pemilik proyek** lewat SSMS. AI dan aplikasi tidak menjalankan DDL.

## Skrip yang dipakai sekarang

`11_bangun_ulang_pascalcase.sql` (revisi tim IT 13 November 2026) membuat kelima tabel dengan struktur akhir lengkap (semua kolom, constraint, dan indeks dari 02 sampai 10) dan nama kolom PascalCase. Untuk database baru, cukup jalankan skrip ini saja.

Bila tabel lama sudah ada, skrip **menghapus kelima tabel beserta seluruh datanya** (DROP TABLE, termasuk akun admin) lalu membangunnya ulang, dalam satu transaksi. Keputusan pemilik proyek 13 November 2026: platform baru selesai dikembangkan dan isinya hanya data uji. Penggantian nama lewat `sp_rename` dicoba lebih dulu dan gagal karena kolom terikat ke CHECK constraint dan indeks terfilter.

Pengaman di skrip:
- Bagian 0 menampilkan jumlah baris per tabel sebelum apa pun diubah.
- Bagian 1 tidak berjalan sebelum `@konfirmasi` diisi `N'HAPUS'`.
- Berhenti tanpa mengubah apa pun bila ada tabel atau view lain yang terikat ke tabel proyek.
- Bila satu langkah gagal, semuanya dibatalkan dan tabel lama kembali utuh.

Setelah berhasil:
1. Buat ulang akun admin: `npm run admin:buat`.
2. Bila hak akun aplikasi diberikan per tabel, hak itu hilang bersama DROP TABLE. Minta IT memberi lagi SELECT, INSERT, UPDATE, DELETE pada kelima tabel.
3. `npm run db:cek`.

## Riwayat (snake_case, tidak dijalankan lagi)

Skrip 02 sampai 10 adalah riwayat struktur lama dengan kolom snake_case. Disimpan sebagai catatan, sudah digantikan `11`.

1. `02_buat_tabel_ujian_jawaban.sql`
2. `03_buat_tabel_admin.sql`
3. `04_tambah_kolom_sesi_admin.sql` (Part 1: kolom `sesi_hash`, `sesi_dibuat`, `sesi_aktif_terakhir` dan indeks unik terfilter `UX_HCIS_Psikotes_Admin_SesiHash`)
4. `05_buat_tabel_sesi.sql` (Part 3: tabel `HCIS_Psikotes_Sesi` berisi data sesi dan template undangan, tanpa data pribadi; kolom `sesi_id`, `sesi_peserta_hash`, `sesi_peserta_aktif` di tabel ujian). Bila hak akun aplikasi diberikan per tabel, minta IT memberi SELECT, INSERT, UPDATE pada tabel baru ini.
5. `06_tambah_waktu_jawaban.sql` (Part 4: kolom `waktu_ms` di tabel jawaban, milidetik sejak tes dimulai, hanya untuk Koran)
6. `07_tambah_kolom_hasil.sql` (Part 5: kolom `n_koran` dan `ringkasan_interval` (JSON 22 interval) di tabel ujian; tanpa tabel baru, ikut retensi 4 bulan)
7. `08_tambah_undangan_dikirim.sql` (Part 8: kolom `undangan_dikirim_pada` di tabel ujian; diisi saat HC membuka undangan di Outlook)
8. `09_sesi_kelompok.sql` (Part 8b, sudah dijalankan 4 November 2026: tabel `HCIS_Psikotes_Kelompok`, kolom `kelompok_id` di ujian, `mode` dan `email_penerima` di sesi; Bagian 2 melonggarkan `email` dan `token_hash` di ujian lewat DROP CONSTRAINT/INDEX lalu indeks unik terfilter, dalam satu transaksi. Struktur saja, tanpa menghapus data.)
9. `10_tambah_persetujuan.sql` (Part 8c, sudah dijalankan 4 November 2026: kolom `persetujuan_pada` dan `persetujuan_versi` di tabel ujian, bukti peserta memilih "Saya Setuju"; boleh NULL untuk baris lama, ikut retensi 4 bulan)

Hasil `npm run db:cek` yang diharapkan: `HCIS_Psikotes_Admin, HCIS_Psikotes_Jawaban, HCIS_Psikotes_Kelompok, HCIS_Psikotes_Sesi, HCIS_Psikotes_Ujian`.

Catatan:
- `SkorAkhir` belum diberi batasan rentang karena rumusnya belum dikonfirmasi HC.
- Penghapusan otomatis data lebih dari 3 bulan dibuat di Part 10. Hapus baris `HCIS_Psikotes_Jawaban` dulu, baru `HCIS_Psikotes_Ujian`, karena ada foreign key.
