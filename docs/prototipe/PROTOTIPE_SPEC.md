# Spesifikasi perilaku prototipe lo-fi (Portal Psikotes)

Versi prototipe: 50 (10 Nov 2026), termasuk **redesain visual dan efek UX** (bagian 7, 7a, 7b, 7c). Mengikuti WORKFLOW terkini (Part 8b, 8c persetujuan, revisi HC 4/5/9 Nov) dan tangkapan UI web terkini. Bagian yang **diturunkan dari teks WORKFLOW tanpa tangkapan layar** ditandai [turunan]: tampilan admin serentak, Laporan Peserta (Review), Detail Jawaban, dan teks persetujuan lengkap (teks resmi ada di `backend/config/persetujuan.json`, yang menang). Jika spesifikasi ini berbeda dengan `WORKFLOW` atau kode backend (Part 1-5), **WORKFLOW dan backend yang menang**. Berkas ini hanya menjelaskan UI/UX.

## 1. Cara memakai prototipe ini
- Tiru: tata letak, teks, urutan layar, status tombol, perilaku input.
- Jangan tiru: data contoh, angka statis (timer, "8 dari 30", dsb.), logika JS prototipe. Semua data nyata datang dari API backend.
- Teks berkurung siku, misalnya `[sesuai HC]` dan `[Instruksi soal dari tim HC]`, adalah tempat isi dari server (instruksi, durasi, gambar soal). Isinya tidak boleh ditulis permanen di front-end.
- Tidak ada nama perusahaan di UI (revisi HC). Header cukup "Portal Psikotes".

## 2. Alur layar peserta
Tangkapan varian: `Main_selesai`, `Token_serentak`, `Token_tidak_setuju`, `Token_individu`, `Token_galat`, `KoranLatihan_isi`, `Koran_isi`, `HcToken_form_serentak`, `HcToken_serentak`, `HcToken_serentak_aksi`, `HcJawaban_koran`.

Urutan stepper di header: 1 Pilih tes > 2 Verifikasi > 3 Instruksi > 4 Latihan > 5 Tes > 6 Selesai.

| Layar | Berkas | Catatan |
|---|---|---|
| 1 Pilih tes | Main | Daftar bernomor 01-03 (TIU 5, TIU 6, Tes Koran / Kraepelin), tombol "Pilih ... →". Tes yang sudah dikirim dari tab ini tampil redup dengan "✓ Selesai" dan tombol "Sudah dikerjakan" (nonaktif); tautan "Peserta lain memakai komputer ini" menghapus penanda. Penanda hanya di sessionStorage, tanpa identitas. Tombol "TIU 5 terkirim / TIU 6 terkirim" di kotak putus-putus hanya simulasi prototipe. |
| 2 Verifikasi | Token | Dua langkah. Langkah 1: token saja. Langkah 2 sesuai mode token: individu = nama dan email, serentak = nama saja, **ditambah blok persetujuan** (bagian 6a). Token pada banner ditampilkan berkelompok (individu 20 karakter per 4, serentak 10 karakter per 5). |
| 3 Instruksi TIU | Instruksi | Durasi dan jumlah soal dari server. |
| 3b Instruksi Koran | KoranInstruksi | 9 menit 32 detik, 13 halaman, aturan berurutan, satu digit langsung terkunci tanpa Enter. |
| 4 Latihan TIU 5 | Simulasi | 2 soal latihan, baris benar hijau tua dan salah merah tua, kotak umpan balik "Belum tepat. Jawaban yang benar: X." Tombol: Soal latihan berikutnya, Mulai tes, Kembali ke instruksi. Isi soal tetap placeholder. |
| 4 Latihan TIU 6 | Simulasi6 | 2 soal latihan x 5 butir B/S, kunci tampil setelah semua butir terisi. |
| 4a-4c Latihan Koran | KoranContoh1, KoranContoh2, KoranLatihan | Contoh 1 (hasil <= 9), contoh 2 (hasil > 9, ketik hanya digit terakhir), lalu uji coba **dua lajur** (6 kotak per lajur), kotak terkunci otomatis dan kursor pindah tanpa Enter. Setelah "Selesai uji coba" muncul ✓/✗ dan "Benar n dari 12", lalu "Mulai tes". |
| 5 Tes TIU 5 | Tiu5 | Lihat bagian 3. |
| 5 Tes TIU 6 | Tiu6 | Lihat bagian 3. |
| 5 Tes Koran | Koran | Lihat bagian 4. |
| Konfirmasi kirim | Submit | "Kirim jawaban sekarang?" dengan ringkasan terjawab/belum. |
| 6 Selesai | Selesai | Pesan terima kasih, **tanpa skor**. Ada varian "Waktu habis" (jawaban terisi dikirim otomatis); pemilih varian di kotak putus-putus hanya catatan prototipe. |

