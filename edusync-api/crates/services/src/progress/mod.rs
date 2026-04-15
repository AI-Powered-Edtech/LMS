/// Progress events module — Phase 3D
///
/// Sub-modules:
///   - `types`     : TelemetryEvent, ProgressBatchRequest/Response, ValidationError
///   - `api`       : enqueue_progress_events() — validation + DB insert
///   - `processor` : process_progress_batch()  — aggregate + upsert student_lesson_signals

pub mod api;
pub mod processor;
pub mod types;
