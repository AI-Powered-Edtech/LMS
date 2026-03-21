import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchNotifications, markAsRead, markAllAsRead } from '../api/notificationService';

const mockFrom = vi.fn();

vi.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

describe('fetchNotifications', () => {
  beforeEach(() => vi.clearAllMocks());

  it('queries notifications table', async () => {
    const fromSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    mockFrom.mockImplementation(fromSpy);
    await fetchNotifications('user-1', 'tenant-1');
    expect(fromSpy).toHaveBeenCalledWith('notifications');
  });

  it('returns notifications array', async () => {
    const notifications = [{ id: 'n1', user_id: 'user-1', is_read: false }];
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: notifications, error: null }),
    });
    const result = await fetchNotifications('user-1', 'tenant-1');
    expect(result).toEqual(notifications);
  });

  it('limits to 50 notifications', async () => {
    const limitSpy = vi.fn().mockResolvedValue({ data: [], error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: limitSpy,
    });
    await fetchNotifications('user-1', 'tenant-1');
    expect(limitSpy).toHaveBeenCalledWith(50);
  });

  it('throws on error', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'Access denied' } }),
    });
    await expect(fetchNotifications('user-1', 'tenant-1')).rejects.toMatchObject({
      message: 'Access denied',
    });
  });
});

describe('markAsRead', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates notifications table', async () => {
    const fromSpy = vi.fn().mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    mockFrom.mockImplementation(fromSpy);
    await markAsRead('n1', 'tenant-1');
    expect(fromSpy).toHaveBeenCalledWith('notifications');
  });

  it('sets is_read to true', async () => {
    let updatedData: unknown;
    mockFrom.mockReturnValue({
      update: vi.fn().mockImplementation((data) => {
        updatedData = data;
        return {
          eq: vi.fn().mockResolvedValue({ error: null }),
        };
      }),
    });
    await markAsRead('n1', 'tenant-1');
    expect((updatedData as any).is_read).toBe(true);
  });

  it('throws on error', async () => {
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
    });
    await expect(markAsRead('n1', 'tenant-1')).rejects.toMatchObject({ message: 'Update failed' });
  });
});

describe('markAllAsRead', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates all unread notifications for user', async () => {
    const fromSpy = vi.fn().mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    mockFrom.mockImplementation(fromSpy);
    await markAllAsRead('user-1', 'tenant-1');
    expect(fromSpy).toHaveBeenCalledWith('notifications');
  });
});
