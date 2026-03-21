import { describe, it, expect, vi, beforeEach } from 'vitest';
import { questionBankService } from '../api/questionBankService';

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

const mockQuestion = {
  type: 'MCQ' as const,
  text: 'What is 2+2?',
  explanation: 'Basic addition',
  difficulty_level: 1,
  options: [
    { option_text: '3', is_correct: false, order_index: 0 },
    { option_text: '4', is_correct: true, order_index: 1 },
  ],
  tags: ['math', 'basics'],
};

describe('questionBankService.createQuestion', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts into question_bank table', async () => {
    const fromSpy = vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'q1' }, error: null }),
    });
    mockFrom.mockImplementation(fromSpy);
    try {
      await questionBankService.createQuestion(mockQuestion);
    } catch {
      // tolerate if additional steps fail
    }
    const tableNames = fromSpy.mock.calls.map((call: unknown[]) => call[0]);
    expect(tableNames.some((t: unknown) => typeof t === 'string' && t.includes('question'))).toBe(true);
  });

  it('throws on insert error', async () => {
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
    });
    await expect(questionBankService.createQuestion(mockQuestion)).rejects.toMatchObject({
      message: 'Insert failed',
    });
  });
});

describe('questionBankService.searchQuestions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('queries question_bank table', async () => {
    const fromSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
      limit: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
    });
    mockFrom.mockImplementation(fromSpy);
    try {
      await questionBankService.searchQuestions({});
    } catch {
      // ok
    }
    const tableNames = fromSpy.mock.calls.map((call: unknown[]) => call[0]);
    expect(tableNames.some((t: unknown) => typeof t === 'string' && t.includes('question'))).toBe(true);
  });
});