## 3. TIU 5 dan TIU 6
- Header lengket (sticky) navy dengan sudut bawah membulat: nama tes, "Peserta: nama", dan pil oranye "Sisa waktu mm:ss".
- Timer **harus dihitung dari waktu server**, bukan jam peserta. Prototipe hanya menampilkan angka statis.
- TIU 5: 30 soal, satu gambar per soal (A, B, C dan pilihan 1-5 sudah di dalam gambar), pilihan jawaban 1-5 berupa lima tombol horizontal. Kalimat instruksi: "Klik kembali jawaban yang dipilih untuk membatalkan pilihan. Anda juga dapat melewati soal dan menjawabnya kembali nanti." Label "Jawaban tersimpan" pada kartu soal. Urutan soal TIU diacak per ujian (tidak ada efek UI).
- TIU 6: 8 soal x 5 butir (40 butir), satu gambar per soal, tiap butir B atau S berupa tombol persegi (terpilih = navy), dengan kotak instruksi biru bergaris kiri. Klik yang sama lagi mengosongkan.
- Navigasi soal (panel kanan): kotak bernomor dengan 3 status dalam grid 5 kolom (TIU 6: 4 kolom): saat ini (oranye), sudah dijawab (navy), belum dijawab (putih + garis abu). "Sebelumnya" nonaktif di soal pertama. Perilaku klik nomor (lompat ke soal) belum ada di prototipe; itu usulan wajar tetapi perlu disetujui.
- Tombol "Sebelumnya" dan "Berikutnya" di bawah kartu soal, "Kirim jawaban" di panel kanan menuju layar konfirmasi.
- Waktu habis: sesuai aturan WORKFLOW, jawaban dikirim otomatis. Layar akhir (langsung ke "Selesai") adalah usulan, belum digambar di prototipe.
- Layout responsif: di bawah 640 px kolom tersusun vertikal dan tombol penuh lebar.

## 4. Tes Koran (perilaku paling sensitif)
- 13 halaman x 4 lajur. Satu lajur 20 digit angka (1-9) dengan 19 kotak jawaban di antaranya, total 988 jawaban. Di prototipe angka dibangkitkan acak untuk tampilan; di aplikasi nyata angka datang dari server.
- **Ketat berurutan**: hanya satu kotak aktif (putih, garis oranye). Kotak di atasnya terkunci, kotak di bawahnya redup. Tidak bisa dilewati, tidak bisa mundur, tidak bisa mengubah jawaban lama, tidak bisa kembali ke halaman sebelumnya.
- Input: satu digit saja (hasil dua digit = ketik digit terakhirnya). Karakter selain angka dibuang.
- **Satu digit yang diketik langsung terkunci dan kursor otomatis pindah ke kotak berikutnya. Tidak ada Enter.** Kotak terisi tampil navy dengan angka putih, kotak aktif putih bergaris oranye, kotak berikutnya abu. Banner navy di atas menjelaskan aturan ini.
- Halaman berganti otomatis setelah kotak terakhir halaman terisi (tidak ada tombol "Halaman berikutnya"). Di kotak terakhir halaman 13 muncul tautan "Lanjut ke konfirmasi" menuju layar konfirmasi.
- Satu lajur harus muat di layar 1366x768 tanpa gulir (baris sekitar 27 px).
- Tidak ada indikator benar/salah di tes sebenarnya (hanya di uji coba).
- Header navy: pil oranye "Sisa waktu" 09:32 (572 detik = 22 interval x 26 detik), "Halaman x dari 13", "Terjawab n dari 988 soal". Aturan skor v2-2026-11-05.
- Setiap jawaban perlu membawa penanda waktu ke server karena Koran dilacak per 26 detik (22 interval). Rincian format ada di backend Part 4-5.
- Fokus otomatis ke kotak aktif setiap kali berpindah. Pastikan di Angular ini ditangani eksplisit, jangan hanya mengandalkan tabindex.
- Latihan Koran memakai data di `frontend/src/app/koran/latihan.ts` (contoh1, contoh2, ujiCoba). Angkanya sudah sama dengan prototipe, jadi **berkas itu dipertahankan**.

## 5. Dashboard HC
Layar baru **HcLogin** (dua panel: kiri panel ilustrasi bergradien navy-ke-biru dengan judul "Kelola sesi, token, dan hasil tes", kanan kartu kaca "Masuk admin HC" dengan ubin ikon, username, kata sandi, tombol navy "Masuk"; di prototipe tombol langsung ke Overview; ilustrasi lihat 7a). Header terang "Portal Psikotes · Dashboard HC", "admin.uji" dan tautan "Keluar" di kanan, tiga tab. Halaman HC lebar maksimal 1440 px.
- **Overview**: judul "Ringkasan" dengan tanggal (contoh "Selasa, 10 November 2026"), strip 3 KPI: sedang mengerjakan, selesai hari ini, total selesai. Tabel sesi hari ini: NAMA SESI, MODE, JENIS TES, JUMLAH PESERTA ("n dari X" untuk serentak), WAKTU (buka - tutup), STATUS.
- **Token dan jadwal**: satu formulir kiri untuk kedua mode. Pilihan Individu / Serentak, kalimat keterangan mode, Nama sesi, "Tes dan jadwal" (baris tes yang bisa dicentang, tiap tes dengan Tanggal, Buka, Tutup), lalu kolom khusus mode: individu = "Peserta (satu per baris: email, atau email, nama)"; serentak = jumlah peserta X (maks 1000) dan email penerima. Templat email (opsional) hanya di formulir ini, bentuk `<details>`. Tombol: "Buat sesi dan token" / "Buat sesi dan token kelompok". Kolom kanan punya dropdown **Sesi** yang memilih tampilan (individu atau serentak) terpisah dari mode formulir.
  - Tampilan individu: undangan peserta (satu email per peserta berisi semua tes, kirim / kirim ulang / kirim semua), tabel token per tes dengan token **disamarkan ("••••")**, status Dipakai / Belum dipakai / Kedaluwarsa, Cabut, pratinjau email. Catatan: "Nilai token hanya terlihat sesaat setelah dibuat." Email dibuka di klien email (Outlook) untuk dikirim admin.
  - Tampilan serentak [turunan]: tabel token kelompok (tes dan sesi, jadwal, terpakai n dari X + bilah, status Aktif / Belum mulai / Penuh / Dicabut, aksi Lihat peserta, Tambah kuota +1, Token baru, Cabut), daftar peserta yang sudah masuk (urut nama, status, Ubah nama, nama kembar hanya ditandai), pratinjau email token kelompok.
