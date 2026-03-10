/**
 * ProgressReporter — Client-side telemetry batching for Smart Player
 *
 * Collects telemetry events and flushes them to the
 * `progress-events` Edge Function in batches.
 *
 * Flush triggers:
 *   - 15 seconds elapsed since last flush
 *   - 10 events collected
 *   - lesson_completed event pushed
 *   - Tab close / visibility hidden (beforeunload)
 *
 * Optimization:
 *   - Local dedup before flush: for video_progress events,
 *     only keeps max(position) per lesson_id to reduce payload ~80%.
 */

const FLUSH_INTERVAL_MS = 15_000;
const FLUSH_THRESHOLD = 10;
const EDGE_FUNCTION_PATH = "/functions/v1/progress-events";

export interface TelemetryEvent {
    event_id: string;
    event_version: 1;
    tenant_id: string;
    user_id: string;
    lesson_id: string;
    course_id?: string;
    event_type: string;
    position?: number;
    timestamp: number;
    session_id?: string;
    device_type?: string;
}

function generateEventId(): string {
    return crypto.randomUUID();
}

/**
 * Deduplicates video_progress events before flush.
 * Groups by lesson_id and keeps only the event with max(position).
 * Non-progress events (lesson_completed, quiz_submitted, etc.) are always kept.
 */
function deduplicateEvents(events: TelemetryEvent[]): TelemetryEvent[] {
    const progressByLesson = new Map<string, TelemetryEvent>();
    const nonProgressEvents: TelemetryEvent[] = [];

    for (const event of events) {
        if (event.event_type === "video_progress") {
            const existing = progressByLesson.get(event.lesson_id);
            if (!existing || (event.position ?? 0) > (existing.position ?? 0)) {
                progressByLesson.set(event.lesson_id, event);
            }
        } else {
            // Keep all non-progress events (lesson_completed, video_paused, etc.)
            nonProgressEvents.push(event);
        }
    }

    return [...nonProgressEvents, ...progressByLesson.values()];
}

export class ProgressReporter {
    private buffer: TelemetryEvent[] = [];
    private flushTimer: ReturnType<typeof setInterval> | null = null;
    private supabaseUrl: string;
    private supabaseAnonKey: string;
    private isFlushing = false;

    constructor(supabaseUrl: string, supabaseAnonKey: string) {
        this.supabaseUrl = supabaseUrl;
        this.supabaseAnonKey = supabaseAnonKey;
    }

    /** Start the periodic flush timer and register unload listeners. */
    start(): void {
        this.flushTimer = setInterval(() => {
            this.flush();
        }, FLUSH_INTERVAL_MS);

        window.addEventListener("beforeunload", this.handleUnload);
        document.addEventListener("visibilitychange", this.handleVisibilityChange);
    }

    /** Stop the reporter, flush remaining events, and clean up listeners. */
    stop(): void {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
        window.removeEventListener("beforeunload", this.handleUnload);
        document.removeEventListener("visibilitychange", this.handleVisibilityChange);

        // Final flush
        this.flush();
    }

    /** Push a telemetry event into the buffer. Triggers flush if threshold reached. */
    push(event: Omit<TelemetryEvent, "event_id" | "event_version" | "timestamp">): void {
        const fullEvent: TelemetryEvent = {
            ...event,
            event_id: generateEventId(),
            event_version: 1,
            timestamp: Date.now(),
        };

        this.buffer.push(fullEvent);

        // Immediate flush on critical events
        // lesson_completed: save progress now
        // video_paused: students often pause then leave tab without triggering beforeunload
        if (event.event_type === "lesson_completed" || event.event_type === "video_paused") {
            this.flush();
            return;
        }

        // Flush when threshold reached
        if (this.buffer.length >= FLUSH_THRESHOLD) {
            this.flush();
        }
    }

    /** Flush the current buffer to the Edge Function. Deduplicates before sending. */
    async flush(): Promise<void> {
        if (this.buffer.length === 0 || this.isFlushing) return;

        this.isFlushing = true;
        const rawBatch = this.buffer.splice(0); // drain buffer

        // Deduplicate: keep max(position) per lesson for video_progress
        const batch = deduplicateEvents(rawBatch);

        try {
            const url = `${this.supabaseUrl}${EDGE_FUNCTION_PATH}`;
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.supabaseAnonKey}`,
                },
                body: JSON.stringify(batch),
            });

            if (!response.ok) {
                if (response.status === 429 || response.status >= 500) {
                    console.warn(`[ProgressReporter] Server returned ${response.status}, re-queuing ${batch.length} events`);
                    this.buffer.unshift(...batch);
                } else {
                    console.error(`[ProgressReporter] Failed to send batch: ${response.status}`);
                }
            }
        } catch (error) {
            console.warn("[ProgressReporter] Network error, re-queuing events:", error);
            this.buffer.unshift(...batch);
        } finally {
            this.isFlushing = false;
        }
    }

    // --- Private event handlers ---

    private handleUnload = (): void => {
        if (this.buffer.length === 0) return;

        // Deduplicate before sending via beacon too
        const batch = deduplicateEvents(this.buffer);
        const url = `${this.supabaseUrl}${EDGE_FUNCTION_PATH}`;
        const blob = new Blob([JSON.stringify(batch)], { type: "application/json" });
        navigator.sendBeacon(url, blob);
        this.buffer = [];
    };

    private handleVisibilityChange = (): void => {
        if (document.visibilityState === "hidden") {
            this.flush();
        }
    };
}
