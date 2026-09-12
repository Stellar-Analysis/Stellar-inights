import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';

/**
 * `useLocalStorage` – original tuple-return contract kept stable for
 * backwards compatibility with existing call sites (e.g. caching
 * collaboration session, monitor panels, ...). The new
 * `useStaleLocalStorage` hook below adds stale indicators + `invalidate`
 * for the issue #93 acceptance criteria without breaking this signature.
 */
function metaKey(key: string): string {
  return `${key}:__meta`;
}

interface StorageMeta {
  updatedAt: number;
}

function readMeta(key: string): StorageMeta | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(metaKey(key));
    return raw ? (JSON.parse(raw) as StorageMeta) : null;
  } catch (error) {
    logger.warn(`Error reading localStorage meta for key "${key}":`, error);
    return null;
  }
}

export interface LocalStorageCacheInfo {
  /** True once `ttlMs` has elapsed since the value was last written. Always false when `ttlMs` is not provided. */
  isStale: boolean;
  /** Timestamp (ms) the value was last written, or null if it has never been written by this hook. */
  lastUpdated: number | null;
  /** Clears the staleness metadata without touching the stored value, forcing `isStale` to report stale on next read. */
  invalidate: () => void;
}

export interface UseLocalStorageOptions {
  /** If set, `isStale` becomes true once this many milliseconds have elapsed since the last write. */
  ttlMs?: number;
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: UseLocalStorageOptions
): [T, (value: T | ((val: T) => T)) => void, () => void, LocalStorageCacheInfo] {
  // Get from local storage then parse stored json or return initialValue
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      logger.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const [lastUpdated, setLastUpdated] = useState<number | null>(() => readMeta(key)?.updatedAt ?? null);

  const writeMeta = useCallback((updatedAt: number | null) => {
    if (typeof window === 'undefined') {
      setLastUpdated(updatedAt);
      return;
    }

    if (updatedAt === null) {
      window.localStorage.removeItem(metaKey(key));
    } else {
      window.localStorage.setItem(metaKey(key), JSON.stringify({ updatedAt }));
    }

    setLastUpdated(updatedAt);
  }, [key]);

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      setStoredValue(prevValue => {
        // Allow value to be a function so we have the same API as useState
        const valueToStore = value instanceof Function ? value(prevValue) : value;

        // Save to local storage
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }

        return valueToStore;
      });
      writeMeta(Date.now());
    } catch (error) {
      logger.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, writeMeta]);

  // Remove from localStorage
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
      writeMeta(null);
    } catch (error) {
      logger.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue, writeMeta]);

  /** Marks the cached value stale without removing it, so callers can show stale data while refetching. */
  const invalidate = useCallback(() => {
    writeMeta(null);
  }, [writeMeta]);

  // Listen for changes to this key from other tabs/windows
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          logger.warn(`Error parsing localStorage change for key "${key}":`, error);
        }
      }

      if (e.key === metaKey(key)) {
        setLastUpdated(e.newValue ? (JSON.parse(e.newValue) as StorageMeta).updatedAt : null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  const ttlMs = options?.ttlMs;
  const isStale = ttlMs != null && (lastUpdated == null || Date.now() - lastUpdated > ttlMs);

  return [storedValue, setValue, removeValue, { isStale, lastUpdated, invalidate }];
}

// --------------------------------------------------------------------------
// Issue #93: cache invalidation + stale-indicator hook. This is the new
// surface; pre-existing callers stay on `useLocalStorage`.
//
// A parallel `:__meta__` entry stores the last-write timestamp so we can
// tell whether the cached value is older than `staleAfterMs` without
// touching the value itself.
// --------------------------------------------------------------------------

export interface UseStaleLocalStorageMetadata {
  updatedAt: string;
}

export interface UseStaleLocalStorageResult<T> {
  value: T;
  setValue: (value: T | ((val: T) => T)) => void;
  removeValue: () => void;
  /** True when the persisted value is older than `staleAfterMs`. */
  isStale: boolean;
  /** Force-clear the cached entry without resetting in-memory state. */
  invalidate: () => void;
  metadata: UseStaleLocalStorageMetadata;
}

const META_SUFFIX = ':__meta__';
const DEFAULT_STALE_AFTER_MS = 5 * 60 * 1000; // 5 minutes

function readMetadata(key: string): UseStaleLocalStorageMetadata | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(`${key}${META_SUFFIX}`);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as UseStaleLocalStorageMetadata;
    if (typeof parsed.updatedAt !== 'string') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeMetadata(key: string, metadata: UseStaleLocalStorageMetadata): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(`${key}${META_SUFFIX}`, JSON.stringify(metadata));
  } catch (error) {
    logger.warn(`Error writing localStorage metadata for "${key}":`, error);
  }
}

export function useStaleLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: { staleAfterMs?: number },
): UseStaleLocalStorageResult<T> {
  const staleAfterMs = options?.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;

  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      logger.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const [metadata, setMetadata] = useState<UseStaleLocalStorageMetadata>(
    () => readMetadata(key) ?? { updatedAt: new Date(0).toISOString() },
  );

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        setStoredValue(prevValue => {
          const valueToStore = value instanceof Function ? value(prevValue) : value;
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
            const nextMeta = { updatedAt: new Date().toISOString() };
            writeMetadata(key, nextMeta);
            setMetadata(nextMeta);
          }
          return valueToStore;
        });
      } catch (error) {
        logger.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key],
  );

  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
        window.localStorage.removeItem(`${key}${META_SUFFIX}`);
      }
      setMetadata({ updatedAt: new Date(0).toISOString() });
    } catch (error) {
      logger.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  const invalidate = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
        window.localStorage.removeItem(`${key}${META_SUFFIX}`);
      }
      setMetadata({ updatedAt: new Date(0).toISOString() });
    } catch (error) {
      logger.warn(`Error invalidating localStorage key "${key}":`, error);
    }
  }, [key]);

  useEffect(() => {
    const stored = readMetadata(key);
    setMetadata(stored ?? { updatedAt: new Date(0).toISOString() });
  }, [key]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue));
          const nextMeta = readMetadata(key);
          setMetadata(nextMeta ?? { updatedAt: new Date().toISOString() });
        } catch (error) {
          logger.warn(`Error parsing localStorage change for key "${key}":`, error);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  const isStale = (() => {
    const ageMs = Date.now() - new Date(metadata.updatedAt).getTime();
    if (Number.isNaN(ageMs)) {
      return true;
    }
    return ageMs > staleAfterMs;
  })();

  return { value: storedValue, setValue, removeValue, invalidate, isStale, metadata };
}
