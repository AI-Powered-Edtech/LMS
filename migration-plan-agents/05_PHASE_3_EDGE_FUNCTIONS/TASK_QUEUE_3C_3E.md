# TASK QUEUE — Phase 3C: Notifications + 3D: Processing + 3E: Cron Jobs

**Week 46-52 | ~90 jam**

## Aturan untuk Agent

1. **JANGAN** ubah file di luar scope task
2. **JANGAN** buat custom DLQ table baru — gunakan domain-specific DLQ atau VIL built-in
3. **Semua teks UI/email** harus Bahasa Indonesia
4. Jalankan `cargo check && cargo clippy -- -D warnings && cargo test` setelah setiap task
5. **JANGAN** ubah `AGENTS.md`, `CLAUDE.md`, `README.md`, `CHANGELOG.md`
6. Cron schedule dalam **UTC** — WIB = UTC+7
7. Semua handlers pakai **Pattern A (Axum-style)**
8. SQL: **JANGAN** `SELECT *` — selalu explicit columns

---

# Wave 3C — Notification & Communication

## Task 3C-1: Email Foundation — Types, Templates & SMTP Client

```
TASK ID:       3C-1
OWNER TYPE:    Rust backend agent
GOAL:          Buat email types, HTML template engine, dan SMTP client wrapper
DEPENDENCY:    Phase 1A scaffold selesai
EDIT ONLY:     - crates/services/src/email/mod.rs
               - crates/services/src/email/templates.rs
               - crates/services/src/email/types.rs
               - crates/services/Cargo.toml
```

**Cargo.toml deps to add:**

```toml
lettre = { version = "0.11", features = ["tokio1-native-tls", "builder"] }
```

**Concrete Code:**

```rust
// === crates/services/src/email/types.rs ===
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmailRecipient {
    pub email: String,
    pub name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DigestItem {
    pub title: String,
    pub description: String,
    pub url: Option<String>,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmailDigestData {
    pub tenant_id: Uuid,
    pub recipient: EmailRecipient,
    pub items: Vec<DigestItem>,
    pub period: String,  // "24 jam terakhir"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParentDigestData {
    pub parent: EmailRecipient,
    pub children: Vec<ChildProgress>,
    pub period: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChildProgress {
    pub name: String,
    pub attendance_rate: f64,
    pub completed_lessons: i32,
    pub avg_quiz_score: Option<f64>,
    pub recent_activities: Vec<DigestItem>,
}
```

```rust
// === crates/services/src/email/mod.rs ===
use lettre::{
    message::header::ContentType,
    transport::smtp::authentication::Credentials,
    AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor,
};
use crate::email::types::EmailRecipient;

pub struct EmailClient {
    transport: AsyncSmtpTransport<Tokio1Executor>,
    from_email: String,
    from_name: String,
}

impl EmailClient {
    pub fn new(smtp_host: &str, smtp_user: &str, smtp_pass: &str, from_email: &str, from_name: &str) -> Result<Self, lettre::transport::smtp::Error> {
        let creds = Credentials::new(smtp_user.to_string(), smtp_pass.to_string());
        let transport = AsyncSmtpTransport::<Tokio1Executor>::relay(smtp_host)?
            .credentials(creds)
            .build();
        Ok(Self {
            transport,
            from_email: from_email.to_string(),
            from_name: from_name.to_string(),
        })
    }

    pub async fn send_html(&self, to: &EmailRecipient, subject: &str, html: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let from = format!("{} <{}>", self.from_name, self.from_email);
        let to_addr = match &to.name {
            Some(n) => format!("{} <{}>", n, to.email),
            None => to.email.clone(),
        };
        let email = Message::builder()
            .from(from.parse()?)
            .to(to_addr.parse()?)
            .subject(subject)
            .header(ContentType::TEXT_HTML)
            .body(html.to_string())?;
        self.transport.send(email).await?;
        Ok(())
    }
}
```

**Verify:**

```bash
cargo check -p edusync-services && echo "PASS: 3C-1 email foundation OK"
```

---

## Task 3C-2: Email Digest Service (send-email-digest)

```
TASK ID:       3C-2
OWNER TYPE:    Rust backend agent
GOAL:          Port send-email-digest Edge Function ke Rust handler
DEPENDENCY:    Task 3C-1
READ FIRST:    - supabase/functions/send-email-digest/index.ts
EDIT ONLY:     - crates/services/src/email/digest.rs
               - crates/services/src/email/mod.rs (add pub mod digest;)
```

**Concrete Code:**

```rust
// === crates/services/src/email/digest.rs ===
use sqlx::PgPool;
use uuid::Uuid;
use crate::email::{EmailClient, types::EmailDigestData};
use crate::email::templates::render_digest_html;

pub async fn send_email_digest_all_tenants(pool: &PgPool, client: &EmailClient) -> Result<usize, sqlx::Error> {
    // 1. Get all active tenants
    let tenants = sqlx::query!(
        "SELECT id FROM tenants WHERE is_active = true"
    ).fetch_all(pool).await?;

    let mut sent = 0;
    for tenant in &tenants {
        if let Err(e) = send_digest_for_tenant(pool, client, tenant.id).await {
            tracing::error!("Digest gagal untuk tenant {}: {}", tenant.id, e);
        } else {
            sent += 1;
        }
    }
    Ok(sent)
}

async fn send_digest_for_tenant(pool: &PgPool, client: &EmailClient, tenant_id: Uuid) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // 2. Get activities from last 24h
    let items = sqlx::query!(
        "SELECT title, description, created_at
         FROM activity_log
         WHERE tenant_id = $1 AND created_at > NOW() - INTERVAL '24 hours'
         ORDER BY created_at DESC
         LIMIT 20",
        tenant_id
    ).fetch_all(pool).await?;

    if items.is_empty() {
        return Ok(());
    }

    // 3. Get teacher emails for this tenant
    let teachers = sqlx::query!(
        "SELECT p.email, p.full_name
         FROM profiles p
         JOIN user_roles ur ON ur.user_id = p.id
         WHERE ur.tenant_id = $1 AND ur.role = 'teacher' AND p.email IS NOT NULL",
        tenant_id
    ).fetch_all(pool).await?;

    for teacher in &teachers {
        let data = EmailDigestData {
            tenant_id,
            recipient: crate::email::types::EmailRecipient {
                email: teacher.email.clone().unwrap_or_default(),
                name: teacher.full_name.clone(),
            },
            items: items.iter().map(|i| crate::email::types::DigestItem {
                title: i.title.clone(),
                description: i.description.clone().unwrap_or_default(),
                url: None,
                timestamp: i.created_at,
            }).collect(),
            period: "24 jam terakhir".to_string(),
        };
        let html = render_digest_html(&data);
        client.send_html(&data.recipient, "Ringkasan Aktivitas Harian EduSync", &html).await?;
    }
    Ok(())
}
```

