/** Satu-satunya pemetaan navigasi layar awal. Hanya navigasi, bukan pembatas akses. */
const TUJUAN: Readonly<Record<string, string>> = {
  p: '/operator',
  o: '/belum-tersedia',
};

function sedangMengisi(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) ||
    target.isContentEditable ||
    target.closest('[contenteditable]:not([contenteditable="false"])') !== null
  );
}

/** Route tujuan, atau null bila penekanan tombol harus diabaikan. */
export function tujuanPintasan(e: KeyboardEvent): string | null {
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || sedangMengisi(e.target)) return null;
  // e.key bisa kosong pada event buatan peramban (mis. isi otomatis).
  const tombol = (e.key ?? '').toLowerCase();
  return Object.hasOwn(TUJUAN, tombol) ? TUJUAN[tombol] : null;
}
