# Rencana skrip penghapusan data terjadwal (Part 10)

Status: **usulan untuk dibahas dengan tim IT**, belum ada skrip yang dibuat atau dijalankan.
Disusun 16 November 2026. Database `BA`, hanya tabel `dbo.HCIS_Psikotes_*`.

## 1. Dasar aturan
Disetujui HC (29 Oktober 2026, disampaikan pemilik proyek; belum ada dokumen tertulis HC):
- Jawaban mentah peserta dihapus **3 bulan** setelah tanggal tes.
- Seluruh data peserta (identitas, email, token, hasil, ringkasan skor) dihapus **4 bulan** setelah tanggal tes.

Angka 3 dan 4 bulan sudah tersimpan sebagai konfigurasi di `backend/config/skoring.json` (`retensi.jawaban_bulan`, `retensi.ujian_bulan`), dan aplikasi memvalidasi bahwa jawaban tidak disimpan lebih lama dari ujian.

## 2. Apa yang dihapus dan kapan
Patokan waktu adalah kolom `Tanggal` (tanggal tes) per baris, bukan tanggal pembuatan. Satu sesi bisa punya beberapa tes di tanggal berbeda, jadi tiap tes dihitung dari tanggalnya sendiri.

| Tabel | Isi | Kapan dihapus |
| --- | --- | --- |
| `HCIS_Psikotes_Jawaban` | Jawaban mentah per nomor, waktu jawaban Koran | 3 bulan setelah `Ujian.Tanggal` |
| `HCIS_Psikotes_Ujian` | Nama, email, hash token, status, hasil, kategori, N Koran, ringkasan 22 interval, persetujuan | 4 bulan setelah `Ujian.Tanggal` |
| `HCIS_Psikotes_Kelompok` | Hash token kelompok, kuota (tanpa data pribadi) | 4 bulan setelah `Kelompok.Tanggal`, dan tidak ada lagi baris ujian yang memakainya |
| `HCIS_Psikotes_Sesi` | Nama sesi, template email, email PIC (`EmailPenerima`) | 4 bulan setelah `Sesi.Tanggal`, dan tidak ada lagi baris ujian atau kelompok yang memakainya |
| `HCIS_Psikotes_Admin` | Akun admin HC | **Tidak dihapus.** Ini bukan data peserta. |

Definisi "lewat N bulan": `DATEADD(MONTH, N, Tanggal) <= tanggal hari ini` (jam server database, WIB). Contoh: tes 16 November 2026 → jawaban dihapus mulai 16 Februari 2027, data lain mulai 16 Maret 2027. Tes 30 November → 28 Februari (aturan akhir bulan SQL Server).

## 3. Cara kerja skrip
Urutan mengikuti foreign key (anak dulu, induk kemudian):

1. **Pilih target, tanpa menghapus.**
   - Ujian 3 bulan: jawabannya dihapus.
   - Ujian 4 bulan: seluruh barisnya dihapus.
   - Kelompok dan sesi 4 bulan yang tidak lagi dipakai baris ujian mana pun setelah langkah ini.
2. **Hapus jawaban** dari ujian 3 bulan dan 4 bulan.
3. **Hapus baris ujian** 4 bulan.
4. **Hapus kelompok**, lalu **sesi**, yang sudah tidak terpakai.

Penjaga:
- **Mode uji sebagai bawaan.** Skrip hanya mencetak jumlah baris yang *akan* dihapus. Penghapusan baru berjalan bila mode uji dimatikan secara eksplisit.
- **Hasil belum dihitung tidak kehilangan jawaban.** Ujian berstatus `DIKIRIM` atau `WAKTU_HABIS` yang `DihitungPada`-nya masih kosong dilewati pada tahap 3 bulan dan dilaporkan. Tanpa penjaga ini, skornya tidak bisa dihitung lagi. Pada tahap 4 bulan seluruh baris dihapus apa pun statusnya, sesuai aturan HC.
- **Ujian `BERJALAN` tidak pernah disentuh.** Secara normal tidak mungkin ada setelah 3 bulan. Bila ada, ujian itu dilaporkan sebagai anomali.
- **Dihapus bertahap** (misalnya 5.000 baris per putaran), supaya tidak mengunci tabel lama di database `BA` yang dipakai bersama. Tiap putaran langsung tersimpan, jadi skrip yang terhenti di tengah aman dijalankan ulang esok harinya, karena kriterianya sama.
- **Tanpa DDL**: tidak ada `CREATE`, `ALTER`, `DROP`, atau `TRUNCATE`. Hanya `SELECT` dan `DELETE` pada 4 tabel di atas.

