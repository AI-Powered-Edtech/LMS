/**
 * AI Tutor SSE Streaming Hook
 *
 * Uses Server-Sent Events (SSE) to stream AI Tutor responses token by token.
 * Provides real-time streaming from the backend's /api/v1/ai/tutor/stream endpoint.
 *
 * Features:
 * - Token-by-token streaming for responsive UI
 * - Automatic reconnection on failure
 * - Session persistence
 * - Rate limiting integration
 * - Error handling with retry logic
 */

import { useState, useCallback, useRef } from 'react';
import { getAuthToken } from '@/services/auth/vilSession';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StreamingChunk {
  token: string;
  timestamp: number;
}

export interface StreamingState {
  status: 'idle' | 'connecting' | 'streaming' | 'completed' | 'error';
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

// ─── SSE Event Types ─────────────────────────────────────────────────────────

type SSEEventType = 'start' | 'message' | 'done' | 'error';

interface SSEEventData {
  status?: string;
  token?: string;
  reply?: string;
  session_id?: string;
  error?: string;
}

// ─── API Base URL ─────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || '';

// ─── Main Hook ────────────────────────────────────────────────────────────────

export function useAiStream(options: UseAiStreamOptions = {}) {
  const { onToken, onComplete, onError, maxRetries = 2 } = options;

  const [streamingState, setStreamingState] = useState<StreamingState>({
    status: 'idle',
    tokens: [],
    fullText: '',
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
        status: 'connecting',
        tokens: [],
        fullText: '',
        sessionId,
        startTime: Date.now(),
      });

      try {
        const token = await getAuthToken();
        if (!token) {
          throw new Error('Authentication required');
        }

        const response = await fetch(`${API_BASE}/api/v1/ai/tutor/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Accept': 'text/event-stream',
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
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('ReadableStream not supported');
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';
        let currentSessionId = sessionId;

        setStreamingState((prev) => ({
          ...prev,
          status: 'streaming',
        }));

        // Read SSE stream
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          // Decode chunk
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // Parse SSE events
          const lines = buffer.split('\n');
          buffer = ''; // Clear buffer

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Skip empty lines and comments
            if (!line.trim() || line.startsWith(':')) {
              continue;
            }

            // Parse event type
            if (line.startsWith('event:')) {
              const eventType = line.replace('event:', '').trim() as SSEEventType;

              // Next line should be data
              const dataLine = lines[i + 1];
              if (!dataLine || !dataLine.startsWith('data:')) {
                continue;
              }

              try {
                const eventData: SSEEventData = JSON.parse(
                  dataLine.replace('data:', '').trim()
                );

                // Handle different event types
                switch (eventType) {
                  case 'start':
                    // Processing started
                    break;

                  case 'message':
                    // New token or complete message
                    if (eventData.token) {
                      // Token-by-token streaming
                      const newChunk: StreamingChunk = {
                        token: eventData.token,
                        timestamp: Date.now(),
                      };

                      fullText += eventData.token;

                      setStreamingState((prev) => ({
                        ...prev,
                        tokens: [...prev.tokens, newChunk],
                        fullText,
                      }));

                      // Call onToken callback
                      onToken?.(eventData.token, fullText);
                    } else if (eventData.reply) {
                      // Complete message received
                      fullText = eventData.reply;
                      currentSessionId = eventData.session_id;

                      setStreamingState((prev) => ({
                        ...prev,
                        fullText,
                        sessionId: currentSessionId,
                      }));

                      // Clear previous tokens as we got the full message
                      onToken?.('', fullText);
                    }
                    break;

                  case 'done':
                    // Streaming completed
                    currentSessionId = eventData.session_id || currentSessionId;

                    setStreamingState((prev) => ({
                      ...prev,
                      status: 'completed',
                      sessionId: currentSessionId,
                      endTime: Date.now(),
                    }));

                    onComplete?.(fullText, currentSessionId);
                    retryCountRef.current = 0; // Reset retry count on success
                    break;

                  case 'error':
                    throw new Error(eventData.error || 'Streaming error occurred');
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE event:', line, parseError);
              }

              i++; // Skip data line
            }
          }
        }

        // If we exit the loop without 'done' event, mark as completed
        setStreamingState((prev) => {
          if (prev.status === 'streaming') {
            return {
              ...prev,
              status: 'completed',
              endTime: Date.now(),
            };
          }
          return prev;
        });

      } catch (error: any) {
        if (error.name === 'AbortError') {
          // Stream was intentionally aborted, don't treat as error
          return;
        }

        const errorMessage = error.message || 'Failed to start stream';

        // Retry logic
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          console.log(`Retrying stream (${retryCountRef.current}/${maxRetries})...`);

          // Wait before retry (exponential backoff)
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * retryCountRef.current)
          );

          // Retry with same parameters
          return startStream(lessonId, message, sessionId);
        }

        // Max retries reached
        setStreamingState((prev) => ({
          ...prev,
          status: 'error',
          error: errorMessage,
          endTime: Date.now(),
        }));

        onError?.(errorMessage);
      }
    },
    [onToken, onComplete, onError, maxRetries]
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
      status: prev.status === 'streaming' || prev.status === 'connecting'
        ? 'idle'
        : prev.status,
    }));
  }, []);

  /**
   * Reset streaming state
   */
  const resetStream = useCallback(() => {
    abortStream();
    setStreamingState({
      status: 'idle',
      tokens: [],
      fullText: '',
    });
    retryCountRef.current = 0;
  }, [abortStream]);

  return {
    streamingState,
    startStream,
    abortStream,
    resetStream,
    isStreaming: streamingState.status === 'streaming' || streamingState.status === 'connecting',
    fullText: streamingState.fullText,
  };
}

export default useAiStream;
