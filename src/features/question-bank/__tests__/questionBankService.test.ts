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

  it('calls rpc create_question', async () => {
    mockRpc.mockResolvedValue({ data: { id: 'q1' }, error: null });
    try {
      await questionBankService.createQuestion(mockQuestion);
    } catch {
      // tolerate if additional steps fail
    }
    const rpcNames = mockRpc.mock.calls.map((call: unknown[]) => call[0]);
    expect(rpcNames.some((t: unknown) => typeof t === 'string' && t === 'create_question')).toBe(true);
  });

  it('throws on insert error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Insert failed' } });
    await expect(questionBankService.createQuestion(mockQuestion)).rejects.toMatchObject({
      message: 'Insert failed',
    });
  });
});

describe('questionBankService.searchQuestions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls rpc search_questions', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    try {
      await questionBankService.searchQuestions({});
    } catch {
      // ok
    }
    const rpcNames = mockRpc.mock.calls.map((call: unknown[]) => call[0]);
    expect(rpcNames.some((t: unknown) => typeof t === 'string' && t === 'search_questions')).toBe(true);
  });
});
