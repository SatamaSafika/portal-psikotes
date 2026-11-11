import { Component, computed, input } from '@angular/core';

/** Inisial dua huruf dari nama (kata pertama dan kedua). Kosong menjadi "?". */
export function inisial(nama: string | null | undefined): string {
  const kata = (nama ?? '').trim().split(/\s+/).filter((k) => /\p{L}|\p{N}/u.test(k));
  if (kata.length === 0) return '?';
  const huruf = (k: string) => [...k].find((c) => /\p{L}|\p{N}/u.test(c)) ?? '';
  return (huruf(kata[0]) + (kata.length > 1 ? huruf(kata[1]) : '')).toLocaleUpperCase('id');
}

/** Avatar inisial lingkaran 36 px di tabel HC. Dekoratif: nama lengkap selalu tampil di sebelahnya. */
@Component({
  selector: 'app-avatar',
  host: { class: 'avatar', 'aria-hidden': 'true' },
  template: `{{ teks() }}`,
})
export class Avatar {
  readonly nama = input<string | null>(null);
  protected readonly teks = computed(() => inisial(this.nama()));
}
