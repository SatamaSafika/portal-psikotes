# Spesifikasi perilaku prototipe lo-fi (Portal Psikotes)

Versi prototipe: 48 (4 Nov 2026, menambah Part 8b: sesi serentak). Spesifikasi diperbarui 4 Nov 2026 untuk Part 8c (persetujuan peserta, bagian 6a); board HTML dan tangkapan layarnya belum diperbarui. Jika spesifikasi ini berbeda dengan `WORKFLOW` atau kode backend (Part 1-5), **WORKFLOW dan backend yang menang**. Berkas ini hanya menjelaskan UI/UX.

## 1. Cara memakai prototipe ini
- Tiru: tata letak, teks, urutan layar, status tombol, perilaku input.
- Jangan tiru: data contoh, angka statis (timer, "8 dari 30", dsb.), logika JS prototipe. Semua data nyata datang dari API backend.
- Teks berkurung siku, misalnya `[sesuai HC]` dan `[Instruksi soal dari tim HC]`, adalah tempat isi dari server (instruksi, durasi, gambar soal). Isinya tidak boleh ditulis permanen di front-end.
- Tidak ada nama perusahaan di UI (revisi HC). Header cukup "Portal Psikotes".

## 2. Alur layar peserta
Berkas tangkapan tambahan untuk Part 8b: `Token_serentak.png`, `Token_individu.png`, `Token_galat.png`, `HcToken_serentak.png`, `HcToken_serentak_aksi.png`.

Urutan stepper di header: 1 Pilih tes > 2 Verifikasi > 3 Instruksi > 4 Latihan > 5 Tes > 6 Selesai.

| Layar | Berkas | Catatan |
|---|---|---|
| 1 Pilih tes | Main | Tiga kartu: TIU 5, TIU 6, Tes Koran / Kraepelin. Tombol mengarah ke verifikasi. |
| 2 Verifikasi | Token | Dua langkah. Langkah 1: token saja. Langkah 2 sesuai mode token: individu = nama dan email, serentak = nama saja, keduanya didahului persetujuan peserta. Lihat bagian 6 dan 6a. |
| 3 Instruksi TIU | Instruksi | Durasi dan jumlah soal dari server. |
| 3b Instruksi Koran | KoranInstruksi | 7 menit 20 detik, 13 halaman, aturan berurutan. |
| 4 Latihan TIU 5 | Simulasi | 2 soal latihan, kunci langsung tampil setelah menjawab. Tidak dinilai, tidak disimpan. |
| 4 Latihan TIU 6 | Simulasi6 | 2 soal latihan x 5 butir B/S, kunci tampil setelah semua butir terisi. |
| 4a-4c Latihan Koran | KoranContoh1, KoranContoh2, KoranLatihan | Contoh 1 (hasil <= 9), contoh 2 (hasil > 9, tulis satuan), lalu uji coba 6 kotak. Kunci tampil setelah tombol "Selesai uji coba". |
| 5 Tes TIU 5 | Tiu5 | Lihat bagian 3. |
| 5 Tes TIU 6 | Tiu6 | Lihat bagian 3. |
| 5 Tes Koran | Koran | Lihat bagian 4. |
| Konfirmasi kirim | Submit | "Kirim jawaban sekarang?" dengan ringkasan terjawab/belum. |
| 6 Selesai | Selesai | Pesan terima kasih. **Tidak ada skor yang ditampilkan ke peserta.** |

## 3. TIU 5 dan TIU 6
- Header lengket (sticky): nama tes, "Peserta: nama", dan pil "Sisa waktu mm:ss".
- Timer **harus dihitung dari waktu server**, bukan jam peserta. Prototipe hanya menampilkan angka statis.
- TIU 5: 30 soal, satu gambar per soal (A, B, C dan pilihan 1-5 sudah di dalam gambar), pilihan jawaban 1-5 berupa radio. Klik pilihan yang sama sekali lagi mengosongkan jawaban. Boleh melewati soal dan kembali.
- TIU 6: 8 soal x 5 butir (40 butir), satu gambar per soal, tiap butir B atau S. Klik yang sama lagi mengosongkan.
- Navigasi soal (panel kanan): kotak bernomor dengan 3 status: saat ini (navy solid), sudah dijawab (biru muda + garis navy), belum dijawab (putih + garis abu). Perilaku klik nomor (lompat ke soal) belum ada di prototipe; itu usulan wajar tetapi perlu disetujui.
- Tombol "Sebelumnya" dan "Berikutnya" di bawah kartu soal, "Kirim jawaban" di panel kanan menuju layar konfirmasi.
- Waktu habis: sesuai aturan WORKFLOW, jawaban dikirim otomatis. Layar akhir (langsung ke "Selesai") adalah usulan, belum digambar di prototipe.
- Layout responsif: di bawah 640 px kolom tersusun vertikal dan tombol penuh lebar.

