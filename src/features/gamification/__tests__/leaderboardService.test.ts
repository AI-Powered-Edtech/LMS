import { describe, it, expect, vi, beforeEach } from 'vitest';
import { leaderboardService } from '../api/leaderboardService';

const mockFrom = vi.fn();

vi.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

function makeLeaderboardChain(resolveWith: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(resolveWith),
  };
}

describe('leaderboardService.getLeaderboard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('queries leaderboards table', async () => {
    const fromSpy = vi.fn().mockReturnValue(makeLeaderboardChain({ data: [], error: null }));
    mockFrom.mockImplementation(fromSpy);
    await leaderboardService.getLeaderboard('class-1', 'tenant-1');
    expect(fromSpy).toHaveBeenCalledWith('leaderboards');
  });

  it('returns empty array when no entries', async () => {
    mockFrom.mockReturnValue(makeLeaderboardChain({ data: [], error: null }));
    const result = await leaderboardService.getLeaderboard('class-1', 'tenant-1');
    expect(result).toEqual([]);
  });

  it('maps points to score field', async () => {
    const entries = [{ user_id: 'u1', points: 100, rank: 1 }];
    mockFrom.mockReturnValue(makeLeaderboardChain({ data: entries, error: null }));
    const result = await leaderboardService.getLeaderboard('class-1', 'tenant-1');
    expect(result[0].score).toBe(100);
  });

  it('returns empty array for 42P01 (missing table)', async () => {
    mockFrom.mockReturnValue(makeLeaderboardChain({
      data: null,
      error: { code: '42P01', message: 'table not found' },
    }));
    const result = await leaderboardService.getLeaderboard('class-1', 'tenant-1');
    expect(result).toEqual([]);
  });

  it('returns empty array for 400 error', async () => {
    mockFrom.mockReturnValue(makeLeaderboardChain({
      data: null,
      error: { code: '400', message: 'bad request' },
    }));
    const result = await leaderboardService.getLeaderboard('class-1', 'tenant-1');
    expect(result).toEqual([]);
  });

  it('throws for unexpected errors', async () => {
    mockFrom.mockReturnValue(makeLeaderboardChain({
      data: null,
      error: { code: '500', message: 'Internal error' },
    }));
    await expect(leaderboardService.getLeaderboard('class-1', 'tenant-1')).rejects.toMatchObject({
      code: '500',
    });
  });

  it('limits to top 20', async () => {
    const limitSpy = vi.fn().mockResolvedValue({ data: [], error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: limitSpy,
    });
    await leaderboardService.getLeaderboard('class-1', 'tenant-1');
    expect(limitSpy).toHaveBeenCalledWith(20);
  });
});
