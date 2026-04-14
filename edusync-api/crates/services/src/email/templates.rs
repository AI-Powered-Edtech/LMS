use chrono::{Datelike, Timelike};

use crate::email::types::{DigestItem, EmailDigestData, ParentDigestData};

// ── Label tipe notifikasi (Bahasa Indonesia) ─────────────────────────────────

fn type_label(notification_type: &str) -> &'static str {
    match notification_type {
        "grade_posted" => "Nilai Baru",
        "assignment_due" => "Tenggat Tugas",
        "quiz_available" => "Kuis Tersedia",
        "announcement" => "Pengumuman",
        "achievement_unlocked" => "Pencapaian",
        "badge_earned" => "Lencana Baru",
        "course_enrolled" => "Pendaftaran Kursus",
        "discussion_reply" => "Balasan Diskusi",
        "parent_daily_digest" => "Laporan Harian",
        "system" => "Informasi Sistem",
        _ => "Notifikasi",
    }
}

// ── HTML escaping ─────────────────────────────────────────────────────────────

fn escape_html(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

// ── Format tanggal singkat (WIB) ──────────────────────────────────────────────

fn format_date_id(dt: &chrono::DateTime<chrono::Utc>) -> String {
    // UTC+7 offset manual (WIB)
    let wib = *dt + chrono::Duration::hours(7);
    format!(
        "{:02}/{:02}/{} {:02}:{:02}",
        wib.day(),
        wib.month(),
        wib.year(),
        wib.hour(),
        wib.minute(),
    )
}

// ── Nama bulan Indonesia ──────────────────────────────────────────────────────

fn bulan_indonesia(month: u32) -> &'static str {
    match month {
        1 => "Januari",
        2 => "Februari",
        3 => "Maret",
        4 => "April",
        5 => "Mei",
        6 => "Juni",
        7 => "Juli",
        8 => "Agustus",
        9 => "September",
        10 => "Oktober",
        11 => "November",
        12 => "Desember",
        _ => "Unknown",
    }
}

// ── Render baris notifikasi ───────────────────────────────────────────────────

fn render_items_html(items: &[DigestItem]) -> String {
    // Kelompokkan per tipe
    let mut groups: Vec<(String, Vec<&DigestItem>)> = Vec::new();
    for item in items {
        let label = type_label(&item.notification_type).to_string();
        if let Some(g) = groups.iter_mut().find(|(l, _)| l == &label) {
            g.1.push(item);
        } else {
            groups.push((label, vec![item]));
        }
    }

    let mut html = String::new();
    for (label, group_items) in &groups {
        // Header kelompok
        html.push_str(&format!(
            r#"<tr>
              <td colspan="2" style="padding:16px 12px 4px;background:#f7f9fc;">
                <strong style="color:#2563eb;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">
                  {} ({})
                </strong>
              </td>
            </tr>"#,
            escape_html(label),
            group_items.len()
        ));

        for item in group_items.iter() {
            let body_html = if item.body.is_empty() {
                String::new()
            } else {
                format!(
                    r#"<br><span style="color:#555;font-size:13px;">{}</span>"#,
                    escape_html(&item.body)
                )
            };
            html.push_str(&format!(
                r#"<tr>
                  <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">
                    <strong style="color:#1e3a5f;">{}</strong>{}
                  </td>
                  <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#888;font-size:12px;white-space:nowrap;">
                    {}
                  </td>
                </tr>"#,
                escape_html(&item.title),
                body_html,
                format_date_id(&item.created_at),
            ));
        }
    }
    html
}

// ── Digest HTML ───────────────────────────────────────────────────────────────

