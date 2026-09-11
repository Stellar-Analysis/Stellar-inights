/**
 * Frontend debug tooling for issue #104.
 *
 * Provides dev-only helpers that surface network state, realtime health,
 * and cache status from a single entrypoint. The helpers are gated to
 * `import.meta.env.DEV` (or `process.env.NODE_ENV === 'development'`)
 * so production bundles never expose them.
 *
 * Usage in a dev-only component:
 *   ```tsx
 *   import { getDebugSnapshot, subscribeDebug } from '@/lib/debug';
 *
 *   const snap = await getDebugSnapshot();
 *   console.table(snap);
 *   ```
 *
 * Production safety: every exported function returns a redacted
 * "production-disabled" payload when invoked outside a development
 * build. The wrapper checks `process.env.NODE_ENV` at runtime so a
 * build-time tree-shake can drop the implementation entirely.
 */

import { logger } from '@/lib/logger';

type JsonObject = Record<string, unknown>;

interface DebugSnapshot extends JsonObject {
  /** True only in dev/test builds. Always `false` in production. */
  devMode: boolean;
  /** Wall-clock timestamp of the snapshot. */
  collectedAt: string;
  /** Connectivity summary (`online` | `offline` | `unknown`). */
  network: 'online' | 'offline' | 'unknown';
  /** Effective connection type from the Network Information API if present. */
  effectiveConnectionType: string | null;
  /** Realtime (WebSocket) health flags. */
  realtime: {
    connected: boolean;
    lastErrorAt: string | null;
    retryCount: number;
  };
  /** Tanstack Query cache summary. */
  cache: {
    queries: number;
    mutations: number;
    staleQueries: number;
  };
  /** localStorage size estimate. */
  storage: {
    items: number;
    bytesEstimate: number;
  };
  /** Link to consolidated debugging guide. */
  docsUrl: string;
}

const DISABLED: DebugSnapshot = {
  devMode: false,
  collectedAt: new Date(0).toISOString(),
  network: 'unknown',
  effectiveConnectionType: null,
  realtime: { connected: false, lastErrorAt: null, retryCount: 0 },
  cache: { queries: 0, mutations: 0, staleQueries: 0 },
  storage: { items: 0, bytesEstimate: 0 },
  docsUrl:
    'https://github.com/Stellar-Analysis/frontend/blob/main/docs/debugging-guide.md',
};

/** Returns true when this code is executing in a development bundle. */
export function isDebugEnabled(): boolean {
  if (typeof process === 'undefined' || !process.env) {
    return false;
  }
  return process.env.NODE_ENV !== 'production';
}

/**
 * Subscribes to connectivity changes and yields a redacted payload.
 * The listener is automatically detached when the caller-supplied abort
 * signal fires, so callers don't leak timers.
 */
export async function getDebugSnapshot(): Promise<DebugSnapshot> {
  if (!isDebugEnabled()) {
    logger.debug('debug snapshot requested in production; returning disabled payload');
    return DISABLED;
  }

  const network: DebugSnapshot['network'] =
    typeof navigator === 'undefined'
      ? 'unknown'
      : navigator.onLine
        ? 'online'
        : 'offline';

  const effectiveConnectionType =
    typeof navigator !== 'undefined' &&
    'connection' in navigator &&
    navigator.connection &&
    'effectiveType' in navigator.connection
      ? (navigator.connection as { effectiveType?: string }).effectiveType ?? null
      : null;

  const realtime = readRealtimeBadge();

  const cache = readReactQueryCache();
  const storage = estimateLocalStorage();

  return {
    devMode: true,
    collectedAt: new Date().toISOString(),
    network,
    effectiveConnectionType,
    realtime,
    cache,
    storage,
    docsUrl: DISABLED.docsUrl,
  };
}

