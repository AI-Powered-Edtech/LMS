use axum::http::{HeaderValue, Method};
use tower_http::cors::{AllowOrigin, CorsLayer};

pub fn cors_layer() -> CorsLayer {
    let origins: Vec<HeaderValue> = {
        let mut values = vec![
            "http://localhost:5173".parse().unwrap(),
            "http://127.0.0.1:5173".parse().unwrap(),
        ];

        if let Ok(extra) = std::env::var("CORS_ORIGINS") {
            for origin in extra.split(',') {
                if let Ok(value) = origin.trim().parse() {
                    values.push(value);
                }
            }
        }

        values
    };

    CorsLayer::new()
        .allow_origin(AllowOrigin::list(origins))
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([
            axum::http::header::AUTHORIZATION,
            axum::http::header::CONTENT_TYPE,
            "x-client-info".parse().unwrap(),
            "x-request-id".parse().unwrap(),
            "apikey".parse().unwrap(),
        ])
        .allow_credentials(true)
}
