import { describe, it, expect, vi } from 'vitest';

vi.mock('../../lib/supabase', () => ({
    supabase: {
        auth: { getSession: vi.fn(), getUser: vi.fn() },
        rpc: vi.fn(),
        from: vi.fn()
    }
}));

import { quizService } from '../quizService';

describe('Quiz Service (Mocked)', () => {
    it('Should be truthy', () => {
        expect(quizService).toBeTruthy();
    });
});
