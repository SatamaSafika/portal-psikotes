# Workflow pengembangan Portal Psikotes

Pembagian per bagian (part), bukan per hari. Ukuran: S (sekitar setengah hari), M (sekitar satu hari), L (lebih dari satu hari). Ukuran adalah perkiraan kasar, bukan janji.

## Status (15 November 2026)
- Selesai dan di-commit di cabang `fika`: Part 0 sampai Part 8 (Dashboard HC `fd807ab`), Part 8b sesi serentak (`3ced5b4` sampai `cd75911`), Part 8c persetujuan peserta (`a7dc76b`, `f6893d4`), revisi UI HC 4 November (`4853c4c`), revisi HC 5 November (`f4befa5`), gaya UI v50 dan revisi HC 10 November (`8157a1f`).
- Selesai dan diterima pemilik proyek (15 November 2026): seluruh proses bisnis (peserta individu dan serentak, pengerjaan tiga tes, koreksi, dashboard HC, laporan, ekspor) dan tampilan front-end (Redesign 9 November, Refinement visual, gaya prototipe v50, revisi HC 10 November).
- Selesai: revisi tim IT 13 November 2026, kolom database PascalCase. Database dibangun ulang dengan `db/11` dan kini bersih dari data uji coba (lihat bagian "Revisi tim IT" di bawah).
- Di-commit 16 November 2026: perubahan PascalCase, email Tes 1-3, gaya terakhir, `docs/PRESENTASI_IT.md`.
- Part 9: pemeriksaan statis, `npm audit`, dan seluruh daftar uji keamanan lolos (uji API diuji manual oleh pemilik proyek saat hands-on dengan partner). Tersisa: skenario demo tertulis dan gladi.
- Revisi HC 2 November 2026 (UI tanpa nama perusahaan, tracking Koran, landing page tanpa deskripsi) dan 5 November 2026 (Koran 26 detik x 22, tanpa Enter; laporan per peserta) berlaku untuk semua part berikutnya.

Aturan kerja di setiap part:
1. Mulai dari Plan mode di Claude Code: minta rencana dulu, baca, baru izinkan menulis kode.
2. Kerja di cabang `fika`. Satu part, satu atau beberapa commit kecil.
3. Jalankan sendiri hasilnya. Kode belum dianggap jadi sebelum dijalankan dan lolos "selesai kalau".
4. Jangan mengaktifkan persetujuan otomatis untuk perintah terminal. Sesi VS Code bisa mulai dalam auto mode: pastikan mode Manual lewat `Shift+Tab` atau `/permissions`.
5. Soal asli, kunci, `.env` tidak pernah dikirim ke chat atau dibaca AI.
6. [REVISI 2 Nov 2026] UI dan semua teks yang tampil ke peserta tidak memuat nama "Bakrie Autoparts" atau variasinya (permintaan HC). Berlaku untuk judul halaman dan tab browser, header, footer, teks instruksi, pesan galat, dan template email undangan bawaan. Logo juga tidak dipakai. Suntingan template email oleh HC tidak dibatasi isinya (keputusan pemilik proyek). Pengecualian hanya untuk dokumen internal repo (README, CLAUDE.md, WORKFLOW).
7. [REVISI 2 Nov 2026] Perubahan skema database (DDL) tetap hanya boleh dijalankan dengan persetujuan eksplisit pemilik proyek, dan hanya pada tabel `dbo.HCIS_Psikotes_*` di database `BA`.

## Aturan tes yang sudah dikonfirmasi (rujukan semua part)
Sumber: HC, disampaikan pemilik proyek (29 Oktober 2026), dan dikonfirmasi lagi hari yang sama. Belum ada dokumen tertulis HC.

| Tes | Durasi | Jumlah | Masukan skor | Skor mentah |
| --- | --- | --- | --- | --- |
| TIU 5 | 10 menit (600 detik) | 30 soal | total benar | jumlah benar |
| TIU 6 | 10 menit (600 detik) | 40 butir (8 Soal x 5 butir) | total benar | jumlah benar, dinilai per butir |
| Koran | 9 menit 32 detik (572 detik, revisi HC 5 November 2026) | 13 halaman x 4 lajur x 20 angka = 1040 angka, 988 penjumlahan (19 per lajur, lihat catatan). Angka dibuat acak sekali oleh pemilik proyek (disetujui HC) | total benar dibagi 22 (N), N dibulatkan | jumlah benar |

**Tracking Koran per 20 detik** (permintaan HC, 2 November 2026): untuk bahan grafik per peserta. 440 detik dibagi interval 20 detik = 22 interval. Interval ke-k mencakup detik [20 x (k-1), 20 x k), jadi jawaban pada detik tepat 440 tidak dihitung. Tiap interval menampilkan jumlah dikerjakan (benar + salah), jumlah benar, dan jumlah salah. Jumlah 22 interval harus sama dengan total jawaban, total benar, dan total salah. Tidak mengubah aturan skor di bawah. Interpretasi grafik oleh HC, bukan oleh sistem. Grafik hanya untuk admin HC, tidak tampil ke peserta.

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
- Durasi Koran 9 menit 32 detik (revisi HC 5 November 2026; sebelumnya 7 menit 20 detik).
- Koran: 13 halaman, 4 lajur per halaman, 20 angka per lajur (dari pemilik proyek). Jawaban adalah digit terakhir dari jumlah dua angka bersebelahan, jadi 20 angka menghasilkan 19 jawaban per lajur, total 52 x 19 = 988. **Perlu verifikasi**: apakah HC menghitung 19 atau 20 jawaban per lajur. Angka dibuat sekali, disimpan di bank, sama untuk semua peserta.
- Penjelasan jawaban hanya untuk latihan TIU 5 (keputusan pemilik proyek). Latihan TIU 6 dan semua soal tanpa penjelasan.
- Koran dikerjakan ketat satu per satu dari atas ke bawah: setiap kotak harus terisi sebelum lanjut, tidak bisa melompat, tidak bisa kembali atau mengubah (keputusan pemilik proyek, 2 November 2026). Jadi pada Koran "dikerjakan" = jumlah kotak yang terisi, dan tidak ada kotak kosong di tengah. TIU 5 dan TIU 6 tetap boleh melewati dan mengubah jawaban sebelum kirim.
- Penyimpanan (disetujui HC, 29 Oktober 2026): jawaban mentah peserta dihapus 3 bulan setelah tanggal tes. Seluruh data peserta (identitas, email, token, hasil, ringkasan skor) dihapus 4 bulan setelah tanggal tes. Hanya admin HC yang dapat melihat hasil dan mencari identitas.

## Part 0. Persiapan (S) — selesai
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

## Part 1. Fondasi backend (M) — selesai
- [X] Koneksi SQL Server (pooling), konfigurasi dari `.env`, penanganan galat.
- [X] Helmet, batas laju (rate limit), CORS terbatas.
- [X] Skrip pembuatan akun admin pertama (hash password). Satu peran admin saja, tanpa tabel peran.
- [X] Login dan logout admin dengan sesi aman. Sesi disimpan di kolom tabel admin (skrip `db/04`, satu sesi per admin).
- [X] Uji oleh pemilik proyek: jalankan `db/04`, buat admin dummy, uji login, logout, penguncian.

