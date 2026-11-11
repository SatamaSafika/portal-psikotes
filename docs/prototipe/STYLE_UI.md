# STYLE_UI: brief penerapan gaya UI prototipe v50

Sumber lengkap ada di `PROTOTIPE_SPEC.md` bagian 7-7c dan 10. Berkas ini ringkasan dan batasan keras. Jika ada beda, `PROTOTIPE_SPEC.md` yang menang, dan WORKFLOW serta backend menang atas keduanya.

---

## Tujuan
Ubah tampilan (CSS, template, aset) frontend Angular 22 Portal Psikotes agar mengikuti style prototipe lo-fi v62. Ini perubahan visual saja.

## Batasan keras (jangan dilanggar)
1. Hanya ubah frontend (komponen, template, SCSS, aset). Jangan sentuh backend, route API, logika skor, timer, validasi token, atau `backend/.env`.
2. Jangan ubah perilaku: urutan halaman, aturan tes (TIU 5, TIU 6, Koran), timer, auto-lanjut Koran, persetujuan peserta.
3. Tidak ada nama perusahaan ("Bakrie Autoparts") atau logo perusahaan di UI maupun teks yang tampil ke peserta. Nama produk: "Portal Psikotes".
4. Jangan pakai data pegawai asli. Hanya data dummy.
5. Jangan baca, tampilkan, atau salin soal asli, kunci jawaban, atau `.env`. Pakai placeholder.
6. Jangan jalankan DDL, DROP, TRUNCATE. Tidak ada perubahan database dalam tugas ini.
7. Mode manual: minta persetujuan sebelum menjalankan perintah terminal. Jangan auto-approve.
8. Prototipe adalah referensi UI/UX. Bila prototipe bertentangan dengan WORKFLOW atau perilaku backend, WORKFLOW dan backend yang menang.

## Langkah kerja yang diminta
1. Baca struktur frontend dulu (routing, komponen bersama, SCSS global). Tulis rencana singkat dan minta persetujuan sebelum mengubah banyak file.
2. Mulai dari design tokens dan style global (variabel CSS, font, tombol, kartu, field), baru halaman per halaman.
3. Kerjakan bertahap: (a) token + global, (b) halaman peserta pra-tes, (c) halaman tes, (d) dashboard HC. Berhenti di tiap tahap agar saya bisa cek.
4. Pakai komponen bersama (button, card, field, chip, tooltip) supaya tidak menyalin CSS di tiap halaman.
5. Setelah selesai, jalankan build dan test yang ada, lalu laporkan file yang berubah dan hal yang tidak bisa dipastikan.

## Design tokens
| Token | Nilai |
|---|---|
| navy | `#193F69` |
| biru aksen | `#2F6FD6` |
| oranye (CTA utama) | `#CB642B` (hover `#B0541F`) |
| teks utama / sekunder | `#1C2F4A` / `#5E7391` |
| garis / border halus | `#CFDBEC`, `#DCE6F5` |
| tinted biru muda | `#E3EDFC`, tile ikon `linear-gradient(145deg,#E6EFFD,#C9DCF8)` |
| latar halaman | `radial-gradient(900px 500px at 85% 0%,#D7E5FB 0%,rgba(215,229,251,0) 60%), radial-gradient(700px 500px at 0% 60%,#E3EDFC 0%,rgba(227,237,252,0) 60%), linear-gradient(180deg,#F3F7FD,#EAF1FB)` |
| status | Baik hijau `#E3F3E8`/`#1E6B3A`; Rata-Rata kuning `#FFF3CC`/`#6B5200`; Kurang oranye muda `#FBE9DC`/`#7A3A0A`; Kurang Sekali merah muda `#FBE4E6`/`#8A1F2B` |
| font | Judul h1-h3: Raleway (500-800). Isi: Inter (400-700). Fallback `system-ui`. Muat lewat Google Fonts atau, lebih baik, self-host bila jaringan produksi dibatasi (perlu verifikasi) |

Aturan warna: oranye hanya untuk satu aksi utama per layar. Biru/navy untuk aksi sekunder dan elemen struktural.

