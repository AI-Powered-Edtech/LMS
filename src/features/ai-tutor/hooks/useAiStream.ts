/**
 * AI Tutor SSE Streaming Hook
 *
 * Uses Server-Sent Events (SSE) to stream AI Tutor responses token by token.
 * Provides real-time streaming from the backend's /api/v1/ai/tutor/stream endpoint.
 *
 * Features:
 * - Token-by-token streaming for responsive UI
 * - Proper buffer accumulation (waits for \n\n before parsing)
 * - Automatic reconnection on failure
 * - Session persistence
 * - Rate limiting integration
 * - Error handling with retry logic
 */

import { useCallback, useRef, useState } from "react";

import { getAuthToken } from "@/services/auth/vilSession";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StreamingChunk {
  token: string;
  timestamp: number;
}

export interface StreamingState {
  status: "idle" | "connecting" | "streaming" | "completed" | "error";
  tokens: StreamingChunk[];
  fullText: string;
  sessionId?: string;
  error?: string;
  startTime?: number;
  endTime?: number;
}

export interface UseAiStreamOptions {
  onToken?: (token: string, fullText: string) => void;
  onComplete?: (fullText: string, sessionId?: string) => void;
  onError?: (error: string) => void;
  maxRetries?: number;
}

// ─── API Base URL ─────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || "";

// ─── SSE Event Parser ─────────────────────────────────────────────────────────

/**
 * Parse SSE events from a buffer.
 * Waits for complete events (delimited by \n\n) before parsing.
 * Returns parsed events and remaining buffer.
 */
function parseSSEEvents(buffer: string): {
  events: SSEEvent[];
  remaining: string;
} {
  const events: SSEEvent[] = [];
  let remaining = buffer;

  // Find complete events (separated by \n\n)
  while (true) {
    const eventEndIndex = remaining.indexOf("\n\n");
    if (eventEndIndex === -1) {
      // No complete event found, wait for more data
      break;
    }

    const eventText = remaining.slice(0, eventEndIndex);
    remaining = remaining.slice(eventEndIndex + 2);

    const parsed = parseSingleSSEEvent(eventText);
    if (parsed) {
      events.push(parsed);
    }
  }

  return { events, remaining };
}

/**
 * Parse a single SSE event from text like:
 * event: token
 * data: {"token": "Hello"}
 */
function parseSingleSSEEvent(eventText: string): SSEEvent | null {
  const lines = eventText.split("\n");
  let eventType = "message";
  let data: string | null = null;

  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventType = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      data = line.slice(5).trim();
    }
  }

  if (!data) return null;

  try {
    return { type: eventType as SSEEventType, data: JSON.parse(data) };
  } catch {
    return null;
  }
}

type SSEEventType = "start" | "token" | "done" | "error";

interface SSEEvent {
  type: SSEEventType;
  data: Record<string, any>;
}

// ─── Main Hook ────────────────────────────────────────────────────────────────

export function useAiStream(options: UseAiStreamOptions = {}) {
  const { onToken, onComplete, onError, maxRetries = 2 } = options;

  const [streamingState, setStreamingState] = useState<StreamingState>({
    status: "idle",
    tokens: [],
    fullText: "",
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);

  /**
   * Start streaming AI Tutor response
   */
  const startStream = useCallback(
    async (lessonId: string, message: string, sessionId?: string) => {
      // Abort any existing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Reset state
      setStreamingState({
        status: "connecting",
        tokens: [],
        fullText: "",
        sessionId,
        startTime: Date.now(),
      });

      try {
        const token = await getAuthToken();
        if (!token) {
          throw new Error("Authentication required");
        }

        const response = await fetch(`${API_BASE}/api/v1/ai/tutor/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            Accept: "text/event-stream",
          },
          body: JSON.stringify({
            lesson_id: lessonId,
            message,
            session_id: sessionId,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error ||
              `HTTP ${response.status}: ${response.statusText}`,
          );
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("ReadableStream not supported");
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";
        let currentSessionId = sessionId;

        setStreamingState((prev) => ({
          ...prev,
          status: "streaming",
        }));

        // Read SSE stream
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          // Decode chunk and append to buffer
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // Parse complete SSE events (only processes events delimited by \n\n)
          const { events, remaining } = parseSSEEvents(buffer);
          buffer = remaining; // Keep incomplete data in buffer

          // Handle each parsed event
          for (const event of events) {
            switch (event.type) {
              case "start":
                // Processing started
                break;

              case "token":
                // New token from Groq
                if (event.data.token) {
                  const newChunk: StreamingChunk = {
                    token: event.data.token,
                    timestamp: Date.now(),
                  };

                  fullText += event.data.token;

                  setStreamingState((prev) => ({
                    ...prev,
                    tokens: [...prev.tokens, newChunk],
                    fullText,
                  }));

                  onToken?.(event.data.token, fullText);
                }
                break;

              case "done":
                // Streaming completed
                currentSessionId = event.data.session_id || currentSessionId;

                setStreamingState((prev) => ({
                  ...prev,
                  status: "completed",
                  sessionId: currentSessionId,
                  endTime: Date.now(),
                }));

                onComplete?.(fullText, currentSessionId);
                retryCountRef.current = 0;
                break;

              case "error":
                throw new Error(event.data.error || "Streaming error occurred");
            }
          }
        }

        // If we exit the loop without 'done' event, mark as completed
        setStreamingState((prev) => {
          if (prev.status === "streaming") {
            return {
              ...prev,
              status: "completed",
              endTime: Date.now(),
            };
          }
          return prev;
        });
      } catch (error: any) {
        if (error.name === "AbortError") {
          return;
        }

        const errorMessage = error.message || "Failed to start stream";

        // Retry logic
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * retryCountRef.current),
          );
          return startStream(lessonId, message, sessionId);
        }

        setStreamingState((prev) => ({
          ...prev,
          status: "error",
          error: errorMessage,
          endTime: Date.now(),
        }));

        onError?.(errorMessage);
      }
    },
    [onToken, onComplete, onError, maxRetries],
  );

  /**
   * Abort current stream
   */
  const abortStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setStreamingState((prev) => ({
      ...prev,
      status:
        prev.status === "streaming" || prev.status === "connecting"
          ? "idle"
          : prev.status,
    }));
  }, []);

  /**
   * Reset streaming state
   */
  const resetStream = useCallback(() => {
    abortStream();
    setStreamingState({
      status: "idle",
      tokens: [],
      fullText: "",
    });
    retryCountRef.current = 0;
  }, [abortStream]);

  return {
    streamingState,
    startStream,
    abortStream,
    resetStream,
    isStreaming:
      streamingState.status === "streaming" ||
      streamingState.status === "connecting",
    fullText: streamingState.fullText,
  };
}

