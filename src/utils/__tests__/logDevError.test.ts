import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { logger } from '@/utils/logger';
import { logDevError, logDevWarn } from '../logDevError';

describe('logDevError and logDevWarn', () => {
  let errorSpy: MockInstance;
  let warnSpy: MockInstance;
  let originalDev: boolean;

  beforeEach(() => {
    vi.clearAllMocks();
    errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    originalDev = import.meta.env.DEV;
  });

  afterEach(() => {
    // @ts-ignore - dynamic override for testing
    import.meta.env.DEV = originalDev;
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  describe('logDevError', () => {
    it('should call logger.error when in DEV mode', () => {
      // @ts-ignore - dynamic override for testing
      import.meta.env.DEV = true;
      logDevError('TestContext', 'error message', 123);

      expect(errorSpy).toHaveBeenCalledWith('[TestContext]', 'error message', 123);
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });

    it('should not call logger.error when not in DEV mode', () => {
      // @ts-ignore - dynamic override for testing
      import.meta.env.DEV = false;
      logDevError('TestContext', 'error message');

      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  describe('logDevWarn', () => {
    it('should call logger.warn when in DEV mode', () => {
      // @ts-ignore - dynamic override for testing
      import.meta.env.DEV = true;
      logDevWarn('WarnContext', 'warning message', { data: 1 });

      expect(warnSpy).toHaveBeenCalledWith('[WarnContext]', 'warning message', { data: 1 });
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('should not call logger.warn when not in DEV mode', () => {
      // @ts-ignore - dynamic override for testing
      import.meta.env.DEV = false;
      logDevWarn('WarnContext', 'warning message');

      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});