## 4. Tes Koran (perilaku paling sensitif)
- 13 halaman x 4 lajur. Satu lajur 20 digit angka (1-9) dengan 19 kotak jawaban di antaranya, total 988 jawaban. Di prototipe angka dibangkitkan acak untuk tampilan; di aplikasi nyata angka datang dari server.
- **Ketat berurutan**: hanya satu kotak aktif (putih, garis oranye). Kotak di atasnya terkunci, kotak di bawahnya redup. Tidak bisa dilewati, tidak bisa mundur, tidak bisa mengubah jawaban lama, tidak bisa kembali ke halaman sebelumnya.
- Input: satu digit saja (hasil dua digit = tulis satuannya). Karakter selain angka dibuang, hanya digit terakhir yang diambil.
- Enter pada kotak berisi memindah fokus ke kotak berikutnya. Enter pada kotak kosong tidak melakukan apa-apa.
- Layar sempit (<= 640 px): kotak berpindah otomatis setelah satu digit terisi.
- Tombol "Halaman berikutnya" nonaktif (redup) sampai kotak terakhir halaman terisi. Di halaman 13 tombolnya menjadi kirim.
- Tidak ada indikator benar/salah di tes sebenarnya (hanya di uji coba).
- Header: "Sisa waktu" 07:20 (440 detik), "Halaman x dari 13", "Terjawab n dari 988 soal".
- Setiap jawaban perlu membawa penanda waktu ke server karena Koran dilacak per 20 detik (22 interval). Rincian format ada di backend Part 4-5.
- Fokus otomatis ke kotak aktif setiap kali berpindah. Pastikan di Angular ini ditangani eksplisit, jangan hanya mengandalkan tabindex.
- Latihan Koran memakai data di `frontend/src/app/koran/latihan.ts` (contoh1, contoh2, ujiCoba). Angkanya sudah sama dengan prototipe, jadi **berkas itu dipertahankan**.

## 5. Dashboard HC
Header navy "Portal Psikotes · Dashboard HC", "Admin HC" di kanan, tiga tab.
- **Overview**: tiga kartu (peserta selesai hari ini, token aktif, sesi tes aktif) dan tabel jadwal hari ini (sesi, jenis tes, jumlah peserta, waktu buka, status: Berjalan/Selesai).
- **Token dan jadwal**: formulir "Buat sesi tes" (nama sesi, jenis tes, tanggal, waktu buka/tutup, email peserta satu per baris). Satu peserta bisa punya beberapa tes, tiap tes dengan token dan jadwalnya sendiri. Kartu "Undangan peserta": satu email per peserta berisi semua tes + token + jadwal. Tombol "Kirim undangan" per peserta, berubah jadi "Kirim ulang" setelah terkirim, dan "Kirim semua undangan yang belum terkirim". Tabel "Token dan jadwal per tes" dengan status Terpakai/Belum dipakai/Kedaluwarsa. Pratinjau email di bawahnya.
- **Hasil dan laporan**: filter jenis tes, sesi, tanggal; tabel (peserta, tes, benar, salah, dijawab, kategori, skor akhir); tombol "Lihat jawaban"; ekspor Excel/PDF; untuk Koran grafik 22 interval (dikerjakan, benar, salah) dan tombol "Lihat tabel 22 interval".
- **Mode sesi (Part 8b)**: pada "Buat sesi tes" ada pilihan **Individu** atau **Serentak (kelompok)**. Mode individu tidak berubah. Mode serentak: nama sesi, jumlah peserta X, satu email penerima (pengawas, guru, atau panitia), dan daftar tes (1 sampai 3) dengan jadwal masing-masing. Sistem membuat satu token kelompok per tes.
- **Token kelompok** (tampilan serentak): tabel per token dengan tes, sesi, jadwal, "terpakai n dari X" (dengan bilah), status (Belum buka, Aktif, Kuota penuh, Jadwal selesai, Dicabut), dan aksi: Lihat peserta, Tambah kuota (+1), Token baru, Cabut. Token mentah tidak ditampilkan di tabel (hanya hash tersimpan), hanya muncul sekali di pratinjau email setelah dibuat.
- **Peserta yang sudah masuk**: diurutkan menurut nama, status (Mengerjakan, Selesai, Waktu habis), dan waktu persetujuan (Part 8c). Nama kembar tidak ditolak, hanya ditandai. Admin dapat mengubah nama (salah ketik).
- **Hasil dan ekspor** memuat kolom waktu persetujuan dan versi teks persetujuan (Part 8c).
- **Email token kelompok**: satu email ke penerima berisi token semua tes, jadwal, dan kuota X. Templat bawaan terpisah dari undangan individu: tidak memuat larangan membagikan token, dan menyarankan token tidak diumumkan sebelum tes dimulai.
- **Overview**: tabel jadwal punya kolom Mode. Untuk serentak, jumlah peserta ditulis "n dari X". Token serentak dihitung satu per tes.
- **Hasil**: kolom Sesi ditambahkan, diurutkan per sesi lalu nama. Nama yang penulisannya beda (Budi Santoso vs Budi S.) tampil sebagai dua peserta. Tidak ada penggabungan otomatis lintas tes.
- Email dikirim lewat `mailto` (pembuka klien email), bukan SMTP. Alamat pengirim dan domain belum diputuskan (tampil `[alamat pengirim, menunggu keputusan HC]`).
- Hanya admin HC yang melihat hasil. Peserta tidak pernah melihat skor.

