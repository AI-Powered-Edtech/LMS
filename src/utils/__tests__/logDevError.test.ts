import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logDevError, logDevWarn } from '../logDevError';
import { logger } from '@/utils/logger';

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('logDevError and logDevWarn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('logDevError', () => {
    it('should call logger.error when in DEV mode', () => {
      // @ts-ignore - dynamic override for testing
      import.meta.env.DEV = true;
      logDevError('TestContext', 'error message', 123);

      expect(logger.error).toHaveBeenCalledWith('[TestContext]', 'error message', 123);
      expect(logger.error).toHaveBeenCalledTimes(1);
    });

    it('should not call logger.error when not in DEV mode', () => {
      // @ts-ignore - dynamic override for testing
      import.meta.env.DEV = false;
      logDevError('TestContext', 'error message');

      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe('logDevWarn', () => {
    it('should call logger.warn when in DEV mode', () => {
      // @ts-ignore - dynamic override for testing
      import.meta.env.DEV = true;
      logDevWarn('WarnContext', 'warning message', { data: 1 });

      expect(logger.warn).toHaveBeenCalledWith('[WarnContext]', 'warning message', { data: 1 });
      expect(logger.warn).toHaveBeenCalledTimes(1);
    });

    it('should not call logger.warn when not in DEV mode', () => {
      // @ts-ignore - dynamic override for testing
      import.meta.env.DEV = false;
      logDevWarn('WarnContext', 'warning message');

      expect(logger.warn).not.toHaveBeenCalled();
    });
  });
});
