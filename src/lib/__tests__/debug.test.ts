/**
 * Tests for the development-only debug helper module.
 *
 * Key invariants verified:
 * 1. All helpers return null in production (NODE_ENV !== "development").
 * 2. All helpers return non-null data in development.
 * 3. No secret or sensitive data leaks into the report.
 */

import {
  getNetworkState,
  getWebSocketHealth,
  getCacheStatus,
  getDebugReport,
  installDebugConsoleHelpers,
} from "@/lib/debug";


// ── Helpers ──────────────────────────────────────────────────────────────────

function setNodeEnv(env: string) {
  const original = process.env.NODE_ENV;
  // @ts-expect-error – overriding read-only in tests
  process.env.NODE_ENV = env;
  return () => {
    // @ts-expect-error
    process.env.NODE_ENV = original;
  };
}

function makeWebSocket(readyState: number, url = "ws://localhost:8080/ws"): WebSocket {
  return { readyState, url } as unknown as WebSocket;
}

// ── Production safety ─────────────────────────────────────────────────────────

describe("production safety — all helpers return null", () => {
  let restore: () => void;

  beforeEach(() => {
    restore = setNodeEnv("production");
  });

  afterEach(() => restore());

  it("getNetworkState returns null in production", () => {
    expect(getNetworkState()).toBeNull();
  });

  it("getWebSocketHealth returns null in production", () => {
    expect(getWebSocketHealth(makeWebSocket(1))).toBeNull();
  });

  it("getCacheStatus returns null in production", async () => {
    expect(await getCacheStatus()).toBeNull();
  });

  it("getDebugReport returns null in production", async () => {
    expect(await getDebugReport()).toBeNull();
  });

  it("installDebugConsoleHelpers does not attach to window in production", () => {
    const w = globalThis as unknown as Record<string, unknown>;
    delete w.__stellarDebug;
    installDebugConsoleHelpers();
    expect(w.__stellarDebug).toBeUndefined();
  });
});

// ── Development mode ──────────────────────────────────────────────────────────

describe("development mode — helpers return data", () => {
  let restore: () => void;

  beforeEach(() => {
    restore = setNodeEnv("development");
  });

  afterEach(() => restore());

  describe("getNetworkState()", () => {
    it("returns an object with at least an 'online' field", () => {
      const state = getNetworkState();
      expect(state).not.toBeNull();
      expect(typeof state!.online).toBe("boolean");
    });
  });

  describe("getWebSocketHealth()", () => {
    it("returns NO_INSTANCE when ws is null", () => {
      const health = getWebSocketHealth(null);
      expect(health).not.toBeNull();
      expect(health!.readyStateLabel).toBe("NO_INSTANCE");
      expect(health!.url).toBeNull();
    });

    it("labels readyState 0 as CONNECTING", () => {
      const health = getWebSocketHealth(makeWebSocket(0));
      expect(health!.readyStateLabel).toBe("CONNECTING");
    });

    it("labels readyState 1 as OPEN", () => {
      const health = getWebSocketHealth(makeWebSocket(1));
      expect(health!.readyStateLabel).toBe("OPEN");
    });

    it("labels readyState 2 as CLOSING", () => {
      const health = getWebSocketHealth(makeWebSocket(2));
      expect(health!.readyStateLabel).toBe("CLOSING");
    });

    it("labels readyState 3 as CLOSED", () => {
      const health = getWebSocketHealth(makeWebSocket(3));
      expect(health!.readyStateLabel).toBe("CLOSED");
    });

    it("includes the ws url", () => {
      const health = getWebSocketHealth(makeWebSocket(1, "ws://localhost:8080/ws"));
      expect(health!.url).toBe("ws://localhost:8080/ws");
    });
  });

  describe("getCacheStatus()", () => {
    it("returns a CacheStatus object", async () => {
      const status = await getCacheStatus();
      expect(status).not.toBeNull();
      expect(typeof status!.entries).toBe("number");
      expect(Array.isArray(status!.cacheNames)).toBe(true);
    });
  });

  describe("getDebugReport()", () => {
    it("returns a report with required top-level keys", async () => {
      const report = await getDebugReport();
      expect(report).not.toBeNull();
      expect(report).toHaveProperty("timestamp");
      expect(report).toHaveProperty("environment");
      expect(report).toHaveProperty("network");
      expect(report).toHaveProperty("cache");
    });

    it("does not contain secrets in string representation", async () => {
      const report = await getDebugReport();
      const serialized = JSON.stringify(report);
      // Basic check: no obvious secret patterns
      expect(serialized).not.toMatch(/S[A-Z2-7]{55}/); // Stellar secret key
      expect(serialized).not.toMatch(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/); // JWT
    });

    it("timestamp is a valid ISO string", async () => {
      const report = await getDebugReport();
      expect(() => new Date(report!.timestamp)).not.toThrow();
      expect(new Date(report!.timestamp).toISOString()).toBe(report!.timestamp);
    });
  });

  describe("installDebugConsoleHelpers()", () => {
    it("attaches __stellarDebug to window in development", () => {
      const w = globalThis as unknown as Record<string, unknown>;
      delete w.__stellarDebug;
      installDebugConsoleHelpers();
      expect(w.__stellarDebug).toBeDefined();
    });

    it("__stellarDebug.networkState is callable", () => {
      installDebugConsoleHelpers();
      const helpers = (globalThis as unknown as Record<string, Record<string, () => unknown>>).__stellarDebug;
      expect(typeof helpers.networkState).toBe("function");
    });
  });
});
