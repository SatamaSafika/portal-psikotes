# Workflow pengembangan Portal Psikotes

Pembagian per bagian (part), bukan per hari. Ukuran: S (sekitar setengah hari), M (sekitar satu hari), L (lebih dari satu hari). Ukuran adalah perkiraan kasar, bukan janji.

## Status (2 November 2026)
- Selesai: Part 0, Part 1 (commit `b62a6ed`), Part 2 (commit `bcadab0`), Part 3 (commit `8349343`), semua di cabang `fika`.
- Berikutnya: Part 4.
- Revisi HC 2 November 2026 (UI tanpa nama perusahaan, tracking Koran per 20 detik, landing page tanpa deskripsi) memengaruhi Part 3 sampai Part 10. Kode Part 0 sampai 2 tidak perlu diubah, kecuali pemeriksaan bahan bank soal oleh pemilik proyek (lihat Part 2).

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
| Koran | 7 menit 20 detik (440 detik) | 13 halaman x 4 lajur x 20 angka = 1040 angka, 988 penjumlahan (19 per lajur, lihat catatan). Angka dibuat acak sekali oleh pemilik proyek (disetujui HC) | total benar dibagi 22 (N), N dibulatkan | jumlah benar |

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
- Durasi Koran 7 menit 20 detik (dikonfirmasi).
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
- [ ] [REVISI] Skrip `db/06_tambah_waktu_jawaban.sql` (nomor 05 sudah dipakai Part 3): tambah satu kolom waktu relatif (milidetik sejak mulai tes) pada `dbo.HCIS_Psikotes_Jawaban`, boleh kosong untuk TIU 5 dan TIU 6. Ini DDL, jalankan hanya setelah disetujui pemilik proyek. Lakukan sebelum endpoint simpan jawaban Koran.
- Ambil soal tanpa kunci. Gambar lewat endpoint yang memeriksa token dan percobaan berjalan.
- Simpan jawaban (boleh kosong, boleh diubah sebelum kirim). Tolak setelah `batas_selesai`. TIU 6 disimpan per butir dengan nomor datar `(soal - 1) x 5 + butir`.
- Kirim jawaban dan penanganan waktu habis. Untuk Koran, simpan bertahap dan terima sisa jawaban saat waktu habis.
- [REVISI] Koran: setiap jawaban disimpan bersama waktu relatifnya (dari klien). Server memvalidasi: waktu tidak negatif, naik terus mengikuti urutan jawaban (tes berurutan), tidak melewati durasi 440 detik ditambah toleransi kecil, dan selaras dengan `mulai_pada` server. Waktu tidak valid ditolak atau ditandai, bukan dipercaya begitu saja.
- [REVISI] Koran dikerjakan ketat satu per satu (keputusan pemilik proyek, 2 November 2026): tidak bisa kembali, tidak bisa melompat, tidak bisa mengubah. Server hanya menerima jawaban untuk nomor berikutnya (nomor terakhir + 1, mulai dari 1), berisi satu digit 0 sampai 9. Jawaban kosong, nomor yang sudah dijawab, dan nomor yang melompat ditolak. Akibatnya jawaban Koran selalu berupa deretan nomor 1 sampai n tanpa celah, satu kotak satu waktu, dan waktu naik mengikuti nomor. Berbeda dengan TIU 5 dan TIU 6 yang boleh melewati dan mengubah jawaban.
- Tidak ada endpoint hasil untuk peserta.

Selesai kalau: jawaban setelah batas waktu ditolak, waktu jawaban Koran yang tidak masuk akal ditolak, dan tidak ada respons API yang memuat kunci atau skor.

## Part 5. Koreksi dan hasil (M)
- Koreksi dari `jawaban` dan bank soal: skor mentah = jumlah benar. Tidak ada penalti.
- Kategori dan skor akhir dari `skoring.json`. Koran: N = total benar / 22, dibulatkan ke bilangan bulat setengah ke atas, lalu kategori. Simpan total benar dan N yang sudah dibulatkan.
- Simpan hasil di `ujian` dengan `aturan_versi` dan `bank_versi`.
- [REVISI] Koran: hitung ringkasan 22 interval (dikerjakan, benar, salah) dari jawaban dan waktunya. Panjang interval (20 detik) disimpan di `skoring.json` sebagai konfigurasi (CLAUDE.md aturan 5, disetujui pemilik proyek 2 November 2026), dan jumlah interval = durasi / interval, divalidasi harus bilangan bulat.
- [REVISI] **Keputusan terbuka**: simpan ringkasan ini di database (ikut retensi 4 bulan, perlu kolom atau tabel baru, DDL) atau hitung saat dilihat dari jawaban mentah (hilang setelah 3 bulan, tanpa DDL tambahan). Saran: simpan ringkasan, karena grafik tetap bisa dibuka sampai 4 bulan.
- Skrip hitung ulang dari jawaban mentah.
- Uji dengan data dummy yang hasilnya dihitung tangan lebih dulu.
- Uji nilai batas, tiap sisi:
  - TIU 5: 5 dan 6, 13 dan 14, 21 dan 22, 28 dan 29.
  - TIU 6: 8 dan 9, 16 dan 17, 24 dan 25, 32 dan 33.
  - Koran (total benar): 120 dan 121, 230 dan 231, 340 dan 341, 450 dan 451. Tambah 0 (N = 0) dan 988 (N = 45, jawaban maksimum).
  - [REVISI] Interval Koran: jawaban pada detik 19,999 dan 20,000 (masuk interval 1 dan 2), jawaban pada detik 439,999 (interval 22) dan 440,000 (tidak dihitung), 22 interval tepat, jumlah semua interval sama dengan total benar dan total salah, serta tes tanpa satu pun jawaban menghasilkan 22 interval berisi nol.