**Verify:**

```bash
cargo check -p edusync-services && echo "PASS: 3C-2 email digest OK"
```

---

## Task 3C-3: Parent Digest Service (send-parent-digest)

```
TASK ID:       3C-3
OWNER TYPE:    Rust backend agent
GOAL:          Port send-parent-digest Edge Function ke Rust handler
DEPENDENCY:    Task 3C-1
READ FIRST:    - supabase/functions/send-parent-digest/index.ts
EDIT ONLY:     - crates/services/src/email/parent_digest.rs
               - crates/services/src/email/mod.rs (add pub mod parent_digest;)
```

**Concrete Code:**

```rust
// === crates/services/src/email/parent_digest.rs ===
use sqlx::PgPool;
use uuid::Uuid;
use crate::email::{EmailClient, types::{ParentDigestData, ChildProgress, EmailRecipient}};
use crate::email::templates::render_parent_digest_html;

pub async fn send_parent_digest_all_tenants(pool: &PgPool, client: &EmailClient) -> Result<usize, sqlx::Error> {
    let tenants = sqlx::query!("SELECT id FROM tenants WHERE is_active = true")
        .fetch_all(pool).await?;

    let mut sent = 0;
    for tenant in &tenants {
        if let Err(e) = send_parent_digest_for_tenant(pool, client, tenant.id).await {
            tracing::error!("Parent digest error tenant {}: {}", tenant.id, e);
        } else {
            sent += 1;
        }
    }
    Ok(sent)
}

async fn send_parent_digest_for_tenant(pool: &PgPool, client: &EmailClient, tenant_id: Uuid) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // Get parent-child links
    let parents = sqlx::query!(
        "SELECT DISTINCT p.id as parent_id, p.email, p.full_name
         FROM profiles p
         JOIN parent_student_links psl ON psl.parent_id = p.id
         WHERE psl.tenant_id = $1 AND p.email IS NOT NULL",
        tenant_id
    ).fetch_all(pool).await?;

    for parent in &parents {
        let children = sqlx::query!(
            "SELECT p.full_name, psl.student_id
             FROM parent_student_links psl
             JOIN profiles p ON p.id = psl.student_id
             WHERE psl.parent_id = $1 AND psl.tenant_id = $2",
            parent.parent_id, tenant_id
        ).fetch_all(pool).await?;

        let mut child_progresses = vec![];
        for child in &children {
            // GOTCHA: column is total_time_spent, NOT time_spent_seconds
            let progress = sqlx::query!(
                "SELECT COUNT(*)::int as completed_lessons,
                        AVG(latest_quiz_score) as avg_score
                 FROM student_lesson_signals
                 WHERE user_id = $1 AND last_accessed_at > NOW() - INTERVAL '7 days'",
                child.student_id
            ).fetch_one(pool).await?;

            child_progresses.push(ChildProgress {
                name: child.full_name.clone().unwrap_or_default(),
                attendance_rate: 0.0,  // TODO: from attendance table
                completed_lessons: progress.completed_lessons.unwrap_or(0),
                avg_quiz_score: progress.avg_score.map(|s| s as f64),
                recent_activities: vec![],
            });
        }

        let data = ParentDigestData {
            parent: EmailRecipient {
                email: parent.email.clone().unwrap_or_default(),
                name: parent.full_name.clone(),
            },
            children: child_progresses,
            period: "7 hari terakhir".to_string(),
        };
        let html = render_parent_digest_html(&data);
        client.send_html(&data.parent, "Perkembangan Anak Anda di EduSync", &html).await?;
    }
    Ok(())
}
```

**Verify:**

```bash
cargo check -p edusync-services && echo "PASS: 3C-3 parent digest OK"
```

---

## Task 3C-4: Push Notification Service (send-push)

```
TASK ID:       3C-4
OWNER TYPE:    Rust backend agent
GOAL:          Port send-push Edge Function ke Rust handler via web-push
DEPENDENCY:    Phase 1A scaffold selesai
READ FIRST:    - supabase/functions/send-push/index.ts
EDIT ONLY:     - crates/services/src/push/mod.rs
               - crates/services/src/push/types.rs
               - crates/services/Cargo.toml
```

**Cargo.toml deps to add:**

```toml
web-push = "0.9"
```

**Concrete Code:**

```rust
// === crates/services/src/push/types.rs ===
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PushSubscription {
    pub id: Uuid,
    pub user_id: Uuid,
    pub endpoint: String,
    pub p256dh: String,
    pub auth_key: String,  // 'auth' is reserved word, use auth_key in Rust
    pub tenant_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct SendPushRequest {
    pub user_ids: Vec<Uuid>,
    pub title: String,
    pub body: String,
    pub url: Option<String>,
    pub icon: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PushPayload {
    pub title: String,
    pub body: String,
    pub url: Option<String>,
    pub icon: Option<String>,
}
```

```rust
// === crates/services/src/push/mod.rs ===
use sqlx::PgPool;
use uuid::Uuid;
use web_push::*;
use crate::push::types::{PushSubscription, SendPushRequest, PushPayload};

pub struct PushClient {
    vapid_private_key: Vec<u8>,
    vapid_subject: String,
}

impl PushClient {
    pub fn new(vapid_private_key_b64: &str, vapid_subject: &str) -> Result<Self, web_push::WebPushError> {
        let key = base64::decode(vapid_private_key_b64).map_err(|_| WebPushError::InvalidCryptoKeys)?;
        Ok(Self { vapid_private_key: key, vapid_subject: vapid_subject.to_string() })
    }

    pub async fn send_to_users(&self, pool: &PgPool, req: &SendPushRequest) -> Result<usize, Box<dyn std::error::Error + Send + Sync>> {
        // Get subscriptions for all user_ids
        let subscriptions = sqlx::query_as!(
            PushSubscription,
            "SELECT id, user_id, endpoint, p256dh, auth as auth_key, tenant_id
             FROM push_subscriptions
             WHERE user_id = ANY($1)",
            &req.user_ids
        ).fetch_all(pool).await?;

        let payload = PushPayload {
            title: req.title.clone(),
            body: req.body.clone(),
            url: req.url.clone(),
            icon: req.icon.clone(),
        };
        let payload_json = serde_json::to_string(&payload)?;

        let mut sent = 0;
        for sub in &subscriptions {
            let subscription_info = SubscriptionInfo::new(
                &sub.endpoint,
                &sub.p256dh,
                &sub.auth_key,
            );
            let mut builder = WebPushMessageBuilder::new(&subscription_info);
            builder.set_payload(ContentEncoding::Aes128Gcm, payload_json.as_bytes());
            builder.set_vapid_signature(
                VapidSignatureBuilder::from_pem(std::io::Cursor::new(&self.vapid_private_key), &subscription_info)?
                    .add_sub_info(&subscription_info)
                    .build()?
            );
            let message = builder.build()?;
            if let Err(e) = IsahcWebPushClient::new()?.send(message).await {
                tracing::warn!("Push gagal ke {}: {}", sub.endpoint, e);
            } else {
                sent += 1;
            }
        }
        Ok(sent)
    }
}
```

