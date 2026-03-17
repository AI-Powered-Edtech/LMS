// Quiz Heartbeat Hook - 30s heartbeat interval
// Part of the Quiz Engine Refactor

import { useEffect } from 'react';
import * as quizPlayerService from '../api/quizPlayer.service';

interface UseQuizHeartbeatOptions {
  attemptId: string | undefined;
  intervalMs?: number;
}

/**
 * Hook for quiz heartbeat tracking
 * Sends heartbeat signals every 30 seconds to track active quiz sessions
 */
export function useQuizHeartbeat({ 
  attemptId, 
  intervalMs = 30000 
}: UseQuizHeartbeatOptions): void {
  useEffect(() => {
    if (!attemptId) return;

    const interval = setInterval(() => {
      quizPlayerService.recordHeartbeat(attemptId);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [attemptId, intervalMs]);
}