/// Menghasilkan HTML email digest harian untuk satu pengguna.
pub fn digest_html(data: &EmailDigestData) -> String {
    let recipient_name = data.recipient.name.as_deref().unwrap_or("Pengguna EduSync");
    let recipient_email = &data.recipient.email;
    let count = data.items.len();
    let sections = render_items_html(&data.items);
    let app_url = std::env::var("APP_URL").unwrap_or_else(|_| "https://edusync.app".to_string());

    format!(
        r#"<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Ringkasan Notifikasi EduSync</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td colspan="2" style="background:#2563eb;padding:24px 32px;">
              <h1 style="margin:0;color:#fff;font-size:22px;">EduSync</h1>
              <p style="margin:4px 0 0;color:#bfdbfe;font-size:14px;">
                Ringkasan Aktivitas EduSync — 24 jam terakhir
              </p>
            </td>
          </tr>

          <!-- Salam -->
          <tr>
            <td colspan="2" style="padding:20px 24px 8px;">
              <p style="margin:0;color:#333;font-size:14px;">
                Halo, <strong>{recipient_name}</strong>! Anda memiliki
                <strong>{count} notifikasi</strong> yang belum dibaca.
              </p>
            </td>
          </tr>

          <!-- Tabel notifikasi -->
          <tr>
            <td colspan="2" style="padding:8px 12px 0;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="border-collapse:collapse;font-size:14px;">
                {sections}
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td colspan="2" style="padding:24px;text-align:center;">
              <a href="{app_url}/#/app/student/notifications"
                 style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;
                        border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;">
                Lihat Semua Notifikasi
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td colspan="2" style="padding:16px 24px;background:#f7f9fc;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
                Email ini dikirim ke {recipient_email}.<br>
                Anda dapat menonaktifkan email notifikasi di pengaturan akun EduSync.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"#,
        recipient_name = escape_html(recipient_name),
        count = count,
        sections = sections,
        app_url = app_url,
        recipient_email = escape_html(recipient_email),
    )
}

/// Teks biasa (fallback) untuk email digest.
pub fn digest_text(data: &EmailDigestData) -> String {
    let mut lines = Vec::new();
    lines.push("=== Ringkasan Aktivitas EduSync ===".to_string());
    lines.push(format!(
        "Halo, {}! Anda memiliki {} notifikasi belum dibaca.",
        data.recipient.name.as_deref().unwrap_or("Pengguna"),
        data.items.len()
    ));
    lines.push(String::new());
    for item in &data.items {
        lines.push(format!(
            "[{}] {} — {}",
            type_label(&item.notification_type),
            item.title,
            format_date_id(&item.created_at)
        ));
        if !item.body.is_empty() {
            lines.push(format!("  {}", item.body));
        }
    }
    lines.push(String::new());
    lines.push("Buka EduSync untuk melihat detail notifikasi.".to_string());
    lines.join("\n")
}

// ── Parent Digest HTML ────────────────────────────────────────────────────────

/// Menghasilkan HTML email laporan harian orang tua.
pub fn parent_digest_html(data: &ParentDigestData) -> String {
    let recipient_name = data.recipient.name.as_deref().unwrap_or("Orang Tua");
    let recipient_email = &data.recipient.email;
    let child_name = &data.child_name;

    let activities_html = if data.activities.is_empty() {
        r#"<tr><td style="padding:12px;color:#888;">Tidak ada aktivitas baru hari ini.</td></tr>"#
            .to_string()
    } else {
        let mut html = String::new();
        for act in &data.activities {
            let body_part = if act.body.is_empty() {
                String::new()
            } else {
                format!(
                    r#"<br><span style="font-size:12px;color:#555;">{}</span>"#,
                    escape_html(&act.body)
                )
            };
            html.push_str(&format!(
                r#"<tr>
                  <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">
                    <span style="font-size:11px;color:#2563eb;background:#eff6ff;padding:2px 6px;border-radius:3px;">
                      {}
                    </span>
                    <br>
                    <strong style="color:#1e3a5f;">{}</strong>{}
                  </td>
                </tr>"#,
                escape_html(type_label(&act.notification_type)),
                escape_html(&act.title),
                body_part,
            ));
        }
        html
    };

    let grade_html = match data.average_grade {
        Some(g) => format!(
            r#"<tr>
              <td style="padding:8px 24px;">
                <span style="color:#555;font-size:14px;">Rata-rata nilai: </span>
                <strong style="color:#1e3a5f;font-size:16px;">{:.1}</strong>
              </td>
            </tr>"#,
            g
        ),
        None => String::new(),
    };

    let app_url = std::env::var("APP_URL").unwrap_or_else(|_| "https://edusync.app".to_string());

    format!(
        r#"<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Laporan Aktivitas {child_name} — EduSync</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#2563eb;padding:24px 32px;">
              <h1 style="margin:0;color:#fff;font-size:22px;">EduSync</h1>
              <p style="margin:4px 0 0;color:#bfdbfe;font-size:14px;">
                Laporan Aktivitas {child_name}
              </p>
            </td>
          </tr>

          <!-- Salam -->
          <tr>
            <td style="padding:20px 24px 8px;">
              <p style="margin:0;color:#333;font-size:14px;">
                Halo, <strong>{recipient_name}</strong>! Berikut ringkasan aktivitas
                <strong>{child_name}</strong> hari ini.
              </p>
            </td>
          </tr>

          <!-- Statistik kehadiran -->
          <tr>
            <td style="padding:8px 24px;">
              <span style="color:#555;font-size:14px;">Kehadiran: </span>
              <strong style="color:#1e3a5f;font-size:16px;">{attendance_days} hari hadir</strong>
            </td>
          </tr>

          {grade_html}

          <!-- Aktivitas -->
          <tr>
            <td style="padding:8px 24px 0;">
              <p style="margin:0 0 8px;color:#374151;font-weight:bold;font-size:14px;">
                Aktivitas Hari Ini:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="border-collapse:collapse;font-size:14px;">
                {activities_html}
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:24px;text-align:center;">
              <a href="{app_url}/#/app/parent/dashboard"
                 style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;
                        border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;">
                Lihat Laporan Lengkap
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 24px;background:#f7f9fc;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
                Email ini dikirim ke {recipient_email}.<br>
                Anda dapat mengubah pengaturan notifikasi di aplikasi EduSync.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"#,
        child_name = escape_html(child_name),
        recipient_name = escape_html(recipient_name),
        attendance_days = data.attendance_days,
        grade_html = grade_html,
        activities_html = activities_html,
        app_url = app_url,
        recipient_email = escape_html(recipient_email),
    )
}