**Verify:**

```bash
cargo check -p edusync-services && echo "PASS: 3C-4 push notification OK"
```

---

## Task 3C-5: WhatsApp Webhook Handler (whatsapp-webhook)

```
TASK ID:       3C-5
OWNER TYPE:    Rust backend agent
GOAL:          Port whatsapp-webhook Edge Function ke Rust endpoint
DEPENDENCY:    Phase 1A scaffold selesai
READ FIRST:    - supabase/functions/whatsapp-webhook/index.ts
EDIT ONLY:     - crates/services/src/whatsapp/mod.rs
               - crates/services/src/whatsapp/types.rs
               - crates/services/src/whatsapp/webhook.rs
```

**Concrete Code:**

```rust
// === crates/services/src/whatsapp/types.rs ===
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Deserialize)]
pub struct WhatsAppWebhookPayload {
    pub object: String,
    pub entry: Vec<WhatsAppEntry>,
}

#[derive(Debug, Deserialize)]
pub struct WhatsAppEntry {
    pub id: String,
    pub changes: Vec<WhatsAppChange>,
}

#[derive(Debug, Deserialize)]
pub struct WhatsAppChange {
    pub field: String,
    pub value: WhatsAppValue,
}

#[derive(Debug, Deserialize)]
pub struct WhatsAppValue {
    pub messages: Option<Vec<WhatsAppMessage>>,
    pub contacts: Option<Vec<WhatsAppContact>>,
}

#[derive(Debug, Deserialize)]
pub struct WhatsAppMessage {
    pub from: String,
    pub id: String,
    #[serde(rename = "type")]
    pub message_type: String,
    pub text: Option<WhatsAppText>,
    pub timestamp: String,
}

#[derive(Debug, Deserialize)]
pub struct WhatsAppText {
    pub body: String,
}

#[derive(Debug, Deserialize)]
pub struct WhatsAppContact {
    pub wa_id: String,
    pub profile: WhatsAppProfile,
}

#[derive(Debug, Deserialize)]
pub struct WhatsAppProfile {
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct WhatsAppMessageRecord {
    pub id: Uuid,
    pub wa_message_id: String,
    pub from_number: String,
    pub message_type: String,
    pub body: Option<String>,
    pub tenant_id: Option<Uuid>,
    pub received_at: DateTime<Utc>,
}
```

```rust
// === crates/services/src/whatsapp/webhook.rs ===
use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use sqlx::PgPool;
use std::collections::HashMap;
use crate::whatsapp::types::WhatsAppWebhookPayload;

// GET /api/v1/whatsapp/webhook — verify webhook
pub async fn verify_webhook(
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let mode = params.get("hub.mode").map(|s| s.as_str());
    let token = params.get("hub.verify_token").map(|s| s.as_str());
    let challenge = params.get("hub.challenge").map(|s| s.as_str());
    let expected_token = std::env::var("WHATSAPP_VERIFY_TOKEN").unwrap_or_default();

    if mode == Some("subscribe") && token == Some(expected_token.as_str()) {
        if let Some(c) = challenge {
            return (StatusCode::OK, c.to_string()).into_response();
        }
    }
    StatusCode::FORBIDDEN.into_response()
}

// POST /api/v1/whatsapp/webhook — receive messages
pub async fn receive_message(
    State(pool): State<PgPool>,
    Json(payload): Json<WhatsAppWebhookPayload>,
) -> impl IntoResponse {
    for entry in &payload.entry {
        for change in &entry.changes {
            if let Some(messages) = &change.value.messages {
                for msg in messages {
                    let _ = sqlx::query!(
                        "INSERT INTO whatsapp_messages (wa_message_id, from_number, message_type, body, received_at)
                         VALUES ($1, $2, $3, $4, NOW())
                         ON CONFLICT (wa_message_id) DO NOTHING",
                        msg.id,
                        msg.from,
                        msg.message_type,
                        msg.text.as_ref().map(|t| t.body.clone()),
                    ).execute(&pool).await;
                }
            }
        }
    }
    StatusCode::OK
}
```

**Verify:**

```bash
cargo check -p edusync-services && echo "PASS: 3C-5 WhatsApp webhook OK"
```

---

## Task 3C-6: WhatsApp OTP Sender (send-parent-otp)

```
TASK ID:       3C-6
OWNER TYPE:    Rust backend agent
GOAL:          Port send-parent-otp Edge Function ke Rust handler
DEPENDENCY:    Task 3C-5
READ FIRST:    - supabase/functions/send-parent-otp/index.ts
EDIT ONLY:     - crates/services/src/whatsapp/otp.rs
               - crates/services/src/whatsapp/mod.rs (add pub mod otp;)
```

**Concrete Code:**

```rust
// === crates/services/src/whatsapp/otp.rs ===
use rand::Rng;
use sqlx::PgPool;
use uuid::Uuid;

/// Generate 6-digit OTP, store in DB, send via WhatsApp
pub async fn send_otp(pool: &PgPool, phone: &str, tenant_id: Uuid) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    // Generate 6-digit OTP
    let otp: String = rand::thread_rng()
        .sample_iter(&rand::distributions::Uniform::from(0..10))
        .take(6)
        .map(|d| d.to_string())
        .collect();

    // Store OTP with 10-minute expiry
    sqlx::query!(
        "INSERT INTO parent_otps (phone, otp_code, tenant_id, expires_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')
         ON CONFLICT (phone) DO UPDATE SET otp_code = EXCLUDED.otp_code, expires_at = EXCLUDED.expires_at",
        phone,
        otp,
        tenant_id,
    ).execute(pool).await?;

    // Send WhatsApp message via Meta API
    send_whatsapp_message(phone, &format!("Kode OTP EduSync Anda: {}. Berlaku 10 menit.", otp)).await?;

    Ok(otp)
}

pub async fn verify_otp(pool: &PgPool, phone: &str, otp_code: &str) -> Result<bool, sqlx::Error> {
    let result = sqlx::query!(
        "DELETE FROM parent_otps
         WHERE phone = $1 AND otp_code = $2 AND expires_at > NOW()
         RETURNING id",
        phone,
        otp_code,
    ).fetch_optional(pool).await?;

    Ok(result.is_some())
}

async fn send_whatsapp_message(to: &str, text: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let token = std::env::var("WHATSAPP_ACCESS_TOKEN")?;
    let phone_id = std::env::var("WHATSAPP_PHONE_NUMBER_ID")?;
    let client = reqwest::Client::new();
    client.post(format!("https://graph.facebook.com/v18.0/{}/messages", phone_id))
        .bearer_auth(&token)
        .json(&serde_json::json!({
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": { "body": text }
        }))
        .send().await?
        .error_for_status()?;
    Ok(())
}
```

