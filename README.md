# Portal Psikotes

Portal web tes psikotes (TIU 5, TIU 6, Tes Koran/Kraepelin) untuk kebutuhan HC PT Bakrie Autoparts. Peserta mengerjakan tes, sistem menyimpan jawaban mentah, lalu menilai otomatis memakai kunci jawaban dan aturan kategori dari HC.

Pemilik proyek: Satama Safika, BA Intern. Permintaan dari departemen HC.

## Status (27 Oktober 2026)

On Progress.

Selesai:
- Diskusi dan analisis kebutuhan bersama HC.
- Dokumen acuan kebutuhan platform.
- Prototipe UI lo-fi 12 layar (9 layar portal peserta, 3 layar dashboard HC).
- Pemilihan stack: Angular + TypeScript, Express + TypeScript, SQL Server 2024 perusahaan.

Berikutnya:
- Konfirmasi aturan skoring, durasi, dan jumlah soal ke HC.
- Rancangan database.
- Pengembangan backend dan frontend.

## Stack

| Bagian | Teknologi |
| --- | --- |
| Frontend | Angular, TypeScript (Ionic hanya bila diwajibkan tim IT) |
| Backend | Express, TypeScript |
| Database | SQL Server 2024 milik perusahaan (database khusus, skema `psikotes`). Kredensial hanya di `backend/.env` |
| Login admin | Username dan password dari daftar admin terdaftar |
| Login peserta | Token sekali pakai |

Versi yang dipakai adalah versi stabil terbaru. Untuk Node, pakai rilis LTS aktif. Catat nomor versi terpasang di `docs/VERSI.md` setelah instalasi, lalu samakan dengan tim IT.

## Struktur folder

```
frontend/            aplikasi Angular
backend/             API Express + TypeScript
  src/modules/       token, tes, skoring, hasil, admin
docs/                catatan teknis dan pertanyaan ke IT
materi_rahasia/      lokal saja, diabaikan git (soal, kunci, data peserta)
```

## Menjalankan backend

```
cd backend
npm install express
npm install -D typescript tsx @types/node @types/express
copy .env.example .env
npm run dev
```

Cek di browser: http://localhost:3000/api/health

## Menjalankan frontend

Lihat `frontend/README.md`.

## Keamanan dan data

- Repositori harus Private.
- Soal, kunci jawaban, dan data peserta tidak disimpan di repositori. Taruh di `materi_rahasia/` lokal.
- Selama pengembangan hanya data dummy. Data asli menunggu server dan persetujuan IT dan HC.
- Kunci jawaban dan timer dikerjakan di server, tidak dikirim ke browser.
- Rumus skoring disimpan sebagai konfigurasi, tidak ditulis keras di kode, karena menunggu konfirmasi HC.

## Pertanyaan terbuka

Lihat `docs/PERTANYAAN_IT.md` dan daftar konfirmasi HC di CLAUDE.md.
