# Panduan untuk AI dan kontributor

Proyek: Portal Psikotes (TIU 5, TIU 6, Tes Koran/Kraepelin). Ditujukan untuk digabung ke sistem besar perusahaan di masa depan, jadi ikuti stack dan konvensi perusahaan.

## Stack
- Frontend: Angular + TypeScript (versi stabil terbaru). Ionic hanya bila diwajibkan.
- Backend: Express + TypeScript (Node LTS aktif).
- Database pengembangan: SQL Server gratis lewat Docker. Akses lewat ORM agar mudah dipindah.
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
9. Jangan menyentuh database produksi perusahaan.

## Aturan tes (ringkas)
- TIU 5 dan TIU 6: peserta boleh melewati soal, mengosongkan jawaban, dan mengubah jawaban sebelum kirim.
- TIU 5: instruksi dan satu gambar soal digabung. Jawaban hanya angka pilihan.
- TIU 6: satu gambar guntingan 1 sampai 5. Jawaban hanya B atau S per nomor.
- Koran/Kraepelin: beberapa lajur per halaman (prototipe: 4), total 1000 soal, pindah halaman manual oleh peserta, Enter memindahkan kursor ke kotak berikutnya.
- Setiap tes punya 2 soal latihan dengan kunci langsung.

## Belum dikonfirmasi HC
- Rumus kategori dan skor akhir TIU 5, TIU 6, dan Kraepelin (termasuk arti pembagi 20 pada Kraepelin).
- Apakah skor mentah TIU 5 hanya jumlah benar atau benar dikurangi penalti.
- Durasi, jumlah soal, lama penyimpanan hasil, siapa yang boleh melihat hasil.

## Konvensi kode
- TypeScript strict. Tipe model dibagi antara frontend dan backend bila memungkinkan.
- Struktur backend per modul: token, tes, skoring, hasil, admin. Skoring terpisah dari rute.
- Ikuti penamaan tabel dan folder yang dipakai tim IT bila sudah diketahui.
- Commit kecil dengan pesan jelas. Kerja di cabang, bukan langsung di main.