**Verify:**

```bash
cargo check -p edusync-services && echo "PASS: 3C-6 WhatsApp OTP OK"
```

---

## Task 3C-7: PDF Certificate Generation (generate-pdf)

```
TASK ID:       3C-7
OWNER TYPE:    Rust backend agent
GOAL:          Port generate-pdf Edge Function ke Rust handler
DEPENDENCY:    Phase 1A scaffold selesai
READ FIRST:    - supabase/functions/generate-pdf/index.ts
EDIT ONLY:     - crates/services/src/pdf/mod.rs
               - crates/services/src/pdf/certificate.rs
               - crates/services/Cargo.toml
```

**Cargo.toml deps to add:**

```toml
printpdf = "0.6"
```

**Concrete Code:**

```rust
// === crates/services/src/pdf/certificate.rs ===
use printpdf::*;
use std::io::BufWriter;

pub struct CertificateData {
    pub student_name: String,
    pub course_title: String,
    pub completion_date: String,          // "10 April 2026"
    pub certificate_number: String,       // "CERT-2026-0001"
    pub tenant_name: String,
    pub teacher_name: String,
}

pub fn generate_certificate_pdf(data: &CertificateData) -> Result<Vec<u8>, Box<dyn std::error::Error + Send + Sync>> {
    // A4 landscape: 297mm x 210mm
    let (doc, page1, layer1) = PdfDocument::new(
        format!("Sertifikat - {}", data.student_name),
        Mm(297.0), Mm(210.0), "Layer 1",
    );

    let current_layer = doc.get_page(page1).get_layer(layer1);

    // Load font (use built-in Helvetica for now; swap to Noto Sans for prod)
    let font = doc.add_builtin_font(BuiltinFont::HelveticaBold)?;
    let font_regular = doc.add_builtin_font(BuiltinFont::Helvetica)?;

    // Title
    current_layer.use_text("SERTIFIKAT PENYELESAIAN", 32.0, Mm(148.5), Mm(170.0), &font);

    // Student name
    current_layer.use_text(&data.student_name, 24.0, Mm(148.5), Mm(140.0), &font);

    // Course title
    current_layer.use_text(
        &format!("telah berhasil menyelesaikan kursus: {}", data.course_title),
        14.0, Mm(148.5), Mm(120.0), &font_regular,
    );

    // Date
    current_layer.use_text(&data.completion_date, 12.0, Mm(148.5), Mm(90.0), &font_regular);

    // Certificate number
    current_layer.use_text(
        &format!("No. Sertifikat: {}", data.certificate_number),
        10.0, Mm(148.5), Mm(60.0), &font_regular,
    );

    let mut bytes = Vec::new();
    doc.save(&mut BufWriter::new(&mut bytes))?;
    Ok(bytes)
}
```

```rust
// === crates/services/src/pdf/mod.rs ===
pub mod certificate;

use axum::{
    extract::{Query, State},
    http::{header, StatusCode},
    response::IntoResponse,
};
use sqlx::PgPool;
use uuid::Uuid;
use std::collections::HashMap;

/// GET /api/v1/certificates/:cert_id/pdf
pub async fn download_certificate_pdf(
    State(pool): State<PgPool>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let cert_id = match params.get("cert_id").and_then(|s| s.parse::<Uuid>().ok()) {
        Some(id) => id,
        None => return (StatusCode::BAD_REQUEST, "ID tidak valid").into_response(),
    };

    let cert = match sqlx::query!(
        "SELECT student_name, course_title, issued_at, certificate_number, tenant_id
         FROM certificates WHERE id = $1",
        cert_id
    ).fetch_optional(&pool).await {
        Ok(Some(c)) => c,
        _ => return (StatusCode::NOT_FOUND, "Sertifikat tidak ditemukan").into_response(),
    };

    let data = certificate::CertificateData {
        student_name: cert.student_name,
        course_title: cert.course_title,
        completion_date: cert.issued_at.format("%d %B %Y").to_string(),
        certificate_number: cert.certificate_number,
        tenant_name: "EduSync".to_string(),
        teacher_name: "".to_string(),
    };

    match certificate::generate_certificate_pdf(&data) {
        Ok(pdf_bytes) => (
            StatusCode::OK,
            [
                (header::CONTENT_TYPE, "application/pdf"),
                (header::CONTENT_DISPOSITION, &format!("attachment; filename=\"sertifikat-{}.pdf\"", cert_id)),
            ],
            pdf_bytes,
        ).into_response(),
        Err(e) => {
            tracing::error!("PDF generation gagal: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Gagal membuat PDF").into_response()
        }
    }
}
```

**Verify:**

```bash
cargo check -p edusync-services && echo "PASS: 3C-7 PDF certificate OK"
```

---

# Wave 3D — Processing & Misc Functions

## Task 3D-1: Quiz Grading Background Service

```
TASK ID:       3D-1
OWNER TYPE:    Rust backend agent
GOAL:          Port grade-quiz-attempt Edge Function ke background worker
DEPENDENCY:    Task 3C-7
READ FIRST:    - supabase/functions/grade-quiz-attempt/index.ts
EDIT ONLY:     - crates/services/src/grading/mod.rs
```

**Concrete Code:**

