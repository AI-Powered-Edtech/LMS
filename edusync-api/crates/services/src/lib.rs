// Phase 3 service modules.
//
// NOTE: The `email.rs` stub file coexists with the `email/` directory module.
// We use `#[path]` to explicitly resolve to the directory module.

#[path = "email/mod.rs"]
pub mod email;

pub mod ai;
pub mod grading;
pub mod import;
pub mod lti;
pub mod pdf;
pub mod plagiarism;
pub mod progress;
pub mod reports;
pub mod push;
pub mod quiz;
pub mod scorm;
pub mod video;
pub mod whatsapp;

// Re-export the primary email client for convenience
pub use email::EmailClient;
