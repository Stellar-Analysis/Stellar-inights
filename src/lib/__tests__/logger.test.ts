/**
 * Tests for secure logging functionality
 */

// Mock console methods
const originalConsole = global.console;
let mockConsole: any;

beforeEach(() => {
  mockConsole = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  global.console = mockConsole;
});

afterEach(() => {
  global.console = originalConsole;
});

// Mock environment variables
const mockProcessEnv = (env: Partial<typeof process.env>) => {
  const originalEnv = process.env;
  process.env = { ...originalEnv, ...env };
  return () => {
    process.env = originalEnv;
  };
};

import { logger, createScopedLogger, __testing__ } from '../logger';

describe('Logger Redaction', () => {
  describe('redactSensitiveData', () => {
    it('should redact Stellar addresses', () => {
      const data = "Account: GCKFBEIYTKP5ROORWS2HE6XXVV6MQVE6YDJHB5P7C4GGQXJN6ZHGKF3R";
      const result = __testing__.redactSensitiveData(data);
      expect(result).toContain('G****[REDACTED]');
      expect(result).not.toContain('GCKFBEIYTKP5ROORWS2HE6XXVV6MQVE6YDJHB5P7C4GGQXJN6ZHGKF3R');
    });

    it('should redact Stellar secret keys', () => {
      const data = "Secret: SCKFBEIYTKP5ROORWS2HE6XXVV6MQVE6YDJHB5P7C4GGQXJN6ZHGKF3R";
      const result = __testing__.redactSensitiveData(data);
      expect(result).toContain('S****[REDACTED_SECRET]');
      expect(result).not.toContain('SCKFBEIYTKP5ROORWS2HE6XXVV6MQVE6YDJHB5P7C4GGQXJN6ZHGKF3R');
    });

    it('should redact JWT tokens', () => {
      const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
      const data = `Token: ${jwt}`;
      const result = __testing__.redactSensitiveData(data);
      expect(result).toContain('[REDACTED_JWT]');
      expect(result).not.toContain(jwt);
    });

    it('should redact email addresses', () => {
      const data = "Contact: john.doe@example.com";
      const result = __testing__.redactSensitiveData(data);
      expect(result).toContain('****@[REDACTED]');
      expect(result).not.toContain('john.doe@example.com');
    });

    it('should redact API keys', () => {
      const data = "API Key: fake_api_key_1234567890abcdef1234567890abcdef";
      const result = __testing__.redactSensitiveData(data);
      expect(result).toContain('[REDACTED_KEY]');
      expect(result).not.toContain('fake_api_key_1234567890abcdef1234567890abcdef');
    });

    it('should redact phone numbers', () => {
      const data = "Phone: +1234567890";
      const result = __testing__.redactSensitiveData(data);
      expect(result).toContain('+1****[REDACTED]');
      expect(result).not.toContain('+1234567890');
    });

    it('should redact credit card numbers', () => {
      const data = "Card: 1234-5678-9012-3456";
      const result = __testing__.redactSensitiveData(data);
      expect(result).toContain('****-****-****-[REDACTED]');
      expect(result).not.toContain('1234-5678-9012-3456');
    });

    it('should handle nested objects', () => {
      const data = {
        username: 'john',
        password: 'secret123',
        profile: {
          email: 'john@example.com',
          api_key: 'ak_1234567890abcdef1234567890abcdef'
        }
      };
      const result = __testing__.redactSensitiveData(data);
      
      expect(result.username).toBe('john');
      expect(result.password).toBe('[REDACTED]');
      expect(result.profile.email).toContain('****@[REDACTED]');
      expect(result.profile.api_key).toBe('[REDACTED]');
    });

    it('should handle arrays', () => {
      const data = [
        'safe data',
        'GCKFBEIYTKP5ROORWS2HE6XXVV6MQVE6YDJHB5P7C4GGQXJN6ZHGKF3R',
        { secret: 'hidden', public: 'visible' }
      ];
      const result = __testing__.redactSensitiveData(data) as any[];
      
      expect(result[0]).toBe('safe data');
      expect(result[1]).toContain('G****[REDACTED]');
      expect(result[2].secret).toBe('[REDACTED]');
      expect(result[2].public).toBe('visible');
    });

    it('should not redact safe data', () => {
      const safeData = [
        'regular text',
        'user_normal_field',
        'not_a_stellar_account_G123',  // Wrong format
        'short@em',                     // Invalid email
        'short_key'                     // Too short for API key
      ];
      
      safeData.forEach(data => {
        const result = __testing__.redactSensitiveData(data);
        expect(result).toBe(data);
      });
    });
  });

  describe('Environment Awareness', () => {
    it('should log debug in development', () => {
      const restore = mockProcessEnv({ NODE_ENV: 'development' });
      
      logger.debug('Debug message', { key: 'value' });
      
      expect(mockConsole.debug).toHaveBeenCalled();
      restore();
    });

    it('should not log debug in production by default', () => {
      const restore = mockProcessEnv({ 
        NODE_ENV: 'production',
        NEXT_PUBLIC_ENABLE_PROD_LOGS: 'false'
      });
      
      logger.debug('Debug message', { key: 'value' });
      
      expect(mockConsole.debug).not.toHaveBeenCalled();
      restore();
    });

    it('should log debug in production when enabled', () => {
      const restore = mockProcessEnv({ 
        NODE_ENV: 'production',
        NEXT_PUBLIC_ENABLE_PROD_LOGS: 'true'
      });
      
      logger.debug('Debug message', { key: 'value' });
      
      expect(mockConsole.debug).toHaveBeenCalled();
      restore();
    });

    it('should always log errors', () => {
      const restore = mockProcessEnv({ NODE_ENV: 'production' });
      
      logger.error('Error message');
      
      // In production, errors go to Sentry, not console in this implementation
      // But the logger.error method should still be called
      expect(mockConsole.error).not.toHaveBeenCalled(); // Not called in prod
      restore();
    });

    it('should log errors to console in development', () => {
      const restore = mockProcessEnv({ NODE_ENV: 'development' });
      
      logger.error('Error message', new Error('Test error'));
      
      expect(mockConsole.error).toHaveBeenCalled();
      restore();
    });

    it('should not log in test environment unless enabled', () => {
      const restore = mockProcessEnv({ 
        NODE_ENV: 'test',
        ENABLE_TEST_LOGS: 'false'
      });
      
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      
      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.warn).not.toHaveBeenCalled();
      restore();
    });
  });

  describe('Scoped Logger', () => {
    it('should prefix messages with scope', () => {
      const restore = mockProcessEnv({ NODE_ENV: 'development' });
      const scopedLogger = createScopedLogger('TestComponent');
      
      scopedLogger.debug('Debug message');
      scopedLogger.info('Info message');
      scopedLogger.warn('Warn message');
      
      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('[TestComponent] Debug message'),
        undefined
      );
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('[TestComponent] Info message'),
        undefined
      );
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('[TestComponent] Warn message'),
        undefined
      );
      restore();
    });

    it('should redact sensitive data in scoped logs', () => {
      const restore = mockProcessEnv({ NODE_ENV: 'development' });
      const scopedLogger = createScopedLogger('AuthComponent');
      
      scopedLogger.debug('Processing account', { 
        account: 'GCKFBEIYTKP5ROORWS2HE6XXVV6MQVE6YDJHB5P7C4GGQXJN6ZHGKF3R',
        password: 'secret123'
      });
      
      const call = mockConsole.debug.mock.calls[0];
      expect(call[1].account).toContain('G****[REDACTED]');
      expect(call[1].password).toBe('[REDACTED]');
      restore();
    });
  });

  describe('Message Formatting', () => {
    it('should format messages with timestamp and level', () => {
      const message = __testing__.formatMessage('DEBUG', 'Test message');
      expect(message).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\] \[DEBUG\] Test message$/);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complex realistic log scenarios', () => {
      const restore = mockProcessEnv({ NODE_ENV: 'development' });
      
      // Simulate API response logging
      logger.api('POST', '/auth/login', {
        request: {
          username: 'john',
          password: 'secret123',
          account: 'GCKFBEIYTKP5ROORWS2HE6XXVV6MQVE6YDJHB5P7C4GGQXJN6ZHGKF3R'
        },
        response: {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
          user: { 
            id: 'user_123',
            email: 'john@example.com'
          }
        }
      });
      
      const call = mockConsole.debug.mock.calls[0];
      const metadata = call[1];
      
      // Should preserve safe data
      expect(metadata.request.username).toBe('john');
      expect(metadata.response.user.id).toBe('user_123');
      
      // Should redact sensitive data
      expect(metadata.request.password).toBe('[REDACTED]');
      expect(metadata.request.account).toContain('G****[REDACTED]');
      expect(metadata.response.token).toBe('[REDACTED_JWT]');
      expect(metadata.response.user.email).toContain('****@[REDACTED]');
      
      restore();
    });

    it('should handle WebSocket event logging', () => {
      const restore = mockProcessEnv({ NODE_ENV: 'development' });
      
      logger.websocket('message', {
        type: 'auth',
        payload: {
          stellar_account: 'GCKFBEIYTKP5ROORWS2HE6XXVV6MQVE6YDJHB5P7C4GGQXJN6ZHGKF3R',
          secret_key: 'SCKFBEIYTKP5ROORWS2HE6XXVV6MQVE6YDJHB5P7C4GGQXJN6ZHGKF3R'
        }
      });
      
      const call = mockConsole.debug.mock.calls[0];
      const data = call[1];
      
      expect(data.type).toBe('auth');
      expect(data.payload.stellar_account).toContain('G****[REDACTED]');
      expect(data.payload.secret_key).toContain('S****[REDACTED_SECRET]');
      
      restore();
    });
  });
});