### Inti kueri (untuk ditinjau IT)
Contoh dengan 3 dan 4 bulan. Pada pelaksanaan, angkanya diambil dari konfigurasi (lihat bagian 4).

```sql
DECLARE @hari_ini DATE = CAST(SYSDATETIME() AS DATE);

-- Ujian yang jawabannya dihapus (3 bulan), kecuali yang hasilnya belum dihitung
SELECT u.Id FROM dbo.HCIS_Psikotes_Ujian u
 WHERE DATEADD(MONTH, 3, u.Tanggal) <= @hari_ini
   AND u.Status <> 'BERJALAN'
   AND NOT (u.Status IN ('DIKIRIM', 'WAKTU_HABIS') AND u.DihitungPada IS NULL);

-- Ujian yang dihapus seluruhnya (4 bulan)
SELECT u.Id FROM dbo.HCIS_Psikotes_Ujian u
 WHERE DATEADD(MONTH, 4, u.Tanggal) <= @hari_ini
   AND u.Status <> 'BERJALAN';

-- Kelompok yang dihapus: lewat 4 bulan dan tidak dipakai ujian yang tersisa
SELECT k.Id FROM dbo.HCIS_Psikotes_Kelompok k
 WHERE DATEADD(MONTH, 4, k.Tanggal) <= @hari_ini
   AND NOT EXISTS (SELECT 1 FROM dbo.HCIS_Psikotes_Ujian u
                    WHERE u.KelompokId = k.Id AND u.Id NOT IN (/* ujian 4 bulan */));

-- Sesi yang dihapus: lewat 4 bulan dan tidak dipakai ujian atau kelompok yang tersisa (pola sama)

-- Penghapusan bertahap, contoh untuk jawaban
WHILE 1 = 1
BEGIN
    DELETE TOP (5000) j FROM dbo.HCIS_Psikotes_Jawaban j
      JOIN @target t ON t.Id = j.UjianId;
    IF @@ROWCOUNT < 5000 BREAK;
END
```

## 4. Cara menjalankan (perlu keputusan IT)

| Opsi | Cara | Kelebihan | Kekurangan |
| --- | --- | --- | --- |
| **A. Skrip Node di backend** (usulan) | `npm run data:hapus` (mode uji bawaan, `--hapus` untuk menghapus), dijadwalkan harian lewat Windows Task Scheduler atau cron di server aplikasi | Angka retensi dibaca dari `skoring.json`, satu sumber dengan aplikasi (aturan proyek: ambang di konfigurasi, bukan di kode). Pola sama dengan `hasil:hitung-ulang`. Bisa diuji otomatis | Butuh penjadwal di server aplikasi |
| B. Job SQL Server Agent | Skrip T-SQL di atas dijalankan harian oleh Agent | Dikelola penuh oleh IT, tidak bergantung server aplikasi | Angka 3 dan 4 bulan ditulis dua kali (di job dan di `skoring.json`), bisa tidak sinkron. Butuh akses Agent |
| C. Di dalam aplikasi | Pekerjaan harian di proses backend, seperti penutupan otomatis tiap 15 detik | Tidak butuh penjadwal terpisah | Penghapusan berjalan diam-diam dengan akun aplikasi; lebih sulit diawasi dan dimatikan |

Usulan: **opsi A**, dijalankan setiap hari pukul 02.00 WIB, di luar jam tes.

