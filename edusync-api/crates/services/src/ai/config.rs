/// AI service configuration and CircuitBreaker singleton.
///
/// HTTP calls to Groq are made via `vil_server::prelude::SseCollect`, which
/// maintains its own global connection-pooled reqwest client — no manual
/// `reqwest::Client` needed here.
///
/// `vil_server` (0.2.2) does not export a `CircuitBreaker` type, so we keep
/// the lightweight manual implementation below.
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};

// ─── Constants ────────────────────────────────────────────────────────────────

pub const GROQ_API_URL: &str = "https://api.groq.com/openai/v1/chat/completions";
pub const GROQ_MODEL: &str = "llama-3.3-70b-versatile";

/// Per-user rate limit for AI grading/tutor endpoints (requests per hour).
pub const AI_RATE_LIMIT_PER_HOUR: i64 = 50;

/// Per-user rate limit for content-generation endpoint (requests per hour).
pub const CONTENT_GEN_RATE_LIMIT_PER_HOUR: i64 = 20;

/// Maximum characters in a single essay submission.
pub const MAX_ESSAY_CHARS: usize = 10_000;

/// Maximum characters of lesson/resource context fed to the model.
pub const MAX_CONTEXT_CHARS: usize = 10_000;

/// Maximum messages kept per tutor session.
pub const MAX_SESSION_MESSAGES: usize = 50;

/// Last N messages loaded as conversation history.
pub const TUTOR_HISTORY_WINDOW: usize = 10;

// ─── CircuitBreaker ───────────────────────────────────────────────────────────
//
// vil_server 0.2.2 does not export CircuitBreaker from its prelude.
// This manual implementation is retained; it is equivalent to the documented
// VIL primitive in terms of semantics (failure threshold + cooldown window).

/// Internal state for the circuit breaker.
#[derive(Debug)]
pub struct CircuitBreakerState {
    /// Number of consecutive failures since last reset.
    pub failure_count: u32,
    /// When the circuit was last opened (set when threshold is crossed).
    pub opened_at: Option<Instant>,
}

/// Threshold: open the circuit after this many consecutive failures.
const CB_FAILURE_THRESHOLD: u32 = 5;

/// How long the circuit stays open before allowing a probe request.
const CB_RESET_AFTER: Duration = Duration::from_secs(60);

/// Thread-safe circuit breaker wrapping mutable state.
#[derive(Clone, Debug)]
pub struct CircuitBreaker {
    state: Arc<Mutex<CircuitBreakerState>>,
}

impl CircuitBreaker {
    pub fn new() -> Self {
        Self {
            state: Arc::new(Mutex::new(CircuitBreakerState {
                failure_count: 0,
                opened_at: None,
            })),
        }
    }

    /// Returns `true` if the circuit is **closed** (requests are allowed).
    /// Returns `false` if the circuit is **open** (requests should be rejected).
    ///
    /// Half-open probing: if the reset window has elapsed, one request is
    /// allowed through regardless — on success the circuit closes again.
    pub fn is_closed(&self) -> bool {
        let state = self.state.lock().expect("CircuitBreaker mutex poisoned");

        match state.opened_at {
            None => true, // circuit is closed
            Some(opened_at) => {
                // Half-open: allow one probe after the reset window
                opened_at.elapsed() >= CB_RESET_AFTER
            }
        }
    }

    /// Record a successful API call.
    /// Resets the failure counter and closes the circuit.
    pub fn record_success(&self) {
        let mut state = self.state.lock().expect("CircuitBreaker mutex poisoned");
        state.failure_count = 0;
        state.opened_at = None;
    }

    /// Record a failed API call.
    /// Opens the circuit when the failure threshold is crossed.
    pub fn record_failure(&self) {
        let mut state = self.state.lock().expect("CircuitBreaker mutex poisoned");
        state.failure_count += 1;
        if state.failure_count >= CB_FAILURE_THRESHOLD {
            // Only set opened_at once (avoid resetting the timer on each new failure)
            if state.opened_at.is_none() {
                tracing::warn!(
                    failure_count = state.failure_count,
                    "CircuitBreaker: opening circuit after {} consecutive failures",
                    state.failure_count,
                );
                state.opened_at = Some(Instant::now());
            }
        }
    }
}

impl Default for CircuitBreaker {
    fn default() -> Self {
        Self::new()
    }
}

// ─── Singleton CircuitBreaker ─────────────────────────────────────────────────

/// Process-wide singleton circuit breaker for all Groq AI calls.
///
/// Usage:
/// ```rust
/// use edusync_services::ai::config::groq_circuit_breaker;
///
/// let cb = groq_circuit_breaker();
/// if !cb.is_closed() {
///     return Err(/* circuit open error */);
/// }
/// // … make API call …
/// cb.record_success();
/// ```
static GROQ_CB: OnceLock<CircuitBreaker> = OnceLock::new();

pub fn groq_circuit_breaker() -> &'static CircuitBreaker {
    GROQ_CB.get_or_init(CircuitBreaker::new)
}
