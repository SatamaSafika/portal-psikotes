# Panduan untuk AI dan kontributor

Proyek: Portal Psikotes (TIU 5, TIU 6, Tes Koran/Kraepelin). Ditujukan untuk digabung ke sistem besar perusahaan di masa depan, jadi ikuti stack dan konvensi perusahaan.

## Stack
- Frontend: Angular + TypeScript (versi stabil terbaru). Ionic hanya bila diwajibkan.
- Backend: Express + TypeScript (Node LTS aktif).
- Database: SQL Server 2024 milik perusahaan (diizinkan dipakai). Host, port, username, dan password hanya ada di `backend/.env` (tidak di-commit, tidak dibaca AI). Pakai database `BA` (dipakai bersama proyek lain), skema `dbo`, semua tabel berprefix `HCIS_Psikotes_` (contoh `HCIS_Psikotes_Ujian`). Constraint dan index juga berprefix `HCIS_Psikotes_`. Kolom snake_case. Akses lewat driver `mssql` dengan query berparameter. ORM diputuskan setelah ada jawaban tim IT.
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
9. Database `BA` dipakai bersama. Proyek ini hanya boleh menyentuh tabel berprefix `HCIS_Psikotes_` di skema `dbo`. Jangan membaca, mengubah, atau menghapus tabel lain di `BA`, maupun database lain. Jangan menjalankan DDL, DROP, atau TRUNCATE tanpa persetujuan eksplisit pemilik proyek. Jangan menulis kredensial di kode, log, atau chat.

## Aturan tes (ringkas)
- TIU 5 dan TIU 6: peserta boleh melewati soal, mengosongkan jawaban, dan mengubah jawaban sebelum kirim.
- TIU 5: instruksi dan satu gambar soal digabung. Jawaban hanya angka pilihan.
- TIU 6: satu gambar guntingan 1 sampai 5. Jawaban hanya B atau S per nomor.
- Koran/Kraepelin: beberapa lajur per halaman (prototipe: 4), total 1000 soal, pindah halaman manual oleh peserta, Enter memindahkan kursor ke kotak berikutnya.
- Setiap tes punya 2 soal latihan dengan kunci langsung.

## Dikonfirmasi HC (28 Oktober 2026, dari pemilik proyek; sumber: HC)
- Tanpa penalti. Skor mentah = jumlah jawaban benar. Jawaban salah dan kosong tidak mengurangi.
- Durasi TIU 5, TIU 6, dan Kraepelin: masing-masing 10 menit. Kraepelin: satu timer 10 menit total, peserta mengerjakan sebisanya (tidak harus selesai 1000 angka), tidak ada timer per lajur.
- Jumlah soal: TIU 5 = 30, TIU 6 = 40, Kraepelin = angka disediakan sampai 1000.
- Penyimpanan hasil: maksimal 3 bulan, dihitung sejak tanggal tes (kolom `tanggal`). Setelah itu data peserta (ujian dan jawaban) dihapus otomatis.
- Yang boleh melihat hasil: hanya admin HC, dan semua admin HC berperan sama (tidak ada tingkat hak akses). Peserta tidak punya tampilan hasil, hanya mengerjakan lalu melihat halaman selesai tanpa skor.

## Belum dikonfirmasi HC
- Rumus kategori dan skor akhir TIU 5, TIU 6, dan Kraepelin (termasuk arti pembagi 20 pada Kraepelin, dan bagaimana jawaban benar dan salah dipakai pada Kraepelin).
- Apakah ringkasan skor tanpa identitas peserta boleh disimpan lebih lama dari 3 bulan.

## Konvensi kode
- TypeScript strict. Tipe model dibagi antara frontend dan backend bila memungkinkan.
- Struktur backend per modul: token, tes, skoring, hasil, admin. Skoring terpisah dari rute.
- Ikuti penamaan tabel dan folder yang dipakai tim IT bila sudah diketahui.
- Commit kecil dengan pesan jelas. Kerja di cabang, bukan langsung di main.