Selesai kalau: login admin berhasil, salah password dibatasi, kata sandi tidak muncul di log.

## Part 2. Bank soal dan skrip impor (M) — selesai
- [X] Skrip impor: baca `mentah\`, `instruksi_*.txt`, dan `kunci.csv`, tulis `backend/bank/v1/soal.json`, salin gambar. (`npm run bank:impor`, ada mode `--periksa`)
- [X] Pemeriksaan: nomor Soal atau butir bolong, gambar tanpa kunci, kunci tidak valid (TIU 5 harus 1 sampai 5, TIU 6 harus B atau S), berkas tidak terpakai, jumlah baris TIU 6 = jumlah Soal x 5.
- [X] Skrip pembuat angka Koran (`npm run buat-koran`): membuat deretan angka 0 sampai 9 dengan generator acak yang aman (`crypto.randomInt`, bukan `Math.random`), sekali saja per versi bank. Skrip menolak menimpa berkas yang sudah ada, karena mengganti angka berarti mengganti kunci. Susunan (13 halaman, 4 lajur per halaman, 20 angka per lajur) diambil dari konfigurasi, bukan angka tetap di kode. Angka v1 sudah dibuat di `mentah/koran.json` dan disalin ke `bank/v1/` oleh skrip impor.
- [X] Pembaca bank soal di backend (tanpa mengirim kunci ke klien).
- [X] Muat dan validasi `skoring.json`: batas kategori saling menyambung tanpa celah atau tumpang tindih.
- [X] Uji oleh pemilik proyek: `npm test`, `bank:impor -- --periksa`, `bank:impor`, `bank:periksa`.
- [X] [REVISI] Pemilik proyek memeriksa sendiri `instruksi_tiu5.txt`, `instruksi_tiu6.txt`, dan semua gambar soal dan latihan: tidak ada nama atau logo perusahaan (aturan 6, dikonfirmasi 2 November 2026). AI tidak membaca berkas ini. Bila kelak ada yang perlu diubah, perbaiki di `mentah/` lalu impor sebagai `bank/v2` (`npm run bank:impor -- --versi v2`), karena `bank/v1` tidak ditimpa.
- Latihan Tes Koran (2 soal latihan) belum punya bahan: dibahas di Part 7.

Selesai kalau: skrip menyatakan bank valid, jumlah soal sesuai ekspektasi per tes, dan angka Koran sudah dibuat dan terbaca.

## Part 3. Sesi, token, dan undangan email (L)
Keputusan pemilik proyek (2 November 2026): undangan lewat email saja (bukan WA). Satu token per tes, dan setiap tes punya jadwal sendiri (tanggal, jam buka, jam tutup) yang sama untuk semua peserta sesi itu; satu email per peserta memuat semua tokennya beserta jadwal tiap tes. Template bawaan netral, bisa diedit HC, suntingan disimpan per sesi. Pengiriman sementara lewat tombol yang membuka aplikasi email (`mailto`), SMTP menyusul.
- [X] Skrip `db/05_buat_tabel_sesi.sql`: tabel `HCIS_Psikotes_Sesi` (data sesi dan template, tanpa data pribadi) dan kolom `sesi_id`, `sesi_peserta_hash`, `sesi_peserta_aktif` di tabel ujian. DDL, dijalankan pemilik proyek.
- [X] Admin membuat sesi dan daftar email, sistem membuat token acak panjang (20 karakter, sekitar 100 bit), simpan hash saja. Token mentah hanya tampil sekali; "token baru" mengganti token yang belum dipakai.
- [X] Template undangan: bawaan di `config/undangan.json`, wajib memuat `{daftar_token}`, penanda salah ketik ditolak. Respons berisi subjek, isi, dan tautan `mailto` per peserta.
- [X] [REVISI 2 Nov 2026] Jadwal per tes: admin mengirim `jadwal` (satu per tes), disimpan per token di tabel ujian. `{daftar_token}` memuat nama tes, jadwal, dan token. Penanda `{tanggal}`, `{jam_buka}`, `{jam_tutup}` dihapus. Tanpa DDL.
- [X] Uji ulang oleh pemilik proyek setelah revisi jadwal per tes (email 3 tes dengan jadwal berbeda tampil benar di Outlook).
- [X] Verifikasi token peserta: sekali pakai, belum kedaluwarsa, dalam jam sesi, terikat email. Pesan gagal selalu sama. Batas percobaan gagal per IP.
- [X] Sesi peserta setelah token diverifikasi (cookie terikat `ujian_id`), supaya refresh halaman tidak mengunci peserta.
- [X] Mulai ujian: `mulai_pada` dan `batas_selesai` ditulis di server, dari `durasi_detik` tiap tes. Harus mulai sebelum jam tutup; durasi tidak dipotong jam tutup (keputusan sementara, **perlu verifikasi HC**).
- [X] `npm run db:cek` menampilkan jam dan zona waktu server database.
- [X] Uji oleh pemilik proyek: jalankan `db/05`, pastikan zona waktu server database WIB, uji alur sesi dan token.
- HC mengirim dari Outlook desktop. Di komputer HC, atur aplikasi email bawaan Windows ke Outlook (Pengaturan > Aplikasi > Aplikasi default > pilih default menurut jenis tautan > MAILTO), supaya tombol kirim membuka Outlook, bukan browser.
- [REVISI] Template bawaan dan teks halaman token tanpa nama perusahaan. Tanyakan ke HC dan IT apa nama pengirim dan domain pengirim email yang dipakai bila nanti memakai SMTP, karena domain bisa memuat nama perusahaan.
- Tombol `mailto` membuka satu email per klik. Kirim massal sekaligus butuh SMTP dari IT (tambah dependensi `nodemailer` saat itu).
- Belum ada: admin mengatur ulang peserta yang tokennya sudah terpakai tapi berganti perangkat sebelum mulai. Bahas bila dibutuhkan HC.

Selesai kalau: token tidak bisa dipakai dua kali, tidak bisa dipakai di luar jam sesi, dan email undangan berisi token terbentuk dari template.

## Part 4. API pengerjaan (L)
Keputusan pemilik proyek (3 November 2026): kunci latihan dikirim setelah latihan dijawab; toleransi kirim 5 detik; ujian otomatis terkirim saat waktu habis, apa pun kondisi jawabannya.
- [X] Kode Part 4 (lihat butir di bawah). Uji otomatis: 72 tes lolos.
- [X] Uji oleh pemilik proyek: jalankan `db/06`, uji alur TIU dan Koran, waktu habis dengan `DURASI_UJI_DETIK` (TIU 5 tertutup otomatis `WAKTU_HABIS`, TIU 6 dan Koran `DIKIRIM`).
- [X] [REVISI] Skrip `db/06_tambah_waktu_jawaban.sql` (nomor 05 sudah dipakai Part 3): tambah satu kolom waktu relatif (milidetik sejak mulai tes) pada `dbo.HCIS_Psikotes_Jawaban`, boleh kosong untuk TIU 5 dan TIU 6. Ini DDL, jalankan hanya setelah disetujui pemilik proyek. Lakukan sebelum endpoint simpan jawaban Koran.
- [X] Ambil soal tanpa kunci. Gambar lewat endpoint yang memeriksa token dan percobaan berjalan.
- [X] Simpan jawaban (boleh kosong, boleh diubah sebelum kirim). Tolak setelah `batas_selesai`. TIU 6 disimpan per butir dengan nomor datar `(soal - 1) x 5 + butir`.
- [X] Latihan: dikirim tanpa kunci; `latihan/periksa` membalas benar/salah dan kunci setelah peserta menjawab (penjelasan hanya TIU 5).
- [X] Kirim jawaban dan penanganan waktu habis. Untuk Koran, simpan bertahap dan terima sisa jawaban saat waktu habis. Jawaban diterima sampai `batas_selesai` + 5 detik; setelah itu server menutup otomatis (`WAKTU_HABIS`, setiap 15 detik). Token yang jadwalnya lewat tanpa mulai menjadi `KEDALUWARSA`.
- [X] Batas laju rute peserta per peserta (600 per 15 menit), bukan per IP.
- [X] [REVISI] Koran: setiap jawaban disimpan bersama waktu relatifnya (dari klien). Server memvalidasi: waktu tidak negatif, naik terus mengikuti urutan jawaban (tes berurutan), di bawah durasi 440 detik (jawaban pada atau setelah detik 440 ditolak, supaya skor sama dengan jumlah 22 interval), dan tidak lebih besar dari waktu berjalan menurut server sejak `mulai_pada` ditambah toleransi 1 detik. Waktu tidak valid ditolak, bukan dipercaya begitu saja.
- [REVISI] Koran dikerjakan ketat satu per satu (keputusan pemilik proyek, 2 November 2026): tidak bisa kembali, tidak bisa melompat, tidak bisa mengubah. Server hanya menerima jawaban untuk nomor berikutnya (nomor terakhir + 1, mulai dari 1), berisi satu digit 0 sampai 9. Jawaban kosong, nomor yang sudah dijawab, dan nomor yang melompat ditolak. Akibatnya jawaban Koran selalu berupa deretan nomor 1 sampai n tanpa celah, satu kotak satu waktu, dan waktu naik mengikuti nomor. Berbeda dengan TIU 5 dan TIU 6 yang boleh melewati dan mengubah jawaban.
- Tidak ada endpoint hasil untuk peserta.

Selesai kalau: jawaban setelah batas waktu ditolak, waktu jawaban Koran yang tidak masuk akal ditolak, dan tidak ada respons API yang memuat kunci atau skor.

## Part 5. Koreksi dan hasil (M)
Keputusan pemilik proyek (3 November 2026): ringkasan 22 interval disimpan di database, sebagai kolom di tabel ujian (tanpa tabel baru).
- [X] Skrip `db/07_tambah_kolom_hasil.sql`: kolom `n_koran` dan `ringkasan_interval` (JSON, dicek `ISJSON`) di tabel ujian.
- [X] Koreksi dari `jawaban` dan bank soal: skor mentah = jumlah benar. Tidak ada penalti.
- [X] Kategori dan skor akhir dari `skoring.json`. Koran: N = total benar / 22, dibulatkan ke bilangan bulat setengah ke atas, lalu kategori. Simpan total benar dan N yang sudah dibulatkan.
- [X] Simpan hasil di `ujian` dengan `aturan_versi` dan `bank_versi`. Dihitung otomatis saat kirim dan setiap 15 detik untuk ujian selesai yang belum dihitung.
- [X] [REVISI] Koran: hitung ringkasan 22 interval (dikerjakan, benar, salah) dari jawaban dan waktunya. Panjang interval (20 detik) disimpan di `skoring.json` sebagai konfigurasi (CLAUDE.md aturan 5, disetujui pemilik proyek 2 November 2026), dan jumlah interval = durasi / interval, divalidasi harus bilangan bulat.
- [X] [REVISI] Ringkasan disimpan di kolom `ringkasan_interval` (ikut retensi 4 bulan), jadi grafik tetap bisa dibuka setelah jawaban mentah dihapus (3 bulan).
- [X] Skrip hitung ulang dari jawaban mentah (`npm run hasil:hitung-ulang`). Ujian yang jawaban mentahnya sudah terhapus dilewati.
- [X] Uji dengan data dummy yang hasilnya dihitung tangan lebih dulu (`test/koreksi.test.ts`, 86 tes lolos).
- [X] Uji oleh pemilik proyek: jalankan `db/07`, kerjakan sesi dummy, cocokkan hasil dengan hitungan tangan (Koran 3 benar, 2 salah, N 0, interval 1 = 3/2/1, interval 2 = 2/1/1, 22 interval; TIU 5 cocok dengan kunci; hitung ulang 2 ujian).
- Uji nilai batas, tiap sisi:
  - TIU 5: 5 dan 6, 13 dan 14, 21 dan 22, 28 dan 29.
  - TIU 6: 8 dan 9, 16 dan 17, 24 dan 25, 32 dan 33.
  - Koran (total benar): 120 dan 121, 230 dan 231, 340 dan 341, 450 dan 451. Tambah 0 (N = 0) dan 988 (N = 45, jawaban maksimum).
  - [REVISI] Interval Koran: jawaban pada detik 19,999 dan 20,000 (masuk interval 1 dan 2), jawaban pada detik 439,999 (interval 22) dan 440,000 (tidak dihitung), 22 interval tepat, jumlah semua interval sama dengan total benar dan total salah, serta tes tanpa satu pun jawaban menghasilkan 22 interval berisi nol.

Selesai kalau: hitungan tangan dan hitungan sistem sama untuk setidaknya satu contoh tiap tes, semua uji nilai batas lolos, dan ringkasan 22 interval cocok dengan hitungan tangan pada satu contoh Koran.

## Part 6. Frontend peserta, TIU 5 dan TIU 6 (L)
Keputusan pemilik proyek (3 November 2026): Node 24 LTS + Angular 22; nama dari peserta disimpan bila HC belum mengisi; token untuk tes lain ditolak tanpa terpakai; klik nomor di navigasi soal melompat ke soal itu. Acuan UI: `docs/prototipe/` (versi 47).
- [X] Node 24.22 (nvm-windows), Angular 22.2 di `frontend/`, proksi `/api` ke backend, font Montserrat dipasang lokal, token desain dari prototipe.
- [X] Backend: `masuk` menerima `jenis_tes` dan `nama`; `/saya` memuat `nama`, `jumlah_soal`, `jumlah_nomor`.
- [X] Halaman: pilih tes, verifikasi (token, nama, email), instruksi, latihan (kunci setelah dijawab), TIU 5, TIU 6, kirim, selesai. Halaman selesai tanpa skor.
- [X] [REVISI] Landing page: hanya judul dan pilihan langsung, tanpa deskripsi. Semua halaman tanpa nama dan logo perusahaan (aturan 6), termasuk footer dan judul tab. Pakai teks netral, misalnya "Portal Psikotes".
- [X] Navigasi soal (klik nomor), timer dari server (sinkron tiap 30 detik), simpan otomatis, kirim otomatis saat waktu habis (halaman selesai dengan pesan waktu habis).
- [X] Tes unit frontend (Vitest): hitung mundur, antrean simpan otomatis, status navigasi.
- [X] Uji oleh pemilik proyek di browser: TIU 5 dan TIU 6 dari pilih tes sampai selesai, token untuk tes lain ditolak tanpa terpakai, kirim otomatis saat waktu habis.
- Analytics Angular CLI dimatikan (`"analytics": false`). Fungsi bantu uji manual: `backend/scripts/uji-api.ps1`.
- Kartu Tes Koran di halaman awal sudah ada; halaman Koran dibuat di Part 7.

Selesai kalau: satu peserta dummy menyelesaikan TIU 5 dan TIU 6 dari token sampai halaman selesai.

## Part 7. Frontend peserta, Tes Koran (M)
Keputusan pemilik proyek (3 November 2026): isi kotak aktif boleh diganti sebelum Enter, lalu terkunci; di halaman 13 "Kirim jawaban" membuka halaman konfirmasi; susunan Koran (halaman, lajur, angka) hanya dari konfigurasi dan bank, tanpa angka tetap di kode front-end.
- [X] 13 halaman, empat lajur per halaman, 20 angka per lajur (dari `/soal`, mengikuti `tes.json`). Enter pindah kotak, pindah halaman manual.
- [X] [REVISI] Pengerjaan ketat satu per satu dari atas ke bawah. Hanya kotak berikutnya yang aktif. Kotak harus terisi satu digit sebelum lanjut (Enter pada kotak kosong tidak berpindah). Kotak yang sudah dijawab terkunci. Tidak bisa kembali atau melompat ke kotak, lajur, atau halaman lain. Pindah halaman manual hanya setelah semua kotak di halaman itu terisi. Di layar <= 640 px satu digit langsung mengunci.
- [X] Satu timer 7 menit 20 detik dari server. Peserta mengerjakan sebisanya. Simpan jawaban bertahap (tiap sekitar 2 detik atau 20 jawaban, berurutan, dicoba lagi bila gagal, pulih otomatis bila server menolak urutan) supaya tidak hilang saat waktu habis.
- [X] [REVISI] Catat waktu relatif tiap jawaban (milidetik sejak tes dimulai) dan kirim bersama jawaban. `waktu_ms` dari `berjalan_ms` server ditambah selang jam browser, tidak pernah mundur. Ini tidak menampilkan apa pun ke peserta: tidak ada indikator interval atau grafik di layar peserta.
- [X] Instruksi Koran, contoh 1, contoh 2, uji coba (benar/salah setelah "Selesai uji coba", bisa diulang). `/saya` memuat `jumlah_halaman`.
- [X] Tes unit Vitest: susunan dan nomor datar, halaman setelah refresh, penyaring digit, waktu tidak mundur, antrean berurutan dan pemulihan urutan.
- [X] Uji oleh pemilik proyek di browser: Koran dari pilih tes sampai selesai, hasil dicek di sisi admin, `waktu_ms` tersimpan dan naik mengikuti nomor.
- Latihan Koran: bahan sudah ada di `frontend/src/app/koran/latihan.ts` (contoh 1, contoh 2, uji coba; sama dengan prototipe, dipertahankan). Kunci latihan dihitung di browser karena bukan bagian bank soal. Latihan tidak dicatat waktunya dan tidak masuk interval (disetujui pemilik proyek, 2 November 2026).

Selesai kalau: peserta dummy menyelesaikan Koran, hasil koreksi cocok dengan hitungan tangan, dan setiap jawaban tersimpan dengan waktu relatifnya.

## Part 8. Dashboard HC (M)
Keputusan pemilik proyek (4 November 2026): grafik SVG sendiri tanpa pustaka; ekspor CSV (Excel) dan cetak browser (PDF); penanda "undangan dikirim" disimpan di database (db/08, kolom di tabel ujian); "Lihat jawaban" menampilkan jawaban dan benar/salah tanpa kunci.
- [X] Overview, token dan sesi (buat dengan jadwal per tes, cabut), hasil per peserta (jumlah benar, N untuk Koran, kategori, skor akhir). Hanya admin HC (login di `/admin/masuk`).
- [X] [REVISI] Halaman hasil Koran per peserta: tabel dan grafik 22 titik (dikerjakan, benar, salah per interval 20 detik), SVG tanpa pustaka. Grafik hanya untuk admin HC dan tidak ada di sisi peserta.
- [X] [REVISI] Dashboard juga tanpa nama dan logo perusahaan (aturan 6).
- [X] Skrip `db/08_tambah_undangan_dikirim.sql`: kolom `undangan_dikirim_pada` di tabel ujian. DDL, dijalankan pemilik proyek.
- [X] Backend: `GET /api/admin/ringkasan`, `GET /api/admin/hasil` (filter jenis, sesi, tanggal), `GET /api/admin/ujian/:id/jawaban` (benar/salah, tanpa kunci), `GET /api/admin/template-bawaan`, `POST /api/admin/sesi/:id/undangan-dikirim`.
- [X] Undangan: tombol membuka Outlook (mailto) dan menandai terkirim; "Buka undangan berikutnya" satu per klik (browser memblokir banyak mailto sekaligus). Token mentah hanya di memori sesaat setelah dibuat; setelah dimuat ulang, kirim ulang = buat token baru (beda dengan prototipe "token yang sama", karena token hanya disimpan sebagai hash).
- [X] Ekspor Excel (CSV titik koma, BOM UTF-8, pengaman rumus) dan Ekspor PDF (cetak browser dengan tata letak cetak).
- [X] Kode admin dimuat terpisah (lazy), peserta tidak mengunduhnya. Tes: 91 backend, 30 frontend.
- [X] Uji oleh pemilik proyek di kantor (butuh database): jalankan `db/08`, login admin, buat sesi 3 tes, kirim undangan, cabut token, hasil, grafik Koran cocok dengan tabel, ekspor, keluar.

Selesai kalau: HC dummy dapat membuat sesi, mencabut token, membaca hasil, dan melihat grafik 22 interval Koran yang cocok dengan ringkasan tangan.

## Part 8b. Sesi serentak / kelompok (L)
Keputusan pemilik proyek (4 November 2026, setelah uji coba dashboard dengan HC): token per peserta dirasa tidak efisien untuk tes massal di sekolah atau kampus. Dua metode: individu (yang sekarang, tidak berubah) dan serentak.
Aturan metode serentak: satu sesi berisi 1 sampai 3 tes; tiap tes punya satu token kelompok dengan kuota X (jumlah orang), jadwal sendiri, dan hanya aktif pada jadwalnya. Email token (satu email, semua tes dan jadwal) dikirim ke alamat yang diinput, diasumsikan pengawas, guru, atau panitia. Peserta mengisi nama saja, tanpa email dan tanpa NIM/NISN. Satu peserta satu catatan ujian dengan timer sendiri. Tes selalu diawasi di tempat, semua peserta di atas 18 tahun.
Keputusan pemilik proyek atas rencana 8b (4 November 2026):
1. Tabel ujian: Opsi A. `email` dan `token_hash` dilonggarkan menjadi boleh NULL (DROP CONSTRAINT `UQ_HCIS_Psikotes_Ujian_Token` dan `UQ_HCIS_Psikotes_Ujian_Peserta`, DROP INDEX `IX_HCIS_Psikotes_Ujian_Email`, lalu dibuat ulang sebagai indeks unik terfilter), ditambah CHECK: baris individu wajib email dan token, baris kelompok wajib nama tanpa email dan token. Struktur saja, tanpa menghapus data.
2. Email penerima token kelompok (PIC) disimpan di tabel sesi (`email_penerima`), ikut retensi 4 bulan (Part 10).
3. Kuota maksimum 1000 per token (pemakaian normal 100 sampai 200). Batas gagal jalur token 300 per 15 menit per IP (yang berhasil tidak dihitung). Nama peserta kelompok minimal 2, maksimal 100 karakter.
4. Cabut token kelompok hanya menolak klaim baru; peserta yang sedang mengerjakan tetap lanjut.
5. Aturan mode individu tidak berubah (token per peserta, terikat email, sekali pakai, sesuai jadwal). Tampilan verifikasi menjadi dua langkah untuk kedua mode.
Status 4 November 2026: DDL dijalankan; kode backend dan frontend selesai; uji di kantor oleh pemilik proyek lolos (`npm run uji:kelompok`, alur manual serentak, regresi individu). Prototipe versi 48 sudah memuat 8b.
- [x] DDL `db/09_sesi_kelompok.sql` (dijalankan pemilik proyek di SSMS, 4 November 2026): tabel `HCIS_Psikotes_Kelompok` (sesi, jenis tes, hash token, kuota, terpakai, jadwal, dicabut), kolom `kelompok_id` di tabel ujian, kolom `mode` dan `email_penerima` di tabel sesi, pelonggaran `email` dan `token_hash` (keputusan 1).
- [x] Klaim atomik: satu transaksi `UPDATE ... WHERE terpakai < kuota` pada jadwal aktif dan belum dicabut, lalu `INSERT` catatan ujian. Tidak boleh baca lalu tulis terpisah.
- [x] Token kelompok pendek dan mudah diketik (usulan 10 karakter tanpa karakter mirip). Batas gagal jalur kelompok per token, ambang per IP dinaikkan, supaya satu ruangan tidak terkunci karena salah ketik.
- [x] Verifikasi peserta (dua langkah): token, lalu nama (mode kelompok) atau nama dan email (mode individu). Pesan gagal tetap seragam. Cookie sesi peserta seperti Part 3.
- [x] Buat sesi serentak: nama sesi, email PIC, X, daftar tes dengan jadwal per tes. Template email bawaan kelompok terpisah (tanpa kalimat larangan membagikan token), bisa disunting HC.
- [x] Dashboard: terpakai n dari X per token, tambah kuota, cabut, hasil diurutkan per sesi lalu nama (termasuk ekspor), koreksi nama oleh admin, kartu Overview menghitung per token.
- [x] Mode individu tidak berubah (uji regresi seluruh tes yang ada).
- [x] Perbarui prototipe dan `PROTOTIPE_SPEC.md` (pilihan mode, kuota, layar verifikasi dua langkah): prototipe versi 48, tangkapan layar `Token_serentak`, `Token_individu`, `Token_galat`, `HcToken_serentak`, `HcToken_serentak_aksi`.
Selesai kalau: 100 klaim paralel pada kuota 50 menghasilkan tepat 50 peserta; di luar jadwal dan token tercabut ditolak; 100 salah ketik dari satu IP tidak mengunci peserta yang benar; hasil per peserta dan skor tetap sesuai hitungan tangan; semua tes lama tetap lolos.

## Part 8c. Persetujuan peserta (S)
Permintaan HC terkait legal (4 November 2026, disampaikan pemilik proyek; DDL `db/10` disetujui dan dijalankan pemilik proyek). Teks dari tangkapan layar formulir HC, disimpan di `backend/config/persetujuan.json` dengan versi.
- [x] DDL `db/10_tambah_persetujuan.sql`: kolom `persetujuan_pada` dan `persetujuan_versi` di tabel ujian.
- [x] Verifikasi langkah 2 (individu dan serentak): teks persetujuan, pilihan Saya Setuju / Saya Tidak Setuju tanpa pilihan bawaan; tidak setuju = tidak bisa lanjut, token dan kuota tidak terpakai.
- [x] Server mewajibkan `setuju: true` dengan versi teks yang berlaku (400 tanpa persetujuan, 409 bila teks sudah diperbarui), lalu menyimpan waktu dan versi bersama catatan ujian.
- [x] Admin: kolom persetujuan di daftar peserta serentak dan di ekspor hasil.
- [x] `PROTOTIPE_SPEC.md` bagian 6a (uraian layar persetujuan).
- [ ] Board `Token.dc.html` dan tangkapan layar persetujuan (dikerjakan pemilik proyek).
Perlu verifikasi HC/legal: (a) teks sudah final atau masih draf; (b) kata "proses rekrutmen" cocok untuk semua sesi serentak (misalnya tes di kampus); (c) bukti persetujuan ikut terhapus 4 bulan setelah tes atau perlu disimpan lebih lama.
Selesai kalau: peserta tidak bisa masuk tanpa memilih Saya Setuju (juga lewat API langsung), dan setiap catatan ujian baru menyimpan waktu dan versi persetujuan.

## Revisi UI HC (4 November 2026, disampaikan pemilik proyek)
- [x] Kartu pilihan tes TIU 5 dan TIU 6 di laman awal sama ukuran dan sejajar (sebelumnya kartu ke-2 turun 20 px).
- [x] Tiga kartu angka di Overview dashboard HC sama ukuran dan sejajar.
- [x] Tes Koran: saat semua kotak satu halaman terisi, Enter (kedua) memindah ke halaman berikutnya, selain tombol. Enter yang mengunci kotak terakhir tidak ikut memindah halaman. Halaman 13: kirim tetap lewat tombol lalu layar konfirmasi "Kirim jawaban sekarang?" (dikonfirmasi pemilik proyek, 4 November 2026).
- [x] Tes Koran: keterangan bahwa setelah Enter jawaban terkunci dan kursor tidak dapat naik ke kotak di atasnya, di layar tes, uji coba, dan instruksi.

## Revisi HC (5 November 2026, disampaikan pemilik proyek)
Menggantikan aturan lama di Part 4, 5, 7, 8, dan revisi Enter 4 November. Butir lama di atas tetap sebagai riwayat. Tanpa DDL.
- [X] Koran: interval 26 detik x 22, durasi 572 detik = 9 menit 32 detik (26 x 22, dikonfirmasi pemilik proyek 5 November 2026). Versi aturan `v2-2026-11-05`. Rumus N tidak berubah. Setelah diterapkan, jalankan `npm run hasil:hitung-ulang` supaya grafik hasil lama memakai interval baru.
- [X] Koran: satu angka langsung terkunci dan pindah kotak tanpa Enter, di semua layar dan uji coba. Halaman berganti otomatis. Kotak terakhir halaman 13 membuka layar konfirmasi kirim.
- [X] Overview: total peserta selesai (data tersimpan), selesai hari ini, sedang mengerjakan (status BERJALAN, sudah mulai, batas waktu belum lewat), dihitung per orang per sesi.
- [X] Hasil dan laporan: satu baris per peserta per sesi dengan Review, Cetak PDF, dan Detail jawaban (per nomor dan per 26 detik, terpisah dari Review). Laporan Peserta memuat identitas, hasil tiap tes, grafik Koran, dan catatan HC yang tercetak tetapi tidak disimpan. Ekspor PDF mencetak semua peserta sesuai filter, satu per halaman. Ekspor Excel tetap per tes.
- [X] Serentak digabung menurut nama di sesi yang sama; dua catatan bernama sama untuk tes yang sama tidak digabung dan ditandai.
Perlu verifikasi HC: angka pada contoh laporan tidak konsisten (benar dan salah Koran tampak tertukar, TIU 6 benar 26 tertulis Cukup padahal Baik menurut `skoring.json`). Laporan memakai hitungan sistem.

## Redesign UI/UX dan perbaikan fungsi (9 November 2026, permintaan pemilik proyek)
Tanpa DDL. Hanya warna dan tipografi korporat; nama dan logo perusahaan tetap tidak dipakai (aturan keras 10).
- [X] Token desain: navy `#193F69`, oranye `#CB642B`. Ikon Lucide (`lucide`; `lucide-angular` belum mendukung Angular 22). Halaman HC lebar maksimum 1440 px. (Font Lato, latar, dan warna teks diganti oleh Refinement visual akhir di bawah.)
- [X] Halaman pilih tes: tes yang sudah dikirim dari tab ini tampil redup dengan penanda Selesai dan tombol "Sudah dikerjakan" (sessionStorage, tanpa identitas; token tetap sekali pakai di server). Tautan "Peserta lain memakai komputer ini" menghapus penanda.
- [X] Instruksi TIU: "Klik kembali jawaban yang dipilih untuk membatalkan pilihan. Anda juga dapat melewati soal dan menjawabnya kembali nanti."
- [X] ~~Tes Koran: satu lajur muat dalam layar 1366 x 768 tanpa menggulir.~~ Diganti permintaan berikutnya (9 November): lajur tidak dipaksa muat satu layar, keterbacaan lebih utama.
- [X] Tes Koran (refinement 9 November): teks instruksi panjang di bawah lajur dihapus; baris 36 px dengan angka lebih besar; setiap kotak tepat di tengah dua angka dengan kurung penghubung (A+B, B+C); kotak terisi navy solid, kotak aktif putih bersorot oranye; kotak aktif tetap digulir otomatis ke tampilan.
- [X] Warna lebih tegas (9 November): header tes navy solid dengan timer oranye solid (merah saat hampir habis); peringatan Koran navy; navigasi soal TIU dan pilihan terpilih solid; pesan galat dan berhasil solid.
- [X] Template email hanya diedit di formulir Buat sesi tes; tombol "Ubah template sesi" di kartu pratinjau dihapus (rute backend tetap ada untuk kompatibilitas).
- [X] TIU 5 dan TIU 6: urutan soal acak per catatan ujian, deterministik dari id ujian, jenis tes, dan versi bank (sama saat dimuat ulang atau dilanjutkan, tanpa kolom baru). Jawaban, kunci, dan skoring tetap memakai nomor soal asli. TIU 6 diacak per Soal (butir tetap di Soal-nya).
- [X] Latihan Koran: uji coba menjadi dua lajur (lajur kedua hanya di latihan; tes utama tidak berubah).
- [X] Ekspor Excel `.xlsx` (menggantikan CSV) mengikuti filter aktif: lembar Rekap Peserta, detail per jenis tes, dan Keterangan; AutoFilter, baris judul beku, format tanggal, lebar kolom otomatis. Dibuat tanpa dependensi (ZIP + SpreadsheetML), diuji terbuka di Excel 16. Teks diawali `=` tetap teks (aman dari injeksi rumus).

