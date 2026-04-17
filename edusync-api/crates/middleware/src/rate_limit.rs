use axum::{
    async_trait,
    extract::FromRequestParts,
    http::request::Parts,
    http::StatusCode,
    Extension,
};
use governor::{
    clock::DefaultClock,
    state::{keyed::DefaultKeyedStateStore},
    Quota, RateLimiter,
};
use std::sync::Arc;
use std::num::NonZeroU32;

type IpRateLimiter = RateLimiter<String, DefaultKeyedStateStore<String>, DefaultClock>;

#[derive(Clone)]
pub struct ApiRateLimiter {
    limiter: Arc<IpRateLimiter>,
}

impl Default for ApiRateLimiter {
    fn default() -> Self {
        Self::new()
    }
}

impl ApiRateLimiter {
    pub fn new() -> Self {
        let quota = Quota::per_minute(NonZeroU32::new(60).unwrap());
        Self {
            limiter: Arc::new(RateLimiter::keyed(quota)),
        }
    }

    pub fn check(&self, ip: &str) -> bool {
        self.limiter.check_key(&ip.to_string()).is_ok()
    }
}

pub struct RateLimitGuard;

#[async_trait]
impl<S> FromRequestParts<S> for RateLimitGuard
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, &'static str);

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let ip = parts
            .headers
            .get("x-forwarded-for")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("unknown")
            .to_string();

        let Extension(limiter): Extension<ApiRateLimiter> =
            Extension::from_request_parts(parts, _state)
                .await
                .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Rate limiter not configured"))?;

        if !limiter.check(&ip) {
            return Err((StatusCode::TOO_MANY_REQUESTS, "Terlalu banyak permintaan. Silakan coba lagi nanti."));
        }

        Ok(RateLimitGuard)
    }
}
