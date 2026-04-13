/// Plagiarism detection service - text similarity checking.
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use uuid::Uuid;
use vil_server::prelude::{VilError, VilResponse};

// ─── Types ────────────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct CheckPlagiarismRequest {
    pub submission_id: Uuid,
    pub content: String,
    pub assignment_id: Uuid,
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
    _user_id: Uuid,
    tenant_id: Uuid,
    req: CheckPlagiarismRequest,
) -> Result<VilResponse<PlagiarismReport>, VilError> {
    if req.content.len() < 50 {
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
    .bind(req.assignment_id)
    .bind(req.submission_id)
    .bind(tenant_id)
    .fetch_all(db)
    .await
    .map_err(|e| VilError::internal(format!("DB error: {}", e)))?;

    // Calculate similarity (simple word-based comparison)
    let mut matches = Vec::new();
    let words: Vec<&str> = req.content.split_whitespace().collect();

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

    // Save report
    sqlx::query(
        r#"INSERT INTO public.plagiarism_reports
              (id, submission_id, overall_similarity, status, created_at)
           VALUES ($1, $2, $3, $4, NOW())"#,
    )
    .bind(report_id)
    .bind(req.submission_id)
    .bind(overall_similarity)
    .bind(status)
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
        r#"SELECT overall_similarity, status FROM public.plagiarism_reports WHERE id = $1"#,
    )
    .bind(report_id)
    .fetch_optional(db)
    .await
    .map_err(|e| VilError::internal(format!("DB error: {}", e)))?
    .ok_or_else(|| VilError::not_found("Report not found"))?;

    let overall_similarity: f64 = report.get("overall_similarity");
    let status: String = report.get("status");

    Ok(VilResponse::ok(PlagiarismReport {
        report_id,
        overall_similarity,
        matches: vec![], // TODO: fetch from DB
        status,
    }))
}