## Refinement visual akhir (9 November 2026, permintaan pemilik proyek)
Tanpa perubahan logika, API, database, timer, pengacakan, skoring, atau penyimpanan. Diaudit dengan tangkapan layar semua halaman (server tiruan data dummy di luar repo).
- [X] Font: Raleway (judul, angka tegak) dan Inter (antarmuka), menggantikan Lato.
- [X] Panel datar radius 4 px tanpa bayangan; kepala tabel slate netral; status teks bertitik warna; latar warm neutral.
- [X] Overview: satu strip KPI bersekat (sedang mengerjakan, selesai hari ini, total selesai) menggantikan tiga kartu berikon.
- [X] Hasil dan laporan: filter sebagai toolbar; kolom "Hasil per tes" (kode tes, skor 1-5, kategori berwarna menurut skor) menggantikan kolom badge dan ringkasan teks; aksi Review, Cetak, Jawaban dalam satu baris.
- [X] Halaman awal: nomor urut 01-03 menggantikan ikon; tab admin tanpa ikon dekoratif; TIU 5 pilihan 1-5 berjajar; gambar soal tanpa bingkai ganda; teks bantu Token dan jadwal diringkas.

Catatan 10 November: arah visual bagian ini (panel datar, warm neutral) digantikan Penerapan gaya prototipe v50 di bawah. Yang tetap: font Raleway dan Inter, strip KPI tiga angka, kolom Hasil per tes, nomor 01-03, pilihan TIU 5 berjajar.