```rust
// === crates/services/src/grading/mod.rs ===
use sqlx::PgPool;
use uuid::Uuid;
use serde_json::Value;

#[derive(Debug, sqlx::FromRow)]
struct PendingAttempt {
    id: Uuid,
    quiz_id: Uuid,
    user_id: Uuid,
}

#[derive(Debug, sqlx::FromRow)]
struct QuizAnswer {
    question_id: Uuid,
    selected_option_id: Option<Uuid>,
    answer_text: Option<String>,
    question_type: String,
}

#[derive(Debug, sqlx::FromRow)]
struct CorrectOption {
    id: Uuid,
    is_correct: bool,
    points: Option<f64>,
}

/// Poll for pending quiz attempts and grade them (MCQ auto-grading)
pub async fn grade_pending_attempts(pool: &PgPool) -> Result<usize, sqlx::Error> {
    // 1. Find submitted but ungraded attempts
    let pending = sqlx::query_as!(
        PendingAttempt,
        "SELECT id, quiz_id, user_id
         FROM quiz_attempts
         WHERE status = 'submitted' AND graded_at IS NULL
         LIMIT 50
         FOR UPDATE SKIP LOCKED"
    ).fetch_all(pool).await?;

    let mut graded = 0;
    for attempt in &pending {
        if let Err(e) = grade_attempt(pool, attempt).await {
            tracing::error!("Grading gagal untuk attempt {}: {}", attempt.id, e);
        } else {
            graded += 1;
        }
    }
    Ok(graded)
}

async fn grade_attempt(pool: &PgPool, attempt: &PendingAttempt) -> Result<(), sqlx::Error> {
    // 2. Get all answers for this attempt
    let answers = sqlx::query_as!(
        QuizAnswer,
        "SELECT qa.question_id, qa.selected_option_id, qa.answer_text,
                qq.question_type
         FROM quiz_answers qa
         JOIN quiz_questions qq ON qq.id = qa.question_id
         WHERE qa.attempt_id = $1",
        attempt.id
    ).fetch_all(pool).await?;

    let mut total_score = 0.0f64;
    let mut max_score = 0.0f64;

    for answer in &answers {
        // Only auto-grade MCQ and true_false
        if answer.question_type == "mcq" || answer.question_type == "true_false" {
            if let Some(option_id) = answer.selected_option_id {
                let option = sqlx::query_as!(
                    CorrectOption,
                    "SELECT id, is_correct, points FROM quiz_options WHERE id = $1",
                    option_id
                ).fetch_optional(pool).await?;

                if let Some(opt) = option {
                    let pts = opt.points.unwrap_or(1.0);
                    max_score += pts;
                    if opt.is_correct {
                        total_score += pts;
                    }
                }
            }
        }
        // essay type: leave for manual review, skip
    }

    // 3. Update attempt with score and mark graded
    let percentage = if max_score > 0.0 { (total_score / max_score) * 100.0 } else { 0.0 };
    sqlx::query!(
        "UPDATE quiz_attempts
         SET score = $1, max_score = $2, percentage = $3, status = 'graded', graded_at = NOW()
         WHERE id = $4",
        total_score,
        max_score,
        percentage,
        attempt.id,
    ).execute(pool).await?;

    Ok(())
}
```

**Verify:**

```bash
cargo check -p edusync-services && echo "PASS: 3D-1 quiz grading worker OK"
```

---

## Task 3D-2: Progress Events Processor

```
TASK ID:       3D-2
OWNER TYPE:    Rust backend agent
GOAL:          Port process-progress-events Edge Function ke batch processor
DEPENDENCY:    Task 3D-1
READ FIRST:    - supabase/functions/process-progress-events/index.ts
EDIT ONLY:     - crates/services/src/progress/mod.rs
```

**Concrete Code:**

```rust
// === crates/services/src/progress/mod.rs ===
use sqlx::PgPool;
use uuid::Uuid;
use serde_json::Value;

#[derive(Debug, sqlx::FromRow)]
struct ProgressEvent {
    id: Uuid,
    user_id: Uuid,
    lesson_id: Uuid,
    event_type: String,
    payload: Value,
    tenant_id: Uuid,
}

/// Process batch of progress events — runs every 30 seconds via tokio::interval
pub async fn process_progress_events(pool: &PgPool) -> Result<usize, sqlx::Error> {
    // 1. Dequeue batch of events (SKIP LOCKED for concurrent safety)
    let events = sqlx::query_as!(
        ProgressEvent,
        "DELETE FROM progress_events
         WHERE id IN (
             SELECT id FROM progress_events
             ORDER BY created_at ASC
             LIMIT 100
             FOR UPDATE SKIP LOCKED
         )
         RETURNING id, user_id, lesson_id, event_type, payload, tenant_id"
    ).fetch_all(pool).await?;

    if events.is_empty() {
        return Ok(0);
    }

    // 2. Update student_lesson_signals per (user_id, lesson_id) pair
    // GOTCHA: columns are total_time_spent, last_accessed_at, latest_quiz_score
    // NOT: time_spent_seconds, last_event_at, quiz_avg_score
    for event in &events {
        let time_spent = event.payload.get("time_spent_ms")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);

        sqlx::query!(
            "INSERT INTO student_lesson_signals (user_id, lesson_id, tenant_id, total_time_spent, last_accessed_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (user_id, lesson_id) DO UPDATE SET
                 total_time_spent = student_lesson_signals.total_time_spent + EXCLUDED.total_time_spent,
                 last_accessed_at = NOW()",
            event.user_id,
            event.lesson_id,
            event.tenant_id,
            time_spent as i64,
        ).execute(pool).await?;
    }

    Ok(events.len())
}
```

**Verify:**

```bash
cargo check -p edusync-services && echo "PASS: 3D-2 progress events processor OK"
```

---

## Task 3D-3: Progress Events API

```
TASK ID:       3D-3
OWNER TYPE:    Rust backend agent
GOAL:          Port progress-events Edge Function ke API endpoint
DEPENDENCY:    Task 3D-2
READ FIRST:    - supabase/functions/progress-events/index.ts
EDIT ONLY:     - crates/services/src/progress/api.rs
               - crates/services/src/progress/mod.rs (add pub mod api;)
```

**Concrete Code:**

