/**
 * antiCheatLogger.ts — Client-side anti-cheat event accumulator
 *
 * Batches anti-cheat events in memory before sending to the server.
 * Prevents flooding the server with individual event RPCs.
 *
 * Events are accumulated per attempt and can be flushed manually
 * or automatically when a threshold is reached.
 */

// ─── Types ───────────────────────────────────────────────

export type AntiCheatEventType =
  | "TAB_SWITCH"
  | "WINDOW_BLUR"
  | "TIME_ANOMALY"
  | "COPY_PASTE"
  | "RIGHT_CLICK"
  | "DEVTOOLS_OPEN"
  | "KEYBOARD_SHORTCUT_BLOCKED"
  | "PRINT_ATTEMPT";

export interface AntiCheatEvent {
  type: AntiCheatEventType;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface AntiCheatSummary {
  attemptId: string;
  totalEvents: number;
  eventsByType: Record<AntiCheatEventType, number>;
  firstEventAt: string | null;
  lastEventAt: string | null;
  severityLevel: "none" | "low" | "medium" | "high";
}

export interface AntiCheatLogger {
  /** Log a new anti-cheat event */
  log: (type: AntiCheatEventType, metadata?: Record<string, unknown>) => void;
  /** Get total event count */
  getEventCount: () => number;
  /** Get count for a specific event type */
  getEventCountByType: (type: AntiCheatEventType) => number;
  /** Get all accumulated events */
  getEvents: () => readonly AntiCheatEvent[];
  /** Get a summary of all events */
  getSummary: () => AntiCheatSummary;
  /** Flush and return all events (clears the buffer) */
  flush: () => AntiCheatEvent[];
  /** Reset the logger */
  reset: () => void;
}

// ─── Constants ───────────────────────────────────────────

/** Weighted severity scores per event type */
const SEVERITY_WEIGHTS: Record<AntiCheatEventType, number> = {
  TAB_SWITCH: 2,
  WINDOW_BLUR: 1,
  TIME_ANOMALY: 2,
  COPY_PASTE: 3,
  RIGHT_CLICK: 1,
  // Weight 2 (not 5) to account for false-positives from external monitors / browser extensions
  DEVTOOLS_OPEN: 2,
  KEYBOARD_SHORTCUT_BLOCKED: 3,
  PRINT_ATTEMPT: 2,
};

// ─── Factory ─────────────────────────────────────────────

/**
 * Create a new anti-cheat logger for a quiz attempt.
 *
 * @param attemptId - The quiz attempt ID to associate events with
 * @param options - Optional configuration
 */
export function createAntiCheatLogger(
  attemptId: string,
  options?: {
    /** Maximum events to buffer before auto-flush. Default: 50 */
    maxBufferSize?: number;
    /** Callback when buffer is full */
    onBufferFull?: (events: AntiCheatEvent[]) => void;
  },
): AntiCheatLogger {
  const maxBuffer = options?.maxBufferSize ?? 50;
  let events: AntiCheatEvent[] = [];

  const log: AntiCheatLogger["log"] = (type, metadata) => {
    const event: AntiCheatEvent = {
      type,
      timestamp: new Date().toISOString(),
      metadata,
    };

    events.push(event);

    // Auto-flush if buffer is full
    if (events.length >= maxBuffer && options?.onBufferFull) {
      const flushed = [...events];
      events = [];
      options.onBufferFull(flushed);
    }
  };

  const getEventCount: AntiCheatLogger["getEventCount"] = () => events.length;

  const getEventCountByType: AntiCheatLogger["getEventCountByType"] = (type) => {
    let count = 0;
    for (let i = 0; i < events.length; i++) {
      if (events[i].type === type) count++;
    }
    return count;
  };

  const getEvents: AntiCheatLogger["getEvents"] = () =>
    Object.freeze([...events]);

  const getSummary: AntiCheatLogger["getSummary"] = () => {
    const eventsByType = {} as Record<AntiCheatEventType, number>;
    const allTypes: AntiCheatEventType[] = [
      "TAB_SWITCH",
      "WINDOW_BLUR",
      "TIME_ANOMALY",
      "COPY_PASTE",
      "RIGHT_CLICK",
      "DEVTOOLS_OPEN",
      "KEYBOARD_SHORTCUT_BLOCKED",
      "PRINT_ATTEMPT",
    ];

    for (let i = 0; i < allTypes.length; i++) {
      eventsByType[allTypes[i]] = 0;
    }

    for (let i = 0; i < events.length; i++) {
      const type = events[i].type;
      if (eventsByType[type] !== undefined) {
        eventsByType[type]++;
      }
    }

    // Weighted score untuk severity yang lebih akurat
    const weightedScore = allTypes.reduce((acc, t) => {
      return acc + eventsByType[t] * (SEVERITY_WEIGHTS[t] ?? 1);
    }, 0);

    let severityLevel: AntiCheatSummary["severityLevel"] = "none";

    if (weightedScore >= 10) severityLevel = "high";
    else if (weightedScore >= 5) severityLevel = "medium";
    else if (weightedScore >= 1) severityLevel = "low";

    return {
      attemptId,
      totalEvents: events.length,
      eventsByType,
      firstEventAt: events.length > 0 ? events[0].timestamp : null,
      lastEventAt:
        events.length > 0 ? events[events.length - 1].timestamp : null,
      severityLevel,
    };
  };

  const flush: AntiCheatLogger["flush"] = () => {
    const flushed = [...events];
    events = [];
    return flushed;
  };

  const reset: AntiCheatLogger["reset"] = () => {
    events = [];
  };

  return {
    log,
    getEventCount,
    getEventCountByType,
    getEvents,
    getSummary,
    flush,
    reset,
  };
}
