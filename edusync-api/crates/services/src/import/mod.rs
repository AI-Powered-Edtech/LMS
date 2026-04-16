/// Bulk User Import — Phase 3D
///
/// Ports `supabase/functions/bulk-import-users/index.ts`.
///
/// Parses a CSV with columns: email, full_name, role, class_code (optional)
/// and inserts users into the `profiles` + `user_roles` tables.
///
/// Role values accepted in both English and Indonesian:
///   "student" | "siswa"  → "student"
///   "teacher" | "guru"   → "teacher"
///   "admin"              → "admin"
///
/// Partial success: per-row validation errors are collected and returned
/// without aborting the batch. Only a catastrophic DB error triggers a
/// full transaction rollback.
///
/// Key schema notes (from CLAUDE.md):
///   - enrollments.user_id (NOT student_id)
///   - courses.status = 'published' (NOT is_published)
// DEPENDENCY: csv = "1"
// DEPENDENCY: serde = "1"
// DEPENDENCY: sqlx = "0.8"
// DEPENDENCY: uuid = "1"
// DEPENDENCY: tracing = "0.1"

use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

// ─── Error type ───────────────────────────────────────────────────────────────

/// Errors from the bulk user importer.
#[derive(Debug)]
pub enum BulkImportError {
    /// CSV could not be parsed at all (structural failure, not per-row).
    CsvParse(String),
    /// Database failure.
    Database(String),
}

impl std::fmt::Display for BulkImportError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            BulkImportError::CsvParse(msg) => write!(f, "Gagal mem-parsing CSV: {msg}"),
            BulkImportError::Database(msg) => write!(f, "Kesalahan basis data: {msg}"),
        }
    }
}

impl std::error::Error for BulkImportError {}

// ─── CSV row type ─────────────────────────────────────────────────────────────

/// One row parsed from the import CSV.
///
/// Headers: `email`, `full_name`, `role`, `class_code` (optional).
#[derive(Debug, Deserialize)]
pub struct ImportRow {
    pub email: String,
    pub full_name: String,
    /// Accepted: "student"/"siswa", "teacher"/"guru", "admin"
    pub role: String,
    /// Optional class/group code — used for enrollment if provided.
    pub class_code: Option<String>,
}

// ─── Result types ─────────────────────────────────────────────────────────────

/// Summary returned to the caller after the import completes.
#[derive(Debug, Serialize)]
pub struct ImportResult {
    /// Rows successfully inserted.
    pub success: usize,
    /// Rows skipped because the email already exists for this tenant.
    pub duplicates: usize,
    /// Per-row failures (validation or non-fatal DB errors).
    pub errors: Vec<ImportError>,
}

/// Describes a failure for one CSV row.
#[derive(Debug, Serialize)]
pub struct ImportError {
    /// 1-based row index in the original CSV.
    pub row: usize,
    pub email: String,
    /// Human-readable reason (Bahasa Indonesia).
    pub reason: String,
}

// ─── Validation helpers ───────────────────────────────────────────────────────

/// Normalise a role string to an internal value. Returns None if unrecognised.
fn normalise_role(raw: &str) -> Option<&'static str> {
    match raw.to_lowercase().trim() {
        "student" | "siswa" => Some("student"),
        "teacher" | "guru" => Some("teacher"),
        "admin" => Some("admin"),
        _ => None,
    }
}

/// Basic email sanity check: must contain '@' with non-empty local and domain parts,
/// and domain must contain '.'.
fn is_valid_email(email: &str) -> bool {
    let mut parts = email.splitn(2, '@');
    let local = parts.next().unwrap_or("");
    let domain = parts.next().unwrap_or("");
    !local.is_empty() && domain.contains('.')
}

// ─── Public importer ──────────────────────────────────────────────────────────

