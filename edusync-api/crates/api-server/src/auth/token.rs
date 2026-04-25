use crate::state::AppState;
use edusync_auth::{jwt::RefreshClaims, verify_refresh_token, AuthError};

pub fn verify_refresh_token_with_session_secret(
    _state: &AppState,
    token: &str,
) -> Result<RefreshClaims, AuthError> {
    verify_refresh_token(token)
}

#[cfg(test)]
mod tests {
    use sqlx::postgres::PgPoolOptions;
    use uuid::Uuid;

    use crate::state::{AppState, ShadowRuntimeConfig, SmtpConfig};
    use edusync_auth::jwt::{init_rsa_keys, issue_refresh_token};
    use edusync_middleware::brute_force::BruteForceTracker;

    use super::verify_refresh_token_with_session_secret;

    const TEST_PRIVATE_KEY: &[u8] = r#"-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDhVQg6kMMBcINM
9W+0MrB8TJYPuNsK+BibiqDrscaaC5ddtIFY/iTJ8gKADQ7QwXVDhNnz8WAqBlpB
ViR+6naldtW7KtiRn1zImkYLfo/EIhtbiMevrmiMQZciyzV9irk1skh92HlwW7Zf
asqMTmw0L/CLuI+s1SGDAELcvog+zyPbMC4swdERKdu5t17wrVF6S53Dno78J3qf
w0EfQ9+306o86m9uqZyHP8sxLkSGzdBRkTP4wNtzgX7hARvBCVXLE8iWqCyKufUX
2uclZGQX/MQAqwq8hhFffaJB5ushegq1lIDIJX+ExhjRqXvW9kRY0S5MaSOzs/dd
ikMV2LGRAgMBAAECggEADFuM+CVF7zdxQ/sL4BPi65Y0U/K9NI9MTi9z9Ckg7Vl9
uM+0Q6IAeNYdvqcOAnMxpVJ3tNyue5ozQJ+4SwDnITDwt3M57avnO0CBXz0Be8NW
a8Exw61AIj0F9wxc8nXKrYAJtg51WSz2cKowfIcKgRwwnYEG2XbWKn3iV4KC11WL
fwgNjrL4E2dECJj7nctA1M1jIvG0NpgyVKMQZvt12D3VFkyGnSJrQCke6Q7F+e4z
Lw8EzH2LQ1Mf31XlQn3YeMvc9wEssZBGT4ArTOQz3xabKwHb0eDc3E7YM+JcXmcn
6mDZcB3JU1/6cDUAQe8sKJ4W5/WCv4ahThVhCG1lJwKBgQD3zvlHxUqqpk+n29Vu
C7F9qJwz3O5nmUmzR1x5MrGwdHie3Dtmmw7BlHyf76TaGuxErH0OCRFAdizCnKJx
ZqOlDUkRZofDeK5lItR/IV30oKJbyjcyjbdz144DSOfBJI3v3AHFQgQsfzDBw7DA
13XESUHJYrxMadeXxHvH4CxZowKBgQDox9tzYQ2bv5l2UaXz+R1OjOBvCpwIc99E
ldR6l7DP/sB7tFTL87zTnj/Yj6jAwdbCJnudZ/+ufcKr4D3oBQNLJn6mmgTFtRW+
rIqnDACWhm5YGHbZKcLAQO6rqI3A3NI0BqoYlXaoZiggotz0YzNIuIoM7sYWf9v1
Ru5fopJjOwKBgG4bySfawhKRU1OCmpMLHxJ2mPFyeXwO4HCIhM5VeB6voej0cnBk
9WmOUNG/6b//tnvNKMPTw5ag68KNVqCMuqnb/Vt981UnilXl5AWZDeZkeb/PWjdc
QOd4H+HVwyRO2cJ6P08mxjP/T+rIyQDmu607379b388UOHd3Foj5UruBAoGBAKe3
j8ryy25DPxu7ujktbMsyv2XiHAgPDHeLCHuHnbJO13qJtGr6YzuJknDDGRBA2S4r
sfb4foTHQaK6v3/TVMspoikBYZzdWxx1jrTK9gV+ODSq876F0zbX0d7GY9Pohl9L
yfRKhCLS7+iLz20ZqFKl+3lT9E8zslRn1cn8BUMPAoGADW62iuaIIxtg3NQ9E3kb
8CK8i1JyLyrrTGrgheb8v4gGNF0tFBpyarxTMhCWKI0CL5mp3xG8n5s+7xk6wsRZ
OQEp0TZ43fp+K0rRnvGVSxHB+md7nw8AejaF0oblCEFV0EeRym/ZIlOV0yraeiCT
/TbeI/xxi9X9Fmfb0+cwY/w=
-----END PRIVATE KEY-----"#
        .as_bytes();

    const TEST_PUBLIC_KEY: &[u8] = r#"-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4VUIOpDDAXCDTPVvtDKw
fEyWD7jbCvgYm4qg67HGmguXXbSBWP4kyfICgA0O0MF1Q4TZ8/FgKgZaQVYkfup2
pXbVuyrYkZ9cyJpGC36PxCIbW4jHr65ojEGXIss1fYq5NbJIfdh5cFu2X2rKjE5s
NC/wi7iPrNUhgwBC3L6IPs8j2zAuLMHRESnbubde8K1Rekudw56O/Cd6n8NBH0Pf
t9OqPOpvbqmchz/LMS5Ehs3QUZEz+MDbc4F+4QEbwQlVyxPIlqgsirn1F9rnJWRk
F/zEAKsKvIYRX32iQebrIXoKtZSAyCV/hMYY0al71vZEWNEuTGkjs7P3XYpDFdix
kQIDAQAB
-----END PUBLIC KEY-----"#
        .as_bytes();

    #[tokio::test]
    async fn refresh_token_verified_with_rsa_keys() {
        init_rsa_keys(TEST_PRIVATE_KEY, TEST_PUBLIC_KEY).expect("should init keys");

        let db = PgPoolOptions::new()
            .connect_lazy("postgres://localhost/edusync_test")
            .expect("should create lazy pool");

        let state = AppState {
            db,
            brute_force: BruteForceTracker::new(),
            shadow: ShadowRuntimeConfig {
                enabled: false,
                divergence_sample_rate: 0.0,
            },
            groq_api_key: None,
            vapid_private_key: None,
            vapid_public_key: None,
            smtp: SmtpConfig {
                from_email: "noreply@edusync.dev".to_string(),
                ..Default::default()
            },
            whatsapp_access_token: None,
            whatsapp_phone_number_id: None,
            s3_endpoint: None,
            s3_bucket: "test-bucket".to_string(),
            s3_public_url: None,
            cache: None,
        };

        let user_id = Uuid::new_v4();
        let (token, _) = issue_refresh_token(user_id).expect("should issue refresh token");

        verify_refresh_token_with_session_secret(&state, &token)
            .expect("refresh token should verify");
    }
}
