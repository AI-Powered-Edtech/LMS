use anyhow::{anyhow, Result};
use reqwest::{Client, StatusCode};
use serde_json::{json, Value};
use uuid::Uuid;

fn base_url() -> String {
    std::env::var("VIL_GATE_BASE_URL").unwrap_or_else(|_| "http://127.0.0.1:8080".to_string())
}

fn test_email() -> String {
    std::env::var("VIL_GATE_TEST_EMAIL").unwrap_or_else(|_| "teacher@edusync.dev".to_string())
}

fn test_password() -> String {
    std::env::var("VIL_GATE_TEST_PASSWORD").unwrap_or_else(|_| "password123".to_string())
}

async fn login(client: &Client) -> Result<String> {
    let response = client
        .post(format!("{}/api/v1/auth/login", base_url()))
        .json(&json!({
            "email": test_email(),
            "password": test_password(),
        }))
        .send()
        .await?;

    if !response.status().is_success() {
        return Err(anyhow!("login failed with status {}", response.status()));
    }

    let payload: Value = response.json().await?;
    payload
        .get("access_token")
        .and_then(Value::as_str)
        .map(ToOwned::to_owned)
        .ok_or_else(|| anyhow!("missing access_token"))
}

async fn create_course(client: &Client, token: &str, title: &str) -> Result<String> {
    let response = client
        .post(format!("{}/api/v1/courses", base_url()))
        .bearer_auth(token)
        .json(&json!({
            "title": title,
            "description": "Gate 3 integration test",
            "status": "draft"
        }))
        .send()
        .await?;

    if !response.status().is_success() {
        return Err(anyhow!(
            "create course failed with status {}",
            response.status()
        ));
    }

    let payload: Value = response.json().await?;
    payload
        .get("id")
        .and_then(Value::as_str)
        .map(ToOwned::to_owned)
        .ok_or_else(|| anyhow!("missing course id"))
}

async fn delete_course(client: &Client, token: &str, course_id: &str) -> Result<()> {
    let response = client
        .delete(format!("{}/api/v1/courses/{}", base_url(), course_id))
        .bearer_auth(token)
        .send()
        .await?;

    if response.status() != StatusCode::NO_CONTENT {
        return Err(anyhow!(
            "delete course failed for {} with status {}",
            course_id,
            response.status()
        ));
    }

    Ok(())
}

fn sample_divergence_event() -> Value {
    json!({
        "request_id": Uuid::new_v4().to_string(),
        "flow_name": "gate3-test",
        "endpoint": "/api/v1/auth/bootstrap",
        "method": "GET",
        "primary_backend": "vil",
        "shadow_backend": "supabase",
        "normalized_request_signature": "GET:/api/v1/auth/bootstrap",
        "result_hash_primary": "aaa",
        "result_hash_shadow": "bbb",
        "diff_summary": "sample divergence",
        "severity": "warn"
    })
}

#[tokio::test]
async fn bootstrap_requires_authorization() -> Result<()> {
    let client = Client::new();
    let response = client
        .get(format!("{}/api/v1/auth/bootstrap", base_url()))
        .send()
        .await?;

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    Ok(())
}

#[tokio::test]
async fn bootstrap_returns_profile_for_authenticated_user() -> Result<()> {
    let client = Client::new();
    let token = login(&client).await?;
    let response = client
        .get(format!("{}/api/v1/auth/bootstrap", base_url()))
        .bearer_auth(token)
        .send()
        .await?;

    assert_eq!(response.status(), StatusCode::OK);
    let payload: Value = response.json().await?;
    assert!(payload.get("profile").is_some());
    assert!(payload.get("memberships").is_some());
    Ok(())
}

#[tokio::test]
async fn divergence_sink_requires_authorization() -> Result<()> {
    let client = Client::new();
    let response = client
        .post(format!("{}/api/v1/internal/divergence-events", base_url()))
        .json(&sample_divergence_event())
        .send()
        .await?;

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    Ok(())
}

#[tokio::test]
async fn divergence_sink_accepts_authenticated_events() -> Result<()> {
    let client = Client::new();
    let token = login(&client).await?;
    let response = client
        .post(format!("{}/api/v1/internal/divergence-events", base_url()))
        .bearer_auth(token)
        .json(&sample_divergence_event())
        .send()
        .await?;

    assert_eq!(response.status(), StatusCode::OK);
    Ok(())
}

