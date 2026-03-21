import { describe, it, expect, vi, beforeEach } from 'vitest';
import { courseService } from '../api/courseService';

// Mock supabase
const mockRange = vi.fn().mockReturnThis();
const mockIlike = vi.fn().mockReturnThis();
const mockIn = vi.fn().mockReturnThis();
const mockOrder = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockSingle = vi.fn();
const mockSelect = vi.fn().mockReturnThis();
const mockInsert = vi.fn().mockReturnThis();
const mockUpdate = vi.fn().mockReturnThis();
const mockDelete = vi.fn().mockReturnThis();
const mockFrom = vi.fn();

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      mockFrom(table);
      return {
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
        delete: mockDelete,
        eq: mockEq,
        ilike: mockIlike,
        order: mockOrder,
        range: mockRange,
        in: mockIn,
        single: mockSingle,
      };
    },
  },
}));

describe('courseService.fetchCourses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: eq returns itself, range returns data
    mockEq.mockReturnThis();
    mockOrder.mockReturnThis();
    mockRange.mockResolvedValue({ data: [], count: 0, error: null });
    mockSelect.mockReturnThis();
    mockIlike.mockReturnThis();
    mockIn.mockReturnThis();
  });

  it('queries the courses table', async () => {
    mockOrder.mockReturnThis();
    mockRange.mockResolvedValue({ data: [], count: 0, error: null });
    await courseService.fetchCourses({ tenantId: 'tenant-1', page: 1, limit: 10 });
    expect(mockFrom).toHaveBeenCalledWith('courses');
  });

  it('applies tenant_id filter', async () => {
    mockRange.mockResolvedValue({ data: [], count: 0, error: null });
    await courseService.fetchCourses({ tenantId: 'tenant-1', page: 1, limit: 10 });
    expect(mockEq).toHaveBeenCalledWith('tenant_id', 'tenant-1');
  });

  it('returns empty courses and count 0 on empty result', async () => {
    mockRange.mockResolvedValue({ data: [], count: 0, error: null });
    const result = await courseService.fetchCourses({ tenantId: 'tenant-1', page: 1, limit: 10 });
    expect(result.courses).toEqual([]);
    expect(result.count).toBe(0);
  });

  it('returns courses when data is present', async () => {
    const courses = [{ id: 'c1', title: 'Math', tenant_id: 'tenant-1' }];
    mockRange.mockResolvedValue({ data: courses, count: 1, error: null });
    const result = await courseService.fetchCourses({ tenantId: 'tenant-1', page: 1, limit: 10 });
    expect(result.courses).toEqual(courses);
    expect(result.count).toBe(1);
  });

  it('applies search filter when provided', async () => {
    mockIlike.mockReturnThis();
    mockRange.mockResolvedValue({ data: [], count: 0, error: null });
    await courseService.fetchCourses({ tenantId: 'tenant-1', page: 1, limit: 10, search: 'math' });
    expect(mockIlike).toHaveBeenCalledWith('title', '%math%');
  });
});
