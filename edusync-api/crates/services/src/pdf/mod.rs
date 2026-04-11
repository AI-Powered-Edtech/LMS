/// Modul PDF — sertifikat kursus dan laporan.
///
/// DEPENDENCY: printpdf = "0.7"
///
/// Axum handler (`POST /api/v1/pdf/certificate`) lives in the api-server crate
/// and delegates to `generate_pdf_for_enrollment` below.

pub mod certificate;

use chrono::NaiveDate;
use sqlx::PgPool;
use uuid::Uuid;

use crate::pdf::certificate::{generate_certificate, CertificateData};
use edusync_middleware::errors::AppError;

// ── Request body ──────────────────────────────────────────────────────────────

/// Request body untuk endpoint `POST /api/v1/pdf/certificate`.
#[derive(serde::Deserialize)]
pub struct GenerateCertificateRequest {
    /// ID enrollment yang sudah selesai.
    pub course_enrollment_id: Uuid,
}

// ── Row dari DB ───────────────────────────────────────────────────────────────

#[derive(sqlx::FromRow)]
struct EnrollmentCertRow {
    student_name: String,
    course_name: String,
    completed_at: Option<chrono::DateTime<chrono::Utc>>,
    tenant_name: String,
    user_id: Uuid,
}

// ── Service function: hasilkan PDF sertifikat ─────────────────────────────────

/// Menghasilkan sertifikat PDF untuk enrollment yang sudah selesai.
///
/// Mengembalikan `(pdf_bytes, filename)`.
/// Hanya pemilik enrollment yang dapat mengunduh sertifikatnya sendiri.
///
/// Dipanggil dari handler di crate `api-server`:
/// ```
/// // api-server handler (ringkasan):
/// let (bytes, filename) =
///     edusync_services::pdf::generate_pdf_for_enrollment(&state.db, ctx.user_id, ctx.tenant_id, req).await?;
/// ```
pub async fn generate_pdf_for_enrollment(
    db: &PgPool,
    user_id: Uuid,
    tenant_id: Uuid,
    req: GenerateCertificateRequest,
) -> Result<(Vec<u8>, String), AppError> {
    // Ambil data enrollment + kursus + profil + tenant
    let row = sqlx::query_as!(
        EnrollmentCertRow,
        r#"
        SELECT
            p.full_name    AS student_name,
            c.title        AS course_name,
            e.completed_at,
            t.name         AS tenant_name,
            e.user_id
        FROM enrollments e
        JOIN profiles p ON p.id = e.user_id
        JOIN courses  c ON c.id = e.course_id
        JOIN tenants  t ON t.id = e.tenant_id
        WHERE e.id        = $1
          AND e.tenant_id = $2
        "#,
        req.course_enrollment_id,
        tenant_id,
    )
    .fetch_optional(db)
    .await
    .map_err(|e| AppError::Internal(format!("Gagal mengambil data enrollment: {e}")))?
    .ok_or(AppError::NotFound)?;

    // Pastikan enrollment milik user yang meminta
    if row.user_id != user_id {
        return Err(AppError::Forbidden);
    }

    // Pastikan kursus sudah selesai
    let completed_at = row
        .completed_at
        .ok_or_else(|| AppError::BadRequest("Kursus belum diselesaikan".to_string()))?;

    let completion_date: NaiveDate = completed_at.date_naive();

    // Nomor sertifikat deterministik dari enrollment ID (8 hex chars dari UUID)
    let cert_number = format!(
        "CERT-{}-{}",
        completion_date.format("%Y"),
        &req.course_enrollment_id
            .to_string()
            .replace('-', "")
            .to_uppercase()[..8]
    );

    let cert_data = CertificateData {
        student_name: row.student_name,
        course_name: row.course_name,
        completion_date,
        certificate_number: cert_number.clone(),
        issuer_name: row.tenant_name,
    };

    let pdf_bytes = generate_certificate(cert_data)?;
    let filename = format!("sertifikat-{cert_number}.pdf");
    Ok((pdf_bytes, filename))
}

// ── Executive report (stub) ──────────────────────────────────────────────────

/// Hasilkan laporan eksekutif tenant dalam PDF.
///
/// **Status:** Sedang dikembangkan — mengembalikan placeholder PDF.
pub async fn generate_executive_report(
    _db: &PgPool,
    _tenant_id: Uuid,
) -> Result<Vec<u8>, AppError> {
    generate_placeholder_pdf(
        "Laporan Eksekutif",
        "Laporan eksekutif sedang dikembangkan.",
    )
}

// ── Parent report (stub) ──────────────────────────────────────────────────────

/// Hasilkan laporan orang tua dalam PDF.
///
/// **Status:** Sedang dikembangkan — mengembalikan placeholder PDF.
pub async fn generate_parent_report(
    _db: &PgPool,
    _parent_user_id: Uuid,
) -> Result<Vec<u8>, AppError> {
    generate_placeholder_pdf(
        "Laporan Orang Tua",
        "Laporan orang tua sedang dikembangkan.",
    )
}

// ── Placeholder PDF ───────────────────────────────────────────────────────────

fn generate_placeholder_pdf(title: &str, body_text: &str) -> Result<Vec<u8>, AppError> {
    use printpdf::*;

    let (doc, page1, layer1) = PdfDocument::new(
        title,
        Mm(210.0), // A4 portrait
        Mm(297.0),
        "Konten",
    );
    let layer = doc.get_page(page1).get_layer(layer1);

    let font_bold = doc
        .add_builtin_font(BuiltinFont::HelveticaBold)
        .map_err(|e| AppError::Internal(format!("Gagal load font: {e}")))?;
    let font_reg = doc
        .add_builtin_font(BuiltinFont::Helvetica)
        .map_err(|e| AppError::Internal(format!("Gagal load font: {e}")))?;

    layer.set_fill_color(Color::Rgb(Rgb::new(0.145, 0.388, 0.922, None)));
    layer.use_text(title, 18.0, Mm(30.0), Mm(260.0), &font_bold);

    layer.set_fill_color(Color::Rgb(Rgb::new(0.4, 0.4, 0.4, None)));
    layer.use_text(body_text, 12.0, Mm(30.0), Mm(240.0), &font_reg);

    let bytes = doc
        .save_to_bytes()
        .map_err(|e| AppError::Internal(format!("Gagal menyimpan placeholder PDF: {e}")))?;
    Ok(bytes)
}
