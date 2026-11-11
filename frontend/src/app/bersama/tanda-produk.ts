import { Component, input } from '@angular/core';

/**
 * Tanda produk generik "Portal Psikotes": empat kotak membulat (biru, biru muda, biru muda, oranye).
 * Bukan logo perusahaan (CLAUDE.md aturan keras 10). Varian putih untuk panel navy (Masuk admin).
 */
@Component({
  selector: 'app-tanda-produk',
  host: { 'aria-hidden': 'true', style: 'display:inline-flex;line-height:0' },
  template: `
    <svg xmlns="http://www.w3.org/2000/svg" [attr.width]="ukuran()" [attr.height]="ukuran()" viewBox="0 0 30 30" focusable="false">
      <rect x="2" y="2" width="12" height="12" rx="4" [attr.fill]="putih() ? '#FFFFFF' : '#2F6FD6'" />
      <rect x="16" y="2" width="12" height="12" rx="4" fill="#8FB4F5" />
      <rect x="2" y="16" width="12" height="12" rx="4" fill="#8FB4F5" />
      <rect x="16" y="16" width="12" height="12" rx="6" fill="#CB642B" />
    </svg>
  `,
})
export class TandaProduk {
  readonly ukuran = input(28);
  readonly putih = input(false);
}
