#[allow(dead_code)]
pub fn init_tracing() {
    let filter =
        std::env::var("RUST_LOG").unwrap_or_else(|_| "edusync_api_server=debug,info".to_string());

    let _ = tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_target(true)
        .with_thread_ids(false)
        .json()
        .try_init();
}

pub fn init_sentry() -> Option<sentry::ClientInitGuard> {
    let dsn = std::env::var("SENTRY_DSN").ok()?;
    Some(sentry::init((
        dsn,
        sentry::ClientOptions {
            release: sentry::release_name!(),
            ..Default::default()
        },
    )))
}