## Penerapan gaya prototipe v50 (10 November 2026, permintaan pemilik proyek)
Acuan `docs/prototipe/PROTOTIPE_SPEC.md` bagian 7 sampai 13 dan `STYLE_UI.md`. Tampilan saja: tanpa perubahan logika, route, API, database, timer, skoring, validasi token, teks persetujuan, atau `koran/latihan.ts`. Diaudit dengan tangkapan layar semua halaman dan keadaan (server tiruan data dummy di luar repo), lebar 1440, 1366 x 768, 1920, dan 600 px.
- [X] Tahap 1-2, token dan komponen bersama: `styles.scss` dipecah menjadi `src/styles/_token, _dasar, _komponen, _peserta, _tes, _admin, _laporan`. Latar gradien biru muda, kartu kaca, tombol pil, chip label, ubin ikon, langkah bernomor, lencana dan kategori berupa pil. Komponen baru di `src/app/bersama/`: tanda produk (generik, bukan logo perusahaan), ilustrasi SVG (halaman awal, selesai, masuk admin), chip Catatan dengan tooltip (hover dan fokus keyboard), avatar inisial. Efek 7b (hover tombol, ubin, fade-up) mati bila `prefers-reduced-motion`. Font Raleway 500 dan 800 ditambah (tetap di-host sendiri).
- [X] Tahap 3, peserta pra-tes: hero halaman awal dengan ilustrasi dan tiga ubin ber-ikon; verifikasi langkah 1 (sekitar 620 px) dan langkah 2 dua kolom (persetujuan kiri, identitas kanan; "Tidak Setuju" tampil sebagai pesan merah); instruksi dengan langkah bernomor; latihan TIU 5 pilihan berjajar; uji coba Koran per kartu lajur; kirim dengan ubin ikon; selesai dengan ilustrasi centang.
- [X] Tahap 4, halaman tes tetap tenang (tanpa efek): header navy membulat, status "Jawaban tersimpan" di kepala kartu soal, instruksi TIU 6 bergaris kiri, navigasi TIU 6 empat kolom. Koran: banner aturan dan posisi halaman satu baris, baris 24 px; diukur di 1366 x 768 satu lajur berakhir di 647 px (tanpa gulir). Prototipe menyebut sekitar 27 px, tetapi dengan 27 px masih perlu gulir sekitar 100 px.
- [X] Tahap 5, dashboard HC: masuk admin dua panel; header terang dan tab kartu; Overview strip kaca tiga KPI; Token dan jadwal tiga kolom (formulir lengket 340 px; pratinjau email di kanan pada layar >= 1700 px, wadah 1680 px; jadwal ringkas "Sel, 10 Nov 08:00–10:00"; templat email di `<details>`; umpan balik berupa toast yang ditutup manual); Hasil dengan kartu ringkasan (dihitung dari baris tampil, nama kategori dari data), Cari nama, avatar, kolom Tanggal; panel Laporan menambah tombol Detail jawaban. Penjelasan panjang dipindah ke chip Catatan, teksnya tidak dihapus.
- [X] Tahap 6, verifikasi: kontras WCAG AA diukur untuk semua pasangan warna teks; fokus keyboard terlihat (outline oranye); `prefers-reduced-motion` mematikan transisi dan animasi; responsif sampai 600 px (tabel HC digulir ke samping, kolom bertumpuk). Build dan 56 tes unit lolos.