## 5. Hak akun database
- Penghapusan butuh `SELECT` dan `DELETE` pada `HCIS_Psikotes_Jawaban`, `_Ujian`, `_Kelompok`, dan `_Sesi`. Akun saat ini sudah punya keduanya.
- Pertanyaan untuk IT: apakah penghapusan memakai akun aplikasi yang sama, atau akun terpisah khusus penghapusan? Akun terpisah lebih aman, karena akun aplikasi di produksi idealnya tidak bisa menghapus data massal.

## 6. Log dan pemantauan
- Log hanya berisi **jumlah**: waktu jalan, mode (uji atau hapus), jumlah baris per tabel, jumlah ujian yang dilewati (hasil belum dihitung, status `BERJALAN`). Tidak ada nama, email, token, atau Id peserta.
- Tidak ada tabel log baru, karena itu butuh DDL. Log dicatat di berkas log server atau di riwayat job. Pertanyaan untuk IT: di mana log job biasanya disimpan dan dipantau?
- Bila skrip gagal, kodenya keluar dengan status gagal supaya penjadwal menandainya.

## 7. Dampak ke aplikasi
- Setelah 3 bulan, **Detail jawaban** di dashboard HC tidak lagi berisi jawaban per nomor, dan `hasil:hitung-ulang` melewati ujian itu (sudah ditangani). Skor, kategori, dan **grafik 22 interval Koran tetap ada** sampai 4 bulan, karena disimpan di kolom `RingkasanInterval` tabel ujian.
- Perlu ditambahkan di aplikasi: pesan "Jawaban mentah sudah dihapus sesuai kebijakan penyimpanan" di panel Detail jawaban, supaya HC tidak mengira ada galat.
- Setelah 4 bulan, peserta hilang dari Hasil, Overview, dan ekspor. Laporan PDF atau Excel yang sudah diunduh HC sebelumnya **tidak ikut terhapus** dan menjadi tanggung jawab HC.

## 8. Cadangan (backup)
Data yang sudah dihapus masih ada di cadangan database sampai cadangan itu kedaluwarsa. Pertanyaan untuk IT: berapa lama cadangan database `BA` disimpan, dan apakah itu bisa dicatat sebagai bagian dari kebijakan penyimpanan untuk HC?

## 9. Rencana uji sebelum diaktifkan
1. Di database uji, atau di database `BA` dengan sesi dummy bernama jelas (misalnya "Uji Retensi"), siapkan baris dengan tanggal tes mundur. Isinya: 2 bulan (tidak terhapus), 3 bulan (jawaban terhapus), 4 bulan (semua terhapus), serta satu ujian selesai yang belum dihitung.
2. Jalankan mode uji. Cocokkan jumlah yang dilaporkan dengan hitungan tangan.
3. Jalankan mode hapus. Pastikan hanya baris dummy yang hilang, sesi lain utuh, dan dashboard HC tetap berjalan.
4. Jalankan kedua kalinya. Hasilnya harus 0 baris (aman dijalankan ulang).
5. Aktifkan jadwal harian dalam mode uji selama satu minggu. Baca lognya, lalu nyalakan mode hapus.

## 10. Yang perlu diputuskan
Tim IT:
1. Opsi penjadwalan A, B, atau C (bagian 4).
2. Akun yang dipakai: akun aplikasi atau akun terpisah (bagian 5).
3. Lokasi dan pemantauan log (bagian 6).
4. Lama penyimpanan cadangan database (bagian 8).

HC (**perlu verifikasi**):
1. Data dihapus *pada* tanggal genap 3 dan 4 bulan, atau sehari sesudahnya.
2. Bukti persetujuan peserta (`PersetujuanPada`, `PersetujuanVersi`) ikut terhapus 4 bulan setelah tes, atau perlu disimpan lebih lama (pertanyaan terbuka sejak Part 8c).
3. Email PIC sesi serentak ikut terhapus bersama sesinya (rencana ini menganggap ya, karena termasuk data pribadi).