- **Hasil dan laporan**: satu baris per peserta per sesi. Filter sesi, jenis tes, tanggal, cari nama, dan ekspor Excel `.xlsx` dan Ekspor PDF; penghitung "n baris dari n peserta". Kolom: PESERTA, SESI (dan mode), HASIL PER TES (kode, skor 1-5, kategori berwarna: Kurang Sekali merah, Kurang oranye, Rata-Rata kuning, Baik / Baik Sekali hijau), TANGGAL, AKSI: **Review** (ke Laporan), **Cetak PDF**, **Jawaban** (ke Detail Jawaban). Peserta serentak digabung per nama dalam satu sesi (Ayu Lestari: TIU 5 dan TIU 6 satu baris). Nama tidak persis sama (Budi Santoso vs Budi S.) dan nama sama untuk tes yang sama (Dimas Pratama dua kali TIU 5) tidak digabung dan diberi tanda. Grafik Koran sudah tidak di halaman ini.
- **Laporan Peserta (Review)** [turunan]: identitas (nama, sesi, tanggal, versi aturan skor), tabel hasil per tes (benar, salah, dijawab atau dikerjakan, keterangan, skor 1-5), grafik Koran 22 interval "setiap 26 detik" (dikerjakan, benar, salah), kolom "Catatan HC" yang ikut tercetak tetapi **tidak disimpan**. Tombol Cetak PDF, Detail jawaban, Kembali. Angka contoh dibuat konsisten dengan aturan skor (bukan angka laporan contoh HC yang tidak konsisten).
- **Detail Jawaban** (model dari UI nyata): panel "Detail jawaban · nama" dengan tautan Tutup, tab TIU 5 / TIU 6 / Tes Koran / Kraepelin. Tiap tab: ringkasan "Benar n, salah n, kosong n. Kunci tidak ditampilkan. Hanya kotak yang dikerjakan yang ditampilkan." lalu kotak per nomor (nomor kecil di atas, **jawaban yang dipilih** besar di bawah; hijau = benar, merah = salah, abu = kosong). Tab Koran menambah "Tracking per 26 detik" (legenda, grafik garis, "Lihat tabel 22 interval", catatan: peserta tidak melihat data ini, interpretasi grafik oleh HC).
- Email dikirim lewat `mailto`, bukan SMTP. Alamat pengirim dan domain belum diputuskan (`[alamat pengirim, menunggu keputusan HC]`).
- Hanya admin HC melihat hasil. Peserta tidak pernah melihat skor. Retensi: jawaban 3 bulan, seluruh data peserta 4 bulan (skrip hapus = Part 10, belum dibuat).

## 6. Token, dua mode, dan verifikasi
- **Individu** (tidak berubah): satu token per peserta per tes, sekali pakai, terikat email, hanya pada jadwal.
- **Serentak**: satu token per tes untuk satu kelompok, kuota X, hanya pada jadwal. Tiap peserta yang masuk mendapat catatan ujian dan timer sendiri. Klaim kuota harus atomik di database. Pengisian identitas: nama saja (tanpa email, tanpa NIM/NISN). Tes diawasi langsung dan semua peserta di atas 18 tahun.
- Format token serentak: pendek dan mudah diketik (usulan 10 karakter huruf besar dan angka tanpa karakter mirip, tampil `XXXXX-XXXXX`). Masukan dinormalisasi: huruf besar/kecil sama, tanda hubung diabaikan.
- Layar verifikasi dua langkah (board 2): langkah 1 hanya token, lalu server menentukan mode dan langkah 2 menampilkan isian yang sesuai. Ada tombol "Ganti token".
- Pesan galat token selalu sama dan tidak membocorkan alasan (salah, penuh, kedaluwarsa, dicabut): "Token tidak dapat digunakan. Periksa kembali token Anda atau hubungi pengawas atau tim HC." Teks akhirnya perlu diputuskan bersama HC.
- Kotak "Catatan prototipe" di bawah formulir token bukan bagian tampilan. Jangan diimplementasikan.
- Batas percobaan gagal untuk jalur serentak **tidak boleh murni per IP**: satu ruang tes biasanya satu IP publik. Detail di WORKFLOW Part 8b.