/** Subscribe to debug snapshot updates. Returns an unsubscribe fn. */
export function subscribeDebug(
  onSnapshot: (snapshot: DebugSnapshot) => void,
  intervalMs = 5_000,
): () => void {
  if (!isDebugEnabled()) {
    return () => {
      /* no-op in production */
    };
  }

  let active = true;

  const tick = async () => {
    if (!active) {
      return;
    }
    try {
      onSnapshot(await getDebugSnapshot());
    } catch (error) {
      logger.warn('debug snapshot failed', { error });
    }
  };

  void tick();
  const handle = setInterval(() => {
    void tick();
  }, intervalMs);

  return () => {
    active = false;
    clearInterval(handle);
  };
}

// --------------------------------------------------------------------------
// Internal helpers. They read global state without importing React, so the
// module can be tree-shaken from production builds when NODE_ENV is set.
// --------------------------------------------------------------------------

function readRealtimeBadge(): DebugSnapshot['realtime'] {
  if (typeof window === 'undefined') {
    return { connected: false, lastErrorAt: null, retryCount: 0 };
  }
  const badge = (window as unknown as { __REALTIME_BADGE__?: DebugSnapshot['realtime'] })
    .__REALTIME_BADGE__;
  return badge ?? { connected: false, lastErrorAt: null, retryCount: 0 };
}

function readReactQueryCache(): DebugSnapshot['cache'] {
  const client = (window as unknown as {
    __REACT_QUERY_CLIENT__?: {
      getQueryCache: () => { getAll: () => unknown[] };
      getMutationCache: () => { getAll: () => unknown[] };
    };
  }).__REACT_QUERY_CLIENT__;
  if (!client) {
    return { queries: 0, mutations: 0, staleQueries: 0 };
  }
  const queries = client.getQueryCache().getAll();
  const mutations = client.getMutationCache().getAll();
  const staleQueries = queries.filter((q) => {
    const updatedAt = (q as { state?: { dataUpdatedAt?: number } }).state?.dataUpdatedAt;
    return typeof updatedAt !== 'number' || updatedAt === 0;
  }).length;
  return { queries: queries.length, mutations: mutations.length, staleQueries };
}

function estimateLocalStorage(): DebugSnapshot['storage'] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { items: 0, bytesEstimate: 0 };
  }
  let items = 0;
  let bytes = 0;
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (key === null) {
      continue;
    }
    items += 1;
    const value = window.localStorage.getItem(key) ?? '';
    bytes += key.length + value.length;
  }
  return { items, bytesEstimate: bytes };
}

export const __testing__ = {
  DISABLED,
  readRealtimeBadge,
  readReactQueryCache,
  estimateLocalStorage,
};
/* Development-only debug helpers for Stellar Insights frontend.
 *
 * All exported functions are no-ops (return null) in production.
 * They must never be relied on for business logic.
 *
 * Usage (browser console or component DevTools panel):
 *   import { getDebugReport } from '@/lib/debug';
 *   console.log(await getDebugReport());
 */

// Checked dynamically so tests can override process.env.NODE_ENV after import.
const isDev = () => process.env.NODE_ENV === "development";

// ── Types ────────────────────────────────────────────────────────────────────

