import { Component, input } from '@angular/core';

/** Footer netral, tanpa nama atau logo perusahaan. */
@Component({
  selector: 'app-kaki-portal',
  template: `
    <footer class="kaki">
      <div class="wadah wadah-lebar kaki-isi">
        <span>Portal Psikotes</span>
        <span>Kendala saat tes? Hubungi tim HC.</span>
      </div>
    </footer>
  `,
})
export class KakiPortal {
  /** Tidak dipakai lagi: header dan footer peserta selalu selebar dashboard HC (logo sejajar). Dibiarkan agar templat lama tetap valid. */
  readonly lebar = input(false);
}
