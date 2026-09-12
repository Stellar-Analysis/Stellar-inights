/**
 * Functional tests for the `useStaleLocalStorage` hook (added for issue #93).
 *
 * Coverage:
 *   - Initial value fallback when localStorage is empty / metadata missing.
 *   - setValue writes the value AND a parallel `:__meta__` entry with an ISO timestamp.
 *   - `isStale` reflects whether the persistence age exceeds `staleAfterMs`
 *     (default 5 minutes, overridable via options).
 *   - `removeValue` clears both keys and resets in-memory + metadata state.
 *   - `invalidate` clears localStorage but PRESERVES the in-memory value
 *     (so consumers can keep using the last-known data while forcing a
 *     refetch on the next read).
 *   - `metadata` reflects the persisted `updatedAt` after re-mount.
 *   - Cross-tab `storage` events that touch the value key also refresh
 *     `metadata` (parity with cross-tab invalidation).
 *   - Distinct keys stay independent.
 *   - Corrupted JSON in the metadata slot is tolerated (treated as missing).
 *
 * The repo-wide `frontend/src/__tests__/setup.ts` already provides a
 * `window.localStorage` mock — we reuse it directly here.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStaleLocalStorage } from '@/hooks/useLocalStorage';

const storage = window.localStorage;
const META_SUFFIX = ':__meta__';

beforeEach(() => {
  storage.clear();
  // Use a deterministic clock so `isStale` comparisons are stable.
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useStaleLocalStorage', () => {
  it('returns initialValue when localStorage has no entry', () => {
    const { result } = renderHook(() =>
      useStaleLocalStorage('fresh', { hello: 'world' }),
    );
    expect(result.current.value).toEqual({ hello: 'world' });
    // No prior writes => metadata anchor is the Unix epoch, so isStale = true
    // (the cache has effectively never been populated).
    expect(result.current.isStale).toBe(true);
    expect(result.current.metadata.updatedAt).toBe('1970-01-01T00:00:00.000Z');
  });

  it('reads existing value and metadata from localStorage', () => {
    const writtenAt = new Date('2025-12-31T23:59:00.000Z').toISOString();
    storage.setItem('existing', JSON.stringify(123));
    storage.setItem(
      `existing${META_SUFFIX}`,
      JSON.stringify({ updatedAt: writtenAt }),
    );

    const { result } = renderHook(() =>
      useStaleLocalStorage('existing', 0),
    );

    expect(result.current.value).toBe(123);
    expect(result.current.metadata.updatedAt).toBe(writtenAt);
    // Now is 2026-01-01T00:00:00.000Z => 1 minute old => within 5min default.
    expect(result.current.isStale).toBe(false);
  });

  it('writes both value and metadata on setValue, with a fresh timestamp', () => {
    const { result } = renderHook(() =>
      useStaleLocalStorage<string[]>('tags', []),
    );
    const { setValue } = result.current;

    act(() => {
      setValue(['a', 'b']);
    });

    expect(storage.getItem('tags')).toBe(JSON.stringify(['a', 'b']));
    const storedMeta = JSON.parse(
      storage.getItem(`tags${META_SUFFIX}`) ?? '{}',
    );
    expect(storedMeta.updatedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(result.current.value).toEqual(['a', 'b']);
    // Just-written => not stale.
    expect(result.current.isStale).toBe(false);
  });

  it('reports isStale = true once the cached age exceeds staleAfterMs', () => {
    const writtenAt = new Date('2025-12-31T23:50:00.000Z').toISOString(); // 10 min ago
    storage.setItem('aging', JSON.stringify('payload'));
    storage.setItem(
      `aging${META_SUFFIX}`,
      JSON.stringify({ updatedAt: writtenAt }),
    );

    const { result } = renderHook(() =>
      useStaleLocalStorage('aging', 'default', { staleAfterMs: 5 * 60 * 1000 }),
    );

    expect(result.current.value).toBe('payload');
    expect(result.current.isStale).toBe(true);
  });

  it('honours a custom staleAfterMs threshold', () => {
    const writtenAt = new Date('2025-12-31T23:59:30.000Z').toISOString(); // 30s ago
    storage.setItem('custom', JSON.stringify('payload'));
    storage.setItem(
      `custom${META_SUFFIX}`,
      JSON.stringify({ updatedAt: writtenAt }),
    );

    const { result } = renderHook(() =>
      useStaleLocalStorage('custom', 'fallback', { staleAfterMs: 5_000 }),
    );

    expect(result.current.isStale).toBe(true);
  });

  it('removeValue removes both keys and resets in-memory + metadata state', () => {
    storage.setItem('removable', JSON.stringify('something'));
    storage.setItem(
      `removable${META_SUFFIX}`,
      JSON.stringify({ updatedAt: new Date().toISOString() }),
    );

    const { result } = renderHook(() =>
      useStaleLocalStorage('removable', 'fallback'),
    );
    expect(result.current.value).toBe('something');

    act(() => {
      result.current.removeValue();
    });

    expect(storage.getItem('removable')).toBeNull();
    expect(storage.getItem(`removable${META_SUFFIX}`)).toBeNull();
    expect(result.current.value).toBe('fallback');
    expect(result.current.metadata.updatedAt).toBe('1970-01-01T00:00:00.000Z');
    // No prior write because storage was wiped => cached "age" is the epoch.
    expect(result.current.isStale).toBe(true);
  });

  it('invalidate wipes localStorage WITHOUT resetting in-memory value', () => {
    const writtenAt = new Date('2025-12-31T23:59:00.000Z').toISOString();
    storage.setItem('cache', JSON.stringify({ ok: true }));
    storage.setItem(
      `cache${META_SUFFIX}`,
      JSON.stringify({ updatedAt: writtenAt }),
    );

    const { result } = renderHook(() =>
      useStaleLocalStorage('cache', { ok: false }),
    );
    expect(result.current.value).toEqual({ ok: true });

    act(() => {
      result.current.invalidate();
    });

    // Storage is cleared.
    expect(storage.getItem('cache')).toBeNull();
    expect(storage.getItem(`cache${META_SUFFIX}`)).toBeNull();
    // But the in-memory slice stays as-is — consumers keep showing last-known
    // value while they trigger a refetch.
    expect(result.current.value).toEqual({ ok: true });
    // Metadata is anchored to the epoch, so the next render sees `isStale`.
    expect(result.current.isStale).toBe(true);
  });

  it('refreshes metadata when the value key changes via a storage event', () => {
    storage.setItem('shared', JSON.stringify('original'));
    // Metadata still absent.
    const { result } = renderHook(() =>
      useStaleLocalStorage('shared', 'fallback'),
    );
    expect(result.current.isStale).toBe(true);

    act(() => {
      storage.setItem(
        `shared${META_SUFFIX}`,
        JSON.stringify({ updatedAt: new Date().toISOString() }),
      );
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'shared',
          newValue: JSON.stringify('from-other-tab'),
        }),
      );
    });

    expect(result.current.value).toBe('from-other-tab');
    expect(result.current.isStale).toBe(false);
  });

  it('different keys stay independent when setValue is called', () => {
    const { result: a } = renderHook(() =>
      useStaleLocalStorage('a-key', 'a-default'),
    );
    const { result: b } = renderHook(() =>
      useStaleLocalStorage('b-key', 'b-default'),
    );

    act(() => {
      a.current.setValue('a-new');
    });

    expect(a.current.value).toBe('a-new');
    expect(b.current.value).toBe('b-default');
    expect(storage.getItem('a-key')).toBe(JSON.stringify('a-new'));
    expect(storage.getItem('b-key')).toBeNull();
    expect(storage.getItem(`a-key${META_SUFFIX}`)).not.toBeNull();
    expect(storage.getItem(`b-key${META_SUFFIX}`)).toBeNull();
  });

  it('tolerates corrupted metadata JSON without throwing', () => {
    storage.setItem('broken', JSON.stringify(7));
    storage.setItem(`broken${META_SUFFIX}`, 'not-json-at-all{{');

    const { result } = renderHook(() =>
      useStaleLocalStorage('broken', 0),
    );

    expect(result.current.value).toBe(7);
    // Falls back to the epoch anchor => stale.
    expect(result.current.isStale).toBe(true);
    expect(result.current.metadata.updatedAt).toBe('1970-01-01T00:00:00.000Z');
  });

  it('tolerates metadata JSON missing the updatedAt field', () => {
    storage.setItem('partial', JSON.stringify('payload'));
    storage.setItem(`partial${META_SUFFIX}`, JSON.stringify({}));

    const { result } = renderHook(() =>
      useStaleLocalStorage('partial', 'fallback'),
    );

    expect(result.current.value).toBe('payload');
    expect(result.current.metadata.updatedAt).toBe('1970-01-01T00:00:00.000Z');
    expect(result.current.isStale).toBe(true);
  });
});