```rust
// === crates/services/src/progress/api.rs ===
use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct ProgressEventPayload {
    pub lesson_id: Uuid,
    pub event_type: String,  // "lesson_start" | "lesson_complete" | "quiz_answer" | "time_spent"
    pub payload: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct BatchProgressEventsRequest {
    pub events: Vec<ProgressEventPayload>,
}

/// POST /api/v1/progress/events — enqueue single event
pub async fn enqueue_event(
    State(pool): State<PgPool>,
    // In real impl: extract user from JWT claims
    Json(payload): Json<ProgressEventPayload>,
) -> impl IntoResponse {
    // TODO: extract user_id, tenant_id from JWT claims
    let user_id = Uuid::new_v4(); // placeholder — replace with JWT extraction

    let result = sqlx::query!(
        "INSERT INTO progress_events (user_id, lesson_id, event_type, payload, tenant_id)
         VALUES ($1, $2, $3, $4, $5)",
        user_id,
        payload.lesson_id,
        payload.event_type,
        payload.payload,
        Uuid::nil(), // placeholder tenant_id
    ).execute(&pool).await;

    match result {
        Ok(_) => StatusCode::ACCEPTED,
        Err(e) => {
            tracing::error!("Gagal enqueue progress event: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}

/// POST /api/v1/progress/events/batch — enqueue batch from offline queue
pub async fn enqueue_batch(
    State(pool): State<PgPool>,
    Json(req): Json<BatchProgressEventsRequest>,
) -> impl IntoResponse {
    // Idempotent batch insert — use ON CONFLICT DO NOTHING if events have idempotency keys
    for event in &req.events {
        let _ = sqlx::query!(
            "INSERT INTO progress_events (user_id, lesson_id, event_type, payload, tenant_id)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT DO NOTHING",
            Uuid::nil(), // placeholder
            event.lesson_id,
            event.event_type,
            event.payload,
            Uuid::nil(),
        ).execute(&pool).await;
    }
    StatusCode::ACCEPTED
}
```

**Verify:**

```bash
cargo check -p edusync-services && echo "PASS: 3D-3 progress events API OK"
```

---

## Task 3D-4: Quiz Data Loader

```
TASK ID:       3D-4
OWNER TYPE:    Rust backend agent
GOAL:          Port load-quiz-data Edge Function ke Rust handler
DEPENDENCY:    Task 3D-3
READ FIRST:    - supabase/functions/load-quiz-data/index.ts
EDIT ONLY:     - crates/services/src/quiz/loader.rs
               - crates/services/src/quiz/mod.rs (add pub mod loader;)
```

**Concrete Code:**

```rust
// === crates/services/src/quiz/loader.rs ===
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Serialize;
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct QuizQuestion {
    pub id: Uuid,
    pub quiz_id: Uuid,
    // GOTCHA: column is 'text', NOT 'question_text'
    pub text: String,
    pub question_type: String,
    pub points: Option<f64>,
    pub order_index: i32,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct QuizOption {
    pub id: Uuid,
    pub question_id: Uuid,
    // GOTCHA: column is 'text', NOT 'option_text'
    pub text: String,
    // NOTE: is_correct is NOT returned to students — filter at query level
}

#[derive(Debug, Serialize)]
pub struct QuizLoadResponse {
    pub quiz_id: Uuid,
    pub title: String,
    pub time_limit_minutes: Option<i32>,
    pub questions: Vec<QuestionWithOptions>,
}

#[derive(Debug, Serialize)]
pub struct QuestionWithOptions {
    pub id: Uuid,
    pub text: String,
    pub question_type: String,
    pub points: Option<f64>,
    pub options: Vec<QuizOptionStudent>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct QuizOptionStudent {
    pub id: Uuid,
    pub text: String,
    // is_correct intentionally NOT included for students
}

/// GET /api/v1/quizzes/:quiz_id/load — load quiz data for student
pub async fn load_quiz_for_student(
    Path(quiz_id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> impl IntoResponse {
    // 1. Get quiz metadata
    let quiz = match sqlx::query!(
        "SELECT id, title, time_limit_minutes
         FROM quizzes
         WHERE id = $1 AND status = 'published'",
        quiz_id
    ).fetch_optional(&pool).await {
        Ok(Some(q)) => q,
        Ok(None) => return (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "Kuis tidak ditemukan"}))).into_response(),
        Err(e) => {
            tracing::error!("DB error: {}", e);
            return StatusCode::INTERNAL_SERVER_ERROR.into_response();
        }
    };

    // 2. Get questions
    // GOTCHA: quiz_questions.text NOT question_text
    let questions = sqlx::query!(
        "SELECT id, text, question_type, points, order_index
         FROM quiz_questions
         WHERE quiz_id = $1
         ORDER BY order_index ASC",
        quiz_id
    ).fetch_all(&pool).await.unwrap_or_default();

    // 3. Get options (without is_correct for students)
    // GOTCHA: quiz_options.text NOT option_text
    let mut question_with_opts = vec![];
    for q in &questions {
        let options = sqlx::query_as!(
            QuizOptionStudent,
            "SELECT id, text FROM quiz_options WHERE question_id = $1 ORDER BY id ASC",
            q.id
        ).fetch_all(&pool).await.unwrap_or_default();

        question_with_opts.push(QuestionWithOptions {
            id: q.id,
            text: q.text.clone(),
            question_type: q.question_type.clone(),
            points: q.points,
            options,
        });
    }

    let response = QuizLoadResponse {
        quiz_id,
        title: quiz.title,
        time_limit_minutes: quiz.time_limit_minutes,
        questions: question_with_opts,
    };

    Json(response).into_response()
}
```

**Verify:**

```bash
cargo check -p edusync-services && echo "PASS: 3D-4 quiz data loader OK"
```

---

## Task 3D-5: SCORM Extract Handler

```
TASK ID:       3D-5
OWNER TYPE:    Rust backend agent
GOAL:          Port scorm-extract Edge Function ke Rust handler
DEPENDENCY:    Task 3D-4
READ FIRST:    - supabase/functions/scorm-extract/index.ts
EDIT ONLY:     - crates/services/src/scorm/mod.rs
               - crates/services/Cargo.toml
```

**Cargo.toml deps to add:**

```toml
zip = "0.6"
quick-xml = { version = "0.31", features = ["serialize"] }
```

**Concrete Code:**

