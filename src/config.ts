/**
 * Centralised frontend configuration helper — Issue #98.
 *
 * Single source of truth for all backend / WebSocket URLs and
 * runtime environment settings. Every module that needs a URL or
 * env flag MUST import from here instead of reading process.env directly.
 *
 * Canonical env-var naming convention
 * ────────────────────────────────────
 *  NEXT_PUBLIC_API_URL           REST API base URL   (required in production)
 *  NEXT_PUBLIC_WS_URL            WebSocket base URL  (optional; derived from API URL when absent)
 *  NEXT_PUBLIC_APP_ENV           "development" | "test" | "production"
 *  NEXT_PUBLIC_STELLAR_NETWORK   "testnet" | "mainnet"
 *  NEXT_PUBLIC_ENABLE_PROD_LOGS  "true" to allow debug output in production
 *
 * Legacy alias handled transparently
 * ────────────────────────────────────
 *  NEXT_PUBLIC_BACKEND_URL — accepted as a fallback for NEXT_PUBLIC_API_URL
 *  NEXT_PUBLIC_WS_PORT     — accepted as a fallback to derive the WS URL
 */

const _apiUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL || // legacy alias
  '';

const _appEnv = process.env.NEXT_PUBLIC_APP_ENV || 'development';
const _stellarNetwork = process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet';

/**
 * Derive the WebSocket URL from either the canonical env var or legacy fallbacks.
 * Priority:
 *   1. NEXT_PUBLIC_WS_URL
 *   2. Convert the REST API URL scheme (http → ws, https → wss) + /ws path
 *   3. Legacy: combine current host with NEXT_PUBLIC_WS_PORT
 */
function deriveWsUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }

  // Derive from REST API URL when possible
  if (_apiUrl) {
    try {
      const u = new URL(_apiUrl);
      u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
      u.pathname = '/ws';
      return u.toString();
    } catch {
      // malformed URL — fall through
    }
  }

  // Legacy: NEXT_PUBLIC_WS_PORT (browser-only)
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = process.env.NEXT_PUBLIC_WS_PORT || '8080';
    return `${protocol}//${host}:${port}/ws`;
  }

  return 'ws://localhost:8080/ws';
}

// ── Validation ────────────────────────────────────────────────────────────────

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateConfig(): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // NEXT_PUBLIC_API_URL is required in production
  if (!_apiUrl) {
    if (_appEnv === 'production') {
      errors.push('NEXT_PUBLIC_API_URL is required in production');
    } else {
      warnings.push(
        'NEXT_PUBLIC_API_URL is not set — requests will use relative paths. ' +
          'Set NEXT_PUBLIC_API_URL in .env.local for a real backend.'
      );
    }
  } else if (_appEnv === 'production' && _apiUrl.includes('localhost')) {
    errors.push('NEXT_PUBLIC_API_URL must not reference localhost in production');
  }

  if (!['development', 'test', 'production'].includes(_appEnv)) {
    errors.push(
      `Invalid NEXT_PUBLIC_APP_ENV: "${_appEnv}". Must be one of: development, test, production`
    );
  }

  if (!['testnet', 'mainnet'].includes(_stellarNetwork)) {
    errors.push(
      `Invalid NEXT_PUBLIC_STELLAR_NETWORK: "${_stellarNetwork}". Must be one of: testnet, mainnet`
    );
  }

  return { valid: errors.length === 0, errors, warnings };
}

// Emit warnings / throw errors at module load time (not in test env to avoid noise)
if (process.env.NODE_ENV !== 'test') {
  const { valid, errors, warnings } = validateConfig();

  for (const w of warnings) {
    // eslint-disable-next-line no-console
    console.warn(`[config] ⚠️  ${w}`);
  }

  if (!valid) {
    throw new Error(`[config] Fatal configuration errors:\n- ${errors.join('\n- ')}`);
  }
}

// ── Exported config object ────────────────────────────────────────────────────

export const config = {
  /**
   * REST API base URL.
   * Always use this instead of reading NEXT_PUBLIC_API_URL or
   * NEXT_PUBLIC_BACKEND_URL directly.
   */
  apiUrl: _apiUrl || 'http://localhost:8080',

  /**
   * Alias kept for server-side route handlers that previously used
   * NEXT_PUBLIC_BACKEND_URL. Points to the same value as apiUrl.
   */
  get backendUrl(): string {
    return this.apiUrl;
  },

  /**
   * WebSocket base URL.
   * All realtime hooks and WebSocket clients should read this property.
   */
  wsUrl: deriveWsUrl(),

  /** Current application environment. */
  appEnv: _appEnv as 'development' | 'test' | 'production',

  /** Stellar network to connect to. */
  stellarNetwork: _stellarNetwork as 'testnet' | 'mainnet',

  /** Whether debug logging is allowed in production builds. */
  enableProductionLogs: process.env.NEXT_PUBLIC_ENABLE_PROD_LOGS === 'true',

  // ── Convenience booleans ──────────────────────────────────────────────────

  get isDevelopment(): boolean {
    return this.appEnv === 'development';
  },
  get isProduction(): boolean {
    return this.appEnv === 'production';
  },
  get isTest(): boolean {
    return this.appEnv === 'test';
  },
  get isMainnet(): boolean {
    return this.stellarNetwork === 'mainnet';
  },
} as const;
