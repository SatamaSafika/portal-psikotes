# Workflow pengembangan Portal Psikotes

Pembagian per bagian (part), bukan per hari. Ukuran: S (sekitar setengah hari), M (sekitar satu hari), L (lebih dari satu hari). Ukuran adalah perkiraan kasar, bukan janji.

Aturan kerja di setiap part:
1. Mulai dari Plan mode di Claude Code: minta rencana dulu, baca, baru izinkan menulis kode.
2. Kerja di cabang `fika`. Satu part, satu atau beberapa commit kecil.
3. Jalankan sendiri hasilnya. Kode belum dianggap jadi sebelum dijalankan dan lolos "selesai kalau".
4. Jangan mengaktifkan persetujuan otomatis untuk perintah terminal.
5. Soal asli, kunci, `.env` tidak pernah dikirim ke chat atau dibaca AI.

## Part 0. Persiapan (S)
- [ ] Claude Code terhubung di VS Code dan membaca CLAUDE.md.
- [ ] `.claude/settings.json` dengan aturan larangan baca `.env`, `materi_rahasia`, `backend/bank`.
- [ ] `backend/bank/` masuk `.gitignore`.
- [ ] Skrip 02 dan 03 dijalankan di database `BA`. Tiga tabel ada: `HCIS_Psikotes_Ujian`, `HCIS_Psikotes_Jawaban`, `HCIS_Psikotes_Admin`.
- [ ] `backend/.env` terisi (host, port, nama database, akun). Tidak di-commit.
- [ ] Minta ke IT: akun aplikasi dengan hak SELECT, INSERT, UPDATE hanya pada tabel `dbo.HCIS_Psikotes_*` di database `BA` (tanpa hak DDL).
- [ ] Bank soal: gambar dan kunci sudah di `materi_rahasia\mentah`, nama berkas sesuai pola.
- [ ] Durasi (10 menit per tes) dan jumlah soal (TIU 5 = 30, TIU 6 = 40, Koran sampai 1000) dimasukkan ke `backend/config/skoring.json` dan `soal.json`. Rumus kategori menunggu HC.
Selesai kalau: `GET /api/health` hidup dan satu perintah koneksi ke database berhasil.

## Part 1. Fondasi backend (M)
- Koneksi SQL Server (pooling), konfigurasi dari `.env`, penanganan galat.
- Helmet, batas laju (rate limit), CORS terbatas.
- Skrip pembuatan akun admin pertama (hash password). Satu peran admin saja, tanpa tabel peran.
- Login dan logout admin dengan sesi aman.
Selesai kalau: login admin berhasil, salah password dibatasi, kata sandi tidak muncul di log.

## Part 2. Bank soal dan skrip impor (M)
- Skrip impor: baca `mentah\` dan `kunci.csv`, tulis `backend/bank/v1/soal.json`, salin gambar.
- Pemeriksaan: nomor bolong, gambar tanpa kunci, kunci tidak valid, berkas tidak terpakai.
- Pembaca bank soal di backend (tanpa mengirim kunci ke klien).
Selesai kalau: skrip menyatakan bank valid dan jumlah soal sesuai ekspektasi per tes.

## Part 3. Sesi dan token (M)
- Admin membuat sesi dan daftar email, sistem membuat token acak panjang, simpan hash saja.
- Verifikasi token peserta: sekali pakai, belum kedaluwarsa, dalam jam sesi, terikat email.
- Mulai ujian: `mulai_pada` dan `batas_selesai` ditulis di server.
Selesai kalau: token tidak bisa dipakai dua kali dan tidak bisa dipakai di luar jam sesi.

## Part 4. API pengerjaan (L)
- Ambil soal tanpa kunci. Gambar lewat endpoint yang memeriksa token dan percobaan berjalan.
- Simpan jawaban (boleh kosong, boleh diubah sebelum kirim). Tolak setelah `batas_selesai`.
- Kirim jawaban dan penanganan waktu habis.
Selesai kalau: jawaban setelah batas waktu ditolak dan tidak ada respons API yang memuat kunci.

## Part 5. Koreksi dan hasil (M)
- Koreksi dari `jawaban` dan bank soal, kategori dan skor dari `skoring.json`.
- Simpan hasil di `ujian` dengan `aturan_versi` dan `bank_versi`.
- Skrip hitung ulang dari jawaban mentah.
- Uji dengan data dummy yang hasilnya dihitung tangan lebih dulu.
Selesai kalau: hitungan tangan dan hitungan sistem sama untuk setidaknya satu contoh tiap tes.

## Part 6. Frontend peserta, TIU 5 dan TIU 6 (L)
- Angular (versi stabil terbaru), proksi `/api` ke backend.
- Halaman: token, instruksi, latihan, TIU 5, TIU 6, kirim, selesai. Ikuti prototipe lo-fi.
- Navigasi soal, timer dari server, simpan otomatis.
Selesai kalau: satu peserta dummy menyelesaikan TIU 5 dan TIU 6 dari token sampai halaman selesai.

## Part 7. Frontend peserta, Tes Koran (M)
- Empat lajur per halaman, Enter pindah kotak, pindah halaman manual.
- Beban: 1000 soal, simpan jawaban bertahap supaya tidak hilang.
Selesai kalau: peserta dummy menyelesaikan Koran dan hasil koreksi cocok dengan hitungan tangan.

## Part 8. Dashboard HC (M)
- Overview, token dan sesi (buat, cabut), hasil per peserta.
Selesai kalau: HC dummy dapat membuat sesi, mencabut token, dan membaca hasil.

## Part 9. Pengujian dan gladi demo (M)
- Daftar uji keamanan (lihat bawah) dan uji alur penuh.
- `npm audit`, perbaiki kerentanan berat.
- Data dummy, skenario demo tertulis, gladi sekali penuh.
Selesai kalau: seluruh daftar uji lolos dan gladi berjalan tanpa campur tangan manual di basis data.

## Part 10. Setelah demo (di luar sasaran minggu ini)
- Skrip penghapusan otomatis data lebih dari 3 bulan (berdasarkan kolom `tanggal`, yaitu tanggal tes), dijadwalkan bersama IT. Uji dulu pada data dummy.
- Deploy di domain publik bersama IT, HTTPS wajib.
- Akun database aplikasi terpisah.
- Kebijakan penyimpanan data, serah terima akses, pencadangan bank soal.

## Daftar uji keamanan (Part 9)
- [ ] Token tidak bisa dipakai dua kali.
- [ ] Token kedaluwarsa atau di luar jam sesi ditolak.
- [ ] Jawaban setelah batas waktu ditolak.
- [ ] Tidak ada respons API (termasuk galat) yang memuat kunci jawaban.
- [ ] Gambar soal tidak bisa diambil tanpa token valid.
- [ ] Percobaan tebak token dibatasi.
- [ ] Salah password admin berulang dibatasi.
- [ ] Kata sandi dan token tidak muncul di log.
- [ ] Semua kueri berparameter, tidak ada penggabungan string SQL.
- [ ] `.env`, `materi_rahasia/`, `backend/bank/` tidak ada di `git ls-files`.