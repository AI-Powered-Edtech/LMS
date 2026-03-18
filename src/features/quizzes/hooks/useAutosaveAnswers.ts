// Autosave Answers Hook - Debounced dirty-tracking + batch RPC flush
// Part of the Quiz Engine Refactor

import { useState, useEffect, useRef, useCallback } from 'react';
import type { SubmitAnswer, SaveStatus } from '../types/quizzes.types';
import * as quizPlayerService from '../api/quizPlayer.service';
import { useAuth } from '@/src/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { QuizKeys } from '../queries/queryKeys';

interface UseAutosaveAnswersOptions {
  attemptId: string | undefined;
  debounceMs?: number;
}

interface UseAutosaveAnswersResult {
  saveStatus: SaveStatus;
  isOnline: boolean;
  dirtyAnswersRef: React.MutableRefObject<Record<string, SubmitAnswer>>;
  setAnswer: (questionId: string, answer: SubmitAnswer) => void;
  flushSave: () => Promise<void>;
}

/**
 * Hook for debounced autosave of quiz answers
 * Tracks dirty answers and flushes them in batches via RPC
 */
export function useAutosaveAnswers({
  attemptId,
  debounceMs = 3000,
}: UseAutosaveAnswersOptions): UseAutosaveAnswersResult {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [isOnline, setIsOnline] = useState(true);
  
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  
  const dirtyAnswersRef = useRef<Record<string, SubmitAnswer>>({});
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Network status ──────────────────────────────────────
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // ── Flush save function ────────────────────────────────
  const flushSave = useCallback(async () => {
    const dirty = dirtyAnswersRef.current;
    const keys = Object.keys(dirty);
    if (keys.length === 0 || !attemptId) return;

    const batch = keys.map(qId => dirty[qId]);
    dirtyAnswersRef.current = {};

    try {
      setSaveStatus('saving');
      await quizPlayerService.batchSaveAnswers(attemptId, batch);
      
      // DECISION: We intentionally skip React Query cache invalidation here.
      // Invalidation on every autosave flush (e.g. typing an essay) would trigger 
      // expensive re-fetches. The QuizPlayer component already maintains optimistically 
      // updated local state for all answers, so the UI remains perfectly in sync.
      /*
      if (tenantId) {
        queryClient.invalidateQueries({ 
          queryKey: QuizKeys.attemptQuestions(attemptId, tenantId) 
        });
      }
      */
      
      setSaveStatus('saved');
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Autosave failed:', err);
      // Put back failed answers so they retry
      keys.forEach(k => {
        if (!dirtyAnswersRef.current[k]) dirtyAnswersRef.current[k] = batch.find(b => b.question_id === k)!;
      });
      setSaveStatus(isOnline ? 'error' : 'offline');
    }
  }, [attemptId, isOnline]);

  // ── Set answer with debounce ────────────────────────────
  const setAnswer = useCallback((questionId: string, answer: SubmitAnswer) => {
    dirtyAnswersRef.current[questionId] = answer;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => flushSave(), debounceMs);
  }, [flushSave, debounceMs]);

  // ── Flush on unmount ─────────────────────────────────────
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      flushSave();
    };
  }, [flushSave]);

  return {
    saveStatus,
    isOnline,
    dirtyAnswersRef,
    setAnswer,
    flushSave,
  };
}
