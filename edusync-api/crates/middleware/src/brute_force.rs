use std::{
    collections::HashMap,
    sync::{Arc, RwLock},
    time::{Duration, Instant},
};

const MAX_ATTEMPTS: u32 = 5;
const LOCKOUT_DURATION: Duration = Duration::from_secs(15 * 60); // 15 minutes

#[derive(Clone)]
struct LoginRecord {
    count: u32,
    locked_until: Option<Instant>,
}

/// In-process login attempt tracker for brute-force protection.
///
/// Tracks attempts by key (typically email address). After `MAX_ATTEMPTS` (5) failures
/// the key is locked for 15 minutes. Thread-safe via `RwLock`.
///
/// Add to `AppState` and clone it — cloning is cheap (`Arc` inside).
///
/// # Example
///
/// ```
/// use edusync_middleware::brute_force::BruteForceTracker;
///
/// let tracker = BruteForceTracker::new();
/// assert!(!tracker.is_locked("user@example.com"));
/// tracker.record_failure("user@example.com");
/// tracker.record_success("user@example.com"); // clears on success
/// assert!(!tracker.is_locked("user@example.com"));
/// ```
#[derive(Clone, Default)]
pub struct BruteForceTracker(Arc<RwLock<HashMap<String, LoginRecord>>>);

impl BruteForceTracker {
    pub fn new() -> Self {
        BruteForceTracker::default()
    }

    /// Returns `true` if the key is currently locked out.
    pub fn is_locked(&self, key: &str) -> bool {
        if let Ok(map) = self.0.read() {
            if let Some(record) = map.get(key) {
                if let Some(locked_until) = record.locked_until {
                    return Instant::now() < locked_until;
                }
            }
        }
        false
    }

    /// Record a failed attempt. Locks the key after `MAX_ATTEMPTS`.
    pub fn record_failure(&self, key: &str) {
        if let Ok(mut map) = self.0.write() {
            let record = map.entry(key.to_string()).or_insert(LoginRecord {
                count: 0,
                locked_until: None,
            });
            record.count += 1;
            if record.count >= MAX_ATTEMPTS {
                tracing::warn!(key, "brute force lockout triggered after {} attempts", record.count);
                record.locked_until = Some(Instant::now() + LOCKOUT_DURATION);
            }
        }
    }

    /// Record a successful login — clears the failure counter for the key.
    pub fn record_success(&self, key: &str) {
        if let Ok(mut map) = self.0.write() {
            map.remove(key);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn locks_after_max_attempts() {
        let tracker = BruteForceTracker::new();
        for _ in 0..MAX_ATTEMPTS {
            assert!(!tracker.is_locked("test@example.com"));
            tracker.record_failure("test@example.com");
        }
        assert!(tracker.is_locked("test@example.com"));
    }

    #[test]
    fn success_clears_lock() {
        let tracker = BruteForceTracker::new();
        for _ in 0..MAX_ATTEMPTS {
            tracker.record_failure("test@example.com");
        }
        assert!(tracker.is_locked("test@example.com"));
        tracker.record_success("test@example.com");
        assert!(!tracker.is_locked("test@example.com"));
    }
}
