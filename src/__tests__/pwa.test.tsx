import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { join } from 'path';
import { existsSync } from 'fs';

// Set up navigator mock before any imports that touch it
Object.defineProperty(globalThis, 'navigator', {
  value: {
    onLine: true,
    serviceWorker: {
      register: vi.fn().mockResolvedValue({}),
      ready: Promise.resolve({ active: { state: 'activated' } }),
    },
  },
  writable: true,
});

beforeEach(() => {
  // Reset to online between tests
  (globalThis.navigator as any).onLine = true;

  globalThis.navigator.serviceWorker = {
    register: vi.fn().mockResolvedValue({}),
    ready: Promise.resolve({ active: { state: 'activated' } }),
  } as any;

  globalThis.caches = {
    open: vi.fn(),
    match: vi.fn(),
    delete: vi.fn(),
  } as any;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PWA Offline Implementation', () => {
  it('renders offline page correctly', async () => {
    const OfflinePage = (await import('@/app/offline/page')).default;
    render(<OfflinePage />);
    expect(screen.getByText('Offline Mode')).toBeInTheDocument();
    // "Retry" is the actual label rendered by the page
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
  });

  it('isOffline() reflects navigator.onLine', async () => {
    const { isOffline } = await import('@/lib/pwa');
    expect(isOffline()).toBe(false);

    (globalThis.navigator as any).onLine = false;
    expect(isOffline()).toBe(true);
  });

  it('getSWStatus() returns registered when SW is active', async () => {
    const { getSWStatus } = await import('@/lib/pwa');
    expect(await getSWStatus()).toBe('registered');
  });

  it('registerSW() calls navigator.serviceWorker.register with /sw.js', async () => {
    const { registerSW } = await import('@/lib/pwa');
    await registerSW();
    expect(globalThis.navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
  });

  it('addOfflineListener fires callback on online/offline events', async () => {
    const { addOfflineListener } = await import('@/lib/pwa');
    const cb = vi.fn();
    addOfflineListener(cb);

    window.dispatchEvent(new Event('offline'));
    expect(cb).toHaveBeenCalledWith(false);

    window.dispatchEvent(new Event('online'));
    expect(cb).toHaveBeenCalledWith(true);
  });

  it('manifest icons exist in public folder', () => {
    const icons = ['icon-light-32x32.png', 'icon.svg', 'apple-touch-icon.png'];
    icons.forEach((icon) => {
      const iconPath = join(process.cwd(), 'public', icon);
      expect(existsSync(iconPath), `Missing PWA icon: ${icon}`).toBe(true);
    });
  });

  it('caches API can be opened and used', async () => {
    (globalThis.caches as any).open.mockResolvedValue({
      addAll: vi.fn(),
      match: vi.fn().mockResolvedValue(new Response('cached')),
      keys: vi.fn().mockResolvedValue([]),
    });

    const cache = await (globalThis.caches as any).open('stellar-static-v1');
    expect(cache.addAll).toBeDefined();
    const match = await cache.match('/');
    expect(match).toBeDefined();
  });
});
