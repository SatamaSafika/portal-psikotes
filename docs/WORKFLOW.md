# Workflow pengembangan Portal Psikotes

Pembagian per bagian (part), bukan per hari. Ukuran: S (sekitar setengah hari), M (sekitar satu hari), L (lebih dari satu hari). Ukuran adalah perkiraan kasar, bukan janji.

Aturan kerja di setiap part:
1. Mulai dari Plan mode di Claude Code: minta rencana dulu, baca, baru izinkan menulis kode.
2. Kerja di cabang `fika`. Satu part, satu atau beberapa commit kecil.
3. Jalankan sendiri hasilnya. Kode belum dianggap jadi sebelum dijalankan dan lolos "selesai kalau".
4. Jangan mengaktifkan persetujuan otomatis untuk perintah terminal. Sesi VS Code bisa mulai dalam auto mode: pastikan mode Manual lewat `Shift+Tab` atau `/permissions`.
5. Soal asli, kunci, `.env` tidak pernah dikirim ke chat atau dibaca AI.

## Aturan tes yang sudah dikonfirmasi (rujukan semua part)
Sumber: HC, disampaikan pemilik proyek (29 Oktober 2026), dan dikonfirmasi lagi hari yang sama. Belum ada dokumen tertulis HC.

| Tes | Durasi | Jumlah | Masukan skor | Skor mentah |
| --- | --- | --- | --- | --- |
| TIU 5 | 10 menit (600 detik) | 30 soal | total benar | jumlah benar |
| TIU 6 | 10 menit (600 detik) | 40 butir (8 Soal x 5 butir) | total benar | jumlah benar, dinilai per butir |
| Koran | 7 menit 20 detik (440 detik) | 13 halaman x 4 lajur x 20 angka = 1040 angka, 988 penjumlahan (19 per lajur, lihat catatan). Angka dibuat acak sekali oleh pemilik proyek (disetujui HC) | total benar dibagi 22 (N), N dibulatkan | jumlah benar |

Tanpa penalti. Jawaban salah dan kosong tidak mengurangi skor. Kategori dan skor akhir:

| Skor mentah | TIU 5 | TIU 6 | Skor akhir |
| --- | --- | --- | --- |
| Terendah | 0 sampai 5, Kurang Sekali | di bawah 9, Kurang Sekali | 1 |
| | 6 sampai 13, Kurang | 9 sampai 16, Kurang | 2 |
| | 14 sampai 21, Cukup | 17 sampai 24, Rata-Rata | 3 |
| | 22 sampai 28, Baik | 25 sampai 32, Baik | 4 |
| Tertinggi | 29 sampai 30, Baik Sekali | 33 atau lebih, Baik Sekali | 5 |

| Koran: N = total benar / 22 | Kategori | Skor akhir |
| --- | --- | --- |
| di bawah 6 | Kurang Sekali | 1 |
| 6 sampai di bawah 11 | Kurang | 2 |
| 11 sampai di bawah 16 | Rata-Rata | 3 |
| 16 sampai di bawah 21 | Baik | 4 |
| 21 atau lebih | Baik Sekali | 5 |

Catatan penerapan:
- TIU 5 menyebut kategori ketiga "Cukup", TIU 6 dan Koran menyebut "Rata-Rata". Ditulis apa adanya sesuai HC.
- Koran: N = total benar / 22, dibulatkan ke bilangan bulat terdekat, setengah ke atas, sebelum dicocokkan dengan tabel (disetujui HC, 29 Oktober 2026). Hitung dengan bilangan bulat: N = (total benar + 11) / 22 dengan pembagian bulat ke bawah, tanpa float. Ambang total benar: 121, 231, 341, 451 (benar 121 berarti N = 5,5 menjadi 6, masuk Kurang).
- TIU 6: 40 butir, dinilai per butir (dikonfirmasi). Satu Soal (satu gambar) berisi 5 butir, jadi 8 Soal.
- Durasi Koran 7 menit 20 detik (dikonfirmasi).
- Koran: 13 halaman, 4 lajur per halaman, 20 angka per lajur (dari pemilik proyek). Jawaban adalah digit terakhir dari jumlah dua angka bersebelahan, jadi 20 angka menghasilkan 19 jawaban per lajur, total 52 x 19 = 988. **Perlu verifikasi**: apakah HC menghitung 19 atau 20 jawaban per lajur. Angka dibuat sekali, disimpan di bank, sama untuk semua peserta.
- Penyimpanan (disetujui HC, 29 Oktober 2026): jawaban mentah peserta dihapus 3 bulan setelah tanggal tes. Seluruh data peserta (identitas, email, token, hasil, ringkasan skor) dihapus 4 bulan setelah tanggal tes. Hanya admin HC yang dapat melihat hasil dan mencari identitas.

