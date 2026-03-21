import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useQuizTimer } from '../hooks/useQuizTimer';

describe('useQuizTimer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('initializes with timeLimitMinutes when no expiresAt', () => {
    const onTimeUp = vi.fn();
    const { result } = renderHook(() =>
      useQuizTimer({ expiresAt: null, timeLimitMinutes: 10, onTimeUp })
    );
    expect(result.current.timeLeft).toBe(600); // 10 * 60
  });

  it('initializes from expiresAt when provided', () => {
    const onTimeUp = vi.fn();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes from now
    const { result } = renderHook(() =>
      useQuizTimer({ expiresAt, timeLimitMinutes: 10, onTimeUp })
    );
    // Should be close to 300 seconds (5 minutes)
    expect(result.current.timeLeft).toBeGreaterThan(295);
    expect(result.current.timeLeft).toBeLessThanOrEqual(300);
  });

  it('decrements timeLeft each second', () => {
    const onTimeUp = vi.fn();
    const { result } = renderHook(() =>
      useQuizTimer({ expiresAt: null, timeLimitMinutes: 1, onTimeUp })
    );
    expect(result.current.timeLeft).toBe(60);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.timeLeft).toBe(57);
  });

  it('isWarning when timeLeft <= 300 and > 60', () => {
    const onTimeUp = vi.fn();
    const expiresAt = new Date(Date.now() + 200 * 1000).toISOString(); // 200s from now
    const { result } = renderHook(() =>
      useQuizTimer({ expiresAt, timeLimitMinutes: 10, onTimeUp })
    );
    expect(result.current.isWarning).toBe(true);
    expect(result.current.isCritical).toBe(false);
    expect(result.current.progressColor).toBe('bg-amber-500');
  });

  it('isCritical when timeLeft <= 60', () => {
    const onTimeUp = vi.fn();
    const expiresAt = new Date(Date.now() + 45 * 1000).toISOString(); // 45s from now
    const { result } = renderHook(() =>
      useQuizTimer({ expiresAt, timeLimitMinutes: 10, onTimeUp })
    );
    expect(result.current.isCritical).toBe(true);
    expect(result.current.progressColor).toBe('bg-red-500');
  });

  it('uses bg-blue-500 when plenty of time remains', () => {
    const onTimeUp = vi.fn();
    const { result } = renderHook(() =>
      useQuizTimer({ expiresAt: null, timeLimitMinutes: 30, onTimeUp })
    );
    expect(result.current.progressColor).toBe('bg-blue-500');
    expect(result.current.isWarning).toBe(false);
    expect(result.current.isCritical).toBe(false);
  });

  it('calls onTimeUp when timer reaches 0', () => {
    const onTimeUp = vi.fn();
    const expiresAt = new Date(Date.now() + 2000).toISOString(); // 2 seconds from now
    renderHook(() =>
      useQuizTimer({ expiresAt, timeLimitMinutes: 1, onTimeUp })
    );

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onTimeUp).toHaveBeenCalled();
  });
});
