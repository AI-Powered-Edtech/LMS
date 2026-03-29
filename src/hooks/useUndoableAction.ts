import { useCallback, useRef } from 'react'

import { useToast } from '@/src/hooks/useToast'

/* ─── Types ───────────────────────────────────────────────────────────── */

export interface UseUndoableActionOptions {
  /** Toast message shown while the action is pending. */
  message: string
  /**
   * Delay in ms before the action executes.
   * Defaults to 5 000 ms.
   */
  delay?: number
  /** The destructive / irreversible action to run after the delay. */
  onExecute: () => void | Promise<void>
  /**
   * Optional callback invoked when the user cancels via "Batal".
   * Useful for reverting optimistic UI updates.
   */
  onUndo?: () => void
}

/* ─── Hook ────────────────────────────────────────────────────────────── */

/**
 * Schedules a destructive action with a 5-second undo window.
 *
 * Usage:
 * ```tsx
 * const { execute } = useUndoableAction({
 *   message: 'Kelas dihapus',
 *   onExecute: () => deleteClass(classId),
 * })
 *
 * <button onClick={execute}>Hapus Kelas</button>
 * ```
 */
export function useUndoableAction({
  message,
  delay = 5000,
  onExecute,
  onUndo,
}: UseUndoableActionOptions) {
  const addToast = useToast((s) => s.addToast)
  const removeToast = useToast((s) => s.removeToast)

  // Hold a ref to the pending timer so we can cancel it
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Hold a ref to the active toast id so we can remove it on undo
  const toastIdRef = useRef<string | null>(null)

  const execute = useCallback(() => {
    // Cancel any existing pending action before scheduling a new one
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (toastIdRef.current !== null) {
      removeToast(toastIdRef.current)
      toastIdRef.current = null
    }

    // We capture the toast id after addToast returns so we can reference it
    // in the action callback.  addToast is synchronous (Zustand set), so
    // after the call the new toast is the last item in the store.
    let capturedToastId: string | null = null

    const cancel = () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      if (capturedToastId !== null) {
        removeToast(capturedToastId)
        capturedToastId = null
        toastIdRef.current = null
      }
      onUndo?.()
    }

    addToast({
      type: 'warning',
      message,
      duration: delay,
      action: {
        label: 'Batal',
        onClick: cancel,
      },
    })

    // Capture the toast id — it's the last one added to the store
    capturedToastId = useToast.getState().toasts.at(-1)?.id ?? null
    toastIdRef.current = capturedToastId

    timerRef.current = setTimeout(async () => {
      timerRef.current = null
      // Remove the toast before executing so it doesn't linger
      if (capturedToastId !== null) {
        removeToast(capturedToastId)
        capturedToastId = null
        toastIdRef.current = null
      }
      await onExecute()
    }, delay)
  }, [message, delay, onExecute, onUndo, addToast, removeToast])

  return { execute }
}
