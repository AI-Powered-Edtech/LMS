import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { xapi } from "@/features/xapi";

import {
  startEventFlushing,
  stopEventFlushing,
  trackLearningEvent,
} from "../api/trackingService";
import type { EventMetadata, LearningEventType } from "../types/events.types";

interface LearningSessionContextValue {
  sessionId: string;
  trackEvent: (eventType: LearningEventType, metadata?: EventMetadata) => void;
}

export const LearningSessionContext =
  createContext<LearningSessionContextValue | null>(null);

interface LearningSessionProviderProps {
  courseId?: string;
  lessonId?: string;
  moduleId?: string;
  children: ReactNode;
}

export function LearningSessionProvider({
  courseId,
  lessonId,
  moduleId,
  children,
}: LearningSessionProviderProps) {
  // New session on each lesson change (or initial mount)
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const prevLessonRef = useRef(lessonId);

  useEffect(() => {
    if (prevLessonRef.current !== lessonId) {
      prevLessonRef.current = lessonId;
      setSessionId(crypto.randomUUID());
    }
  }, [lessonId]);

  // xAPI: record course experienced whenever a new lesson session starts
  useEffect(() => {
    if (courseId) {
      xapi.courseExperienced(courseId).catch(() => {});
    }
    // Only re-emit when lessonId changes (new lesson session), not on every courseId change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  useEffect(() => {
    startEventFlushing();
    return () => {
      stopEventFlushing();
    };
  }, []);

  const value = useMemo<LearningSessionContextValue>(
    () => ({
      sessionId,
      trackEvent: (eventType: LearningEventType, metadata?: EventMetadata) => {
        trackLearningEvent({
          eventType,
          sessionId,
          courseId,
          lessonId,
          moduleId,
          metadata,
        });
      },
    }),
    [sessionId, courseId, lessonId, moduleId],
  );

  return (
    <LearningSessionContext.Provider value={value}>
      {children}
    </LearningSessionContext.Provider>
  );
}

export function useLearningSession() {
  const ctx = useContext(LearningSessionContext);
  if (!ctx)
    throw new Error(
      "useLearningSession must be used within LearningSessionProvider",
    );
  return ctx;
}
