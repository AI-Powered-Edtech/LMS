import { createQueryKeys } from "@/shared/lib/queryKeys";

export const interactiveBlockKeys = {
  ...createQueryKeys("interactive-blocks"),
  /** Progress for a specific block + user: ['interactive-blocks', tenantId, 'progress', blockId, userId] */
  progress: (tenantId: string, blockId: string, userId: string) =>
    ["interactive-blocks", tenantId, "progress", blockId, userId] as const,
};
