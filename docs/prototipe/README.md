# Prototipe Portal Psikotes v50 (gaya UI baru + efek UX)

Letakkan isi folder ini di `docs/prototipe/` (bukan `docs/prototipe/prototipe/`).

- `PROTOTIPE_SPEC.md`: BACA PERTAMA. Perilaku, aturan, gaya visual (bagian 7, 7a, 7b, 7c), dan urutan kerja penerapan (bagian 10).
- `STYLE_UI.md`: brief singkat penerapan gaya dan batasan keras untuk Claude Code.
- `screenshot/`: tangkapan 1440x900 penuh halaman, termasuk varian (Token_*, Main_hover_tombol, HcToken_tooltip, dst).
- `css/gaya-bersama.css`, `aset/` (SVG dan inventaris ikon), `inventaris_token.md`, `inventaris_teks.md`: bahan rujukan lengkap (lihat spesifikasi bagian 13).
- `screenshot/responsif/`: tangkapan 390 dan 768 px.
- `html/`: sumber prototipe (`*.dc.html`). Lihat di browser: `python -m http.server 8000` di folder `html/`, buka `http://localhost:8000/Main.dc.html`. `support.js` hanya shim lokal, BUKAN kode aplikasi; jangan disalin ke Angular.

Prototipe memakai data fiktif dan timer statis. Jangan salin data atau angka contoh ke kode produksi. Efek gerak (7b) tidak terlihat di tangkapan layar; ikuti spesifikasi teksnya.