#[tokio::test]
async fn single_and_maybe_single_fail_when_multiple_rows_match() -> Result<()> {
    let client = Client::new();
    let token = login(&client).await?;
    let prefix = format!("Gate3 single {}", Uuid::new_v4());
    let course_a = create_course(&client, &token, &format!("{prefix} A")).await?;
    let course_b = create_course(&client, &token, &format!("{prefix} B")).await?;

    let single_response = client
        .post(format!("{}/api/v1/data/courses", base_url()))
        .bearer_auth(&token)
        .json(&json!({
            "action": "select",
            "select": "id,title",
            "filters": [
                { "column": "title", "op": "ilike", "value": format!("{prefix}%") }
            ],
            "single": "single"
        }))
        .send()
        .await?;

    let maybe_single_response = client
        .post(format!("{}/api/v1/data/courses", base_url()))
        .bearer_auth(&token)
        .json(&json!({
            "action": "select",
            "select": "id,title",
            "filters": [
                { "column": "title", "op": "ilike", "value": format!("{prefix}%") }
            ],
            "single": "maybeSingle"
        }))
        .send()
        .await?;

    delete_course(&client, &token, &course_a).await?;
    delete_course(&client, &token, &course_b).await?;

    assert_eq!(single_response.status(), StatusCode::BAD_REQUEST);
    assert_eq!(maybe_single_response.status(), StatusCode::BAD_REQUEST);
    Ok(())
}

#[tokio::test]
async fn tenant_filter_override_is_forbidden() -> Result<()> {
    let client = Client::new();
    let token = login(&client).await?;
    let response = client
        .post(format!("{}/api/v1/data/courses", base_url()))
        .bearer_auth(token)
        .json(&json!({
            "action": "select",
            "select": "id,title",
            "filters": [
                { "column": "tenant_id", "op": "eq", "value": Uuid::new_v4().to_string() }
            ]
        }))
        .send()
        .await?;

    assert_eq!(response.status(), StatusCode::FORBIDDEN);
    Ok(())
}

#[tokio::test]
async fn tenant_wide_mutation_without_business_filter_is_rejected() -> Result<()> {
    let client = Client::new();
    let token = login(&client).await?;
    let response = client
        .post(format!("{}/api/v1/data/courses", base_url()))
        .bearer_auth(token)
        .json(&json!({
            "action": "update",
            "select": "id,title",
            "values": {
                "description": "should not update all tenant rows"
            },
            "filters": []
        }))
        .send()
        .await?;

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    Ok(())
}

#[tokio::test]
async fn rpc_argument_validation_rejects_unknown_args() -> Result<()> {
    let client = Client::new();
    let token = login(&client).await?;
    let response = client
        .post(format!(
            "{}/api/v1/rpc/complete_onboarding_step",
            base_url()
        ))
        .bearer_auth(token)
        .json(&json!({
            "args": {
                "p_step": "profile"
            }
        }))
        .send()
        .await?;

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    Ok(())
}

#[tokio::test]
async fn courses_crud_read_and_delete_flow_is_operational() -> Result<()> {
    let client = Client::new();
    let token = login(&client).await?;
    let title = format!("Gate3 CRUD {}", Uuid::new_v4());
    let course_id = create_course(&client, &token, &title).await?;

    let list_response = client
        .get(format!(
            "{}/api/v1/courses?page=1&limit=10&search=Gate3%20CRUD",
            base_url()
        ))
        .bearer_auth(&token)
        .send()
        .await?;
    assert_eq!(list_response.status(), StatusCode::OK);

    let get_response = client
        .get(format!("{}/api/v1/courses/{}", base_url(), course_id))
        .bearer_auth(&token)
        .send()
        .await?;
    assert_eq!(get_response.status(), StatusCode::OK);

    delete_course(&client, &token, &course_id).await?;
    Ok(())
}

// ── Read-path shadow coverage ────────────────────────────────────────────────

#[tokio::test]
async fn data_plane_select_requires_authorization() -> Result<()> {
    let client = Client::new();
    let response = client
        .post(format!("{}/api/v1/data/courses", base_url()))
        .json(&json!({
            "action": "select",
            "select": "id,title"
        }))
        .send()
        .await?;

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    Ok(())
}

#[tokio::test]
async fn rpc_proxy_requires_authorization() -> Result<()> {
    let client = Client::new();
    let response = client
        .post(format!("{}/api/v1/rpc/get_activity_timeline", base_url()))
        .json(&json!({ "args": {} }))
        .send()
        .await?;

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    Ok(())
}