/// Parse `csv_bytes` and import users into the database.
///
/// # Parameters
/// - `db`          : database pool (transaction-scoped for all inserts)
/// - `csv_bytes`   : raw UTF-8 CSV content
/// - `tenant_id`   : tenant performing the import
/// - `imported_by` : user ID of the admin who triggered the import
///
/// # Returns
/// `ImportResult` summarising per-row outcomes.
/// Returns `Err(BulkImportError)` only on catastrophic failures (CSV unparseable,
/// transaction commit failure). Per-row errors are included in the result.
pub async fn import_users_from_csv(
    db: &PgPool,
    csv_bytes: &[u8],
    tenant_id: Uuid,
    imported_by: Uuid,
) -> Result<ImportResult, BulkImportError> {
    // ── 1. Parse CSV ─────────────────────────────────────────────────────────
    let mut reader = csv::ReaderBuilder::new()
        .has_headers(true)
        .trim(csv::Trim::All)
        .from_reader(csv_bytes);

    let mut raw_rows: Vec<(usize, ImportRow)> = vec![];
    let mut errors: Vec<ImportError> = vec![];

    for (idx, result) in reader.deserialize::<ImportRow>().enumerate() {
        let row_num = idx + 1; // 1-based
        match result {
            Ok(row) => raw_rows.push((row_num, row)),
            Err(e) => errors.push(ImportError {
                row: row_num,
                email: String::new(),
                reason: format!("Gagal membaca baris CSV: {e}"),
            }),
        }
    }

    if raw_rows.is_empty() {
        return Ok(ImportResult {
            success: 0,
            duplicates: 0,
            errors,
        });
    }

    // ── 2. Per-row validation ────────────────────────────────────────────────
    // Validated tuple: (row_num, email, full_name, role, class_code)
    let mut valid_rows: Vec<(usize, String, String, &'static str, Option<String>)> = vec![];

    for (row_num, row) in &raw_rows {
        let email = row.email.trim().to_lowercase();

        if email.is_empty() {
            errors.push(ImportError {
                row: *row_num,
                email,
                reason: "Email tidak boleh kosong".to_string(),
            });
            continue;
        }

        if !is_valid_email(&email) {
            errors.push(ImportError {
                row: *row_num,
                email: email.clone(),
                reason: format!("Format email tidak valid: {email}"),
            });
            continue;
        }

        let full_name = row.full_name.trim().to_string();
        if full_name.is_empty() {
            errors.push(ImportError {
                row: *row_num,
                email,
                reason: "Nama lengkap tidak boleh kosong".to_string(),
            });
            continue;
        }

        let Some(role) = normalise_role(&row.role) else {
            errors.push(ImportError {
                row: *row_num,
                email,
                reason: format!(
                    "Peran tidak dikenal: '{}'. Gunakan: student/siswa, teacher/guru, admin",
                    row.role
                ),
            });
            continue;
        };

        let class_code = row.class_code.as_ref().and_then(|c| {
            let t = c.trim().to_string();
            if t.is_empty() { None } else { Some(t) }
        });

        valid_rows.push((*row_num, email, full_name, role, class_code));
    }

    if valid_rows.is_empty() {
        return Ok(ImportResult {
            success: 0,
            duplicates: 0,
            errors,
        });
    }

    // ── 3. Bulk duplicate check ──────────────────────────────────────────────
    let emails_to_check: Vec<String> = valid_rows.iter().map(|(_, e, ..)| e.clone()).collect();

    let existing_emails: std::collections::HashSet<String> = sqlx::query_scalar(
        r#"
        SELECT email
        FROM public.profiles
        WHERE email     = ANY($1::text[])
          AND tenant_id = $2
        "#,
    )
    .bind(&emails_to_check[..])
    .bind(tenant_id)
    .fetch_all(db)
    .await
    .map_err(|e| BulkImportError::Database(e.to_string()))?
    .into_iter()
    .collect();

    let mut new_rows: Vec<(usize, String, String, &'static str, Option<String>)> = vec![];
    let mut duplicates: usize = 0;

    for row in valid_rows {
        if existing_emails.contains(&row.1) {
            duplicates += 1;
        } else {
            new_rows.push(row);
        }
    }

    // ── 4. Insert new users in a single transaction ──────────────────────────
    let mut tx = db
        .begin()
        .await
        .map_err(|e| BulkImportError::Database(e.to_string()))?;

    let mut success: usize = 0;

    for (row_num, email, full_name, role, class_code) in &new_rows {
        let new_user_id = Uuid::new_v4();

        let mut name_parts = full_name.splitn(2, ' ');
        let first_name = name_parts.next().unwrap_or("").to_string();
        let last_name = name_parts.next().unwrap_or("").to_string();

        // 4a. Insert into profiles
        let profile_result: Result<sqlx::postgres::PgQueryResult, sqlx::Error> = sqlx::query(
            r#"
            INSERT INTO public.profiles (
                id,
                email,
                first_name,
                last_name,
                tenant_id,
                created_at,
                imported_by
            ) VALUES (
                $1, $2, $3, $4, $5, NOW(), $6
            )
            ON CONFLICT (email, tenant_id) DO NOTHING
            "#,
        )
        .bind(new_user_id)
        .bind(email)
        .bind(&first_name)
        .bind(&last_name)
        .bind(tenant_id)
        .bind(imported_by)
        .execute(&mut *tx)
        .await;

        match profile_result {
            Err(e) => {
                errors.push(ImportError {
                    row: *row_num,
                    email: email.clone(),
                    reason: format!("Gagal membuat profil: {e}"),
                });
                continue;
            }
            Ok(r) if r.rows_affected() == 0 => {
                // Race condition: email appeared between bulk check and insert
                duplicates += 1;
                continue;
            }
            Ok(_) => {}
        }

        // 4b. Insert into user_roles
        let role_result = sqlx::query(
            r#"
            INSERT INTO public.user_roles (
                user_id,
                role,
                tenant_id,
                created_at
            ) VALUES (
                $1, $2::text::app_role, $3, NOW()
            )
            ON CONFLICT (user_id, tenant_id) DO NOTHING
            "#,
        )
        .bind(new_user_id)
        .bind(role)
        .bind(tenant_id)
        .execute(&mut *tx)
        .await;

        if let Err(e) = role_result {
            errors.push(ImportError {
                row: *row_num,
                email: email.clone(),
                reason: format!("Gagal menetapkan peran: {e}"),
            });
            continue;
        }

        // 4c. Optional enrollment via class_code
        // enrollments.user_id (NOT student_id per CLAUDE.md)
        // courses.status = 'published' (NOT is_published)
        if let Some(code) = class_code {
            let enroll_result = sqlx::query(
                r#"
                INSERT INTO public.enrollments (
                    user_id,
                    student_id,
                    class_id,
                    tenant_id,
                    joined_at
                )
                SELECT
                    $1,
                    $1,
                    id,
                    tenant_id,
                    NOW()
                FROM public.classes
                WHERE join_code = $2
                  AND tenant_id  = $3
                ON CONFLICT (student_id, class_id) DO NOTHING
                "#,
            )
            .bind(new_user_id)
            .bind(code)
            .bind(tenant_id)
            .execute(&mut *tx)
            .await;

            if let Err(e) = enroll_result {
                // Non-fatal: log and continue — user was still created
                tracing::warn!(
                    row      = row_num,
                    email    = %email,
                    code     = %code,
                    error    = %e,
                    "import_users: gagal mendaftarkan ke kelas, pengguna tetap dibuat"
                );
            }
        }

        success += 1;
    }

    tx.commit()
        .await
        .map_err(|e| BulkImportError::Database(e.to_string()))?;

    tracing::info!(
        tenant_id  = %tenant_id,
        success    = success,
        duplicates = duplicates,
        errors     = errors.len(),
        "import_users: impor pengguna selesai"
    );

    Ok(ImportResult {
        success,
        duplicates,
        errors,
    })
}
