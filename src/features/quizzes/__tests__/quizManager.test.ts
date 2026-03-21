import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTeacherQuizzes, getQuizzesByCourse } from '../api/quizManager.service';

const mockFrom = vi.fn();

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

describe('getTeacherQuizzes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('queries quizzes table', async () => {
    const fromSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    mockFrom.mockImplementation(fromSpy);
    await getTeacherQuizzes('tenant-1');
    expect(fromSpy).toHaveBeenCalledWith('quizzes');
  });

  it('returns empty array for no quizzes', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    const result = await getTeacherQuizzes('tenant-1');
    expect(result).toEqual([]);
  });

  it('enriches quizzes with question_count and assignment_count', async () => {
    const quizData = [
      {
        id: 'q1',
        title: 'Math Quiz',
        quiz_questions: [{ id: 'qq1' }, { id: 'qq2' }],
        quiz_assignments: [{ id: 'qa1' }],
      },
    ];
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: quizData, error: null }),
    });
    const result = await getTeacherQuizzes('tenant-1');
    expect(result[0].question_count).toBe(2);
    expect(result[0].assignment_count).toBe(1);
  });

  it('returns 0 counts when arrays are empty', async () => {
    const quizData = [
      { id: 'q1', title: 'Math Quiz', quiz_questions: [], quiz_assignments: [] },
    ];
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: quizData, error: null }),
    });
    const result = await getTeacherQuizzes('tenant-1');
    expect(result[0].question_count).toBe(0);
    expect(result[0].assignment_count).toBe(0);
  });

  it('throws on database error', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    });
    await expect(getTeacherQuizzes('tenant-1')).rejects.toMatchObject({ message: 'DB error' });
  });
});

describe('getQuizzesByCourse', () => {
  beforeEach(() => vi.clearAllMocks());

  it('filters by course_id and tenant_id', async () => {
    const eqSpy = vi.fn().mockReturnThis();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: eqSpy,
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    await getQuizzesByCourse('course-1', 'tenant-1');
    expect(eqSpy).toHaveBeenCalledWith('course_id', 'course-1');
    expect(eqSpy).toHaveBeenCalledWith('tenant_id', 'tenant-1');
  });
});
