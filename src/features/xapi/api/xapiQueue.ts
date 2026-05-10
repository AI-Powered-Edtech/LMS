import { queueOperation, type QueueOperationType } from "@/utils/offlineQueue";
import { captureError } from "@/utils/sentry";

import type {
  XAPIContext,
  XAPIObjectType,
  XAPIResult,
  XAPIVerb,
} from "../types/index";
import { xapiService } from "./xapiService";

const XAPI_QUEUE_TYPE: QueueOperationType = "xapi-statement";

interface XAPIQueuePayload {
  verb: XAPIVerb;
  objectType: XAPIObjectType;
  objectId: string;
  result: XAPIResult;
  context: XAPIContext;
  userId: string;
}

export async function queueXapiStatement(
  verb: XAPIVerb,
  objectType: XAPIObjectType,
  objectId: string,
  result: XAPIResult = {},
  context: XAPIContext = {},
  userId: string,
): Promise<string | null> {
  const payload: XAPIQueuePayload = {
    verb,
    objectType,
    objectId,
    result,
    context: { ...context, platform: context.platform ?? "edusync" },
    userId,
  };

  const idempotencyKey = `xapi:${verb}:${objectType}:${objectId}:${userId}`;

  try {
    const queueId = await queueOperation(
      XAPI_QUEUE_TYPE,
      payload as unknown as Record<string, unknown>,
      idempotencyKey,
      {
        maxRetries: 3,
        conflictStrategy: "client-wins",
      },
    );
    return queueId;
  } catch (err) {
    captureError(err as Error, { context: "queueXapiStatement" });
    return null;
  }
}

export async function flushXapiStatements(): Promise<{
  synced: number;
  failed: number;
}> {
  const { processSyncQueue } = await import("@/utils/offlineQueue");
  const result = await processSyncQueue();
  return { synced: result.synced, failed: result.failed };
}

export const xapiQueue = {
  queueStatement: queueXapiStatement,
  flush: flushXapiStatements,
  recordStatement: xapiService.recordStatement,
};
