import { describe, it, expect, vi, beforeEach } from 'vitest';

// We import the AnalyticsError type indirectly by testing error parsing behavior
// Note: analyticsService methods use supabase.rpc — we mock that

const mockRpc = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/src/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// Import AFTER mock is set up
import { analyticsService } from '../api/analyticsService';

describe('analyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTeacherAnalytics', () => {
    it('calls get_teacher_analytics RPC with correct params', async () => {
      mockRpc.mockResolvedValue({ data: { course_title: 'Math' }, error: null });
      await analyticsService.getTeacherAnalytics('course-1', 'tenant-1');
      expect(mockRpc).toHaveBeenCalledWith('get_teacher_analytics', expect.objectContaining({
        p_course_id: 'course-1',
      }));
    });

    it('returns analytics data on success', async () => {
      const mockData = { course_title: 'Math', total_students: 30 };
      mockRpc.mockResolvedValue({ data: mockData, error: null });
      const result = await analyticsService.getTeacherAnalytics('course-1', 'tenant-1');
      expect(result).toMatchObject({ course_title: 'Math' });
    });

    it('throws AnalyticsError on permission denied', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'must be teacher or admin', code: 'PGRST116' },
      });
      await expect(analyticsService.getTeacherAnalytics('course-1', 'tenant-1')).rejects.toThrow();
    });

    it('throws AnalyticsError when function not found', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'function not found', code: '42883' },
      });
      await expect(analyticsService.getTeacherAnalytics('course-1', 'tenant-1')).rejects.toThrow();
    });

    it('throws AnalyticsError when course not found', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'course not found', code: 'P0001' },
      });
      await expect(analyticsService.getTeacherAnalytics('course-1', 'tenant-1')).rejects.toThrow();
    });
  });
});