## Part 0. Persiapan (S)
- [X] Claude Code terhubung di VS Code dan membaca CLAUDE.md.
- [X] `.claude/settings.json` dengan aturan larangan baca `.env`, `materi_rahasia`, `backend/bank`.
- [X] `backend/bank/` masuk `.gitignore`.
- [X] Skrip 02 dan 03 dijalankan di database `BA`. Tiga tabel ada: `HCIS_Psikotes_Ujian`, `HCIS_Psikotes_Jawaban`, `HCIS_Psikotes_Admin`.
- [X] `backend/.env` terisi (host, port, nama database, akun). Tidak di-commit.
- [X] Minta ke IT: akun aplikasi dengan hak SELECT, INSERT, UPDATE hanya pada tabel `dbo.HCIS_Psikotes_*` di database `BA` (tanpa hak DDL). Skrip hapus 3 bulan butuh DELETE: minta terpisah atau jalankan dengan akun lain.
- [X] Bank soal: gambar, instruksi, dan kunci sudah di `materi_rahasia\mentah`. Pola nama:
  - `latihan-tiu5-NN.png`, `tiu5-NN.png` (01 sampai 30), `latihan-tiu6-NN.png`, `tiu6-NN.png` (satu gambar per Soal).
  - `instruksi_tiu5.txt`, `instruksi_tiu6.txt`.
  - `kunci.csv` dengan kolom `tes,jenis,soal,butir,kunci,penjelasan`. TIU 5: kunci 1 sampai 5, kolom `butir` kosong. TIU 6: `butir` 1 sampai 5, kunci `B` atau `S`.
  - `koran.json` juga sudah tercipta berisikan digit yang akan di ujikan pada soal koran.  
- [X] Salin `skoring.json` v1 (aturan di atas) ke `backend/config/skoring.json`. Durasi: `TIU5` 600, `TIU6` 600, `KORAN` 440 detik.
Selesai kalau: `GET /api/health` hidup dan satu perintah koneksi ke database berhasil.

## Part 1. Fondasi backend (M)
- [X] Koneksi SQL Server (pooling), konfigurasi dari `.env`, penanganan galat.
- [X] Helmet, batas laju (rate limit), CORS terbatas.
- [X] Skrip pembuatan akun admin pertama (hash password). Satu peran admin saja, tanpa tabel peran.
- [X] Login dan logout admin dengan sesi aman. Sesi disimpan di kolom tabel admin (skrip `db/04`, satu sesi per admin).
- [X] Uji oleh pemilik proyek: jalankan `db/04`, buat admin dummy, uji login, logout, penguncian.
Selesai kalau: login admin berhasil, salah password dibatasi, kata sandi tidak muncul di log.