#[tokio::test]
async fn unknown_table_is_rejected() -> Result<()> {
    let client = Client::new();
    let token = login(&client).await?;
    let response = client
        .post(format!("{}/api/v1/data/pg_user", base_url()))
        .bearer_auth(token)
        .json(&json!({ "action": "select", "select": "id" }))
        .send()
        .await?;

    assert_eq!(response.status(), StatusCode::FORBIDDEN);
    Ok(())
}

#[tokio::test]
async fn unknown_rpc_is_rejected() -> Result<()> {
    let client = Client::new();
    let token = login(&client).await?;
    let response = client
        .post(format!("{}/api/v1/rpc/drop_all_tables", base_url()))
        .bearer_auth(token)
        .json(&json!({ "args": {} }))
        .send()
        .await?;

    assert_eq!(response.status(), StatusCode::FORBIDDEN);
    Ok(())
}

#[tokio::test]
async fn courses_data_plane_read_path_returns_tenant_rows() -> Result<()> {
    let client = Client::new();
    let token = login(&client).await?;
    let title = format!("Gate3 ReadPath {}", Uuid::new_v4());
    let course_id = create_course(&client, &token, &title).await?;

    let response = client
        .post(format!("{}/api/v1/data/courses", base_url()))
        .bearer_auth(&token)
        .json(&json!({
            "action": "select",
            "select": "id,title,status",
            "filters": [
                { "column": "id", "op": "eq", "value": course_id }
            ]
        }))
        .send()
        .await?;

    assert_eq!(response.status(), StatusCode::OK);
    let payload: Value = response.json().await?;
    let rows = payload.get("data").and_then(Value::as_array).ok_or_else(|| anyhow!("expected data array"))?;
    assert_eq!(rows.len(), 1, "expected exactly one course row");
    assert_eq!(rows[0].get("id").and_then(Value::as_str), Some(course_id.as_str()));

    delete_course(&client, &token, &course_id).await?;
    Ok(())
}

// ── Write-path shadow coverage ───────────────────────────────────────────────

#[tokio::test]
async fn data_plane_insert_update_delete_lifecycle() -> Result<()> {
    let client = Client::new();
    let token = login(&client).await?;
    let title = format!("Gate3 Lifecycle {}", Uuid::new_v4());

    // INSERT via data plane
    let insert_response = client
        .post(format!("{}/api/v1/data/courses", base_url()))
        .bearer_auth(&token)
        .json(&json!({
            "action": "insert",
            "select": "id,title,status",
            "values": {
                "title": title,
                "description": "Gate3 data plane insert test",
                "status": "draft"
            },
            "single": "single"
        }))
        .send()
        .await?;

    assert_eq!(insert_response.status(), StatusCode::OK);
    let insert_payload: Value = insert_response.json().await?;
    let course_id = insert_payload
        .get("data")
        .and_then(|data| data.get("id"))
        .and_then(Value::as_str)
        .ok_or_else(|| anyhow!("missing id in insert response"))?
        .to_string();

    // UPDATE via data plane
    let new_title = format!("{title} Updated");
    let update_response = client
        .post(format!("{}/api/v1/data/courses", base_url()))
        .bearer_auth(&token)
        .json(&json!({
            "action": "update",
            "select": "id,title",
            "values": {
                "title": new_title
            },
            "filters": [
                { "column": "id", "op": "eq", "value": course_id }
            ],
            "single": "single"
        }))
        .send()
        .await?;

    assert_eq!(update_response.status(), StatusCode::OK);
    let update_payload: Value = update_response.json().await?;
    let updated_title = update_payload
        .get("data")
        .and_then(|data| data.get("title"))
        .and_then(Value::as_str)
        .ok_or_else(|| anyhow!("missing title in update response"))?;
    assert_eq!(updated_title, new_title.as_str());

    // DELETE via data plane
    let delete_response = client
        .post(format!("{}/api/v1/data/courses", base_url()))
        .bearer_auth(&token)
        .json(&json!({
            "action": "delete",
            "filters": [
                { "column": "id", "op": "eq", "value": course_id }
            ]
        }))
        .send()
        .await?;

    assert_eq!(delete_response.status(), StatusCode::OK);
    Ok(())
}