```rust
// === crates/services/src/scorm/mod.rs ===
use std::io::{Cursor, Read};
use zip::ZipArchive;

pub struct ScormManifest {
    pub title: String,
    pub identifier: String,
    pub version: String,         // "1.2" or "2004"
    pub launch_url: String,      // path to index file
}

/// Extract SCORM ZIP and parse imsmanifest.xml
pub fn extract_scorm_manifest(zip_bytes: &[u8]) -> Result<ScormManifest, Box<dyn std::error::Error + Send + Sync>> {
    let cursor = Cursor::new(zip_bytes);
    let mut archive = ZipArchive::new(cursor)?;

    // 1. Find imsmanifest.xml
    let mut manifest_xml = String::new();
    {
        let mut manifest_file = archive.by_name("imsmanifest.xml")
            .map_err(|_| "imsmanifest.xml tidak ditemukan dalam ZIP")?;
        manifest_file.read_to_string(&mut manifest_xml)?;
    }

    // 2. Parse XML (basic parsing — look for key attributes)
    // Full XML parsing via quick-xml would parse <manifest>, <organizations>, <resources>
    let title = extract_xml_text(&manifest_xml, "title").unwrap_or("SCORM Content".to_string());
    let identifier = extract_xml_attr(&manifest_xml, "manifest", "identifier")
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    // 3. Determine SCORM version from schemaversion
    let version = if manifest_xml.contains("CAM 1.3") || manifest_xml.contains("2004") {
        "2004".to_string()
    } else {
        "1.2".to_string()
    };

    // 4. Find launch URL (href of first resource)
    let launch_url = extract_xml_attr(&manifest_xml, "resource", "href")
        .unwrap_or("index.html".to_string());

    Ok(ScormManifest { title, identifier, version, launch_url })
}

// SCORM content runs in sandboxed <iframe> — limitation noted in CLAUDE.md
// scorm_runtime_data.lesson_status has sticky terminal states:
//   once 'completed' or 'passed', cannot revert (enforced in upsert_scorm_runtime RPC)
// lesson_resources.type CHECK constraint includes 'scorm' (migration 20260324200000)

fn extract_xml_text(xml: &str, tag: &str) -> Option<String> {
    let open = format!("<{}>", tag);
    let close = format!("</{}>", tag);
    let start = xml.find(&open)? + open.len();
    let end = xml.find(&close)?;
    Some(xml[start..end].trim().to_string())
}

fn extract_xml_attr(xml: &str, tag: &str, attr: &str) -> Option<String> {
    let tag_start = xml.find(&format!("<{}", tag))?;
    let attr_start = xml[tag_start..].find(&format!("{}=\"", attr))?;
    let value_start = tag_start + attr_start + attr.len() + 2;
    let value_end = xml[value_start..].find('"')?;
    Some(xml[value_start..value_start + value_end].to_string())
}
```

**Verify:**

```bash
cargo check -p edusync-services && echo "PASS: 3D-5 SCORM extract OK"
```

---

## Task 3D-6: Bulk User Import

```
TASK ID:       3D-6
OWNER TYPE:    Rust backend agent
GOAL:          Port bulk-import-users Edge Function ke Rust handler
DEPENDENCY:    Task 3D-5
READ FIRST:    - supabase/functions/bulk-import-users/index.ts
EDIT ONLY:     - crates/services/src/import/mod.rs
               - crates/services/Cargo.toml
```

**Cargo.toml deps to add:**

```toml
csv = "1.3"
```

**Concrete Code:**

```rust
// === crates/services/src/import/mod.rs ===
use csv::ReaderBuilder;
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct UserImportRow {
    pub email: String,
    pub full_name: String,
    pub role: String,        // "teacher" | "student"
    pub phone: Option<String>,
    pub grade_class: Option<String>,
}

#[derive(Debug)]
pub struct ImportResult {
    pub total: usize,
    pub imported: usize,
    pub skipped: usize,
    pub errors: Vec<String>,
}

/// Parse CSV and import users in chunks of 50 rows per transaction
pub async fn bulk_import_users(
    pool: &PgPool,
    csv_bytes: &[u8],
    tenant_id: Uuid,
) -> Result<ImportResult, Box<dyn std::error::Error + Send + Sync>> {
    let mut reader = ReaderBuilder::new()
        .has_headers(true)
        .from_reader(csv_bytes);

    let rows: Vec<UserImportRow> = reader.deserialize()
        .filter_map(|r: Result<UserImportRow, _>| r.ok())
        .collect();

    let total = rows.len();
    let mut imported = 0;
    let mut skipped = 0;
    let mut errors = vec![];

    // Process in chunks of 50
    for chunk in rows.chunks(50) {
        let mut tx = pool.begin().await?;
        for row in chunk {
            // Validate role
            if !["teacher", "student", "admin"].contains(&row.role.as_str()) {
                errors.push(format!("Role tidak valid untuk {}: {}", row.email, row.role));
                skipped += 1;
                continue;
            }

            // Validate email (no .test TLD — GOTCHA from CLAUDE.md)
            if row.email.ends_with(".test") {
                errors.push(format!("Email .test tidak valid: {}", row.email));
                skipped += 1;
                continue;
            }

            // Insert profile (duplicate detection via ON CONFLICT)
            let result = sqlx::query!(
                "INSERT INTO profiles (email, full_name, phone, tenant_id)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (email) DO NOTHING
                 RETURNING id",
                row.email,
                row.full_name,
                row.phone,
                tenant_id,
            ).fetch_optional(&mut *tx).await;

            match result {
                Ok(Some(profile)) => {
                    // Insert user_role
                    let _ = sqlx::query!(
                        "INSERT INTO user_roles (user_id, role, tenant_id)
                         VALUES ($1, $2, $3)
                         ON CONFLICT DO NOTHING",
                        profile.id,
                        row.role,
                        tenant_id,
                    ).execute(&mut *tx).await;
                    imported += 1;
                }
                Ok(None) => {
                    skipped += 1; // duplicate email
                }
                Err(e) => {
                    errors.push(format!("Error untuk {}: {}", row.email, e));
                    skipped += 1;
                }
            }
        }
        // Rollback on error (atomic chunk)
        if let Err(e) = tx.commit().await {
            errors.push(format!("Chunk commit gagal: {}", e));
        }
    }

    Ok(ImportResult { total, imported, skipped, errors })
}
```

**Verify:**

```bash
cargo check -p edusync-services && echo "PASS: 3D-6 bulk import OK"
```

---

# Wave 3E — Cron Jobs & Background Jobs

## Task 3E-1: Cron Job Registration

```
TASK ID:       3E-1
OWNER TYPE:    Rust backend agent
GOAL:          Register semua cron jobs using tokio-cron-scheduler
DEPENDENCY:    3C + 3D tasks selesai
READ FIRST:    - Supabase pg_cron jobs (SELECT * FROM cron.job)
EDIT ONLY:     - crates/api-server/src/cron.rs
               - crates/api-server/Cargo.toml
```

**Cargo.toml deps to add:**

```toml
tokio-cron-scheduler = { version = "0.10", features = ["signal"] }
```

**Schedule Table (all times UTC — WIB = UTC+7):**