/// Teks biasa (fallback) untuk email laporan orang tua.
pub fn parent_digest_text(data: &ParentDigestData) -> String {
    let mut lines = Vec::new();
    lines.push(format!(
        "=== Laporan Aktivitas {} — EduSync ===",
        data.child_name
    ));
    lines.push(format!(
        "Halo, {}!",
        data.recipient.name.as_deref().unwrap_or("Orang Tua")
    ));
    lines.push(String::new());
    lines.push(format!("Kehadiran: {} hari hadir", data.attendance_days));
    if let Some(g) = data.average_grade {
        lines.push(format!("Rata-rata nilai: {:.1}", g));
    }
    lines.push(String::new());
    lines.push("Aktivitas hari ini:".to_string());
    if data.activities.is_empty() {
        lines.push("  Tidak ada aktivitas baru.".to_string());
    } else {
        for act in &data.activities {
            lines.push(format!(
                "  [{}] {}",
                type_label(&act.notification_type),
                act.title
            ));
            if !act.body.is_empty() {
                lines.push(format!("    {}", act.body));
            }
        }
    }
    lines.push(String::new());
    lines.push("Buka EduSync untuk melihat laporan lengkap.".to_string());
    lines.join("\n")
}

// ── Format tanggal Indonesia untuk sertifikat ─────────────────────────────────

/// Format `chrono::NaiveDate` ke "11 April 2026".
pub fn format_tanggal_indonesia(date: chrono::NaiveDate) -> String {
    format!(
        "{} {} {}",
        date.day(),
        bulan_indonesia(date.month()),
        date.year()
    )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn make_item(t: &str, title: &str) -> DigestItem {
        DigestItem {
            title: title.to_string(),
            body: String::new(),
            notification_type: t.to_string(),
            created_at: Utc::now(),
        }
    }

    #[test]
    fn digest_html_contains_judul() {
        let data = EmailDigestData {
            recipient: crate::email::types::EmailRecipient {
                email: "test@edusync.dev".to_string(),
                name: Some("Budi".to_string()),
            },
            items: vec![make_item("grade_posted", "Nilai Matematika")],
            tenant_name: "SMPN 1 Jakarta".to_string(),
        };
        let html = digest_html(&data);
        assert!(html.contains("Ringkasan Aktivitas EduSync"));
        assert!(html.contains("Nilai Baru"));
        assert!(html.contains("Nilai Matematika"));
    }

    #[test]
    fn format_tanggal_works() {
        use chrono::NaiveDate;
        let d = NaiveDate::from_ymd_opt(2026, 4, 11).unwrap();
        assert_eq!(format_tanggal_indonesia(d), "11 April 2026");
    }
}
