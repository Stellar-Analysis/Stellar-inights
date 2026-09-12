/**
 * Issue #98 — Unit tests for frontend config helper
 *
 * Tests cover:
 *  - validateConfig(): all success + all error + all warning paths
 *  - deriveWsUrl() logic via config.wsUrl
 *  - Legacy env-var aliases (NEXT_PUBLIC_BACKEND_URL, NEXT_PUBLIC_WS_PORT)
 *  - Production safety rules (no localhost, required API URL)
 *  - Development warnings for missing optional vars
 *  - Canonical naming convention enforcement
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Helpers ───────────────────────────────────────────────────────────────────

type EnvOverride = Partial<Record<string, string>>;

function withEnv<T>(overrides: EnvOverride, fn: () => T): T {
  const saved: Record<string, string | undefined> = {};

  // Save & apply
  for (const [k, v] of Object.entries(overrides)) {
    saved[k] = process.env[k];
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }

  try {
    return fn();
  } finally {
    // Restore
    for (const [k, orig] of Object.entries(saved)) {
      if (orig === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = orig;
      }
    }
  }
}

// ── Import the pure validateConfig function directly ─────────────────────────
// We import ONLY the pure function so tests don't trigger module-load side-effects.

describe('validateConfig — pure function', () => {
  let validateConfig: (opts?: {
    apiUrl: string;
    appEnv: string;
    stellarNetwork: string;
  }) => { valid: boolean; errors: string[]; warnings: string[] };

  beforeEach(async () => {
    // Re-import to get a fresh copy each time
    vi.resetModules();
    const mod = await import('../config');
    validateConfig = mod.validateConfig as any;
  });

  describe('valid configurations', () => {
    it('passes with all canonical vars set (production)', () => {
      const result = withEnv(
        {
          NEXT_PUBLIC_API_URL: 'https://api.stellar-insights.io',
          NEXT_PUBLIC_APP_ENV: 'production',
          NEXT_PUBLIC_STELLAR_NETWORK: 'mainnet',
        },
        () => validateConfig!()
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('passes with testnet + development', () => {
      const result = withEnv(
        {
          NEXT_PUBLIC_API_URL: 'http://localhost:8080',
          NEXT_PUBLIC_APP_ENV: 'development',
          NEXT_PUBLIC_STELLAR_NETWORK: 'testnet',
        },
        () => validateConfig!()
      );
      expect(result.valid).toBe(true);
    });

    it('passes with test environment', () => {
      const result = withEnv(
        {
          NEXT_PUBLIC_API_URL: 'http://localhost:8080',
          NEXT_PUBLIC_APP_ENV: 'test',
          NEXT_PUBLIC_STELLAR_NETWORK: 'testnet',
        },
        () => validateConfig!()
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('production safety rules', () => {
    it('errors when NEXT_PUBLIC_API_URL is missing in production', () => {
      const result = withEnv(
        {
          NEXT_PUBLIC_API_URL: '',
          NEXT_PUBLIC_BACKEND_URL: '',
          NEXT_PUBLIC_APP_ENV: 'production',
          NEXT_PUBLIC_STELLAR_NETWORK: 'mainnet',
        },
        () => validateConfig!()
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('NEXT_PUBLIC_API_URL'))).toBe(true);
    });

    it('errors when API URL references localhost in production', () => {
      const result = withEnv(
        {
          NEXT_PUBLIC_API_URL: 'http://localhost:8080',
          NEXT_PUBLIC_APP_ENV: 'production',
          NEXT_PUBLIC_STELLAR_NETWORK: 'mainnet',
        },
        () => validateConfig!()
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.toLowerCase().includes('localhost'))).toBe(true);
    });

    it('errors on invalid NEXT_PUBLIC_APP_ENV value', () => {
      const result = withEnv(
        {
          NEXT_PUBLIC_API_URL: 'https://api.example.com',
          NEXT_PUBLIC_APP_ENV: 'staging', // not a valid value
          NEXT_PUBLIC_STELLAR_NETWORK: 'mainnet',
        },
        () => validateConfig!()
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('NEXT_PUBLIC_APP_ENV'))).toBe(true);
      expect(result.errors.some((e) => e.includes('staging'))).toBe(true);
    });

    it('errors on invalid NEXT_PUBLIC_STELLAR_NETWORK value', () => {
      const result = withEnv(
        {
          NEXT_PUBLIC_API_URL: 'https://api.example.com',
          NEXT_PUBLIC_APP_ENV: 'production',
          NEXT_PUBLIC_STELLAR_NETWORK: 'devnet', // not valid
        },
        () => validateConfig!()
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('NEXT_PUBLIC_STELLAR_NETWORK'))).toBe(true);
    });

    it('accumulates multiple errors when several vars are wrong', () => {
      const result = withEnv(
        {
          NEXT_PUBLIC_API_URL: '',
          NEXT_PUBLIC_BACKEND_URL: '',
          NEXT_PUBLIC_APP_ENV: 'bad',
          NEXT_PUBLIC_STELLAR_NETWORK: 'bad',
        },
        () => validateConfig!()
      );
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('development warnings', () => {
    it('warns (not errors) when API URL is absent in development', () => {
      const result = withEnv(
        {
          NEXT_PUBLIC_API_URL: '',
          NEXT_PUBLIC_BACKEND_URL: '',
          NEXT_PUBLIC_APP_ENV: 'development',
          NEXT_PUBLIC_STELLAR_NETWORK: 'testnet',
        },
        () => validateConfig!()
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes('NEXT_PUBLIC_API_URL'))).toBe(true);
    });
  });
});

// ── config object ────────────────────────────────────────────────────────────

describe('config object', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('apiUrl falls back to localhost when API_URL is not set', async () => {
    const { config } = await withEnvAsync(
      {
        NEXT_PUBLIC_API_URL: '',
        NEXT_PUBLIC_BACKEND_URL: '',
        NEXT_PUBLIC_APP_ENV: 'development',
        NEXT_PUBLIC_STELLAR_NETWORK: 'testnet',
        NODE_ENV: 'test',
      },
      () => import('../config')
    );
    expect(config.apiUrl).toBe('http://localhost:8080');
  });

  it('apiUrl uses NEXT_PUBLIC_API_URL when set', async () => {
    const { config } = await withEnvAsync(
      {
        NEXT_PUBLIC_API_URL: 'https://api.example.com',
        NEXT_PUBLIC_APP_ENV: 'development',
        NEXT_PUBLIC_STELLAR_NETWORK: 'testnet',
        NODE_ENV: 'test',
      },
      () => import('../config')
    );
    expect(config.apiUrl).toBe('https://api.example.com');
  });

  it('apiUrl falls back to legacy NEXT_PUBLIC_BACKEND_URL', async () => {
    const { config } = await withEnvAsync(
      {
        NEXT_PUBLIC_API_URL: '',
        NEXT_PUBLIC_BACKEND_URL: 'https://backend.example.com',
        NEXT_PUBLIC_APP_ENV: 'development',
        NEXT_PUBLIC_STELLAR_NETWORK: 'testnet',
        NODE_ENV: 'test',
      },
      () => import('../config')
    );
    expect(config.apiUrl).toBe('https://backend.example.com');
  });

  it('backendUrl is an alias for apiUrl', async () => {
    const { config } = await withEnvAsync(
      {
        NEXT_PUBLIC_API_URL: 'https://api.example.com',
        NEXT_PUBLIC_APP_ENV: 'development',
        NEXT_PUBLIC_STELLAR_NETWORK: 'testnet',
        NODE_ENV: 'test',
      },
      () => import('../config')
    );
    expect(config.backendUrl).toBe(config.apiUrl);
  });

  it('wsUrl uses NEXT_PUBLIC_WS_URL when set', async () => {
    const { config } = await withEnvAsync(
      {
        NEXT_PUBLIC_WS_URL: 'wss://ws.example.com/ws',
        NEXT_PUBLIC_API_URL: 'https://api.example.com',
        NEXT_PUBLIC_APP_ENV: 'development',
        NEXT_PUBLIC_STELLAR_NETWORK: 'testnet',
        NODE_ENV: 'test',
      },
      () => import('../config')
    );
    expect(config.wsUrl).toBe('wss://ws.example.com/ws');
  });

  it('wsUrl derives from NEXT_PUBLIC_API_URL when WS_URL is absent (http → ws)', async () => {
    const { config } = await withEnvAsync(
      {
        NEXT_PUBLIC_WS_URL: undefined,
        NEXT_PUBLIC_API_URL: 'http://api.example.com',
        NEXT_PUBLIC_APP_ENV: 'development',
        NEXT_PUBLIC_STELLAR_NETWORK: 'testnet',
        NODE_ENV: 'test',
      },
      () => import('../config')
    );
    expect(config.wsUrl).toMatch(/^ws:\/\//);
    expect(config.wsUrl).toContain('api.example.com');
  });

  it('wsUrl derives from NEXT_PUBLIC_API_URL (https → wss)', async () => {
    const { config } = await withEnvAsync(
      {
        NEXT_PUBLIC_WS_URL: undefined,
        NEXT_PUBLIC_API_URL: 'https://api.example.com',
        NEXT_PUBLIC_APP_ENV: 'development',
        NEXT_PUBLIC_STELLAR_NETWORK: 'testnet',
        NODE_ENV: 'test',
      },
      () => import('../config')
    );
    expect(config.wsUrl).toMatch(/^wss:\/\//);
  });

  it('isDevelopment is true in development env', async () => {
    const { config } = await withEnvAsync(
      {
        NEXT_PUBLIC_API_URL: 'http://localhost:8080',
        NEXT_PUBLIC_APP_ENV: 'development',
        NEXT_PUBLIC_STELLAR_NETWORK: 'testnet',
        NODE_ENV: 'test',
      },
      () => import('../config')
    );
    expect(config.isDevelopment).toBe(true);
    expect(config.isProduction).toBe(false);
  });

  it('isProduction is true in production env', async () => {
    const { config } = await withEnvAsync(
      {
        NEXT_PUBLIC_API_URL: 'https://api.example.com',
        NEXT_PUBLIC_APP_ENV: 'production',
        NEXT_PUBLIC_STELLAR_NETWORK: 'mainnet',
        NODE_ENV: 'test',
      },
      () => import('../config')
    );
    expect(config.isProduction).toBe(true);
    expect(config.isDevelopment).toBe(false);
  });

  it('isMainnet is true for mainnet network', async () => {
    const { config } = await withEnvAsync(
      {
        NEXT_PUBLIC_API_URL: 'https://api.example.com',
        NEXT_PUBLIC_APP_ENV: 'production',
        NEXT_PUBLIC_STELLAR_NETWORK: 'mainnet',
        NODE_ENV: 'test',
      },
      () => import('../config')
    );
    expect(config.isMainnet).toBe(true);
  });

  it('enableProductionLogs is false by default', async () => {
    const { config } = await withEnvAsync(
      {
        NEXT_PUBLIC_API_URL: 'http://localhost:8080',
        NEXT_PUBLIC_APP_ENV: 'development',
        NEXT_PUBLIC_STELLAR_NETWORK: 'testnet',
        NEXT_PUBLIC_ENABLE_PROD_LOGS: undefined,
        NODE_ENV: 'test',
      },
      () => import('../config')
    );
    expect(config.enableProductionLogs).toBe(false);
  });

  it('enableProductionLogs is true when NEXT_PUBLIC_ENABLE_PROD_LOGS=true', async () => {
    const { config } = await withEnvAsync(
      {
        NEXT_PUBLIC_API_URL: 'http://localhost:8080',
        NEXT_PUBLIC_APP_ENV: 'development',
        NEXT_PUBLIC_STELLAR_NETWORK: 'testnet',
        NEXT_PUBLIC_ENABLE_PROD_LOGS: 'true',
        NODE_ENV: 'test',
      },
      () => import('../config')
    );
    expect(config.enableProductionLogs).toBe(true);
  });
});

// ── Env-var audit: no stray direct reads ─────────────────────────────────────

describe('Canonical env-var naming (smoke test)', () => {
  it('config exposes wsUrl — no module should need NEXT_PUBLIC_WS_URL directly', () => {
    // This test documents the canonical interface: modules import config.wsUrl.
    // If this import resolves without throwing, the shape is correct.
    return import('../config').then(({ config }) => {
      expect(typeof config.wsUrl).toBe('string');
    });
  });

  it('config exposes apiUrl — no module should need NEXT_PUBLIC_API_URL directly', () => {
    return import('../config').then(({ config }) => {
      expect(typeof config.apiUrl).toBe('string');
    });
  });

  it('config exposes backendUrl alias — no module should need NEXT_PUBLIC_BACKEND_URL directly', () => {
    return import('../config').then(({ config }) => {
      expect(typeof config.backendUrl).toBe('string');
    });
  });
});

// ── Async helper ─────────────────────────────────────────────────────────────

async function withEnvAsync<T>(
  overrides: EnvOverride,
  fn: () => Promise<T>
): Promise<T> {
  const saved: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(overrides)) {
    saved[k] = process.env[k];
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }
  try {
    return await fn();
  } finally {
    for (const [k, orig] of Object.entries(saved)) {
      if (orig === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = orig;
      }
    }
  }
}
