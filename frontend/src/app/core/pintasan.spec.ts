import { tujuanPintasan } from './pintasan';

function tekan(
  key: string,
  opsi: KeyboardEventInit = {},
  target: HTMLElement = document.body,
): string | null {
  let hasil: string | null = null;
  const dengar = (e: KeyboardEvent) => {
    hasil = tujuanPintasan(e);
  };
  document.addEventListener('keydown', dengar);
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...opsi }));
  document.removeEventListener('keydown', dengar);
  return hasil;
}

describe('pintasan layar awal', () => {
  it('huruf besar dan kecil sama saja', () => {
    expect(tekan('p')).toBe('/operator');
    expect(tekan('P', { shiftKey: true })).toBe('/operator');
    expect(tekan('o')).toBe('/belum-tersedia');
    expect(tekan('O', { shiftKey: true })).toBe('/belum-tersedia');
  });

  it('tombol lain diabaikan', () => {
    for (const key of ['x', '1', 'Enter', ' ', 'Escape', 'Tab', 'PageUp', 'constructor', '']) {
      expect(tekan(key)).toBeNull();
    }
  });

  it('Ctrl, Cmd, Alt, dan tombol ditahan diabaikan', () => {
    for (const opsi of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { repeat: true }]) {
      expect(tekan('p', opsi)).toBeNull();
      expect(tekan('o', opsi)).toBeNull();
    }
  });

  it('fokus di isian diabaikan', () => {
    for (const tag of ['input', 'textarea', 'select', 'div']) {
      const el = document.createElement(tag);
      if (tag === 'div') el.setAttribute('contenteditable', 'true');
      document.body.append(el);
      expect(tekan('p', {}, el)).toBeNull();
      expect(tekan('O', {}, el)).toBeNull();
      el.remove();
    }
  });
});
