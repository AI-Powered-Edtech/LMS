import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { logger } from '@/utils/logger';

import { logDevError, logDevWarn } from '../logDevError';

describe('logDevError utilities', () => {
  const originalEnvDev = import.meta.env.DEV;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(logger, 'error').mockImplementation(() => {});
    vi.spyOn(logger, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    import.meta.env.DEV = originalEnvDev;
    vi.restoreAllMocks();
  });

  describe('logDevError', () => {
    it('logs error when import.meta.env.DEV is true', () => {
      import.meta.env.DEV = true;
      logDevError('TestContext', 'test error', 123);
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith('[TestContext]', 'test error', 123);
    });

    it('does not log error when import.meta.env.DEV is false', () => {
      import.meta.env.DEV = false;
      logDevError('TestContext', 'test error', 123);
      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe('logDevWarn', () => {
    it('logs warning when import.meta.env.DEV is true', () => {
      import.meta.env.DEV = true;
      logDevWarn('TestContext', 'test warning', 456);
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith('[TestContext]', 'test warning', 456);
    });

    it('does not log warning when import.meta.env.DEV is false', () => {
      import.meta.env.DEV = false;
      logDevWarn('TestContext', 'test warning', 456);
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });
});