## 6a. Persetujuan peserta (Part 8c)
Pada langkah 2 verifikasi, di atas isian nama (dan email untuk individu): blok berjudul "PERSETUJUAN PESERTA PROSES REKRUTMEN *", lima pernyataan bernomor (diawali "Saya"), kalimat penutup "Dengan mencentang pernyataan persetujuan di bawah ini, ...", lalu radio **"Saya Setuju" / "Saya Tidak Setuju"** tanpa nilai awal. "Tidak Setuju" menampilkan pesan bahwa tes tidak bisa dilanjutkan, token dan kuota tidak terpakai. Tombol lanjut nonaktif sampai Setuju dan nama terisi. Server wajib menerima `setuju: true` dan versi teks saat ini. Teks di prototipe disalin dari tangkapan beresolusi rendah dan **bukan teks resmi**: sumbernya `backend/config/persetujuan.json` (dari formulir HC, perlu tinjauan hukum).

## 7. Gaya visual (token desain, redesain 10 Nov: lembut, berair, berseni)
Tujuan: meninggalkan kesan kaku dan "template" (panel datar, garis oranye di kiri judul). Gaya baru: latar gradien biru muda, kartu kaca membulat, tombol pil, ikon dalam ubin berwarna, ilustrasi vektor di halaman pembuka. **Seluruh UI (peserta dan HC) memakai gaya ini.** Halaman tes memakai warna dan font yang sama tetapi tetap tenang (lihat 7c).

**Font**: Raleway 500-800 untuk h1-h3, Inter 400-700 untuk isi, fallback `system-ui`. Dimuat dari Google Fonts di prototipe; untuk produksi sebaiknya di-host sendiri bila jaringan dibatasi (perlu verifikasi). Ikon: Lucide, stroke 1.8.

**Warna** (jadikan CSS variables):
| Peran | Nilai |
|---|---|
| navy | `#193F69` (hover `#12304F`) |
| biru aksen | `#2F6FD6` |
| oranye (aksi utama) | `#CB642B` (hover `#B0541F`) |
| teks utama / sekunder | `#1C2F4A` / `#5E7391` |
| border halus | `#CFDBEC`, `#DCE6F5`, `#EDF2FA` |
| biru muda (chip, ubin, tinted) | `#E3EDFC`; ubin ikon `linear-gradient(145deg,#E6EFFD,#C9DCF8)`; kartu langkah `#F3F7FD` |
| oranye muda | `#FBE9DC` / teks `#7A3A0A` |
| benar / salah | `#1E6B3A` + `#E3F3E8` / `#8A1F2B` + `#FBE4E6` |
| kategori hasil | Baik `#E3F3E8`/`#1E6B3A`, Rata-Rata `#FFF3CC`/`#6B5200`, Kurang `#FBE9DC`/`#7A3A0A`, Kurang Sekali `#FBE4E6`/`#8A1F2B` |
| latar halaman | `radial-gradient(900px 500px at 85% 0%,#D7E5FB 0%,rgba(215,229,251,0) 60%), radial-gradient(700px 500px at 0% 60%,#E3EDFC 0%,rgba(227,237,252,0) 60%), linear-gradient(180deg,#F3F7FD,#EAF1FB)` |
Aturan: oranye hanya untuk **satu aksi utama per layar**; biru/navy untuk aksi sekunder dan struktur.

**Bentuk**: kartu kaca `background:rgba(255,255,255,.72-.86); border:1px solid rgba(255,255,255,.9); border-radius:20-22px; box-shadow:0 10-14px 30-40px rgba(25,63,105,.09-.10)`. Field `border-radius:14px; border:1px solid #CFDBEC`, fokus `outline:2px solid #CB642B; outline-offset:1px` (kontras dan fokus terlihat wajib dipertahankan). Tombol berbentuk pil (`border-radius:999px`). Header halaman peserta transparan, footer transparan dengan teks `#5E7391` (tidak ada lagi footer navy).

**Tanda produk**: kotak kecil empat kotak membulat (biru, biru muda, biru muda, oranye) di samping teks "Portal Psikotes". Ini tanda generik, **bukan logo perusahaan**. Seluruh teks dan elemen untuk peserta tanpa nama perusahaan.

