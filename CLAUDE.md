# Panduan untuk AI dan kontributor

Proyek: Portal Psikotes (TIU 5, TIU 6, Tes Koran/Kraepelin). Ditujukan untuk digabung ke sistem besar perusahaan di masa depan, jadi ikuti stack dan konvensi perusahaan.

## Stack
- Frontend: Angular + TypeScript (versi stabil terbaru). Ionic hanya bila diwajibkan.
- Backend: Express + TypeScript (Node LTS aktif).
- Database: SQL Server 2024 milik perusahaan (diizinkan dipakai). Host, port, username, dan password hanya ada di `backend/.env` (tidak di-commit, tidak dibaca AI). Pakai database khusus dengan skema `psikotes`. Akses lewat driver `mssql` dengan query berparameter. ORM diputuskan setelah ada jawaban tim IT.
- Bahasa antarmuka dan komentar: Indonesia.

## Aturan keras
1. Jangan pernah menaruh soal asli, kunci jawaban, atau data peserta di repositori. Folder `materi_rahasia/` diabaikan git.
2. Hanya data dummy. Jangan membuat data yang menyerupai karyawan nyata.
3. Kunci jawaban dan penghitungan waktu tetap di server. Jangan kirim kunci ke browser.
4. Simpan jawaban mentah peserta, supaya skor dapat dihitung ulang bila aturan berubah.
5. Ambang skoring dan kategori disimpan sebagai konfigurasi (tabel atau berkas), bukan konstanta di kode.
6. Password admin disimpan sebagai hash (argon2 atau bcrypt). Tidak ada pendaftaran mandiri admin. Batasi percobaan login.
7. Token peserta: sekali pakai, terikat sesi dan email, ada masa berlaku.
8. Jangan mengarang sumber, angka, atau aturan HC. Bila ragu, tulis "perlu verifikasi".
9. Database perusahaan dipakai hanya di database khusus proyek ini, skema `psikotes`. Jangan membaca, mengubah, atau menghapus database, skema, atau tabel lain. Jangan menjalankan DDL, DROP, atau TRUNCATE tanpa persetujuan eksplisit pemilik proyek. Jangan menulis kredensial di kode, log, atau chat.

## Aturan tes (ringkas)
- TIU 5 dan TIU 6: peserta boleh melewati soal, mengosongkan jawaban, dan mengubah jawaban sebelum kirim.
- TIU 5: instruksi dan satu gambar soal digabung. Jawaban hanya angka pilihan.
- TIU 6: satu gambar guntingan 1 sampai 5. Jawaban hanya B atau S per nomor.
- Koran/Kraepelin: 13 halaman, 4 lajur per halaman, 20 angka per lajur (1040 angka, 988 penjumlahan jika 19 per lajur), pindah halaman manual oleh peserta, Enter memindahkan kursor ke kotak berikutnya.
- Setiap tes punya 2 soal latihan dengan kunci langsung.

## Dikonfirmasi HC (29 Oktober 2026, disampaikan pemilik proyek; belum ada dokumen tertulis)
- Tanpa penalti. Skor mentah = jumlah benar. Salah dan kosong tidak mengurangi.
- Durasi: TIU 5 = 10 menit, TIU 6 = 10 menit, Koran = 7 menit 20 detik (satu timer total, dikerjakan sebisanya).
- Jumlah soal: TIU 5 = 30, TIU 6 = 40 butir (8 Soal x 5 butir), dinilai per butir. Koran = 13 halaman x 4 lajur x 20 angka.
- Kategori dan skor akhir: lihat `backend/config/skoring.json` dan `WORKFLOW.md`. Koran: N = total benar / 22, dibulatkan ke bilangan bulat terdekat setengah ke atas (hitung dengan bilangan bulat, tanpa float).
- Penyimpanan: jawaban mentah dihapus 3 bulan setelah tanggal tes. Seluruh data peserta (identitas, email, token, hasil, ringkasan skor) dihapus 4 bulan setelah tanggal tes.
- Angka Tes Koran dibuat acak sekali oleh pemilik proyek lewat skrip (`crypto.randomInt`), disimpan di `backend/bank/<versi>/`, sama untuk semua peserta (keputusan HC). Jangan menimpa tanpa konfirmasi, karena kunci bergantung pada angka itu.
- Hanya admin HC yang dapat melihat hasil dan mencari identitas, satu peran. Peserta tidak melihat hasil.

## Belum dikonfirmasi HC
- Belum ada. Catatan: aturan di atas disampaikan lewat pemilik proyek dan belum berupa dokumen tertulis HC.

## Konvensi kode
- TypeScript strict. Tipe model dibagi antara frontend dan backend bila memungkinkan.
- Struktur backend per modul: token, tes, skoring, hasil, admin. Skoring terpisah dari rute.
- Ikuti penamaan tabel dan folder yang dipakai tim IT bila sudah diketahui.
- Commit kecil dengan pesan jelas. Kerja di cabang, bukan langsung di main.