import { Component, input } from '@angular/core';

/**
 * Ilustrasi vektor dekoratif prototipe v50 (docs/prototipe/aset/), hanya di tiga tempat (7a):
 * - main: halaman Pilih tes, kanan hero;
 * - selesai: lencana centang di atas judul Selesai;
 * - hclogin: panel kiri Masuk admin.
 * SVG buatan sendiri, bukan karakter atau logo pihak lain. Id gradien diberi awalan unik per varian.
 */
@Component({
  selector: 'app-ilustrasi',
  host: { 'aria-hidden': 'true', class: 'ilustrasi' },
  template: `
    @switch (varian()) {
      @case ('main') {
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 460" width="520" height="460" focusable="false">
          <defs>
            <linearGradient id="im-g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8FB4F5" /><stop offset="1" stop-color="#2F6FD6" /></linearGradient>
            <linearGradient id="im-g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#DCE9FC" /><stop offset="1" stop-color="#9DBFF4" /></linearGradient>
            <linearGradient id="im-g3" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#193F69" /><stop offset="1" stop-color="#3B7BE0" /></linearGradient>
            <linearGradient id="im-gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".85" /><stop offset="1" stop-color="#fff" stop-opacity="0" /></linearGradient>
          </defs>
          <ellipse cx="270" cy="230" rx="230" ry="200" fill="#CFE0FA" opacity=".55" />
          <g transform="rotate(-14 260 230)"><rect x="150" y="80" width="230" height="290" rx="34" fill="url(#im-g2)" opacity=".75" /></g>
          <g transform="rotate(10 300 240)">
            <rect x="210" y="70" width="210" height="270" rx="34" fill="url(#im-g1)" opacity=".9" />
            <rect x="210" y="70" width="210" height="270" rx="34" fill="url(#im-gl)" opacity=".5" />
          </g>
          <g transform="rotate(-4 250 260)">
            <rect x="120" y="150" width="200" height="250" rx="34" fill="url(#im-g3)" />
            <rect x="120" y="150" width="200" height="250" rx="34" fill="url(#im-gl)" opacity=".28" />
            <rect x="150" y="190" width="70" height="10" rx="5" fill="#fff" opacity=".85" />
            <rect x="150" y="214" width="120" height="8" rx="4" fill="#fff" opacity=".45" />
            <rect x="150" y="234" width="100" height="8" rx="4" fill="#fff" opacity=".45" />
            <circle cx="170" cy="330" r="22" fill="#CB642B" />
            <path d="m160 330 7 7 14-15" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
          </g>
          <circle cx="420" cy="90" r="14" fill="#CB642B" opacity=".9" />
          <circle cx="90" cy="110" r="8" fill="#8FB4F5" />
          <!-- Perbaikan dari prototipe: titik dipindah keluar dari pil (sebelumnya tertindih tepi bawah pil). -->
          <circle cx="474" cy="408" r="9" fill="#8FB4F5" opacity=".7" />
          <path d="M60 380q30-40 70-20" fill="none" stroke="#2F6FD6" stroke-width="2" stroke-dasharray="3 6" stroke-linecap="round" />
          <!-- Pil "Waktu terukur": lebar dihitung dari teks (padding kiri dan kanan sama 16), ikon dan teks sejajar tengah. -->
          <g transform="translate(340 318)">
            <rect width="170" height="54" rx="27" fill="#fff" opacity=".92" />
            <g transform="translate(16 14)" fill="none" stroke="#CB642B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="13" cy="13" r="10.8" />
              <path d="M13 6.5v6.5l4.3 2.2" />
            </g>
            <text x="50" y="27" dominant-baseline="central" font-family="Inter,sans-serif" font-size="14" font-weight="600"
                  fill="#193F69" textLength="104" lengthAdjust="spacingAndGlyphs">Waktu terukur</text>
          </g>
        </svg>
      }
      @case ('selesai') {
        <svg xmlns="http://www.w3.org/2000/svg" width="190" height="170" viewBox="0 0 190 170" focusable="false">
          <defs>
            <linearGradient id="is-g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8FB4F5" /><stop offset="1" stop-color="#2F6FD6" /></linearGradient>
            <linearGradient id="is-g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#DCE9FC" /><stop offset="1" stop-color="#9DBFF4" /></linearGradient>
          </defs>
          <ellipse cx="95" cy="88" rx="88" ry="76" fill="#CFE0FA" opacity=".6" />
          <g transform="rotate(-12 95 85)"><rect x="40" y="25" width="80" height="100" rx="22" fill="url(#is-g2)" /></g>
          <g transform="rotate(10 100 90)"><rect x="70" y="30" width="80" height="100" rx="22" fill="url(#is-g1)" /></g>
          <circle cx="95" cy="88" r="40" fill="#fff" />
          <circle cx="95" cy="88" r="32" fill="#1E8A4E" />
          <path d="m80 88 11 11 20-23" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
          <circle cx="155" cy="38" r="7" fill="#CB642B" />
          <circle cx="30" cy="120" r="5" fill="#8FB4F5" />
        </svg>
      }
      @case ('hclogin') {
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 300" width="420" height="300" focusable="false">
          <g transform="rotate(-12 150 150)"><rect x="60" y="40" width="170" height="210" rx="30" fill="#fff" opacity=".16" /></g>
          <g transform="rotate(8 230 150)"><rect x="150" y="30" width="170" height="210" rx="30" fill="#fff" opacity=".24" /></g>
          <rect x="100" y="90" width="170" height="200" rx="30" fill="#fff" opacity=".92" />
          <rect x="128" y="124" width="70" height="10" rx="5" fill="#193F69" />
          <rect x="128" y="148" width="112" height="8" rx="4" fill="#9DBFF4" />
          <rect x="128" y="168" width="96" height="8" rx="4" fill="#9DBFF4" />
          <rect x="128" y="206" width="30" height="50" rx="8" fill="#2F6FD6" />
          <rect x="166" y="190" width="30" height="66" rx="8" fill="#8FB4F5" />
          <rect x="204" y="222" width="30" height="34" rx="8" fill="#CB642B" />
          <circle cx="330" cy="70" r="12" fill="#CB642B" />
          <circle cx="50" cy="230" r="7" fill="#9DBFF4" />
        </svg>
      }
    }
  `,
})
export class Ilustrasi {
  readonly varian = input.required<'main' | 'selesai' | 'hclogin'>();
}
