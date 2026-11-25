import { Location } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';

describe('layar awal dan route peserta', () => {
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    harness = await RouterTestingHarness.create('/');
  });

  // Navigasi antarhalaman ini tidak boleh memanggil backend.
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  const akar = (): HTMLElement => harness.fixture.nativeElement;
  const ada = (selektor: string): boolean => akar().querySelector(selektor) !== null;
  const url = (): string => TestBed.inject(Router).url;

  async function tekan(
    key: string,
    opsi: KeyboardEventInit = {},
    target: HTMLElement = document.body,
  ): Promise<string> {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...opsi }));
    await harness.fixture.whenStable();
    return url();
  }

  it('hanya menampilkan judul, tanpa tombol, tautan, atau daftar', () => {
    expect(akar().textContent?.trim()).toBe('Portal Psikotes');
    expect(ada('a, button, input, li, [title], [aria-label]')).toBe(false);
  });

  it.each(['p', 'P'])('%s ke /operator', async (key) => {
    expect(await tekan(key)).toBe('/operator');
    expect(ada('app-pilih-tes')).toBe(true);
  });

  it.each(['o', 'O'])('%s ke /belum-tersedia', async (key) => {
    expect(await tekan(key)).toBe('/belum-tersedia');
    expect(ada('app-belum-tersedia')).toBe(true);
  });

  it('tombol lain, Ctrl+P, Alt+O, Cmd+P, dan tombol ditahan tidak berpindah', async () => {
    for (const key of ['x', 'Enter', ' ', '1']) expect(await tekan(key)).toBe('/');
    expect(await tekan('p', { ctrlKey: true })).toBe('/');
    expect(await tekan('o', { altKey: true })).toBe('/');
    expect(await tekan('p', { metaKey: true })).toBe('/');
    expect(await tekan('p', { repeat: true })).toBe('/');
  });

  it('input yang sedang fokus diabaikan', async () => {
    const input = document.createElement('input');
    document.body.append(input);
    input.focus();
    expect(await tekan('p', {}, input)).toBe('/');
    input.remove();
  });

  it('memakai push: Back kembali ke layar awal', async () => {
    const router = TestBed.inject(Router);
    router.setUpLocationChangeListener();
    await tekan('p');
    TestBed.inject(Location).back();
    await vi.waitFor(() => expect(url()).toBe('/'));
    await harness.fixture.whenStable();
    expect(ada('app-landing')).toBe(true);
  });

  it('tidak aktif di halaman lain', async () => {
    await harness.navigateByUrl('/operator');
    expect(await tekan('o')).toBe('/operator');
    await harness.navigateByUrl('/belum-tersedia');
    expect(await tekan('p')).toBe('/belum-tersedia');
  });

  it('tombol Kembali di /belum-tersedia menuju layar awal', async () => {
    await harness.navigateByUrl('/belum-tersedia');
    expect(akar().querySelector('a')?.getAttribute('href')).toBe('/');
  });

  it('/operator tidak menautkan ke layar awal, dan penanda Selesai tetap tampil', async () => {
    sessionStorage.setItem('psikotes_tes_selesai', '["KORAN"]');
    await harness.navigateByUrl('/operator');
    const tautan = [...akar().querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(tautan).toEqual(['/masuk/TIU5', '/masuk/TIU6']);
    expect(akar().querySelectorAll('.ubin-tes.sudah').length).toBe(1);
  });

  it('tautan undangan lama /masuk dan jenis tes tak dikenal ke /operator', async () => {
    await harness.navigateByUrl('/masuk');
    expect(url()).toBe('/operator');
    await harness.navigateByUrl('/masuk/LAIN');
    await vi.waitFor(() => expect(url()).toBe('/operator'));
  });

  it('halaman selesai kembali ke /operator; alamat tak dikenal ke layar awal', async () => {
    await harness.navigateByUrl('/selesai');
    expect(akar().querySelector('a')?.getAttribute('href')).toBe('/operator');
    await harness.navigateByUrl('/tidak-ada');
    expect(url()).toBe('/');
  });

  it('halaman tes tanpa sesi kembali ke /operator', async () => {
    const pindah = harness.navigateByUrl('/tes/instruksi');
    const http = TestBed.inject(HttpTestingController);
    const permintaan = await vi.waitFor(() => http.expectOne('/api/peserta/saya'));
    permintaan.flush(null, { status: 401, statusText: 'Unauthorized' });
    await pindah;
    expect(url()).toBe('/operator');
  });
});
