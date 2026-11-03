import { Component } from '@angular/core';

/** Footer netral, tanpa nama atau logo perusahaan. */
@Component({
  selector: 'app-kaki-portal',
  template: `
    <footer class="kaki">
      <div class="wadah kaki-isi">
        <span>Portal Psikotes</span>
        <span>Kendala saat tes? Hubungi tim HC.</span>
      </div>
    </footer>
  `,
})
export class KakiPortal {}
