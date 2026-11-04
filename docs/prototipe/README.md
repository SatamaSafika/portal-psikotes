# Prototipe lo-fi Portal Psikotes

Isi folder ini:
- `PROTOTIPE_SPEC.md`: perilaku, aturan, dan perbedaan prototipe vs aplikasi nyata. BACA INI DULU. Persetujuan peserta (Part 8c) baru ada di spesifikasi (bagian 6a), belum di board dan tangkapan layar.
- `screenshot/`: 22 tangkapan layar (1280 px): 17 board plus varian Part 8b (verifikasi serentak, individu, galat, dan dashboard serentak).
- `html/`: sumber prototipe (`*.dc.html`). Untuk melihat di browser: jalankan `python -m http.server 8000` di folder `html/`, lalu buka `http://localhost:8000/Main.dc.html`. Harus lewat http, bukan klik dua kali berkas. `support.js` hanyalah shim lokal untuk merender templat, BUKAN kode aplikasi dan jangan disalin ke Angular.

Prototipe memakai data fiktif dan timer statis. Jangan salin data atau angka contoh ke kode produksi.
