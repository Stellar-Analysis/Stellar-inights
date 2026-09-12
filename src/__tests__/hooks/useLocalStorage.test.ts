/**
 * Functional tests for the useLocalStorage hook.
 *
 * Covers: initial value, set, update via function, remove, and
 * cross-tab storage events.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// The test setup in setup.ts already provides a localStorage mock.
// We re-read it here so we can assert directly.
const storage = window.localStorage;

beforeEach(() => {
  storage.clear();
});

describe('useLocalStorage', () => {
  it('returns initialValue when key is not present', () => {
    const { result } = renderHook(() =>
      useLocalStorage('test-key', 'default'),
    );
    const [value] = result.current;
    expect(value).toBe('default');
  });

  it('reads an existing value from localStorage', () => {
    storage.setItem('existing-key', JSON.stringify('persisted'));
    const { result } = renderHook(() =>
      useLocalStorage('existing-key', 'fallback'),
    );
    const [value] = result.current;
    expect(value).toBe('persisted');
  });

  it('sets a new value and persists it to localStorage', () => {
    const { result } = renderHook(() =>
      useLocalStorage('count', 0),
    );
    const [, setCount] = result.current;

    act(() => {
      setCount(42);
    });

    const [newValue] = result.current;
    expect(newValue).toBe(42);
    expect(JSON.parse(storage.getItem('count') ?? 'null')).toBe(42);
  });

  it('supports functional update form', () => {
    const { result } = renderHook(() =>
      useLocalStorage('count', 10),
    );
    const [, setCount] = result.current;

    act(() => {
      setCount((prev) => prev + 5);
    });

    const [newValue] = result.current;
    expect(newValue).toBe(15);
  });

  it('removes the value and resets to initialValue', () => {
    storage.setItem('removable', JSON.stringify('something'));
    const { result } = renderHook(() =>
      useLocalStorage('removable', 'initial'),
    );

    const [, , removeValue] = result.current;
    act(() => {
      removeValue();
    });

    const [value] = result.current;
    expect(value).toBe('initial');
    expect(storage.getItem('removable')).toBeNull();
  });

  it('persists object values correctly', () => {
    const initial = { name: 'Alice', age: 30 };
    const { result } = renderHook(() =>
      useLocalStorage('user', initial),
    );
    const [, setUser] = result.current;

    act(() => {
      setUser({ name: 'Bob', age: 25 });
    });

    const [user] = result.current;
    expect(user).toEqual({ name: 'Bob', age: 25 });
  });

  it('persists array values correctly', () => {
    const { result } = renderHook(() =>
      useLocalStorage<string[]>('tags', []),
    );
    const [, setTags] = result.current;

    act(() => {
      setTags(['react', 'typescript']);
    });

    const [tags] = result.current;
    expect(tags).toEqual(['react', 'typescript']);
  });

  it('handles boolean values', () => {
    const { result } = renderHook(() =>
      useLocalStorage('flag', false),
    );
    const [, setFlag] = result.current;

    act(() => {
      setFlag(true);
    });

    const [flag] = result.current;
    expect(flag).toBe(true);
  });

  it('different keys are independent', () => {
    const { result: resultA } = renderHook(() =>
      useLocalStorage('key-a', 'a'),
    );
    const { result: resultB } = renderHook(() =>
      useLocalStorage('key-b', 'b'),
    );

    act(() => {
      const [, setA] = resultA.current;
      setA('new-a');
    });

    const [valueA] = resultA.current;
    const [valueB] = resultB.current;
    expect(valueA).toBe('new-a');
    expect(valueB).toBe('b');
  });

  it('updates state when a storage event fires from another tab', () => {
    const { result } = renderHook(() =>
      useLocalStorage('shared', 'original'),
    );

    act(() => {
      const event = new StorageEvent('storage', {
        key: 'shared',
        newValue: JSON.stringify('updated-from-other-tab'),
      });
      window.dispatchEvent(event);
    });

    const [value] = result.current;
    expect(value).toBe('updated-from-other-tab');
  });

  it('ignores storage events for different keys', () => {
    const { result } = renderHook(() =>
      useLocalStorage('myKey', 'original'),
    );

    act(() => {
      const event = new StorageEvent('storage', {
        key: 'otherKey',
        newValue: JSON.stringify('should-be-ignored'),
      });
      window.dispatchEvent(event);
    });

    const [value] = result.current;
    expect(value).toBe('original');
  });
});

describe('useLocalStorage - staleness & invalidation', () => {
  it('reports isStale as false when no ttlMs is configured', () => {
    const { result } = renderHook(() => useLocalStorage('no-ttl', 'value'));
    const [, , , info] = result.current;
    expect(info.isStale).toBe(false);
  });

  it('is stale before any value has ever been written, when a ttl is configured', () => {
    const { result } = renderHook(() =>
      useLocalStorage('never-written', 'default', { ttlMs: 1000 }),
    );
    const [, , , info] = result.current;
    expect(info.isStale).toBe(true);
    expect(info.lastUpdated).toBeNull();
  });

  it('is fresh immediately after a write, then stale once the ttl elapses', () => {
    const { result, rerender } = renderHook(() =>
      useLocalStorage('ttl-key', 'initial', { ttlMs: 1000 }),
    );

    act(() => {
      const [, setValue] = result.current;
      setValue('updated');
    });

    expect(result.current[3].isStale).toBe(false);
    expect(result.current[3].lastUpdated).not.toBeNull();

    const realNow = Date.now;
    Date.now = () => realNow() + 5000;
    try {
      rerender();
      expect(result.current[3].isStale).toBe(true);
    } finally {
      Date.now = realNow;
    }
  });

  it('invalidate() marks the value stale without clearing the stored value', () => {
    const { result } = renderHook(() =>
      useLocalStorage('invalidate-key', 'initial', { ttlMs: 60_000 }),
    );

    act(() => {
      const [, setValue] = result.current;
      setValue('persisted-value');
    });
    expect(result.current[3].isStale).toBe(false);

    act(() => {
      const [, , , info] = result.current;
      info.invalidate();
    });

    const [value, , , info] = result.current;
    expect(value).toBe('persisted-value');
    expect(info.isStale).toBe(true);
    expect(info.lastUpdated).toBeNull();
  });

  it('removeValue() also clears the staleness metadata', () => {
    const { result } = renderHook(() =>
      useLocalStorage('remove-with-meta', 'initial', { ttlMs: 60_000 }),
    );

    act(() => {
      const [, setValue] = result.current;
      setValue('something');
    });
    expect(result.current[3].lastUpdated).not.toBeNull();

    act(() => {
      const [, , removeValue] = result.current;
      removeValue();
    });

    expect(result.current[3].lastUpdated).toBeNull();
    expect(result.current[0]).toBe('initial');
  });
});
