import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Tests that validate production-safe logging behaviour:
// 1. debug() is suppressed outside development
// 2. Sensitive data is redacted before reaching console output

describe('logger – production safety', () => {
  let consoleSpy: { log: ReturnType<typeof vi.spyOn>; warn: ReturnType<typeof vi.spyOn>; error: ReturnType<typeof vi.spyOn>; debug: ReturnType<typeof vi.spyOn> };

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe('debug log suppression', () => {
    it('does not call console.log/debug when NODE_ENV is production', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      // Re-import so the module picks up the stubbed env
      vi.resetModules();
      const { logger } = await import('../logger');

      logger.debug('internal detail', { step: 'processing' });

      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });

    it('does call console.log in development', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.resetModules();
      const { logger } = await import('../logger');

      logger.debug('dev detail', { step: 'processing' });

      const wasCalled =
        consoleSpy.log.mock.calls.length > 0 ||
        consoleSpy.debug.mock.calls.length > 0;
      expect(wasCalled).toBe(true);
    });
  });

  describe('sensitive data redaction', () => {
    it('redacts Stellar secret keys from error messages', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.resetModules();
      const { logger } = await import('../logger');

      const secretKey = 'SBCXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
      logger.warn('key exposed', { secret: secretKey });

      const allOutput = [
        ...consoleSpy.log.mock.calls,
        ...consoleSpy.warn.mock.calls,
      ]
        .flat()
        .join(' ');

      expect(allOutput).not.toContain(secretKey);
    });

    it('redacts JWT tokens from log output', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.resetModules();
      const { logger } = await import('../logger');

      const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.SflKxwRJSMeKKF2QT4fwpMeJf36';
      logger.info('auth flow', { token: jwt });

      const allOutput = [...consoleSpy.log.mock.calls, ...consoleSpy.warn.mock.calls]
        .flat()
        .join(' ');

      expect(allOutput).not.toContain(jwt);
    });

    it('redacts email addresses from log metadata', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.resetModules();
      const { logger } = await import('../logger');

      const email = 'user@example.com';
      logger.info('user action', { user: email });

      const allOutput = [...consoleSpy.log.mock.calls, ...consoleSpy.warn.mock.calls]
        .flat()
        .join(' ');

      expect(allOutput).not.toContain(email);
    });

    it('does not redact non-sensitive log metadata', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.resetModules();
      const { logger } = await import('../logger');

      logger.info('corridor fetched', { corridorId: 'USD-EUR', status: 200 });

      const allOutput = [...consoleSpy.log.mock.calls, ...consoleSpy.warn.mock.calls]
        .flat()
        .join(' ');

      // safe values should remain intact
      expect(allOutput).toMatch(/USD-EUR|status|200/);
    });
  });

  describe('error boundary integration', () => {
    it('logs errors without exposing stack traces in production', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.resetModules();
      const { logger } = await import('../logger');

      const err = new Error('Internal DB error: password=hunter2');
      logger.error('Unhandled error', err);

      const allOutput = [...consoleSpy.error.mock.calls, ...consoleSpy.log.mock.calls]
        .flat()
        .join(' ');

      // The raw password should not appear in production output
      expect(allOutput).not.toContain('hunter2');
    });
  });
});
