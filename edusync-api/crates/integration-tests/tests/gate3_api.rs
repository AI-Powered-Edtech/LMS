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
        return Err(anyhow!("create course failed with status {}", response.status()));
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
        .post(format!("{}/api/v1/rpc/complete_onboarding_step", base_url()))
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
        .get(format!("{}/api/v1/courses?page=1&limit=10&search=Gate3%20CRUD", base_url()))
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
