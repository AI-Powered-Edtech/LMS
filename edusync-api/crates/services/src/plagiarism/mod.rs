/// Plagiarism detection service - text similarity checking.
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use uuid::Uuid;
use vil_server::prelude::{VilError, VilResponse};

// ─── Types ────────────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct CheckPlagiarismRequest {
    pub submission_id: Uuid,
}

#[derive(Serialize)]
pub struct PlagiarismMatch {
    pub submission_id: Uuid,
    pub student_name: String,
    pub similarity: f64, // 0.0 - 1.0
    pub matched_text: Vec<String>,
}

#[derive(Serialize)]
pub struct PlagiarismReport {
    pub report_id: Uuid,
    pub overall_similarity: f64,
    pub matches: Vec<PlagiarismMatch>,
    pub status: String, // "clean" | "suspicious" | "high_risk"
}

// ─── Check Plagiarism ─────────────────────────────────────────────────────────

pub async fn check_plagiarism(
    db: &PgPool,
    user_id: Uuid,
    tenant_id: Uuid,
    req: CheckPlagiarismRequest,
) -> Result<VilResponse<PlagiarismReport>, VilError> {
    // G-3 BE-trim (2026-05-09): FE only sends `{ submission_id }`. We look up
    // content + assignment_id from public.submissions ourselves so the FE
    // doesn't need to know either schema. Tenant-scoped for defense-in-depth
    // alongside RLS.
    let row = sqlx::query(
        r#"SELECT content, assignment_id
           FROM public.submissions
           WHERE id = $1 AND tenant_id = $2"#,
    )
    .bind(req.submission_id)
    .bind(tenant_id)
    .fetch_optional(db)
    .await
    .map_err(|e| VilError::internal(format!("DB error: {}", e)))?
    .ok_or_else(|| VilError::not_found("Submission not found"))?;

    let content: String = row.try_get("content").unwrap_or_default();
    let assignment_id: Uuid = row.get("assignment_id");

    if content.len() < 50 {
        return Err(VilError::bad_request("Content too short (min 50 chars)"));
    }

    // Fetch other submissions for comparison
    let submissions = sqlx::query(
        r#"SELECT s.id, s.content, u.full_name
           FROM public.submissions s
           JOIN public.users u ON u.id = s.student_id
           WHERE s.assignment_id = $1
             AND s.id != $2
             AND s.tenant_id = $3
           LIMIT 50"#,
    )
    .bind(assignment_id)
    .bind(req.submission_id)
    .bind(tenant_id)
    .fetch_all(db)
    .await
    .map_err(|e| VilError::internal(format!("DB error: {}", e)))?;

    // Calculate similarity (simple word-based comparison)
    let mut matches = Vec::new();
    let words: Vec<&str> = content.split_whitespace().collect();

    for sub in submissions {
        let other_content: String = sub.get("content");
        let other_words: Vec<&str> = other_content.split_whitespace().collect();

        let similarity = calculate_similarity(&words, &other_words);

        if similarity > 0.3 {
            let sub_id: Uuid = sub.get("id");
            let full_name: Option<String> = sub.try_get("full_name").ok();
            matches.push(PlagiarismMatch {
                submission_id: sub_id,
                student_name: full_name.unwrap_or_else(|| "Unknown".to_string()),
                similarity,
                matched_text: vec![], // TODO: extract matched phrases
            });
        }
    }

    let overall_similarity = matches
        .iter()
        .map(|m| m.similarity)
        .max_by(|a, b| a.partial_cmp(b).unwrap())
        .unwrap_or(0.0);

    let status = if overall_similarity > 0.7 {
        "high_risk"
    } else if overall_similarity > 0.4 {
        "suspicious"
    } else {
        "clean"
    };

    let report_id = Uuid::new_v4();

    // Save check history. FE PlagiarismDashboard reads via Supabase RLS from
    // this same table; schema in migration 077_plagiarism_checks.sql.
    let similarity_score: i32 = (overall_similarity * 100.0).round() as i32;
    let report_data = serde_json::json!({
        "matches": &matches,
    });
    sqlx::query(
        r#"INSERT INTO public.plagiarism_checks
              (id, submission_id, provider, status, similarity_score,
               report_data, checked_by, tenant_id, created_at, updated_at)
           VALUES ($1, $2, 'internal', 'completed', $3, $4, $5, $6, NOW(), NOW())"#,
    )
    .bind(report_id)
    .bind(req.submission_id)
    .bind(similarity_score)
    .bind(report_data)
    .bind(user_id)
    .bind(tenant_id)
    .execute(db)
    .await
    .ok();

    Ok(VilResponse::ok(PlagiarismReport {
        report_id,
        overall_similarity,
        matches,
        status: status.to_string(),
    }))
}

// ─── Similarity Calculation ───────────────────────────────────────────────────

fn calculate_similarity(words1: &[&str], words2: &[&str]) -> f64 {
    if words1.is_empty() || words2.is_empty() {
        return 0.0;
    }

    let set1: std::collections::HashSet<_> = words1.iter().collect();
    let set2: std::collections::HashSet<_> = words2.iter().collect();

    let intersection = set1.intersection(&set2).count();
    let union = set1.union(&set2).count();

    if union == 0 {
        0.0
    } else {
        intersection as f64 / union as f64
    }
}

// ─── Get Report ───────────────────────────────────────────────────────────────

pub async fn get_plagiarism_report(
    db: &PgPool,
    report_id: Uuid,
) -> Result<VilResponse<PlagiarismReport>, VilError> {
    let report = sqlx::query(
        r#"SELECT similarity_score, status FROM public.plagiarism_checks WHERE id = $1"#,
    )
    .bind(report_id)
    .fetch_optional(db)
    .await
    .map_err(|e| VilError::internal(format!("DB error: {}", e)))?
    .ok_or_else(|| VilError::not_found("Report not found"))?;

    let similarity_score: Option<i32> = report.try_get("similarity_score").ok();
    let status: String = report.get("status");

    Ok(VilResponse::ok(PlagiarismReport {
        report_id,
        overall_similarity: similarity_score.map(|s| f64::from(s) / 100.0).unwrap_or(0.0),
        matches: vec![], // TODO: hydrate from report_data JSONB
        status,
    }))
}
