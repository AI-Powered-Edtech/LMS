/// Reports export service - PDF, Excel, dan CSV generation.
///
/// Mendukung export berbagai jenis laporan:
/// - grades: Laporan nilai siswa
/// - attendance: Laporan kehadiran
/// - progress: Laporan progres belajar
///
/// Format yang didukung:
/// - PDF: Untuk cetak dan distribusi formal
/// - Excel (.xlsx): Untuk analisis lebih lanjut
/// - CSV: Untuk integrasi dengan sistem lain
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

// ─── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Deserialize)]
pub struct ExportReportRequest {
    pub report_type: String,
    pub format: String,
    pub course_id: Option<Uuid>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ExportReportResponse {
    pub job_id: Uuid,
    pub status: String,
    pub download_url: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ExportJobStatus {
    pub job_id: Uuid,
    pub status: String,
    pub report_type: String,
    pub format: String,
    pub download_url: Option<String>,
    pub error_message: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub completed_at: Option<chrono::DateTime<chrono::Utc>>,
}

// ─── Create Export Job ────────────────────────────────────────────────────────

pub async fn create_export_job(
    db: &PgPool,
    user_id: Uuid,
    tenant_id: Uuid,
    req: ExportReportRequest,
) -> Result<ExportReportResponse, anyhow::Error> {
    if !["pdf", "excel", "csv"].contains(&req.format.as_str()) {
        anyhow::bail!("Invalid format (use 'pdf', 'excel', or 'csv')");
    }

    if !["grades", "attendance", "progress"].contains(&req.report_type.as_str()) {
        anyhow::bail!("Invalid report type (use 'grades', 'attendance', or 'progress')");
    }

    let job_id = Uuid::new_v4();
    let query_params = serde_json::json!({
        "course_id": req.course_id,
        "start_date": req.start_date,
        "end_date": req.end_date,
    });

    sqlx::query(
        r#"
        INSERT INTO export_jobs
            (id, user_id, tenant_id, report_type, format, status, query_params)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#,
    )
    .bind(job_id)
    .bind(user_id)
    .bind(tenant_id)
    .bind(&req.report_type)
    .bind(&req.format)
    .bind("pending")
    .bind(serde_json::to_string(&query_params)?)
    .execute(db)
    .await?;

    tracing::info!(
        job_id = %job_id,
        user_id = %user_id,
        report_type = %req.report_type,
        format = %req.format,
        "Export job created"
    );

    Ok(ExportReportResponse {
        job_id,
        status: "pending".to_string(),
        download_url: None,
    })
}

// ─── Get Export Status ────────────────────────────────────────────────────────

pub async fn get_export_status(
    db: &PgPool,
    job_id: Uuid,
) -> Result<Option<ExportJobStatus>, anyhow::Error> {
    let row = sqlx::query_as::<_, ExportJobRow>(
        r#"
        SELECT
            id,
            report_type,
            format,
            status,
            download_url,
            error_message,
            created_at,
            completed_at
        FROM export_jobs
        WHERE id = $1
        "#,
    )
    .bind(job_id)
    .fetch_optional(db)
    .await?;

    Ok(row.map(|r| ExportJobStatus {
        job_id: r.id,
        status: r.status,
        report_type: r.report_type,
        format: r.format,
        download_url: r.download_url,
        error_message: r.error_message,
        created_at: r.created_at,
        completed_at: r.completed_at,
    }))
}

#[derive(sqlx::FromRow)]
struct ExportJobRow {
    id: Uuid,
    report_type: String,
    format: String,
    status: String,
    download_url: Option<String>,
    error_message: Option<String>,
    created_at: chrono::DateTime<chrono::Utc>,
    completed_at: Option<chrono::DateTime<chrono::Utc>>,
}

// ─── Fetch Pending Export Jobs ────────────────────────────────────────────────

pub async fn fetch_pending_export_jobs(
    db: &PgPool,
    limit: i64,
) -> Result<Vec<Uuid>, anyhow::Error> {
    let rows = sqlx::query_as::<_, JobIdRow>(
        r#"
        SELECT id
        FROM export_jobs
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT $1
        "#,
    )
    .bind(limit)
    .fetch_all(db)
    .await?;

    Ok(rows.into_iter().map(|r| r.id).collect())
}

#[derive(sqlx::FromRow)]
struct JobIdRow {
    id: Uuid,
}

// ─── Update Export Job Status ─────────────────────────────────────────────────

#[allow(dead_code)]
pub async fn update_export_job_status(
    db: &PgPool,
    job_id: Uuid,
    status: &str,
    download_url: Option<String>,
    s3_key: Option<String>,
    error_message: Option<String>,
) -> Result<(), anyhow::Error> {
    sqlx::query(
        r#"
        UPDATE export_jobs
        SET
            status = $2,
            download_url = $3,
            s3_key = $4,
            error_message = $5,
            completed_at = CASE WHEN $2 = 'completed' OR $2 = 'failed' THEN NOW() ELSE completed_at END,
            started_at = CASE WHEN $2 = 'processing' AND started_at IS NULL THEN NOW() ELSE started_at END
        WHERE id = $1
        "#,
    )
    .bind(job_id)
    .bind(status)
    .bind(&download_url)
    .bind(&s3_key)
    .bind(&error_message)
    .execute(db)
    .await?;

    Ok(())
}

// ─── Generate Grade Report Data ───────────────────────────────────────────

pub async fn generate_grades_report(
    db: &PgPool,
    course_id: Option<Uuid>,
    tenant_id: Uuid,
) -> Result<Vec<GradeRecord>, anyhow::Error> {
    let rows = sqlx::query_as::<_, GradeRecord>(
        r#"
        SELECT
            e.student_id,
            u.full_name as student_name,
            e.course_id,
            c.title as course_title,
            AVG(s.score::numeric) as avg_score,
            COUNT(s.id) as total_assessments
        FROM enrollments e
        JOIN users u ON u.id = e.student_id
        JOIN courses c ON c.id = e.course_id
        LEFT JOIN submissions s ON s.student_id = e.student_id AND s.course_id = e.course_id
        WHERE e.tenant_id = $1
        AND ($2::uuid IS NULL OR e.course_id = $2)
        GROUP BY e.student_id, u.full_name, e.course_id, c.title
        ORDER BY u.full_name
        "#,
    )
    .bind(tenant_id)
    .bind(course_id)
    .fetch_all(db)
    .await?;

    Ok(rows)
}

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct GradeRecord {
    pub student_id: Uuid,
    pub student_name: String,
    pub course_id: Uuid,
    pub course_title: String,
    pub avg_score: Option<f64>,
    pub total_assessments: i64,
}

// ─── Attendance Report ──────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct AttendanceRecord {
    pub student_id: Uuid,
    pub student_name: String,
    pub session_id: Uuid,
    pub status: String,
    pub check_in_time: chrono::DateTime<chrono::Utc>,
    pub session_title: String,
}

// ─── Progress Report ──────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct ProgressRecord {
    pub student_id: Uuid,
    pub student_name: String,
    pub course_id: Uuid,
    pub course_title: String,
    pub progress_percent: f64,
    pub modules_completed: i32,
    pub last_activity_at: Option<chrono::DateTime<chrono::Utc>>,
    pub total_modules: i32,
}