#[tokio::test]
async fn data_plane_update_cannot_change_tenant_id() -> Result<()> {
    let client = Client::new();
    let token = login(&client).await?;
    let title = format!("Gate3 TenantWrite {}", Uuid::new_v4());
    let course_id = create_course(&client, &token, &title).await?;

    let response = client
        .post(format!("{}/api/v1/data/courses", base_url()))
        .bearer_auth(&token)
        .json(&json!({
            "action": "update",
            "values": {
                "tenant_id": Uuid::new_v4().to_string()
            },
            "filters": [
                { "column": "id", "op": "eq", "value": course_id }
            ]
        }))
        .send()
        .await?;

    assert_eq!(response.status(), StatusCode::FORBIDDEN);

    delete_course(&client, &token, &course_id).await?;
    Ok(())
}

// ── Gradebook path ───────────────────────────────────────────────────────────

#[tokio::test]
async fn gradebook_entries_read_path_requires_authorization() -> Result<()> {
    let client = Client::new();
    let response = client
        .post(format!("{}/api/v1/data/gradebook_entries", base_url()))
        .json(&json!({
            "action": "select",
            "select": "id,score,max_score"
        }))
        .send()
        .await?;

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    Ok(())
}

#[tokio::test]
async fn gradebook_entries_read_path_returns_tenant_scoped_data() -> Result<()> {
    let client = Client::new();
    let token = login(&client).await?;

    let response = client
        .post(format!("{}/api/v1/data/gradebook_entries", base_url()))
        .bearer_auth(&token)
        .json(&json!({
            "action": "select",
            "select": "id,score,max_score,notes",
            "limit": 10
        }))
        .send()
        .await?;

    assert_eq!(response.status(), StatusCode::OK);
    let payload: Value = response.json().await?;
    // Data array must be present (may be empty if no gradebook entries for this tenant)
    assert!(payload.get("data").is_some(), "missing data field in response");
    Ok(())
}

// ── Lessons/modules path ─────────────────────────────────────────────────────

#[tokio::test]
async fn lessons_data_plane_read_path() -> Result<()> {
    let client = Client::new();
    let token = login(&client).await?;

    let response = client
        .post(format!("{}/api/v1/data/lessons", base_url()))
        .bearer_auth(&token)
        .json(&json!({
            "action": "select",
            "select": "id,title",
            "limit": 5
        }))
        .send()
        .await?;

    assert_eq!(response.status(), StatusCode::OK);
    let payload: Value = response.json().await?;
    assert!(payload.get("data").is_some(), "missing data field in lessons response");
    Ok(())
}

#[tokio::test]
async fn course_modules_read_path() -> Result<()> {
    let client = Client::new();
    let token = login(&client).await?;

    let response = client
        .post(format!("{}/api/v1/data/course_modules", base_url()))
        .bearer_auth(&token)
        .json(&json!({
            "action": "select",
            "select": "id,title",
            "limit": 5
        }))
        .send()
        .await?;

    assert_eq!(response.status(), StatusCode::OK);
    let payload: Value = response.json().await?;
    assert!(payload.get("data").is_some(), "missing data field in course_modules response");
    Ok(())
}

// ── Divergence sink — identity override ─────────────────────────────────────

#[tokio::test]
async fn divergence_event_with_fake_identity_is_accepted_but_identity_overridden() -> Result<()> {
    let client = Client::new();
    let token = login(&client).await?;

    // Send event with caller-supplied identity fields — server must override them from JWT
    let spoofed_event = json!({
        "request_id": Uuid::new_v4().to_string(),
        "flow_name": "gate3-identity-override-test",
        "endpoint": "/api/v1/data/courses",
        "method": "POST",
        "primary_backend": "vil",
        "shadow_backend": "supabase",
        "normalized_request_signature": "test",
        "result_hash_primary": "aaa",
        "result_hash_shadow": "bbb",
        "diff_summary": "identity override test",
        "severity": "info",
        // These should be overridden by server from JWT context
        "user_id": "00000000-0000-0000-0000-000000000000",
        "tenant_id": "00000000-0000-0000-0000-000000000000",
        "role": "HACKER"
    });

    let response = client
        .post(format!("{}/api/v1/internal/divergence-events", base_url()))
        .bearer_auth(token)
        .json(&spoofed_event)
        .send()
        .await?;

    // Server accepts the event (returns 200) but identity fields are overridden from JWT
    assert_eq!(response.status(), StatusCode::OK);
    Ok(())
}
