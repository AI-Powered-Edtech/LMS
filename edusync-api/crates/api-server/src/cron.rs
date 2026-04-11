//! Background jobs — uses VIL Scheduler (VIL Way)
//!
//! Replaces the prior manual `tokio::time::interval` loops with
//! `vil_server::core::scheduler::Scheduler`.
//!
//! Schedule (all UTC → WIB = UTC+7):
//!   - Quiz grader        : every 30 seconds
//!   - Progress processor : every 30 seconds
//!   - Analytics refresh  : every 15 minutes
//!   - Email digest       : daily 10:00 UTC (17:00 WIB)
//!   - Parent digest      : daily 10:30 UTC (17:30 WIB)

use vil_server::core::scheduler::Scheduler;
use sqlx::PgPool;
use std::time::Duration;

/// Build and return a configured `Scheduler` with all EduSync background jobs.
///
/// Call `.start()` on the returned scheduler in `main.rs` after building it.
pub fn build_scheduler(db: PgPool) -> Scheduler {
    let mut sched = Scheduler::new();

    // ── Quiz grader — every 30 seconds ───────────────────────────────────────
    {
        let db = db.clone();
        sched.every(Duration::from_secs(30), "quiz-grader", move || {
            let db = db.clone();
            async move {
                match edusync_services::grading::run_grading_worker(&db).await {
                    Ok(n) if n > 0 => {
                        tracing::info!(graded = n, "cron:quiz_grader selesai");
                    }
                    Ok(_) => {}
                    Err(edusync_services::grading::GradingWorkerError::CircuitBreakerOpen) => {
                        tracing::warn!("cron:quiz_grader circuit breaker terbuka");
                    }
                    Err(e) => {
                        tracing::error!(error = %e, "cron:quiz_grader gagal");
                    }
                }
            }
        });
    }

    // ── Progress events processor — every 30 seconds ──────────────────────────
    {
        let db = db.clone();
        sched.every(Duration::from_secs(30), "progress-processor", move || {
            let db = db.clone();
            async move {
                match edusync_services::progress::processor::process_progress_batch(&db).await {
                    Ok(n) if n > 0 => {
                        tracing::info!(processed = n, "cron:progress_processor selesai");
                    }
                    Ok(_) => {}
                    Err(
                        edusync_services::progress::processor::ProgressProcessorError::Database(
                            msg,
                        ),
                    ) => {
                        tracing::warn!(error = %msg, "cron:progress_processor gagal");
                    }
                }
            }
        });
    }

    // ── Analytics refresh — every 15 minutes ─────────────────────────────────
    {
        let db = db.clone();
        sched.every(Duration::from_secs(900), "analytics-refresh", move || {
            let db = db.clone();
            async move {
                let result = sqlx::query!("SELECT public.refresh_analytics_snapshots()")
                    .execute(&db)
                    .await;
                match result {
                    Ok(_) => tracing::debug!("cron:analytics_refresh selesai"),
                    Err(e) => tracing::warn!(error = %e, "cron:analytics_refresh gagal"),
                }
            }
        });
    }

    // ── Email digest — daily at 10:00 UTC (17:00 WIB) ─────────────────────────
    {
        let db = db.clone();
        sched.daily_at_utc(10, 0, "email-digest", move || {
            let db = db.clone();
            async move {
                match edusync_services::email::digest::send_email_digest(&db).await {
                    Ok(r) => tracing::info!(
                        sent = r.sent,
                        skipped = r.skipped,
                        errors = r.errors,
                        "cron:email_digest selesai"
                    ),
                    Err(e) => tracing::error!(error = %e, "cron:email_digest gagal"),
                }
            }
        });
    }

    // ── Parent digest — daily at 10:30 UTC (17:30 WIB) ────────────────────────
    {
        let db = db.clone();
        sched.daily_at_utc(10, 30, "parent-digest", move || {
            let db = db.clone();
            async move {
                match edusync_services::email::parent_digest::send_parent_digest(&db).await {
                    Ok(r) => tracing::info!(
                        sent = r.sent,
                        skipped = r.skipped,
                        errors = r.errors,
                        "cron:parent_digest selesai"
                    ),
                    Err(e) => tracing::error!(error = %e, "cron:parent_digest gagal"),
                }
            }
        });
    }

    tracing::info!("VIL Scheduler dikonfigurasi (5 jobs)");
    sched
}
