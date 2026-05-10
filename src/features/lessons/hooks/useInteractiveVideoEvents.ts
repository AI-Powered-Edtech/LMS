import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import type {
  InteractiveEvent,
  InteractiveVideoMetadata,
  Quiz,
} from "@/features/lessons/types";
import { getQuizWithQuestions } from "@/features/quizzes/api/quizManager.service";
import { logger } from "@/utils/logger";

// ==========================================================================
// useInteractiveVideoEvents — Shared hook for interactive video pop-up quizzes
//
// Used by both VideoViewer.tsx and VideoBlock.tsx to avoid duplicated logic.
// Manages: quiz prefetching, active event detection, completion tracking,
// and video pause/resume around quiz overlays.
// ==========================================================================

interface UseInteractiveVideoEventsOptions {
  metadata?: Record<string, unknown>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

interface UseInteractiveVideoEventsResult {
  events: InteractiveEvent[];
  activeEvent: InteractiveEvent | null;
  completedEvents: Set<number>;
  loadedQuizzes: Record<string, Quiz>;
  /** Call from timeupdate handler. Returns true if an event was triggered (video paused). */
  checkForEvent: (currentTime: number) => boolean;
  /** Call when the student completes the pop-up quiz. Resumes video. */
  handleEventComplete: () => void;
}

export function useInteractiveVideoEvents({
  metadata,
  videoRef,
}: UseInteractiveVideoEventsOptions): UseInteractiveVideoEventsResult {
  const { tenantId } = useAuth();

  const interactiveData = metadata as InteractiveVideoMetadata | undefined;
  const events = useMemo(
    () => interactiveData?.interactiveEvents ?? [],
    [interactiveData?.interactiveEvents],
  );

  const [activeEvent, setActiveEvent] = useState<InteractiveEvent | null>(null);
  const [completedEvents, setCompletedEvents] = useState<Set<number>>(
    new Set(),
  );
  const [loadedQuizzes, setLoadedQuizzes] = useState<Record<string, Quiz>>({});

  // Stable ref for events to avoid stale closures
  const eventsRef = useRef(events);
  eventsRef.current = events;

  const completedRef = useRef(completedEvents);
  completedRef.current = completedEvents;

  const activeRef = useRef(activeEvent);
  activeRef.current = activeEvent;

  // Stable key derived from the identity of each event — detects additions, removals, and swaps
  // even when the array length stays the same (e.g. one quiz replaced by another).
  // Uses quizId+timeInSeconds as the unique event fingerprint.
  const eventIdsKey = useMemo(
    () => events.map((e) => `${e.quizId ?? ""}:${e.timeInSeconds}`).join(","),
    [events],
  );

  // Prefetch quizzes referenced by events
  useEffect(() => {
    if (!tenantId || events.length === 0) return;

    // ⚡ Perf: consolidate multiple array traversals into a single pass to reduce O(N) operations.
    const uniqueIds = new Set<string>();
    for (let i = 0; i < events.length; i++) {
      const qId = events[i].quizId;
      if (qId) uniqueIds.add(qId as string);
    }

    if (uniqueIds.size === 0) return;

    uniqueIds.forEach((id) => {
      getQuizWithQuestions(id, tenantId)
        .then((quizData) => {
          setLoadedQuizzes((prev) => ({
            ...prev,
            [id]: quizData as unknown as Quiz,
          }));
        })
        .catch((err) =>
          logger.error("[useInteractiveVideoEvents] Failed to load quiz", err),
        );
    });
  }, [tenantId, events, eventIdsKey]);

  // Check if the current playback time matches an interactive event
  const checkForEvent = useCallback(
    (currentTime: number): boolean => {
      if (activeRef.current) return false; // Already showing an event

      for (const ev of eventsRef.current) {
        if (!completedRef.current.has(ev.timeInSeconds)) {
          if (
            currentTime >= ev.timeInSeconds &&
            currentTime <= ev.timeInSeconds + 1.5
          ) {
            videoRef.current?.pause();
            setActiveEvent(ev);
            return true;
          }
        }
      }
      return false;
    },
    [videoRef],
  );

  // Complete the active event and resume video
  const handleEventComplete = useCallback(() => {
    const current = activeRef.current;
    if (current) {
      setCompletedEvents((prev) => new Set(prev).add(current.timeInSeconds));
      setActiveEvent(null);
      // Resume video slightly past the trigger point to avoid re-triggering
      if (videoRef.current) {
        videoRef.current.currentTime = current.timeInSeconds + 2;
        videoRef.current.play().catch(logger.error);
      }
    }
  }, [videoRef]);

  return {
    events,
    activeEvent,
    completedEvents,
    loadedQuizzes,
    checkForEvent,
    handleEventComplete,
  };
}