## 6. Token, dua mode, dan verifikasi
- **Individu** (tidak berubah): satu token per peserta per tes, sekali pakai, terikat email, hanya pada jadwal.
- **Serentak**: satu token per tes untuk satu kelompok, kuota X, hanya pada jadwal. Tiap peserta yang masuk mendapat catatan ujian dan timer sendiri. Klaim kuota harus atomik di database. Pengisian identitas: nama saja (tanpa email, tanpa NIM/NISN). Tes diawasi langsung dan semua peserta di atas 18 tahun.
- Format token serentak: pendek dan mudah diketik (usulan 10 karakter huruf besar dan angka tanpa karakter mirip, tampil `XXXXX-XXXXX`). Masukan dinormalisasi: huruf besar/kecil sama, tanda hubung diabaikan.
- Layar verifikasi dua langkah (board 2): langkah 1 hanya token, lalu server menentukan mode dan langkah 2 menampilkan isian yang sesuai. Ada tombol "Ganti token".
- Pesan galat token selalu sama dan tidak membocorkan alasan (salah, penuh, kedaluwarsa, dicabut): "Token tidak dapat digunakan. Periksa kembali token Anda atau hubungi pengawas atau tim HC." Teks akhirnya perlu diputuskan bersama HC.
- Kotak "Catatan prototipe" di bawah formulir token bukan bagian tampilan. Jangan diimplementasikan.
- Batas percobaan gagal untuk jalur serentak **tidak boleh murni per IP**: satu ruang tes biasanya satu IP publik. Diputuskan: 300 percobaan gagal per 15 menit per IP, yang berhasil tidak dihitung. Detail di WORKFLOW Part 8b.

## 6a. Persetujuan peserta (Part 8c, belum digambar di board)
Permintaan HC terkait legal. Berlaku untuk kedua mode, di layar verifikasi langkah 2.
- Letak: setelah baris "Token XXXXX-XXXXX diterima · Ganti token", sebelum isian nama (dan email untuk individu).
- Isi: judul "Persetujuan Peserta Proses Rekrutmen" dengan tanda wajib (*), kalimat pembuka, 5 butir bernomor, kalimat penutup, lalu dua pilihan radio: **Saya Setuju** dan **Saya Tidak Setuju**. Tidak ada pilihan bawaan.
- Teks datang dari server (`backend/config/persetujuan.json`, berversi), tidak ditulis permanen di front-end. Di board cukup ditulis `[Teks persetujuan dari HC]` atau disalin dengan catatan bahwa isinya dari server.
- Tombol "Verifikasi dan lanjut" nonaktif sampai "Saya Setuju" dipilih. Bila "Saya Tidak Setuju" dipilih, tampil kotak peringatan: "Tes tidak dapat dilanjutkan tanpa persetujuan. Hubungi pengawas atau tim HC." Token dan kuota tidak terpakai.
- Bila teks persetujuan diperbarui HC saat halaman peserta terbuka, server menolak dan peserta diminta memuat ulang halaman.
- Perlu verifikasi HC/legal: teks final, kecocokan kata "proses rekrutmen" untuk sesi serentak, dan lama penyimpanan bukti persetujuan.

## 7. Gaya visual (token desain)
- Font: Montserrat 400-700.
- Warna: navy `#003C71`, oranye `#CB6015` (aksen dan tombol utama), teks `#17202A`, latar `#F4F6F9`, kartu putih, garis `#D5DBE3`, kontrol `#8A94A1`, biru muda `#E3EBF4`, oranye muda `#FBE9DC`, benar `#1E6B3A` / `#E3F3E8`, salah `#8A1F2B` / `#FBE4E6`.
- Kartu: radius 12 px, garis atas oranye 4 px. Judul h1 dengan garis oranye pendek di bawahnya.
- Fokus input: outline oranye 2-3 px. Pertahankan kontras dan fokus yang terlihat.

## 8. Yang belum diputuskan (jangan diasumsikan)
Sudah diputuskan sejak versi 48 (dipindah dari daftar ini):
- Token baru pada token kelompok: kuota, jumlah terpakai, dan peserta yang sudah masuk tetap; token lama langsung tidak berlaku (Part 8b).
- Batas gagal jalur token: 300 per 15 menit per IP, hanya yang gagal dihitung (Part 8b).
- Ringkasan 22 interval Koran disimpan di database (`db/07`, Part 5).
- Grafik dashboard: SVG buatan sendiri, tanpa pustaka grafik (Part 8).

Masih terbuka:
- Pembatasan screenshot/salin: di web tidak bisa diblokir penuh. Belum ada keputusan teknik pencegahan.
- 19 vs 20 kotak per lajur: prototipe memakai 20 angka dan 19 kotak, belum dikonfirmasi final oleh HC.
- Perilaku jika peserta mulai mendekati jam tutup sesi.
- Perangkat target (laptop saja atau termasuk HP). Prototipe sudah responsif sampai 640 px.
- Domain, nama pengirim email, dan sambungan ke data rekrutmen.