Selesai kalau: hitungan tangan dan hitungan sistem sama untuk setidaknya satu contoh tiap tes, semua uji nilai batas lolos, dan ringkasan 22 interval cocok dengan hitungan tangan pada satu contoh Koran.

## Part 6. Frontend peserta, TIU 5 dan TIU 6 (L)
- Angular (versi stabil terbaru), proksi `/api` ke backend.
- Halaman: token, instruksi, latihan, TIU 5, TIU 6, kirim, selesai. Ikuti prototipe lo-fi, dengan jumlah soal dan timer 10 menit sesuai tabel. Halaman selesai tanpa skor.
- [REVISI] Landing page: hanya judul dan pilihan langsung, tanpa deskripsi. Semua halaman tanpa nama dan logo perusahaan (aturan 6), termasuk footer dan judul tab. Pakai teks netral, misalnya "Portal Psikotes".
- Navigasi soal, timer dari server, simpan otomatis.

Selesai kalau: satu peserta dummy menyelesaikan TIU 5 dan TIU 6 dari token sampai halaman selesai.

## Part 7. Frontend peserta, Tes Koran (M)
- 13 halaman, empat lajur per halaman, 20 angka per lajur. Enter pindah kotak, pindah halaman manual.
- [REVISI] Pengerjaan ketat satu per satu dari atas ke bawah. Hanya kotak berikutnya yang aktif. Kotak harus terisi satu digit sebelum lanjut (Enter pada kotak kosong tidak berpindah). Kotak yang sudah dijawab terkunci. Tidak bisa kembali atau melompat ke kotak, lajur, atau halaman lain. Pindah halaman manual hanya setelah semua kotak di halaman itu terisi.
- Satu timer 7 menit 20 detik dari server. Peserta mengerjakan sebisanya. Simpan jawaban bertahap supaya tidak hilang saat waktu habis.
- [REVISI] Catat waktu relatif tiap jawaban (milidetik sejak tes dimulai) dan kirim bersama jawaban. Ini tidak menampilkan apa pun ke peserta: tidak ada indikator interval atau grafik di layar peserta.
- Latihan Koran (2 soal latihan dengan kunci langsung): tentukan bahannya (lajur pendek berisi angka contoh, tidak rahasia, di konfigurasi). Latihan tidak dicatat waktunya dan tidak masuk interval (disetujui pemilik proyek, 2 November 2026).

Selesai kalau: peserta dummy menyelesaikan Koran, hasil koreksi cocok dengan hitungan tangan, dan setiap jawaban tersimpan dengan waktu relatifnya.

## Part 8. Dashboard HC (M)
- Overview, token dan sesi (buat, cabut), hasil per peserta (jumlah benar, N untuk Koran, kategori, skor akhir). Hanya admin HC.
- [REVISI] Halaman hasil Koran per peserta: tabel dan grafik 22 titik (dikerjakan, benar, salah per interval 20 detik). Pilih pustaka grafik dulu (rencanakan di Plan mode). Grafik hanya untuk admin HC dan tidak ada di sisi peserta. Opsi ekspor (gambar atau CSV) hanya jika HC meminta.
- [REVISI] Dashboard juga tanpa nama dan logo perusahaan (aturan 6).

Selesai kalau: HC dummy dapat membuat sesi, mencabut token, membaca hasil, dan melihat grafik 22 interval Koran yang cocok dengan ringkasan tangan.

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
- [REVISI] Tanyakan ke HC dan IT apakah domain, nama pengirim email, dan sertifikat boleh memuat nama perusahaan, karena UI sudah dibuat netral.
- [REVISI] Kebijakan retensi data waktu jawaban Koran dan ringkasan 22 interval mengikuti keputusan di Part 5.
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
- [ ] [REVISI] Tidak ada teks "Bakrie" atau "Autoparts" di kode frontend yang tampil ke pengguna, aset, judul halaman, dan template email bawaan (cari dengan grep tanpa membaca isi bank soal). Instruksi dan gambar bank soal diperiksa manual oleh pemilik proyek (Part 2).
- [ ] [REVISI] Peserta tidak bisa mengambil data waktu jawaban atau ringkasan interval lewat API.
- [ ] [REVISI] Waktu jawaban Koran yang tidak masuk akal (negatif, mundur, melewati 440 detik) ditolak atau ditandai.
- [ ] [REVISI] Jawaban Koran yang mengubah kotak yang sudah dijawab, melompat nomor, atau kosong ditolak lewat API (tidak hanya dikunci di layar).
- [ ] [REVISI] Ringkasan 22 interval selalu berjumlah 22 dan jumlahnya sama dengan total jawaban.