## 7a. Komponen bersama (buat satu kali, pakai di semua halaman)
| Komponen | Spesifikasi |
|---|---|
| Tombol utama (pill oranye) | teks putih 700, `padding:14px 26px` (di halaman form `12px 26px`), bayangan `0 8px 20px rgba(203,100,43,.26-.28)`. Maksimal satu per layar. |
| Tombol navy | sama, latar `#193F69`. Dipakai di dashboard HC ("Kirim semua undangan", "Buat sesi dan token"). |
| Tombol ghost / sekunder | latar `rgba(255,255,255,.7)`, teks navy 600, border `#CFDBEC`, pil. |
| Chip label (eyebrow) di atas judul | `inline-flex`, latar `#E3EDFC`, teks `#2F6FD6`, pil, `padding:5px 13px`, 12px, 700, `letter-spacing:.06em`, huruf kapital. **Tidak ada garis oranye di kiri judul.** |
| Judul gradien | `linear-gradient(90deg,#193F69,#2F6FD6)` pada teks, hanya untuk judul halaman pembuka (Main). |
| Ubin ikon | kotak 46-64 px, radius 15-22 px, gradien biru muda, ikon Lucide `#2F6FD6`. Dipakai di KPI Overview, kartu pilih tes, ikon kunci di Token, ikon kirim di Submit. |
| Ilustrasi vektor | SVG asli buatan sendiri (bukan karakter atau logo pihak lain), tiga varian, **hanya** di tiga tempat: (1) **Main**: kartu kaca bertumpuk dengan centang dan jam, di kanan hero; (2) **Selesai**: lencana centang di atas judul; (3) **HcLogin**: panel kiri bergradien (`linear-gradient(160deg,#193F69 0%,#2A5FA8 60%,#3B7BE0 100%)`) berisi tanda produk putih di kiri atas, dokumen kaca bertumpuk dengan bilah grafik biru/biru muda/oranye, dua titik dekoratif, dan judul putih "Kelola sesi, token, dan hasil tes" (Raleway 30 px, 700) di kiri bawah. Salin markup SVG langsung dari `html/Main.dc.html`, `html/Selesai.dc.html`, `html/HcLogin.dc.html` sebagai komponen SVG inline; jangan diganti ilustrasi lain. Disembunyikan di bawah 760 px (Main); panel HcLogin tersusun di atas formulir di layar sempit. |
| Langkah instruksi | `ol` tanpa bullet; tiap item kartu `#F3F7FD` radius 16 px dengan lingkaran nomor 28 px bergradien navy-biru. |
| Checkbox | checkbox native, `accent-color:#2F6FD6`, 18x18. Dipakai pada "Tes dan jadwal". Tidak memakai tombol bertanda centang. |
| Chip "Catatan" + tooltip | penjelasan panjang di dashboard HC disembunyikan: chip `#E3EDFC`/`#2F6FD6` dengan ikon info; kartu tooltip putih, radius 14 px, lebar maks 340 px, muncul saat hover **dan fokus keyboard** (`tabindex=0`). Teks tidak dihapus, hanya dipindah. |
| Tabel HC | header 11 px huruf kapital, `letter-spacing:.08em`, `#5E7391`; sel `padding:12px`, garis bawah `#EDF2FA`, baris hover `#F3F7FD`; avatar inisial lingkaran 36 px; aksi utama "Review" pil biru solid `#2F6FD6`, aksi lain pil outline `#C9D8EE`. |
| Ringkasan Hasil | kartu kaca: ubin ikon + angka 28 px + label; satu kartu lebar berisi bilah sebaran kategori (4 warna kategori) dan legendanya. Angkanya dihitung dari data, bukan statis. |
| Header HC | terang (`rgba(255,255,255,.72)`, garis bawah `#DCE6F5`), tab aktif berupa kartu putih dengan bayangan lembut. |
| Stepper peserta | teks kecil `1 Pilih tes > ... > 6 Selesai`, langkah aktif `#FBE9DC` bergaris bawah oranye. |

## 7b. Efek dan interaksi (seluruhnya wajib, dan wajib mati bila `prefers-reduced-motion: reduce`)
1. **Hover tombol** (pill, pillN, ghost, btn, btnO, btn2): `transform:translateY(-2px) scale(1.04)` dengan transisi `.2s cubic-bezier(.34,1.56,.64,1)` (memantul halus); tekan (`:active`): `translateY(0) scale(.97)`. Tombol nonaktif tidak bergerak.
2. **Tombol utama oranye saat hover**: bayangan membesar `0 12px 26px rgba(203,100,43,.38)`, ikon panah di dalamnya bergeser 5 px ke kanan.
3. **Ubin menu pilih tes (Main)**: hover naik 4 px dan bayangan membesar `0 18px 44px rgba(25,63,105,.16)`; ikon di dalamnya bergoyang sekali (`rotate -10deg` lalu `8deg`, 0.5 s).
4. **Kartu muncul**: animasi `fade-up` 0.5 s (`opacity 0 -> 1`, `translateY(14px) -> 0`) pada kartu dan kartu kaca saat halaman dimuat.
5. **Tabel**: baris hover `#F3F7FD` (transisi .15 s); tombol aksi di baris naik 1 px dan latar `#E3EDFC` saat hover.
6. **Tooltip Catatan**: muncul saat hover atau fokus, hilang saat pergi.
7. **Fokus keyboard** terlihat pada semua kontrol (outline oranye pada field, ring jelas pada tombol dan chip).
8. Jangan menambah efek lain. Jangan beri efek apa pun pada halaman tes (7c).
9. `prefers-reduced-motion: reduce`: matikan transisi, animasi, dan transformasi hover di atas.
Catatan verifikasi: efek ini hanya diperiksa lewat gambar diam; rasa geraknya dan performa di laptop spesifikasi rendah **belum diuji** (perlu verifikasi di perangkat target).

