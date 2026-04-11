//! Phase 3E — Background cron job registration.
//!
//! Uses `tokio::time` intervals — no external cron library required.
//!
//! Schedule (all UTC → WIB = UTC+7):
//!   - Email digest        : daily 10:00 UTC (17:00 WIB)
//!   - Parent digest       : daily 10:30 UTC (17:30 WIB)
//!   - Analytics refresh   : every 15 minutes
//!   - Progress processor  : every 30 seconds
//!   - Quiz grading worker : every 30 seconds

use chrono::Utc;
use sqlx::PgPool;
use std::sync::Arc;
use tokio::time::{interval, sleep, Duration};

use crate::state::AppState;

/// Start all background cron jobs. Called once from `main` after the server
/// starts listening. Each job runs in its own detached Tokio task.
pub async fn start_cron_jobs(state: Arc<AppState>) {
    let db = Arc::new(state.db.clone());

    // ── Email digest — daily 10:00 UTC ────────────────────────────────────────
    {
        let db = db.clone();
        tokio::spawn(run_daily_at_utc(10, 0, move || {
            let db = db.clone();
            async move {
                match edusync_services::email::digest::send_email_digest(&db).await {
                    Ok(r) => tracing::info!(
                        sent = r.sent,
                        skipped = r.skipped,
                        errors = r.errors,
                        "cron:email_digest selesai"
                    ),
                    Err(e) => {
                        tracing::error!(error = %e, "cron:email_digest gagal")
                    }
                }
            }
        }));
    }

    // ── Parent digest — daily 10:30 UTC ───────────────────────────────────────
    {
        let db = db.clone();
        tokio::spawn(run_daily_at_utc(10, 30, move || {
            let db = db.clone();
            async move {
                match edusync_services::email::parent_digest::send_parent_digest(&db).await {
                    Ok(r) => tracing::info!(
                        sent = r.sent,
                        skipped = r.skipped,
                        errors = r.errors,
                        "cron:parent_digest selesai"
                    ),
                    Err(e) => {
                        tracing::error!(error = %e, "cron:parent_digest gagal")
                    }
                }
            }
        }));
    }

    // ── Analytics refresh — every 15 minutes ──────────────────────────────────
    {
        let db = db.clone();
        tokio::spawn(async move {
            let mut ticker = interval(Duration::from_secs(15 * 60));
            ticker.tick().await; // skip immediate first tick
            loop {
                ticker.tick().await;
                let result = sqlx::query!("SELECT public.refresh_analytics_snapshots()")
                    .execute(db.as_ref())
                    .await;
                match result {
                    Ok(_) => tracing::debug!("cron:analytics_refresh selesai"),
                    Err(e) => tracing::warn!(error = %e, "cron:analytics_refresh gagal"),
                }
            }
        });
    }

    // ── Progress events processor — every 30 seconds ──────────────────────────
    {
        let db = db.clone();
        tokio::spawn(async move {
            let mut ticker = interval(Duration::from_secs(30));
            ticker.tick().await;
            loop {
                ticker.tick().await;
                let result =
                    edusync_services::progress::processor::process_progress_batch(db.as_ref())
                        .await;
                match result {
                    Ok(n) if n > 0 => {
                        tracing::info!(processed = n, "cron:progress_processor selesai")
                    }
                    Ok(_) => {}
                    Err(edusync_services::progress::processor::ProgressProcessorError::Database(msg)) => {
                        tracing::warn!(error = %msg, "cron:progress_processor gagal")
                    }
                }
            }
        });
    }

    // ── Quiz grading worker — every 30 seconds ────────────────────────────────
    {
        let db = db.clone();
        tokio::spawn(async move {
            let mut ticker = interval(Duration::from_secs(30));
            ticker.tick().await;
            loop {
                ticker.tick().await;
                let result =
                    edusync_services::grading::run_grading_worker(db.as_ref()).await;
                match result {
                    Ok(n) if n > 0 => {
                        tracing::info!(graded = n, "cron:quiz_grader selesai")
                    }
                    Ok(_) => {}
                    Err(edusync_services::grading::GradingWorkerError::CircuitBreakerOpen) => {
                        tracing::warn!("cron:quiz_grader circuit breaker terbuka")
                    }
                    Err(e) => tracing::error!(error = %e, "cron:quiz_grader gagal"),
                }
            }
        });
    }

    tracing::info!("Semua cron job dimulai (5 tasks)");
}

// ─── Helper: run a task daily at a fixed UTC hour:minute ────────────────────

/// Sleeps until the next occurrence of `hour:minute` UTC, runs `task()`,
/// then repeats on a 24-hour cycle.
async fn run_daily_at_utc<F, Fut>(hour: u32, minute: u32, task: F)
where
    F: Fn() -> Fut + Send + 'static,
    Fut: std::future::Future<Output = ()> + Send,
{
    loop {
        let sleep_secs = secs_until_utc(hour, minute);
        tracing::debug!(
            target_hour = hour,
            target_min = minute,
            sleep_secs = sleep_secs,
            "cron: menunggu jadwal berikutnya"
        );
        sleep(Duration::from_secs(sleep_secs)).await;
        task().await;
        // After running, sleep until same time next day.
        // (The next call to secs_until_utc will handle any drift.)
    }
}

/// Calculate seconds until the next occurrence of `hour:minute` UTC.
fn secs_until_utc(hour: u32, minute: u32) -> u64 {
    let now = Utc::now();
    let today_target = now
        .date_naive()
        .and_hms_opt(hour, minute, 0)
        .map(|naive| naive.and_utc())
        .unwrap_or(now);

    let diff = if today_target > now {
        (today_target - now).num_seconds()
    } else {
        // Already passed today — schedule for tomorrow
        let tomorrow_target = today_target + chrono::Duration::hours(24);
        (tomorrow_target - now).num_seconds()
    };

    diff.max(0) as u64
}
