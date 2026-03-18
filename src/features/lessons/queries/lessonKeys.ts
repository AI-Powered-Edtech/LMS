import { createQueryKeys } from '@/src/lib/queryKeys';

const base = createQueryKeys('lessons');

export const lessonKeys = {
    ...base,
    progress: (tenantId: string, userId: string) =>
        [...base.all(tenantId), 'progress', userId] as const,
};