## 7c. Aturan tata letak dan kekhususan per area
**Halaman peserta pra-tes** (Main, Token, Instruksi, Simulasi, Latihan, Submit, Selesai): gaya penuh di atas. Lebar isi saat ini: Main 1200 px (hero dua kolom dengan ilustrasi), Token langkah 1 sekitar 620 px dan **langkah 2 sekitar 1100 px dua kolom** (kiri blok persetujuan, kanan nama, email untuk individu, kotak peringatan, tombol), Instruksi 860 px satu kolom dengan langkah bernomor, Simulasi 880 px, contoh dan uji coba Koran 980 px, Submit 560 px. Header dan footer berada di lebar 1080 px.
**Halaman tes (TIU 5, TIU 6, Koran) TETAP TENANG**: gunakan warna dan font baru, header navy lengket dengan sudut bawah membulat (`border-radius:0 0 22px 22px`) dan bayangan `0 10px 30px rgba(25,63,105,.18)`, kartu lembut. **Tanpa** efek hover, animasi masuk, atau dekorasi pada kotak soal, pilihan jawaban, kotak digit Koran, dan navigasi soal. Jangan mengubah ukuran, jarak, atau urutan yang memengaruhi keterbacaan, tombol jawaban, atau muat-tanpa-gulir satu lajur Koran (1366x768).
**Dashboard HC**: header terang (7a). Lebar isi saat ini: Overview 1160 px, Laporan 1100 px, Hasil dan Detail jawaban 1440 px. **Token dan jadwal**: wadah 1680 px; kiri formulir "Buat sesi tes" 340 px (lengket), tengah kartu Undangan/Token (atau Token kelompok/Peserta masuk), dan di layar >= 1700 px kolom kanan 340 px berisi pratinjau email (lengket); di bawah 1700 px pratinjau pindah ke bawah tabel dengan lebar maks 820 px supaya tabel tidak terpotong.
**Persetujuan peserta**: tata letak boleh dirapikan, tetapi teks wajib dari `backend/config/persetujuan.json` (6a).
**Preferensi pemilik produk**: halaman sebaiknya memanfaatkan lebar layar ke samping, tidak menumpuk ke bawah dan tidak terlalu terpusat. Itu baru diterapkan di Token (langkah 2) dan Token dan jadwal HC; perluasan ke halaman lain (Instruksi, Simulasi, Submit, Laporan) **belum diputuskan** dan jangan dilakukan tanpa persetujuan.

## 8. Yang belum diputuskan (jangan diasumsikan)
- Tombol Token baru pada token kelompok: apakah kuota dan peserta yang sudah masuk tetap (usulan: tetap), dan nilai batas gagal per token vs per IP.
- Pembatasan screenshot/salin: di web tidak bisa diblokir penuh. Belum ada keputusan teknik pencegahan.
- 19 vs 20 kotak per lajur: prototipe memakai 20 angka dan 19 kotak, belum dikonfirmasi final oleh HC.
- Teks persetujuan final dan tinjauan hukum; bukti persetujuan dan masa simpannya.
- Perilaku jika peserta mulai mendekati jam tutup sesi.
- Perangkat target (laptop saja atau termasuk HP). Prototipe sudah responsif sampai 640 px.
- Penyimpanan ringkasan 22 interval (disimpan atau dihitung saat dilihat) dan butuh persetujuan DDL.
- Pustaka grafik untuk dashboard.
- Domain, nama pengirim email, dan sambungan ke data rekrutmen.

- Apakah palet navy dan oranye wajib dipertahankan (belum dijawab pemilik produk).
- Perluasan tata letak melebar ke halaman lain (7c).
- Font: dimuat dari Google Fonts atau di-host sendiri.
- Performa efek (7b) di perangkat target; kontras `#5E7391` di atas latar muda belum diukur.

## 9. Keluaran non-layar (belum digambar di prototipe)
- Laporan Peserta PDF: A4, satu halaman per peserta (isi seperti board Laporan, termasuk catatan HC).
- Laporan Excel `.xlsx`: lembar Rekap Peserta, lembar per jenis tes, lembar Keterangan.
- Email undangan individu dan email token kelompok dibuka di Outlook lewat `mailto` (pratinjau ada di board Token dan jadwal).

## 10. Cara menerapkan ke Angular (urutan kerja yang disarankan)
Ini perubahan **tampilan dan efek saja**. Jangan mengubah logika, route, aturan skor, timer, validasi token, teks persetujuan, `frontend/src/app/koran/latihan.ts`, backend, atau `.env`. Jangan ubah versi Node atau Angular tanpa persetujuan. Minta persetujuan di setiap tahap.
1. **Tokens dan gaya global**: variabel CSS (bagian 7), font, latar, `prefers-reduced-motion`.
2. **Komponen bersama** (7a dan 7b): tombol, kartu kaca, field, chip, ubin ikon, tooltip Catatan, langkah instruksi, avatar, bilah sebaran. Jangan menyalin CSS per halaman.
3. **Halaman peserta pra-tes**: Main, Token (dua langkah), Instruksi (TIU dan Koran), Simulasi/Latihan, Submit, Selesai.
4. **Halaman tes**: hanya warna, font, header lengket membulat. Ikuti 7c dengan ketat. Uji manual Koran: satu lajur muat tanpa gulir di 1366x768, fokus otomatis, auto-lanjut tanpa Enter.
5. **Dashboard HC**: header, Overview, Token dan jadwal (tiga kolom), Hasil dan laporan (ringkasan, tabel, avatar), Laporan, Detail jawaban.
6. **Verifikasi**: kontras WCAG AA, fokus keyboard, responsif sampai 640 px, build dan test yang ada, tangkapan layar sebelum dan sesudah dengan data dummy.
Sumber kebenaran visual: `screenshot/` (1440x900, `full_page`). `html/*.dc.html` hanya rujukan struktur dan CSS; `support.js` adalah shim render lokal, **bukan kode aplikasi**. Data, angka (8 hasil, sebaran kategori, nama peserta) dan timer di prototipe adalah contoh.