Perbedaan dari prototipe dan alasannya:
- Warna digelapkan karena kontras di bawah AA: teks sekunder `#5E7391` -> `#50647F`; latar tombol oranye `#CB642B` -> `#B85A26` (teks putih 3,9 -> 4,6:1; `#CB642B` tetap untuk aksen); teks chip `#2F6FD6` -> `#2560C0`; batas kontrol (field, kotak Koran, pilihan, navigasi soal) `#CFDBEC` -> `#7A8DA8` (1,4 -> 3,4:1, WCAG 1.4.11).
- Halaman awal (permintaan pemilik proyek 11 November): tanpa tombol "Mulai dengan token" (token selalu terikat tes yang dipilih). Subteks kartu tanpa angka ("Pilihan ganda", "Benar atau salah", "Penjumlahan cepat"): belum ada API publik sebelum token, dan durasi atau jumlah soal tidak boleh ditulis permanen di front-end. Kartu selalu satu baris (ditumpuk di bawah 620 px); hover atau fokus menjadikan "Pilih tes" pil oranye `#B0541F`; perangkat sentuh selalu menampilkan pil. Nomor 01-03 dekoratif (`aria-hidden`, `#8FA3C0`). Paragraf hero mengikuti prototipe v50 (menggantikan "landing tanpa deskripsi" 2 November; perlu verifikasi HC).
- Laporan Peserta dan Detail jawaban tetap panel di halaman Hasil, bukan halaman terpisah (route tidak diubah). Tata letak cetak A4 tidak diubah.
- Chip "Perlu perhatian" tidak dipasang: kriteria belum diputuskan HC.
- Cacat prototipe yang dirapikan: pil "Waktu terukur" (teks mepet, titik dekoratif tertindih, teks bisa diseleksi); header, isi, dan footer HC tidak sejajar kiri; jadwal "Tutup" terpisah di baris sendiri; pratinjau email lebih sempit dari kartu lain; Detail jawaban Koran menulis jumlah kosong padahal hanya kotak terisi yang tampil; garis grafik "Dikerjakan" berbeda warna dari legendanya; berkas `aset/ilustrasi-main.svg` terpotong (diambil utuh dari `html/Main.dc.html`); ikon kunci Lucide terpasang terputar 180 derajat dari prototipe.
- Kurung penghubung di kiri kotak Koran (9 November) dihapus mengikuti prototipe v50.
- Perbaikan 11 November: panel Review terbuka = aksi tabel Hasil berupa ikon saja (label untuk pembaca layar dan tooltip); jarak penjelasan di Contoh lajur Koran; tinggi baris Koran mengikuti tinggi layar (24 px di 1366 x 768, sampai 38 px di layar tinggi; selalu muat satu lajur).
- Grafik tracking Koran (permintaan pemilik proyek 10 November: warna navy dan merah tua sulit dibedakan): hanya warna yang diganti, bentuk grafik tetap. Dikerjakan biru `#2F6FD6`, Benar hijau `#1E8A4E`, Salah oranye `#D9480F`. Berlaku di Detail jawaban dan Laporan Peserta (layar dan cetak).