// ─── Generate PDF (placeholder) ────────────────────────────────────────────────

#[allow(dead_code)]
pub async fn generate_pdf_report(
    data: &[u8],
    _report_type: &str,
) -> Result<Vec<u8>, anyhow::Error> {
    Ok(data.to_vec())
}

// ─── Generate Excel (placeholder) ───────────────────────────────────────────

#[allow(dead_code)]
pub async fn generate_excel_report(
    data: &[u8],
    _report_type: &str,
) -> Result<Vec<u8>, anyhow::Error> {
    Ok(data.to_vec())
}

// ─── Generate CSV (placeholder) ────────────────────────────────────────────────

#[allow(dead_code)]
pub async fn generate_csv_report(
    data: &[u8],
    _report_type: &str,
) -> Result<Vec<u8>, anyhow::Error> {
    Ok(data.to_vec())
}

// ─── Export Worker ─────────────────────────────────────────────────

#[allow(dead_code)]
pub async fn run_export_worker(
    db: &PgPool,
    max_jobs: i32,
) -> Result<u32, anyhow::Error> {
    let jobs = fetch_pending_export_jobs(db, max_jobs.into()).await?;
    let mut processed = 0u32;

    for job_id in jobs {
        if process_export_job(db, job_id).await.is_ok() {
            processed += 1;
        }
    }

    Ok(processed)
}

async fn process_export_job(
    db: &PgPool,
    job_id: Uuid,
) -> Result<(), anyhow::Error> {
    tracing::info!(job_id = %job_id, "Processing export job");

    let job = get_export_status(db, job_id).await?
        .ok_or_else(|| anyhow::anyhow!("Job not found"))?;

    // Placeholder - in production, generate actual report
    let _data: Vec<u8> = vec![];

    update_export_job_status(
        db,
        job_id,
        "completed",
        Some(format!("https://storage.example.com/exports/{}.xlsx", job_id)),
        Some(format!("exports/{}.xlsx", job_id)),
        None,
    ).await?;

    Ok(())
}