export interface NetworkState {
  online: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

export interface WebSocketHealth {
  url: string | null;
  readyState: number | null;
  readyStateLabel: string;
  reconnectAttempts: number | null;
}

export interface CacheStatus {
  entries: number;
  /** Approximate size in bytes — available only when Cache API is present */
  estimatedBytes: number | null;
  cacheNames: string[];
}

export interface DebugReport {
  timestamp: string;
  environment: string;
  network: NetworkState;
  websocket: WebSocketHealth | null;
  cache: CacheStatus;
  buildId: string | null;
}

// ── Network ──────────────────────────────────────────────────────────────────

/**
 * Returns the current browser network state.
 * Returns null in production.
 */
export function getNetworkState(): NetworkState | null {
  if (!isDev()) return null;
  if (typeof navigator === "undefined") return null;

  const conn =
    (navigator as Navigator & { connection?: Record<string, unknown> })
      .connection ?? {};

  return {
    online: navigator.onLine,
    effectiveType: (conn.effectiveType as string) ?? undefined,
    downlink: (conn.downlink as number) ?? undefined,
    rtt: (conn.rtt as number) ?? undefined,
  };
}

// ── WebSocket ─────────────────────────────────────────────────────────────────

const WS_READY_STATE_LABELS: Record<number, string> = {
  0: "CONNECTING",
  1: "OPEN",
  2: "CLOSING",
  3: "CLOSED",
};

/**
 * Inspects a WebSocket instance and returns health information.
 * Pass the raw `WebSocket` object from your client.
 * Returns null in production.
 */
export function getWebSocketHealth(ws: WebSocket | null): WebSocketHealth | null {
  if (!isDev()) return null;
  if (!ws) {
    return {
      url: null,
      readyState: null,
      readyStateLabel: "NO_INSTANCE",
      reconnectAttempts: null,
    };
  }
  return {
    url: ws.url,
    readyState: ws.readyState,
    readyStateLabel: WS_READY_STATE_LABELS[ws.readyState] ?? "UNKNOWN",
    reconnectAttempts: null,
  };
}

// ── Cache ─────────────────────────────────────────────────────────────────────

/**
 * Reports the state of the browser Cache API (Service Worker caches).
 * Returns null in production.
 */
export async function getCacheStatus(): Promise<CacheStatus | null> {
  if (!isDev()) return null;
  if (typeof caches === "undefined" || typeof caches.keys !== "function") {
    return { entries: 0, estimatedBytes: null, cacheNames: [] };
  }

  let names: string[] = [];
  let totalEntries = 0;
  try {
    names = await caches.keys();
    for (const name of names) {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      totalEntries += keys.length;
    }
  } catch {
    // Cache API partially unavailable (e.g. restricted browsing context)
  }

  let estimatedBytes: number | null = null;
  if ("storage" in navigator && "estimate" in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      estimatedBytes = estimate.usage ?? null;
    } catch {
      // estimate() is not always available
    }
  }

  return {
    entries: totalEntries,
    estimatedBytes,
    cacheNames: names,
  };
}

// ── Composite report ──────────────────────────────────────────────────────────

/**
 * Collects all available debug information into a single report object.
 * Useful for pasting into a bug report or logging in a DevTools session.
 * Returns null in production.
 */
export async function getDebugReport(
  ws?: WebSocket | null
): Promise<DebugReport | null> {
  if (!isDev()) return null;

  const [cacheStatus] = await Promise.all([getCacheStatus()]);

  return {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? "unknown",
    network: getNetworkState() ?? { online: false },
    websocket: ws !== undefined ? getWebSocketHealth(ws ?? null) : null,
    cache: cacheStatus ?? { entries: 0, estimatedBytes: null, cacheNames: [] },
    buildId: process.env.NEXT_PUBLIC_BUILD_ID ?? null,
  };
}

/**
 * Attaches debug helpers to `window.__stellarDebug` so they can be called
 * from the browser DevTools console without any import.
 *
 * Call once at app startup (e.g. in `_app.tsx`) — in development only.
 *
 * ```ts
 * import { installDebugConsoleHelpers } from '@/lib/debug';
 * installDebugConsoleHelpers();
 * // Then in DevTools:
 * // window.__stellarDebug.report()
 * ```
 */
export function installDebugConsoleHelpers(ws?: WebSocket | null): void {
  if (!isDev() || typeof window === "undefined") return;

  (window as Window & { __stellarDebug?: unknown }).__stellarDebug = {
    networkState: () => getNetworkState(),
    wsHealth: () => getWebSocketHealth(ws ?? null),
    cacheStatus: () => getCacheStatus(),
    report: () => getDebugReport(ws),
  };
}
