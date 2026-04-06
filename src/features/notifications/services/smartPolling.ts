/**
 * Smart Polling Service for Notifications
 *
 * Adjusts polling frequency based on user activity to reduce server load
 * while maintaining responsive notifications.
 */

export interface SmartPollingConfig {
  /** Polling interval when user is active (ms) */
  activeIntervalMs: number
  /** Polling interval when user is idle (ms) */
  idleIntervalMs: number
  /** Time before considering user idle (ms) */
  idleTimeoutMs: number
  /** Whether to poll when tab is in background */
  pollInBackground: boolean
}

const DEFAULT_CONFIG: SmartPollingConfig = {
  activeIntervalMs: 30000, // 30 seconds
  idleIntervalMs: 120000, // 2 minutes
  idleTimeoutMs: 300000, // 5 minutes
  pollInBackground: false,
}

/**
 * Smart polling hook that adjusts frequency based on user activity
 */
export function createSmartPollingManager(config?: Partial<SmartPollingConfig>): {
  /** Get current polling interval */
  getInterval: () => number
  /** Mark user as active */
  markActive: () => void
  /** Start smart polling */
  start: (callback: () => void) => void
  /** Stop polling */
  stop: () => void
} {
  const resolvedConfig = { ...DEFAULT_CONFIG, ...config }
  let isUserActive = true
  let lastActivityTime = Date.now()
  let pollingTimer: number | null = null
  let activityTimer: number | null = null
  let pollCallback: (() => void) | null = null

  /**
   * Get current polling interval based on user state
   */
  function getInterval(): number {
    const timeSinceActivity = Date.now() - lastActivityTime
    const isIdle = timeSinceActivity > resolvedConfig.idleTimeoutMs

    if (isIdle) {
      return resolvedConfig.idleIntervalMs
    }

    return resolvedConfig.activeIntervalMs
  }

  /**
   * Mark user as active
   */
  function markActive(): void {
    isUserActive = true
    lastActivityTime = Date.now()

    // If polling interval changed, restart polling
    if (pollCallback) {
      stop()
      start(pollCallback)
    }
  }

  /**
   * Start smart polling
   */
  function start(callback: () => void): void {
    pollCallback = callback
    scheduleNextPoll()
    setupActivityListeners()
  }

  /**
   * Stop polling
   */
  function stop(): void {
    if (pollingTimer) {
      clearTimeout(pollingTimer)
      pollingTimer = null
    }

    if (activityTimer) {
      clearTimeout(activityTimer)
      activityTimer = null
    }

    removeActivityListeners()
    pollCallback = null
  }

  /**
   * Schedule next poll based on current state
   */
  function scheduleNextPoll(): void {
    if (!pollCallback) return

    // Don't poll in background if disabled
    if (!resolvedConfig.pollInBackground && document.hidden) {
      pollingTimer = window.setTimeout(() => {
        scheduleNextPoll()
      }, 5000) // Check again in 5 seconds
      return
    }

    const interval = getInterval()

    pollingTimer = window.setTimeout(() => {
      pollCallback?.()
      scheduleNextPoll()
    }, interval)
  }

  /**
   * Setup activity event listeners
   */
  function setupActivityListeners(): void {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']

    const handleActivity = (): void => {
      markActive()
    }

    for (const event of events) {
      window.addEventListener(event, handleActivity, { passive: true })
    }

    // Visibility change handler
    const handleVisibilityChange = (): void => {
      if (!document.hidden) {
        markActive()
        // Immediate poll when returning to tab
        pollCallback?.()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Store listeners for cleanup
    ;(setupActivityListeners as any)._listeners = { handleActivity, handleVisibilityChange, events }
  }

  /**
   * Remove activity event listeners
   */
  function removeActivityListeners(): void {
    const listeners = (setupActivityListeners as any)._listeners
    if (!listeners) return

    for (const event of listeners.events) {
      window.removeEventListener(event, listeners.handleActivity)
    }

    document.removeEventListener('visibilitychange', listeners.handleVisibilityChange)
    ;(setupActivityListeners as any)._listeners = null
  }

  return {
    getInterval,
    markActive,
    start,
    stop,
  }
}

/**
 * Singleton instance for app-wide smart polling
 */
let smartPollingInstance: ReturnType<typeof createSmartPollingManager> | null = null

/**
 * Get smart polling manager singleton
 */
export function getSmartPollingManager(): ReturnType<typeof createSmartPollingManager> {
  if (!smartPollingInstance) {
    smartPollingInstance = createSmartPollingManager()
  }
  return smartPollingInstance
}

/**
 * Destroy smart polling singleton
 */
export function destroySmartPolling(): void {
  if (smartPollingInstance) {
    smartPollingInstance.stop()
    smartPollingInstance = null
  }
}
