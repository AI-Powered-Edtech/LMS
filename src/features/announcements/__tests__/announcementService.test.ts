import { describe, it, expect, vi, beforeEach } from 'vitest';
import { announcementService } from '../api/announcementService';

const mockFrom = vi.fn();

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

function makeAnnouncementChain(resolveValue: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    // last call in chain resolves the promise
    // We handle by making the last method return the resolved value
    then: undefined as any,
  };
}

describe('announcementService.fetchAnnouncements', () => {
  beforeEach(() => vi.clearAllMocks());

  it('queries announcements table', async () => {
    const fromSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((cb) => cb({ data: [], error: null })),
    });
    mockFrom.mockImplementation(fromSpy);
    await announcementService.fetchAnnouncements('tenant-1');
    expect(fromSpy).toHaveBeenCalledWith('announcements');
  });

  it('applies tenant_id filter', async () => {
    const eqSpy = vi.fn().mockReturnThis();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: eqSpy,
      order: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((cb) => cb({ data: [], error: null })),
    });
    await announcementService.fetchAnnouncements('tenant-1');
    expect(eqSpy).toHaveBeenCalledWith('tenant_id', 'tenant-1');
  });

  it('returns announcements on success', async () => {
    const items = [{ id: 'a1', title: 'Test', tenant_id: 'tenant-1' }];
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((cb) => cb({ data: items, error: null })),
    });
    const result = await announcementService.fetchAnnouncements('tenant-1');
    expect(result).toEqual(items);
  });

  it('throws on error', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((cb) => cb({ data: null, error: { message: 'Access denied' } })),
    });
    await expect(announcementService.fetchAnnouncements('tenant-1')).rejects.toMatchObject({
      message: 'Access denied',
    });
  });

  it('uses course_id filter when provided', async () => {
    const orSpy = vi.fn().mockReturnThis();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      or: orSpy,
      is: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    await announcementService.fetchAnnouncements('tenant-1', { courseId: 'course-1' });
    expect(orSpy).toHaveBeenCalledWith(`course_id.eq.course-1,course_id.is.null`);
  });
});