## Part 2. Bank soal dan skrip impor (M)
- Skrip impor: baca `mentah\`, `instruksi_*.txt`, dan `kunci.csv`, tulis `backend/bank/v1/soal.json`, salin gambar.
- Pemeriksaan: nomor Soal atau butir bolong, gambar tanpa kunci, kunci tidak valid (TIU 5 harus 1 sampai 5, TIU 6 harus B atau S), berkas tidak terpakai, jumlah baris TIU 6 = jumlah Soal x 5.
- Skrip pembuat angka Koran (`npm run buat-koran`): membuat deretan angka 0 sampai 9 dengan generator acak yang aman (`crypto.randomInt`, bukan `Math.random`), sekali saja per versi bank, disimpan di `backend/bank/v1/`. Skrip menolak menimpa berkas yang sudah ada tanpa konfirmasi, karena mengganti angka berarti mengganti kunci. Susunan (13 halaman, 4 lajur per halaman, 20 angka per lajur) diambil dari konfigurasi, bukan angka tetap di kode. Dijalankan sekali oleh pemilik proyek.
- Pembaca bank soal di backend (tanpa mengirim kunci ke klien).
- Muat dan validasi `skoring.json`: batas kategori saling menyambung tanpa celah atau tumpang tindih.
Selesai kalau: skrip menyatakan bank valid, jumlah soal sesuai ekspektasi per tes, dan angka Koran sudah dibuat dan terbaca.

## Part 3. Sesi dan token (M)
- Admin membuat sesi dan daftar email, sistem membuat token acak panjang, simpan hash saja.
- Verifikasi token peserta: sekali pakai, belum kedaluwarsa, dalam jam sesi, terikat email.
- Sesi peserta setelah token diverifikasi (cookie atau token pendek terikat `ujian_id`), supaya refresh halaman tidak mengunci peserta.
- Mulai ujian: `mulai_pada` dan `batas_selesai` ditulis di server, dari `durasi_detik` tiap tes.
Selesai kalau: token tidak bisa dipakai dua kali dan tidak bisa dipakai di luar jam sesi.

## Part 4. API pengerjaan (L)
- Ambil soal tanpa kunci. Gambar lewat endpoint yang memeriksa token dan percobaan berjalan.
- Simpan jawaban (boleh kosong, boleh diubah sebelum kirim). Tolak setelah `batas_selesai`. TIU 6 disimpan per butir dengan nomor datar `(soal - 1) x 5 + butir`.
- Kirim jawaban dan penanganan waktu habis. Untuk Koran, simpan bertahap dan terima sisa jawaban saat waktu habis.
- Tidak ada endpoint hasil untuk peserta.
Selesai kalau: jawaban setelah batas waktu ditolak dan tidak ada respons API yang memuat kunci atau skor.

## Part 5. Koreksi dan hasil (M)
- Koreksi dari `jawaban` dan bank soal: skor mentah = jumlah benar. Tidak ada penalti.
- Kategori dan skor akhir dari `skoring.json`. Koran: N = total benar / 22, dibulatkan ke bilangan bulat setengah ke atas, lalu kategori. Simpan total benar dan N yang sudah dibulatkan.
- Simpan hasil di `ujian` dengan `aturan_versi` dan `bank_versi`.
- Skrip hitung ulang dari jawaban mentah.
- Uji dengan data dummy yang hasilnya dihitung tangan lebih dulu.
- Uji nilai batas, tiap sisi:
  - TIU 5: 5 dan 6, 13 dan 14, 21 dan 22, 28 dan 29.
  - TIU 6: 8 dan 9, 16 dan 17, 24 dan 25, 32 dan 33.
  - Koran (total benar): 120 dan 121, 230 dan 231, 340 dan 341, 450 dan 451. Tambah 0 (N = 0) dan 988 (N = 45, jawaban maksimum).
Selesai kalau: hitungan tangan dan hitungan sistem sama untuk setidaknya satu contoh tiap tes dan semua uji nilai batas lolos.

## Part 6. Frontend peserta, TIU 5 dan TIU 6 (L)
- Angular (versi stabil terbaru), proksi `/api` ke backend.
- Halaman: token, instruksi, latihan, TIU 5, TIU 6, kirim, selesai. Ikuti prototipe lo-fi, dengan jumlah soal dan timer 10 menit sesuai tabel. Halaman selesai tanpa skor.
- Navigasi soal, timer dari server, simpan otomatis.
Selesai kalau: satu peserta dummy menyelesaikan TIU 5 dan TIU 6 dari token sampai halaman selesai.

## Part 7. Frontend peserta, Tes Koran (M)
- 13 halaman, empat lajur per halaman, 20 angka per lajur. Enter pindah kotak, pindah halaman manual.
- Satu timer 7 menit 20 detik dari server. Peserta mengerjakan sebisanya. Simpan jawaban bertahap supaya tidak hilang saat waktu habis.
Selesai kalau: peserta dummy menyelesaikan Koran dan hasil koreksi cocok dengan hitungan tangan.

## Part 8. Dashboard HC (M)
- Overview, token dan sesi (buat, cabut), hasil per peserta (jumlah benar, N untuk Koran, kategori, skor akhir). Hanya admin HC.
Selesai kalau: HC dummy dapat membuat sesi, mencabut token, dan membaca hasil.

## Part 9. Pengujian dan gladi demo (M)
- Daftar uji keamanan (lihat bawah) dan uji alur penuh.
- `npm audit`, perbaiki kerentanan berat.
- Data dummy, skenario demo tertulis, gladi sekali penuh.
Selesai kalau: seluruh daftar uji lolos dan gladi berjalan tanpa campur tangan manual di basis data.

## Part 10. Setelah demo (di luar sasaran minggu ini)
- Skrip penghapusan terjadwal (bersama IT), dihitung dari kolom `tanggal` (tanggal tes): baris `jawaban` lebih dari 3 bulan dihapus, baris `ujian` lebih dari 4 bulan dihapus seluruhnya (termasuk baris yang tokennya tidak pernah dipakai atau kedaluwarsa). Mode uji tanpa menghapus, log hanya jumlah baris (tanpa nama atau email), uji dulu pada data dummy. Setelah 3 bulan skor tidak bisa dihitung ulang dari jawaban mentah.
- Tanyakan ke IT berapa lama cadangan (backup) database disimpan. Data yang sudah dihapus bisa bertahan di cadangan.
- Pencarian identitas oleh admin HC hanya lewat dashboard, bukan kueri langsung ke database.
- Deploy di domain publik bersama IT, HTTPS wajib.
- Akun database aplikasi terpisah.
- Kebijakan penyimpanan data, serah terima akses, pencadangan bank soal.

## Daftar uji keamanan (Part 9)
- [ ] Token tidak bisa dipakai dua kali.
- [ ] Token kedaluwarsa atau di luar jam sesi ditolak.
- [ ] Jawaban setelah batas waktu ditolak.
- [ ] Tidak ada respons API (termasuk galat) yang memuat kunci jawaban.
- [ ] Peserta tidak bisa mengambil skor atau hasil dirinya lewat API.
- [ ] Peserta A tidak bisa membaca atau menulis ujian peserta B (ganti `ujian_id` di permintaan).
- [ ] Gambar soal tidak bisa diambil tanpa token valid.
- [ ] Percobaan tebak token dibatasi.
- [ ] Salah password admin berulang dibatasi.
- [ ] Kata sandi dan token tidak muncul di log.
- [ ] Semua kueri berparameter, tidak ada penggabungan string SQL.
- [ ] `.env`, `materi_rahasia/`, `backend/bank/` tidak ada di `git ls-files`.