## 11. Rincian visual per layar (checklist penerapan)
Format: tata letak, komponen (merujuk 7a), keadaan, efek. Lebar acuan 1440 px kecuali disebut. Semua layar peserta: header transparan (tanda produk + "Portal Psikotes", stepper di kanan, kecuali Main dan Selesai tanpa stepper) dan footer transparan ("Portal Psikotes" kiri, "Kendala saat tes? Hubungi tim HC." kanan, teks `#5E7391`).

**Main (Pilih tes)**: hero dua kolom. Kiri: judul 3 baris "Pilih tes / yang akan / Anda ikuti" (Raleway, baris ketiga gradien), paragraf, tombol utama "Mulai dengan token ->" (panah bergeser saat hover). Kanan: ilustrasi (`aset/ilustrasi-main.svg`). Di bawah: tiga ubin menu (nomor 01-03, ubin ikon, judul, info "30 soal - 10 menit", tautan "Pilih tes ->"). Keadaan: tes yang sudah dikirim tampil redup dengan "Selesai" dan tombol nonaktif "Sudah dikerjakan"; tautan "Peserta lain memakai komputer ini". Kotak putus-putus catatan prototipe tidak diimplementasikan. Efek: hover ubin (7b-3), hover tombol. Responsif: ilustrasi disembunyikan, ubin bertumpuk.
**Token**: dua langkah. Langkah 1: kiri ikon kunci, judul "Verifikasi token dan identitas", keterangan; kartu kaca berisi field Token, petunjuk kecil, tombol utama "Lanjut", tautan "Kembali"; lebar sekitar 620 px. Kotak galat merah muda dengan `role="alert"`. Langkah 2: lebar sekitar 1100 px, dua kolom: kiri blok persetujuan (judul huruf kapital, lima pernyataan, kalimat penutup, radio "Saya Setuju / Saya Tidak Setuju" tanpa nilai awal), kanan field nama (email hanya mode individu), kotak peringatan oranye muda, tombol "Verifikasi dan lanjut" (nonaktif: opacity .45, kursor not-allowed, sampai Setuju dan nama terisi) dan "Kembali". Banner token (abu-abu) di atas dengan tautan "Ganti token". "Tidak Setuju" menampilkan pesan galat merah. Fokus field: outline oranye.
**Instruksi dan KoranInstruksi**: satu kolom 860 px: chip label (TIU 5 / TES KORAN / KRAEPELIN), h1 "Instruksi pengerjaan", kartu berisi dua kotak info (Durasi, Jumlah soal atau Jumlah halaman; `#E3EDFC`/`#E3EBF4` radius), paragraf, langkah bernomor (7a), tombol utama dan tautan "Kembali". Tidak ada gambar samping.
**Simulasi (TIU 5)**: chip "TIU 5 - LATIHAN", judul "Soal latihan n dari 2", pil info "Latihan, tidak dinilai dan tidak disimpan"; kartu: instruksi, kotak gambar putus-putus (placeholder), lima tombol pilihan 1-5 horizontal. Setelah memilih: pilihan benar hijau (`#E3F3E8`, garis `#1E6B3A`), salah merah, keterangan "Belum tepat. Jawaban yang benar: X." atau "Jawaban Anda benar.", tombol "Soal latihan berikutnya" / "Mulai tes".
**Simulasi6 (TIU 6)**: sama, tetapi tabel Butir x (B, S) 5 baris dengan radio bulat; setelah semua terisi muncul "Benar n dari 5 butir." dan kunci.
**KoranContoh1/2**: dua kartu berdampingan: kiri contoh lajur (digit besar dengan kotak jawaban dan penjelasan "2 + 3 = 5, tulis 5"), kanan "Cara mengerjakan" (daftar) dan kotak catatan; tombol "Lanjut ke contoh 2" / "Lanjut ke uji coba".
**KoranLatihan**: dua kartu lajur (6 kotak per lajur) + kartu "Kerjakan seperti pada contoh"; kotak aktif putih garis oranye, terisi navy angka putih; auto-lanjut tanpa Enter; tombol "Selesai uji coba" lalu hasil v/x dan "Benar n dari 12" dan "Mulai tes". Pil info "Tidak dinilai dan tidak disimpan", "Tanpa batas waktu".
**Tiu5 / Tiu6 (tes)**: header navy lengket membulat (nama tes, "Peserta: nama", pil oranye "Sisa waktu mm:ss"). Kiri kartu soal ("Soal n dari 30", label "Jawaban tersimpan", instruksi, gambar placeholder, "Pilih nomor jawaban" lima kotak / tabel B-S, tombol Sebelumnya dan Berikutnya). Kanan panel "Navigasi soal" (kotak 5 kolom / TIU 6 4 kolom, legenda 3 status) dan tombol navy "Kirim jawaban". **Tanpa efek hover/animasi pada kotak soal dan pilihan.**
**Koran (tes)**: header navy (Sisa waktu 09:32, "Halaman x dari 13", "Terjawab n dari 988 soal"), banner aturan biru tua, empat lajur berdampingan (1366x768 tanpa gulir), kotak digit (aktif, terisi, berikutnya redup), catatan di bawah, tautan "Lanjut ke konfirmasi" di kotak terakhir halaman 13. **Tanpa efek.**
**Submit**: satu kolom 560 px: ubin ikon kirim, "Kirim jawaban sekarang?", dua kotak statistik (Sudah dijawab biru muda, Belum dijawab oranye muda, radius 16 px), keterangan, tombol utama "Ya, kirim jawaban" dan tombol sekunder "Kembali ke soal".
**Selesai**: terpusat: lencana centang (`aset/ilustrasi-selesai.svg`), "Tes selesai" (varian "Waktu habis" dengan pesan berbeda), pesan terima kasih, tombol "Kembali ke halaman utama". Tanpa skor.
**HcLogin**: lihat bagian 5 dan 7a. Panel ilustrasi kiri (gradien), kartu kaca kanan; responsif: panel menumpuk di atas formulir.
**HcOverview**: header HC terang + tiga tab; judul "Ringkasan" + tanggal; strip KPI (tiga ubin ikon: jam, centang, grafik batang; angka 34 px); kartu "Sesi hari ini" dengan tabel (status berupa pil: Berjalan oranye muda, Selesai hijau muda); chip Catatan.
**HcToken**: bagian 5 dan 7c. Komponen: segmented control Individu/Serentak (aktif navy), field, checkbox tes + Tanggal/Buka/Tutup, textarea peserta, `<details>` Templat email, tombol navy; kanan dropdown Sesi, kartu Undangan peserta, Token dan jadwal per tes (token "...."), Pratinjau email (kotak surat dengan header Dari/Kepada/Subjek); varian Serentak: Token kelompok (bilah kuota, status Aktif/Belum mulai/Penuh, aksi Lihat peserta, Tambah kuota, Token baru, Cabut), Peserta yang sudah masuk (Ubah nama, penanda nama kembar), Pratinjau email token kelompok dan tombol "Kirim email token ke penerima". Toast hijau "Tutup" untuk umpan balik.
**HcHasil**: judul + keterangan; tiga kartu ringkasan (Peserta, Hasil tes, sebaran kategori); kartu filter (Sesi, Jenis tes, Tanggal, Cari nama, tombol "Ekspor Excel (.xlsx)" dan "Ekspor PDF"); tabel dengan avatar, kategori berwarna, aksi Review (biru solid), Cetak PDF, Jawaban; baris hover; penghitung "7 baris dari 6 peserta" dan chip "Semua" / "Perlu perhatian n" (kriteria "perlu perhatian" belum diputuskan; di prototipe = skor 1-2, hanya tampilan).
**HcLaporan**: tombol Cetak PDF / Detail jawaban / Kembali; kartu identitas; tabel Hasil per tes; kartu grafik Koran 22 interval (garis dikerjakan/benar/salah); kolom Catatan HC (tidak disimpan, ikut tercetak).
**HcJawaban**: kartu "Detail jawaban - nama" + Tutup, tab (TIU 5 / TIU 6 / Tes Koran / Kraepelin; aktif navy), ringkasan satu kalimat + chip Catatan, kotak per nomor (nomor kecil, jawaban besar; hijau/merah/abu); tab Koran menambah tracking per 26 detik (legenda, grafik, "Lihat tabel 22 interval").