Belum diverifikasi: tampilan di laptop kantor 1366 x 768 dengan browser peserta (tinggi viewport sebenarnya), performa efek di laptop spesifikasi rendah, pembaca layar.

## Revisi HC (10 November 2026, disampaikan pemilik proyek 11 November)
Tampilan saja, tanpa perubahan backend, route, atau database.
- [X] Laporan Peserta: kolom N Tes Koran dihapus (N tetap di Excel). Format mengikuti contoh dokumen pemilik proyek: kepala biru berjarak huruf dengan garis navy, identitas dua pasang per baris (cetak), judul bagian pita navy, tabel bergaris dengan baris judul biru muda, kategori berwarna menurut skor akhir. Cetak A4 tetap satu halaman per peserta (diuji lewat cetak PDF).
- [X] Halaman awal peserta: urutan kartu Koran, TIU 5, TIU 6.
- [X] Portal peserta memakai Tes 1 (Koran), Tes 2 (TIU 5), Tes 3 (TIU 6): halaman awal, verifikasi, instruksi, latihan, pengerjaan, kirim. Dashboard HC tetap TIU 5, TIU 6, Tes Koran. Konstanta di `frontend/src/app/core/model.ts` (`DAFTAR_TES_PESERTA`, `LABEL_TES_PESERTA`).
- [X] Email undangan peserta dan email token kelompok (PIC) memakai Tes 1-3, urut Tes 1, 2, 3 (keputusan pemilik proyek 12 November 2026: jenis tes dirahasiakan dari peserta). `LABEL_TES_PESERTA` di `backend/src/modules/token/undangan.ts`; diuji tidak memuat "TIU" atau "Koran". Email yang sudah terkirim sebelumnya tidak berubah.
- Masih perlu dicek: Teks instruksi dari bank soal juga perlu dicek pemilik proyek (AI tidak membaca bank). Alamat halaman token tetap memuat kode tes (`/masuk/KORAN`), karena route tidak diubah.
- Perlu klarifikasi: catatan "daftarin form" pada notulen.

