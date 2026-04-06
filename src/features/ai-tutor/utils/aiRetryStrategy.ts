/**
 * AI Retry Strategy Utilities
 *
 * Provides exponential backoff, circuit breaker, and retry logic
 * for all AI service calls across the application.
 */

export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries: number
  /** Initial delay in milliseconds (default: 1000) */
  initialDelayMs: number
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelayMs: number
  /** Exponential backoff multiplier (default: 2) */
  backoffMultiplier: number
  /** HTTP status codes that should trigger a retry (default: [429, 500, 502, 503, 504]) */
  retryableStatusCodes: number[]
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableStatusCodes: [429, 500, 502, 503, 504],
}

/**
 * Calculate delay with exponential backoff and jitter
 */
export function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt)
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs)
  // Add jitter: ±25% random variation
  const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1)
  return Math.max(0, Math.round(cappedDelay + jitter))
}

/**
 * Check if an error is retryable based on HTTP status or error message
 */
export function isRetryableError(
  error: unknown,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): boolean {
  if (!error) return false

  // Check for HTTP status codes
  if (typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status
    return config.retryableStatusCodes.includes(status)
  }

  // Check error message for common retryable patterns
  const errorMessage = error instanceof Error ? error.message : String(error)
  const retryablePatterns = [
    'rate limit',
    'too many requests',
    'service unavailable',
    'internal server error',
    'bad gateway',
    'gateway timeout',
    'network error',
    'fetch failed',
    'connection refused',
    'timeout',
  ]

  return retryablePatterns.some((pattern) => errorMessage.toLowerCase().includes(pattern))
}

/**
 * Sleep utility for retry delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Execute an async function with retry and exponential backoff
 *
 * @param fn - The async function to execute
 * @param config - Retry configuration
 * @param onRetry - Optional callback invoked before each retry attempt
 * @returns The result of the function or throws the last error
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void
): Promise<T> {
  const retryConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  let lastError: unknown

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Don't retry if error is not retryable
      if (!isRetryableError(error, retryConfig)) {
        throw error
      }

      // If we've exhausted all retries, break and throw
      if (attempt === retryConfig.maxRetries) {
        break
      }

      const delayMs = calculateBackoffDelay(attempt, retryConfig)
      onRetry?.(attempt + 1, error, delayMs)

      if (import.meta.env.DEV) {
        console.warn(`[AI Retry] Attempt ${attempt + 1} failed, retrying in ${delayMs}ms...`, error)
      }

      await sleep(delayMs)
    }
  }

  throw lastError
}

/**
 * Circuit Breaker State
 */
export interface CircuitBreakerState {
  /** Current state: 'closed' (normal), 'open' (failing), 'half-open' (testing) */
  state: 'closed' | 'open' | 'half-open'
  /** Number of consecutive failures */
  failureCount: number
  /** Timestamp when circuit opened */
  openedAt: number | null
  /** Failure threshold before opening circuit */
  failureThreshold: number
  /** Recovery timeout in milliseconds (default: 30000) */
  recoveryTimeoutMs: number
}

/**
 * Create a circuit breaker instance
 */
export function createCircuitBreaker(
  failureThreshold: number = 5,
  recoveryTimeoutMs: number = 30000
): CircuitBreakerState {
  return {
    state: 'closed',
    failureCount: 0,
    openedAt: null,
    failureThreshold,
    recoveryTimeoutMs,
  }
}

/**
 * Check if circuit breaker allows requests
 */
export function canExecuteRequest(state: CircuitBreakerState): boolean {
  if (state.state === 'closed') return true

  if (state.state === 'open') {
    const elapsed = Date.now() - (state.openedAt ?? 0)
    if (elapsed >= state.recoveryTimeoutMs) {
      // Transition to half-open: allow one test request
      state.state = 'half-open'
      return true
    }
    return false
  }

  // half-open: allow one request
  return true
}

/**
 * Record a successful request
 */
export function recordSuccess(state: CircuitBreakerState): void {
  state.failureCount = 0
  state.state = 'closed'
  state.openedAt = null
}

/**
 * Record a failed request
 */
export function recordFailure(state: CircuitBreakerState): void {
  state.failureCount += 1

  if (state.failureCount >= state.failureThreshold) {
    state.state = 'open'
    state.openedAt = Date.now()
  }
}

/**
 * Execute a function with circuit breaker protection
 */
export async function withCircuitBreaker<T>(
  state: CircuitBreakerState,
  fn: () => Promise<T>
): Promise<T> {
  if (!canExecuteRequest(state)) {
    throw new Error('Layanan AI sedang tidak tersedia. Silakan coba beberapa saat lagi.')
  }

  try {
    const result = await fn()
    recordSuccess(state)
    return result
  } catch (error) {
    recordFailure(state)
    throw error
  }
}

/**
 * AI Service Health Check
 */
export interface AIServiceHealth {
  /** Service name */
  service: string
  /** Whether the service is healthy */
  healthy: boolean
  /** Last successful request timestamp */
  lastSuccess: number | null
  /** Consecutive failure count */
  failureCount: number
  /** Current circuit breaker state */
  circuitState: 'closed' | 'open' | 'half-open'
}

/**
 * Create a health tracker for an AI service
 */
export function createServiceHealthTracker(serviceName: string): AIServiceHealth {
  return {
    service: serviceName,
    healthy: true,
    lastSuccess: null,
    failureCount: 0,
    circuitState: 'closed',
  }
}

/**
 * Update health tracker on success
 */
export function trackSuccess(health: AIServiceHealth): void {
  health.healthy = true
  health.lastSuccess = Date.now()
  health.failureCount = 0
  health.circuitState = 'closed'
}

/**
 * Update health tracker on failure
 */
export function trackFailure(health: AIServiceHealth): void {
  health.failureCount += 1
  health.healthy = health.failureCount < 3
  if (health.failureCount >= 5) {
    health.circuitState = 'open'
  } else if (health.failureCount >= 3) {
    health.circuitState = 'half-open'
  }
}
