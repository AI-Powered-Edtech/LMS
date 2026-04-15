/// Port dari `supabase/functions/send-parent-digest/index.ts`
///
/// Mengirim laporan harian aktivitas anak kepada setiap orang tua
/// yang mengaktifkan digest (`digest_enabled = true`).
///
/// Jadwal: dipanggil jam 17:30 WIB = 10:30 UTC oleh scheduler.
use chrono::{Datelike, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::email::{
    EmailClient,
    templates::{parent_digest_html, parent_digest_text},
    types::{DigestItem, DigestResult, EmailRecipient, ParentDigestData},
};
use edusync_middleware::errors::AppError;

// ── Row dari tabel parent_digest_settings ─────────────────────────────────────

#[derive(sqlx::FromRow)]
struct DigestSetting {
    id: Uuid,
    parent_id: Uuid,
    tenant_id: Uuid,
    channel: String,
}

// ── Row gabungan parent + profil ──────────────────────────────────────────────

#[derive(sqlx::FromRow)]
struct ParentProfile {
    parent_id: Uuid,
    email: String,
    full_name: Option<String>,
    phone: Option<String>,
}

// ── Link orang tua–anak ───────────────────────────────────────────────────────

#[derive(sqlx::FromRow)]
struct ParentChildLink {
    parent_id: Uuid,
    student_id: Uuid,
    tenant_id: Uuid,
    child_full_name: Option<String>,
}

// ── Aktivitas harian ──────────────────────────────────────────────────────────

#[derive(sqlx::FromRow)]
struct LessonCompleted {
    user_id: Uuid,
}

#[derive(sqlx::FromRow)]
struct SubmissionRow {
    student_id: Uuid,
}

#[derive(sqlx::FromRow)]
struct AttendanceRow {
    enrollment_id: Uuid,
    status: String,
}

#[derive(sqlx::FromRow)]
struct EnrollmentRow {
    id: Uuid,
    student_id: Uuid,
}

// ── Fungsi utama ──────────────────────────────────────────────────────────────

/// Kirim laporan harian ke semua orang tua yang digest aktif.
pub async fn send_parent_digest(db: &PgPool) -> Result<DigestResult, AppError> {
    let client = EmailClient::from_env();
    let mut result = DigestResult::default();

    // Tanggal hari ini dalam WIB (UTC+7)
    let now_wib = Utc::now() + chrono::Duration::hours(7);
    let today_str = format!(
        "{:04}-{:02}-{:02}",
        now_wib.year(),
        now_wib.month(),
        now_wib.day()
    );
    let today_start_utc = format!("{}T00:00:00+07:00", today_str);
    let today_end_utc = format!("{}T23:59:59+07:00", today_str);

    // ── 1. Ambil semua pengaturan digest yang aktif ────────────────────────────
    let settings: Vec<DigestSetting> = sqlx::query_as!(
        DigestSetting,
        r#"
        SELECT id, parent_id, tenant_id, channel
        FROM parent_digest_settings
        WHERE
            digest_enabled = true
            AND (last_sent_at IS NULL OR last_sent_at < $1::timestamptz)
        "#,
        format!("{}T00:00:00Z", today_str)
    )
    .fetch_all(db)
    .await
    .map_err(|e| AppError::internal(format!("Gagal mengambil pengaturan digest: {e}")))?;

    if settings.is_empty() {
        tracing::info!("[send_parent_digest] Tidak ada orang tua yang perlu digest hari ini");
        return Ok(result);
    }

    let parent_ids: Vec<Uuid> = settings.iter().map(|s| s.parent_id).collect();
    let tenant_ids: Vec<Uuid> = settings
        .iter()
        .map(|s| s.tenant_id)
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect();
    let student_ids_raw: Vec<Uuid>;

    // ── 2. Batch ambil semua link orang tua–anak ──────────────────────────────
    let all_links: Vec<ParentChildLink> = sqlx::query_as!(
        ParentChildLink,
        r#"
        SELECT
            psl.parent_id,
            psl.student_id,
            psl.tenant_id,
            p.full_name AS child_full_name
        FROM student_parent_links psl
        JOIN profiles p ON p.id = psl.student_id
        WHERE psl.parent_id = ANY($1) AND psl.tenant_id = ANY($2)
        "#,
        &parent_ids as &[Uuid],
        &tenant_ids as &[Uuid]
    )
    .fetch_all(db)
    .await
    .map_err(|e| AppError::internal(format!("Gagal mengambil link orang tua–anak: {e}")))?;

    if all_links.is_empty() {
        result.skipped = settings.len();
        return Ok(result);
    }

    // Kumpulkan student IDs unik
    let unique_student_ids: Vec<Uuid> = all_links
        .iter()
        .map(|l| l.student_id)
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect();
    student_ids_raw = unique_student_ids.clone();

    // ── 3. Batch ambil profil orang tua (email) ───────────────────────────────
    let parent_profiles: Vec<ParentProfile> = sqlx::query_as!(
        ParentProfile,
        r#"
        SELECT id AS parent_id, email, full_name, phone
        FROM profiles
        WHERE id = ANY($1)
        "#,
        &parent_ids as &[Uuid]
    )
    .fetch_all(db)
    .await
    .map_err(|e| AppError::internal(format!("Gagal mengambil profil orang tua: {e}")))?;

    let profile_map: std::collections::HashMap<Uuid, &ParentProfile> =
        parent_profiles.iter().map(|p| (p.parent_id, p)).collect();

    // ── 4. Batch ambil aktivitas ──────────────────────────────────────────────
    let lessons = fetch_lessons_completed(
        db, &student_ids_raw, &tenant_ids, &today_start_utc, &today_end_utc,
    ).await?;
    let submissions = fetch_submissions(
        db, &student_ids_raw, &tenant_ids, &today_start_utc, &today_end_utc,
    ).await?;
    let enrollments = fetch_enrollments(db, &student_ids_raw, &tenant_ids).await?;

    // Build map enrollment_id → attendance status
    let all_enrollment_ids: Vec<Uuid> = enrollments.iter().map(|e| e.id).collect();
    let attendance_map = fetch_attendance(db, &all_enrollment_ids, &today_str).await?;

    // Build lookup maps
    let mut lessons_by_student: std::collections::HashMap<Uuid, usize> =
        std::collections::HashMap::new();
    for l in &lessons {
        *lessons_by_student.entry(l.user_id).or_insert(0) += 1;
    }

    let mut submissions_by_student: std::collections::HashMap<Uuid, usize> =
        std::collections::HashMap::new();
    for s in &submissions {
        *submissions_by_student.entry(s.student_id).or_insert(0) += 1;
    }

    let mut enrollments_by_student: std::collections::HashMap<Uuid, Vec<Uuid>> =
        std::collections::HashMap::new();
    for e in &enrollments {
        enrollments_by_student
            .entry(e.student_id)
            .or_default()
            .push(e.id);
    }

    // ── 5. Proses tiap orang tua ──────────────────────────────────────────────
    for setting in &settings {
        let parent_profile = match profile_map.get(&setting.parent_id) {
            Some(p) => p,
            None => {
                result.skipped += 1;
                continue;
            }
        };

        let children: Vec<&ParentChildLink> = all_links
            .iter()
            .filter(|l| l.parent_id == setting.parent_id && l.tenant_id == setting.tenant_id)
            .collect();

        if children.is_empty() {
            result.skipped += 1;
            continue;
        }

        let mut all_activities: Vec<DigestItem> = Vec::new();
        let mut total_attendance = 0i32;

        for child in &children {
            let lessons_count = lessons_by_student.get(&child.student_id).copied().unwrap_or(0);
            let submissions_count =
                submissions_by_student.get(&child.student_id).copied().unwrap_or(0);

            // Cek kehadiran
            let mut hadir = false;
            if let Some(enr_ids) = enrollments_by_student.get(&child.student_id) {
                for enr_id in enr_ids {
                    if let Some(status) = attendance_map.get(enr_id) {
                        let s = status.to_lowercase();
                        if s == "hadir" || s == "present" {
                            hadir = true;
                            break;
                        }
                    }
                }
            }
            if hadir {
                total_attendance += 1;
            }

            let child_name = child
                .child_full_name
                .as_deref()
                .and_then(|n| n.split_whitespace().next())
                .unwrap_or("Anak");

            if hadir {
                all_activities.push(DigestItem {
                    title: format!("{child_name} hadir di sekolah hari ini"),
                    body: String::new(),
                    notification_type: "announcement".to_string(),
                    created_at: Utc::now(),
                });
            }
            if lessons_count > 0 {
                all_activities.push(DigestItem {
                    title: format!("{child_name} menyelesaikan {lessons_count} pelajaran"),
                    body: String::new(),
                    notification_type: "achievement_unlocked".to_string(),
                    created_at: Utc::now(),
                });
            }
            if submissions_count > 0 {
                all_activities.push(DigestItem {
                    title: format!("{child_name} mengumpulkan {submissions_count} tugas"),
                    body: String::new(),
                    notification_type: "assignment_due".to_string(),
                    created_at: Utc::now(),
                });
            }
        }

        // Nama anak pertama untuk judul
        let first_child_name = children
            .first()
            .and_then(|c| c.child_full_name.as_deref())
            .and_then(|n| n.split_whitespace().next())
            .unwrap_or("Anak");

        let data = ParentDigestData {
            recipient: EmailRecipient {
                email: parent_profile.email.clone(),
                name: parent_profile.full_name.clone(),
            },
            child_name: first_child_name.to_string(),
            activities: all_activities,
            attendance_days: total_attendance,
            average_grade: None, // TODO: query grade rata-rata jika diperlukan
        };

        if setting.channel == "email" {
            let subject = format!(
                "Laporan Harian Anak — EduSync ({})",
                today_str
            );
            let html = parent_digest_html(&data);
            let text = parent_digest_text(&data);

            match client
                .send_email(&data.recipient, &subject, &html, &text)
                .await
            {
                Ok(()) => {
                    // Update last_sent_at
                    let _ = sqlx::query!(
                        "UPDATE parent_digest_settings SET last_sent_at = NOW() WHERE id = $1",
                        setting.id
                    )
                    .execute(db)
                    .await;
                    result.sent += 1;
                }
                Err(e) => {
                    tracing::error!(
                        parent_id = %setting.parent_id,
                        error = %e,
                        "[send_parent_digest] Gagal kirim email"
                    );
                    result.errors += 1;
                }
            }
        } else {
            // Channel inapp / whatsapp — ditangani oleh modul lain
            tracing::debug!(
                parent_id = %setting.parent_id,
                channel = %setting.channel,
                "[send_parent_digest] Channel bukan email, dilewati"
            );
            result.skipped += 1;
        }
    }

    tracing::info!(
        sent = result.sent,
        skipped = result.skipped,
        errors = result.errors,
        "[send_parent_digest] Selesai"
    );
    Ok(result)
}

// ── Helper queries ────────────────────────────────────────────────────────────

async fn fetch_lessons_completed(
    db: &PgPool,
    student_ids: &[Uuid],
    tenant_ids: &[Uuid],
    day_start: &str,
    day_end: &str,
) -> Result<Vec<LessonCompleted>, AppError> {
    sqlx::query_as!(
        LessonCompleted,
        r#"
        SELECT user_id
        FROM lesson_progress
        WHERE
            user_id    = ANY($1)
            AND tenant_id  = ANY($2)
            AND completed  = true
            AND completed_at BETWEEN $3::timestamptz AND $4::timestamptz
        LIMIT 5000
        "#,
        student_ids as &[Uuid],
        tenant_ids as &[Uuid],
        day_start,
        day_end,
    )
    .fetch_all(db)
    .await
    .map_err(|e| AppError::internal(format!("Gagal mengambil lesson_progress: {e}")))
}

async fn fetch_submissions(
    db: &PgPool,
    student_ids: &[Uuid],
    tenant_ids: &[Uuid],
    day_start: &str,
    day_end: &str,
) -> Result<Vec<SubmissionRow>, AppError> {
    sqlx::query_as!(
        SubmissionRow,
        r#"
        SELECT student_id
        FROM assignment_submissions
        WHERE
            student_id = ANY($1)
            AND tenant_id  = ANY($2)
            AND status     IN ('submitted', 'graded')
            AND submitted_at BETWEEN $3::timestamptz AND $4::timestamptz
        LIMIT 5000
        "#,
        student_ids as &[Uuid],
        tenant_ids as &[Uuid],
        day_start,
        day_end,
    )
    .fetch_all(db)
    .await
    .map_err(|e| AppError::internal(format!("Gagal mengambil assignment_submissions: {e}")))
}

async fn fetch_enrollments(
    db: &PgPool,
    student_ids: &[Uuid],
    tenant_ids: &[Uuid],
) -> Result<Vec<EnrollmentRow>, AppError> {
    sqlx::query_as!(
        EnrollmentRow,
        r#"
        SELECT id, user_id AS student_id
        FROM enrollments
        WHERE user_id = ANY($1) AND tenant_id = ANY($2)
        LIMIT 10000
        "#,
        student_ids as &[Uuid],
        tenant_ids as &[Uuid]
    )
    .fetch_all(db)
    .await
    .map_err(|e| AppError::internal(format!("Gagal mengambil enrollments: {e}")))
}

async fn fetch_attendance(
    db: &PgPool,
    enrollment_ids: &[Uuid],
    date_str: &str,
) -> Result<std::collections::HashMap<Uuid, String>, AppError> {
    if enrollment_ids.is_empty() {
        return Ok(std::collections::HashMap::new());
    }
    let rows: Vec<AttendanceRow> = sqlx::query_as!(
        AttendanceRow,
        r#"
        SELECT enrollment_id, status
        FROM attendance_records
        WHERE enrollment_id = ANY($1) AND date = $2::date
        LIMIT 10000
        "#,
        enrollment_ids as &[Uuid],
        date_str
    )
    .fetch_all(db)
    .await
    .map_err(|e| AppError::internal(format!("Gagal mengambil attendance_records: {e}")))?;

    let mut map = std::collections::HashMap::new();
    for row in rows {
        map.entry(row.enrollment_id)
            .or_insert_with(|| row.status.clone());
    }
    Ok(map)
}