## Revisi tim IT (13 November 2026): kolom database PascalCase
Permintaan tim IT: nama tabel sudah benar, nama kolom diganti dari snake_case ke PascalCase (contoh `nama_sesi` -> `NamaSesi`, `id` -> `Id`).
- [X] Kode backend: semua query di 6 berkas `*.repo.ts` memakai nama kolom PascalCase. Hasil query di-alias kembali ke snake_case (`NamaSesi AS nama_sesi`), jadi tipe TypeScript, API, dan frontend tidak berubah. Typecheck dan 109 tes backend lolos.
- [X] Percobaan ganti nama lewat `sp_rename` gagal dua kali (kolom terikat indeks terfilter, Msg 5074, dan CHECK constraint, Msg 15336); kedua percobaan di-rollback tanpa perubahan.
- [X] Keputusan pemilik proyek: bangun ulang tabel karena isinya hanya data uji. Kelima tabel lama dihapus manual oleh pemilik proyek di SSMS, lalu `db/11_bangun_ulang_pascalcase.sql` dijalankan (struktur akhir 02 sampai 10, kolom PascalCase). Database kini bersih dari data uji coba (15 November 2026).
- [X] `db/README.md`: `11` menjadi satu-satunya skrip yang dipakai, termasuk untuk database baru; 02 sampai 10 disimpan sebagai riwayat.
- [X] Buat ulang akun admin (`npm run admin:buat`), karena tabel admin ikut terhapus.
- [X] Uji alur penuh di database baru: login admin, buat sesi individu dan serentak, peserta mengerjakan ketiga tes, hasil, laporan, ekspor.
- [X] Commit perubahan PascalCase (kode repo, `db/11`, `db/README.md`): `391d75b`, ditambah `5ff8000` (email Tes 1-3, password minimal 5), `3b6e7fc` (gaya), `4f0590d` (bahan presentasi IT). `frontend/angular.json` (host tunnel sementara) sengaja tidak di-commit.

