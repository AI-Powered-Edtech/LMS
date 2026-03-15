import { describe, it, expect, vi, beforeEach } from 'vitest';
import { lessonService, ProgressQueueItem, SignedProgressQueue } from '../lessonService';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
    },
    rpc: vi.fn(),
  }
}));

describe('lessonService Security Fix', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        Object.defineProperty(globalThis, 'crypto', {
            value: {
                subtle: {
                    importKey: vi.fn().mockResolvedValue({}),
                    sign: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer),
                    verify: vi.fn().mockResolvedValue(true),
                }
            },
            writable: true
        });
    });

    it('should load secure queue correctly with a valid session', async () => {
        const mockQueue = [{ lessonId: '123', status: 'started', progressPercentage: 50, lastPosition: 0, timestamp: Date.now() }];

        // Mock a valid session
        (supabase.auth.getSession as any).mockResolvedValue({
            data: { session: { user: { id: 'user-1' }, expires_at: 1000 } }
        });

        const signedQueue: SignedProgressQueue = {
            payload: JSON.stringify(mockQueue),
            signature: '010203',
            createdAt: Date.now()
        };
        localStorage.setItem('edusync_progress_queue', JSON.stringify(signedQueue));

        // Use queueProgressUpdate to trigger loadSecureQueue
        (supabase.rpc as any).mockResolvedValue({ error: new Error('Network error') }); // Force error to use queue
        (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: 'user-1' } } });

        await lessonService.queueProgressUpdate('456', 'tenant-1', 'started', 10);

        const rawSaved = localStorage.getItem('edusync_progress_queue');
        expect(rawSaved).toBeTruthy();

        const savedQueue = JSON.parse(rawSaved!) as SignedProgressQueue;
        const payload = JSON.parse(savedQueue.payload) as ProgressQueueItem[];

        expect(payload.length).toBe(2);
        expect(payload[0].lessonId).toBe('123');
        expect(payload[1].lessonId).toBe('456');
    });
});