## Komponen
- **Kartu kaca (`.glass`)**: `background:rgba(255,255,255,.72); border:1px solid rgba(255,255,255,.9); border-radius:22px; box-shadow:0 14px 40px rgba(25,63,105,.10)`.
- **Tombol utama (`.pill`)**: oranye, teks putih 700, `padding:14px 26px`, `border-radius:999px`, bayangan `0 8px 20px rgba(203,100,43,.28)`.
- **Tombol navy (`.pillN`)**: sama, latar `#193F69`.
- **Tombol ghost**: latar `rgba(255,255,255,.7)`, teks navy 600, border `#CFDBEC`, pil.
- **Field**: input `padding:13px 16px; border:1px solid #CFDBEC; border-radius:14px; background:#fff`. Fokus: `outline:2px solid #CB642B; outline-offset:1px`. Label 14px/600 di atas input.
- **Chip label di atas judul (eyebrow)**: `inline-flex; background:#E3EDFC; color:#2F6FD6; border-radius:999px; padding:5px 13px; font-size:12px; font-weight:700; letter-spacing:.06em`. Jangan pakai garis oranye di kiri.
- **Judul gradien (`.grad`)**: hanya di halaman pembuka, `linear-gradient(90deg,#193F69,#2F6FD6)` pada teks.
- **Tile ikon**: kotak 46-64px, radius 15-22px, gradien `#E6EFFD`→`#C9DCF8`, ikon garis (Lucide, stroke 1.8, warna `#2F6FD6`).
- **Checkbox**: pakai checkbox native dengan `accent-color:#2F6FD6`, 18x18. Jangan buat tombol bertanda centang.
- **Chip "ⓘ Catatan" + tooltip**: teks penjelasan panjang di dashboard HC disembunyikan di tooltip (muncul saat hover dan fokus keyboard). Chip `#E3EDFC`/`#2F6FD6`, kartu tooltip putih radius 14px, lebar maks 340px. Harus bisa dijangkau keyboard (`tabindex=0`).
- **Daftar langkah instruksi**: `ol` tanpa bullet, tiap `li` kartu `#F3F7FD` radius 16px, nomor di lingkaran gradien navy-biru 28px.
- **Tabel HC**: header 11px huruf kapital `letter-spacing:.08em` warna `#5E7391`; sel `padding:12px`, garis bawah `#EDF2FA`; baris hover `#F3F7FD`; avatar inisial lingkaran 36px; aksi utama "Review" pil biru solid `#2F6FD6`, aksi lain pil outline `#C9D8EE`.
- **Ringkasan hasil HC**: kartu kaca berisi ikon tile + angka 28px + label; satu kartu lebar berisi bar sebaran kategori.

## Interaksi
- Hover tombol: naik 2px + skala 1.04, transisi 0.2s `cubic-bezier(.34,1.56,.64,1)`; ikon panah di tombol utama bergeser 5px ke kanan; tekan: skala .97.
- Hover tile menu: naik 4px dan bayangan lebih besar; ikon sedikit bergoyang (0.5s).
- Kartu muncul dengan fade-up 0.5s.
- Wajib: `@media (prefers-reduced-motion:reduce)` mematikan semua animasi dan transformasi di atas.
- Jangan tambah efek lain.

## Aturan per area
- **Halaman peserta pra-tes** (pilih tes, token, instruksi, simulasi, latihan, kirim): style penuh di atas. Satu kolom, lebar maks sekitar 860px untuk instruksi. Tanpa ilustrasi samping di halaman instruksi. Ilustrasi vektor hanya di halaman pembuka.
- **Halaman tes (TIU 5, TIU 6, Koran)**: TETAP TENANG. Pakai warna dan font baru, header navy lengket dengan sudut bawah membulat (`border-radius:0 0 22px 22px`) dan bayangan lembut. Tanpa hover-efek, animasi masuk, atau dekorasi pada kotak soal, pilihan jawaban, dan kotak digit Koran. Jangan ubah ukuran atau tata letak yang memengaruhi keterbacaan atau tombol jawaban.
- **Dashboard HC**: header terang (`rgba(255,255,255,.72)`, border bawah `#DCE6F5`), tab aktif berupa kartu putih dengan bayangan, kartu `.glass`, tabel sesuai di atas, catatan panjang jadi tooltip.
- **Persetujuan peserta**: tampilan boleh dirapikan, tetapi teks persetujuan wajib dari `backend/config/persetujuan.json`. Jangan tulis ulang atau mengarang teksnya.

## Aksesibilitas (wajib dicek)
- Kontras teks terhadap latar minimal WCAG AA. Teks `#5E7391` di atas latar muda perlu diukur, jangan diasumsikan lolos.
- Fokus keyboard terlihat di semua kontrol. Tooltip terbuka lewat fokus.
- Target sentuh tombol minimal sekitar 44px pada layar peserta.
- Tata letak tetap terpakai di lebar sempit (gambar dan kolom samping dilipat).

## Hasil yang diharapkan
- Daftar file yang diubah dan komponen bersama baru.
- Tangkapan layar sebelum dan sesudah per halaman (data dummy).
- Daftar perbedaan dari prototipe beserta alasannya.
- Hal yang belum diverifikasi: tampilan font di jaringan produksi, performa efek di laptop spesifikasi rendah, kontras aktual.