Hak akun database (disampaikan pemilik proyek 15 November 2026): CREATE, INSERT, DROP, DELETE, SELECT.
- **Perlu dipastikan: UPDATE.** UPDATE tidak disebut, padahal aplikasi memakainya terus: login admin (penguncian dan sesi), peserta masuk dan mulai, simpan jawaban TIU, kirim, penutupan otomatis tiap 15 detik, simpan hasil, cabut token, tambah kuota. Tanpa UPDATE, hampir semua alur gagal.
- Catatan keamanan: rencana awal (Part 0) adalah akun aplikasi tanpa hak DDL. Bila akun yang sama dipakai aplikasi di produksi, CREATE dan DROP sebaiknya tidak ada pada akun itu (dipisah: akun aplikasi SELECT, INSERT, UPDATE, DELETE; DDL lewat akun pemilik proyek atau IT). Bahas dengan IT.

## Catatan keamanan (12 November 2026)
- Kata sandi admin minimal 5 karakter (sebelumnya 12), keputusan pemilik proyek. Risiko: kata sandi pendek mudah dipecahkan bila hash di database bocor; penguncian 5 kali gagal hanya melindungi login lewat halaman. Perlu ditinjau sebelum produksi. Aturan di `PASSWORD_MIN` (`backend/src/modules/admin/admin.service.ts`).

## Part 9. Pengujian dan gladi demo (M)
- [X] Daftar uji keamanan (lihat bawah) dan uji alur penuh: lolos, diuji manual oleh pemilik proyek (16 November 2026).
- [X] `npm audit` (16 November 2026): frontend 0 kerentanan. Backend 2 high pada `@azure/msal-node` (dependensi tidak langsung dari `mssql`, alur login Azure AD yang tidak dipakai), diperbaiki dengan `npm audit fix` tanpa perubahan versi mayor; kini 0. Typecheck dan 109 tes backend lolos.
- Data dummy, skenario demo tertulis, gladi sekali penuh.

Selesai kalau: seluruh daftar uji lolos dan gladi berjalan tanpa campur tangan manual di basis data.

## Part 10. Setelah demo (di luar sasaran minggu ini)
- Skrip penghapusan terjadwal (bersama IT), dihitung dari kolom `tanggal` (tanggal tes): baris `jawaban` lebih dari 3 bulan dihapus, baris `ujian` lebih dari 4 bulan dihapus seluruhnya (termasuk baris yang tokennya tidak pernah dipakai atau kedaluwarsa). Mode uji tanpa menghapus, log hanya jumlah baris (tanpa nama atau email), uji dulu pada data dummy. Setelah 3 bulan skor tidak bisa dihitung ulang dari jawaban mentah.
- Tanyakan ke IT berapa lama cadangan (backup) database disimpan. Data yang sudah dihapus bisa bertahan di cadangan.
- Pencarian identitas oleh admin HC hanya lewat dashboard, bukan kueri langsung ke database.
- Deploy di domain publik bersama IT, HTTPS wajib.
- [REVISI] Tanyakan ke HC dan IT apakah domain, nama pengirim email, dan sertifikat boleh memuat nama perusahaan, karena UI sudah dibuat netral.
- [REVISI] Kebijakan retensi data waktu jawaban Koran dan ringkasan 22 interval mengikuti keputusan di Part 5.
- Akun database aplikasi terpisah.
- Kebijakan penyimpanan data, serah terima akses, pencadangan bank soal.

## Daftar uji keamanan (Part 9)
Status 16 November 2026: butir uji lewat API dan log diuji manual oleh pemilik proyek saat sesi hands-on penjelasan ke partner, dan dinyatakan lolos semua. Tidak ada catatan uji tertulis atau skrip otomatis; bila dibutuhkan bukti untuk IT, buat skrip `uji:keamanan` menyusul.
- [X] Token tidak bisa dipakai dua kali.
- [X] Token kedaluwarsa atau di luar jam sesi ditolak.
- [X] Jawaban setelah batas waktu ditolak.
- [X] Tidak ada respons API (termasuk galat) yang memuat kunci jawaban.
- [X] Peserta tidak bisa mengambil skor atau hasil dirinya lewat API.
- [X] Peserta A tidak bisa membaca atau menulis ujian peserta B (ganti `ujian_id` di permintaan).
- [X] Gambar soal tidak bisa diambil tanpa token valid.
- [X] Percobaan tebak token dibatasi.
- [X] Salah password admin berulang dibatasi.
- [X] Kata sandi dan token tidak muncul di log. (16 November: tidak ada `console.*` di `src` yang mencetak token, sandi, email, atau nama; perlu dilihat juga di log server saat uji alur.)
- [X] Semua kueri berparameter, tidak ada penggabungan string SQL. (16 November: interpolasi `${...}` di `*.repo.ts` hanya konstanta SQL berhuruf kapital, tidak ada `join` atau penggabungan dari input.)
- [X] `.env`, `materi_rahasia/`, `backend/bank/` tidak ada di `git ls-files` (hanya `.gitkeep`).
- [X] [REVISI] Tidak ada teks "Bakrie" atau "Autoparts" di kode frontend yang tampil ke pengguna, aset, judul halaman, dan template email bawaan (grep `frontend/src`, `frontend/public`, `backend/src`, `backend/config`: 0 hasil, 16 November). Instruksi dan gambar bank soal diperiksa manual oleh pemilik proyek (Part 2).
- [X] [REVISI] Peserta tidak bisa mengambil data waktu jawaban atau ringkasan interval lewat API.
- [X] [REVISI] Waktu jawaban Koran yang tidak masuk akal (negatif, mundur, melewati durasi Koran) ditolak atau ditandai.
- [X] [REVISI] Jawaban Koran yang mengubah kotak yang sudah dijawab, melompat nomor, atau kosong ditolak lewat API (tidak hanya dikunci di layar).
- [X] [REVISI] Ringkasan 22 interval selalu berjumlah 22 dan jumlahnya sama dengan total jawaban.