| Job                 | UTC Schedule      | WIB Schedule       |
| ------------------- | ----------------- | ------------------ |
| Email digest        | `0 10 * * *`      | Daily 17:00 WIB    |
| Parent digest       | `30 10 * * *`     | Daily 17:30 WIB    |
| Analytics refresh   | `*/15 * * * *`    | Every 15 min       |
| Cleanup expired     | `0 19 * * *`      | Daily 02:00 (+1)   |
| AI quota reset      | `0 17 1 * * *`    | Monthly 1st 00:00  |
| Progress events     | `*/30 * * * * *`  | Every 30 sec       |
| Quiz grading        | `*/60 * * * * *`  | Every 60 sec       |

**STOP IF:** pg_cron conflict detected → disable pg_cron first:
```sql
SELECT cron.unschedule(jobname) FROM cron.job WHERE command ILIKE '%email_digest%';
```

**Concrete Code:**

```rust
// === crates/api-server/src/cron.rs ===
use tokio_cron_scheduler::{Job, JobScheduler};
use sqlx::PgPool;
use std::sync::Arc;
use edusync_services::email::{EmailClient, digest::send_email_digest_all_tenants, parent_digest::send_parent_digest_all_tenants};
use edusync_services::grading::grade_pending_attempts;
use edusync_services::progress::process_progress_events;

pub async fn start_cron_scheduler(
    pool: Arc<PgPool>,
    email_client: Arc<EmailClient>,
) -> Result<JobScheduler, Box<dyn std::error::Error + Send + Sync>> {
    let sched = JobScheduler::new().await?;

    // Email digest — daily 10:00 UTC (17:00 WIB)
    {
        let pool = pool.clone();
        let client = email_client.clone();
        sched.add(Job::new_async("0 0 10 * * *", move |_id, _l| {
            let pool = pool.clone();
            let client = client.clone();
            Box::pin(async move {
                match send_email_digest_all_tenants(&pool, &client).await {
                    Ok(n) => tracing::info!("Email digest: {} tenant terkirim", n),
                    Err(e) => tracing::error!("Email digest gagal: {}", e),
                }
            })
        })?).await?;
    }

    // Parent digest — daily 10:30 UTC (17:30 WIB)
    {
        let pool = pool.clone();
        let client = email_client.clone();
        sched.add(Job::new_async("0 30 10 * * *", move |_id, _l| {
            let pool = pool.clone();
            let client = client.clone();
            Box::pin(async move {
                match send_parent_digest_all_tenants(&pool, &client).await {
                    Ok(n) => tracing::info!("Parent digest: {} tenant terkirim", n),
                    Err(e) => tracing::error!("Parent digest gagal: {}", e),
                }
            })
        })?).await?;
    }

    // Quiz grading worker — every 60 seconds
    {
        let pool = pool.clone();
        sched.add(Job::new_async("*/60 * * * * *", move |_id, _l| {
            let pool = pool.clone();
            Box::pin(async move {
                match grade_pending_attempts(&pool).await {
                    Ok(n) if n > 0 => tracing::info!("Graded {} quiz attempts", n),
                    Ok(_) => {},
                    Err(e) => tracing::error!("Quiz grading worker gagal: {}", e),
                }
            })
        })?).await?;
    }

    // Progress events processor — every 30 seconds
    {
        let pool = pool.clone();
        sched.add(Job::new_async("*/30 * * * * *", move |_id, _l| {
            let pool = pool.clone();
            Box::pin(async move {
                match process_progress_events(&pool).await {
                    Ok(n) if n > 0 => tracing::info!("Processed {} progress events", n),
                    Ok(_) => {},
                    Err(e) => tracing::error!("Progress processor gagal: {}", e),
                }
            })
        })?).await?;
    }

    sched.start().await?;
    tracing::info!("Cron scheduler dimulai dengan semua jobs");
    Ok(sched)
}
```

**Verify:**

```bash
cargo check -p edusync-api-server && echo "PASS: 3E-1 cron scheduler OK"
```

---

## Task 3E-2: Nginx Route Update

```
TASK ID:       3E-2
OWNER TYPE:    DevOps / Agent
GOAL:          Update nginx.conf dengan semua Phase 3 routes
DEPENDENCY:    Task 3E-1
READ FIRST:    - nginx.conf (existing routes)
EDIT ONLY:     - nginx.conf
```

**Routes to add:**

```nginx
# Phase 3C — Notification & Communication
location /api/v1/email/ {
    proxy_pass http://vil-api:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Authorization $http_authorization;
}
location /api/v1/push/ {
    proxy_pass http://vil-api:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Authorization $http_authorization;
}
location /api/v1/whatsapp/ {
    proxy_pass http://vil-api:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Authorization $http_authorization;
}
location /api/v1/pdf/ {
    proxy_pass http://vil-api:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Authorization $http_authorization;
}

# Phase 3D — Processing
location /api/v1/progress/ {
    proxy_pass http://vil-api:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Authorization $http_authorization;
}
location /api/v1/webhooks/ {
    proxy_pass http://vil-api:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Authorization $http_authorization;
}

# Phase 3C/3D shared
location /api/v1/certificates/ {
    proxy_pass http://vil-api:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Authorization $http_authorization;
}
```

**Verify:**

```bash
nginx -t && echo "PASS: nginx config valid"
curl -s http://localhost/api/v1/health | grep -q "ok" && echo "PASS: health check OK"
```

---

# Output Deliverables

After Phase 3C-3E:

| Deliverable                    | Status |
| ------------------------------ | ------ |
| Email types + templates + SMTP | ⬜     |
| send-email-digest handler      | ⬜     |
| send-parent-digest handler     | ⬜     |
| send-push handler              | ⬜     |
| whatsapp-webhook handler       | ⬜     |
| send-parent-otp handler        | ⬜     |
| generate-pdf handler           | ⬜     |
| grade-quiz-attempt worker      | ⬜     |
| progress-events processor      | ⬜     |
| load-quiz-data handler         | ⬜     |
| scorm-extract handler          | ⬜     |
| bulk-import-users handler      | ⬜     |
| Cron jobs registered           | ⬜     |
| Nginx routes updated           | ⬜     |

---

## Effort Estimate

| Wave   | Tasks                      | Jam  | Parallelism |
| ------ | -------------------------- | ---- | ----------- |
| Wave 1 | 3C-1 + 3C-4 + 3C-7        | 8-10 | Parallel    |
| Wave 2 | 3C-2 + 3C-3 + 3C-5 + 3C-6 | 8-10 | Parallel    |
| Wave 3 | 3D-1 + 3D-2 + 3D-3        | 8-10 | Parallel    |
| Wave 4 | 3D-4 + 3D-5 + 3D-6        | 6-8  | Parallel    |
| Wave 5 | 3E-1 + 3E-2               | 4-6  | Serial      |
| Total  |                            | ~90  |             |
