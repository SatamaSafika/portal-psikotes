@'
# Portal Tes Psikotes

Portal web resmi perusahaan untuk tes psikotes: TIU 5, TIU 6, dan Tes Koran (Kraepelin).
Fungsi: peserta mengerjakan tes, sistem menyimpan jawaban dan mengoreksi otomatis
memakai kunci jawaban dari HC, lalu hasil dikategorikan sesuai ketentuan HC.

**Status: ON PROGRESS (laporan 23 Oktober 2026)**

## Ruang lingkup
| Tes | Status |
|---|---|
| TIU 5 | Belum dimulai |
| TIU 6 | Belum dimulai |
| Tes Koran / Kraepelin | Belum dimulai |

## Progres hari ini
- [x] Diskusi dengan HC selesai: soal, aturan, durasi, dan hasil yang diharapkan sudah diterima
- [ ] Analisis kebutuhan per tes (aturan, durasi, cara skoring)
- [ ] Rancangan alur peserta dan admin
- [ ] Rancangan database
- [ ] Pemilihan teknologi (belum diputuskan)

## Rencana berikutnya
1. Memetakan aturan dan durasi tiap tes
2. Merancang struktur data (peserta, sesi, soal, jawaban, hasil)
3. Menyusun aturan koreksi dan kategori skor bersama HC

## Pertanyaan terbuka
- Siapa yang menjadi peserta (pelamar, karyawan, atau keduanya)?
- Bagaimana cara peserta masuk (kode akses, akun, atau tautan)?
- Berapa lama hasil tes boleh disimpan?
- Domain dan server yang akan dipakai?

## Keamanan
Repo ini private. Soal, kunci jawaban, dan data peserta tidak disimpan di repo.
Letakkan di folder lokal `materi_rahasia/` (diabaikan git).

## Penanggung jawab
Satama Safika, BA Intern, PT Bakrie Autoparts
'@ | Set-Content -Encoding utf8 README.md