## 12. Keadaan, responsif, dan aksesibilitas
- **Keadaan yang ada di prototipe**: tombol nonaktif (Token langkah 2), galat token (kotak merah), "Tidak Setuju" (pesan galat), kotak Koran aktif/terisi/berikutnya, pilihan benar/salah (latihan), kotak jawaban hijau/merah/abu (Detail jawaban), tes selesai dan waktu habis, baris tabel hover, tooltip terbuka. Screenshot varian ada di `screenshot/` (Token_*, HcToken_*, Main_*).
- **Responsif**: tangkapan 390 dan 768 px di `screenshot/responsif/`. Pada 390 px: tombol penuh lebar, kolom bertumpuk, ilustrasi disembunyikan; Koran menampilkan dua lajur per baris dan tetap bisa digulir; tabel HC bergulir horizontal. Kemampuan memakai Koran dan Tiu di HP **belum diputuskan** (perangkat target belum ditetapkan).
- **Aksesibilitas yang dipertahankan**: label terhubung ke field, `role="alert"` untuk galat, fokus terlihat, tooltip dapat difokus, target klik besar di halaman peserta. Yang **belum diverifikasi**: kontras warna (`#5E7391` di latar muda, teks kecil 11-13 px), urutan tab, pembaca layar. Ukur dan perbaiki saat implementasi.

## 13. Daftar berkas paket dan cara memakainya
- `PROTOTIPE_SPEC.md` (ini), `STYLE_UI.md` (brief + batasan), `README.md`.
- `css/gaya-bersama.css`: gabungan CSS bersama (dasar, lembut, hover, animasi, langkah bernomor, tooltip, tabel, tiga kolom HC). Rujukan untuk variabel CSS dan komponen.
- `aset/`: `tanda-produk.svg`, `ilustrasi-main.svg`, `ilustrasi-selesai.svg`, `ilustrasi-hclogin.svg`, `ikon_inventaris.md` (17 ikon Lucide).
- `inventaris_token.md`: semua warna, radius, ukuran font, bayangan yang benar-benar dipakai (hasil hitung otomatis; nilai langka bisa sisa gaya lama).
- `inventaris_teks.md`: semua teks UI per layar.
- `screenshot/`: 1440x900 penuh halaman + varian keadaan dan hover; `screenshot/responsif/`: 390 dan 768 px.
- `html/`: sumber prototipe; `support.js` hanya shim render, bukan kode aplikasi.
