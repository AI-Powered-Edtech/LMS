/// Port dari `supabase/functions/generate-pdf/index.ts`
///
/// Menghasilkan sertifikat penyelesaian kursus dalam format PDF landscape A4.
/// Menggunakan `printpdf` untuk rendering.
///
/// DEPENDENCY: printpdf = "0.7"
/// DEPENDENCY: chrono = { version = "0.4", features = ["serde"] }
use chrono::NaiveDate;
use edusync_middleware::errors::AppError;

// ── Struct data sertifikat ────────────────────────────────────────────────────

/// Data yang diperlukan untuk membuat sertifikat.
#[derive(Debug, Clone)]
pub struct CertificateData {
    /// Nama lengkap siswa.
    pub student_name: String,
    /// Judul kursus yang diselesaikan.
    pub course_name: String,
    /// Tanggal penyelesaian.
    pub completion_date: NaiveDate,
    /// Nomor unik sertifikat (mis. "CERT-2026-00123").
    pub certificate_number: String,
    /// Nama sekolah / tenant.
    pub issuer_name: String,
}

// ── Format tanggal Indonesia ──────────────────────────────────────────────────

/// Format `NaiveDate` ke "11 April 2026".
pub fn format_tanggal(date: NaiveDate) -> String {
    use chrono::Datelike;
    let bulan = match date.month() {
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
    };
    format!("{} {} {}", date.day(), bulan, date.year())
}

// ── Konstanta dimensi ─────────────────────────────────────────────────────────

// A4 landscape: 297mm × 210mm
const PAGE_WIDTH_MM: f64 = 297.0;
const PAGE_HEIGHT_MM: f64 = 210.0;

// Konversi mm ke pt (1 pt = 0.352778 mm → 1 mm = 2.83465 pt)
const MM_TO_PT: f64 = 2.834_645_669;

fn mm(v: f64) -> printpdf::Mm {
    printpdf::Mm(v)
}

// ── Warna ─────────────────────────────────────────────────────────────────────

fn blue() -> printpdf::Color {
    // #2563eb → RGB(0.145, 0.388, 0.922)
    printpdf::Color::Rgb(printpdf::Rgb::new(0.145, 0.388, 0.922, None))
}

fn gold() -> printpdf::Color {
    // gold accent → RGB(0.757, 0.604, 0.227)
    printpdf::Color::Rgb(printpdf::Rgb::new(0.757, 0.604, 0.227, None))
}

fn dark() -> printpdf::Color {
    printpdf::Color::Rgb(printpdf::Rgb::new(0.1, 0.1, 0.1, None))
}

fn gray() -> printpdf::Color {
    printpdf::Color::Rgb(printpdf::Rgb::new(0.35, 0.35, 0.35, None))
}

fn white() -> printpdf::Color {
    printpdf::Color::Rgb(printpdf::Rgb::new(1.0, 1.0, 1.0, None))
}

fn near_white() -> printpdf::Color {
    printpdf::Color::Rgb(printpdf::Rgb::new(0.99, 0.99, 1.0, None))
}

// ── Fungsi utama ──────────────────────────────────────────────────────────────

/// Hasilkan PDF sertifikat sebagai `Vec<u8>` (bytes siap kirim).
pub fn generate_certificate(data: CertificateData) -> Result<Vec<u8>, AppError> {
    use printpdf::*;

    let (doc, page1, layer1) = PdfDocument::new(
        format!("Sertifikat — {}", data.student_name),
        mm(PAGE_WIDTH_MM),
        mm(PAGE_HEIGHT_MM),
        "Sertifikat",
    );

    let current_layer = doc.get_page(page1).get_layer(layer1);

    let w = PAGE_WIDTH_MM;
    let h = PAGE_HEIGHT_MM;

    // ── Background ──────────────────────────────────────────────────────────

    current_layer.set_fill_color(near_white());
    current_layer.add_rect(Rect::new(mm(0.0), mm(0.0), mm(w), mm(h)));

    // ── Border luar (biru) ──────────────────────────────────────────────────

    current_layer.set_outline_color(blue());
    current_layer.set_outline_thickness(1.5 * MM_TO_PT);
    current_layer.set_fill_color(printpdf::Color::Rgb(Rgb::new(0.0, 0.0, 0.0, None))); // transparent trick
                                                                                       // Outer rect
    draw_rect_outline(&current_layer, 7.0, 7.0, w - 14.0, h - 14.0);

    // ── Border dalam (gold) ─────────────────────────────────────────────────

    current_layer.set_outline_color(gold());
    current_layer.set_outline_thickness(0.75 * MM_TO_PT);
    draw_rect_outline(&current_layer, 12.0, 12.0, w - 24.0, h - 24.0);

    // ── Dekorasi sudut (gold) ───────────────────────────────────────────────

    current_layer.set_fill_color(gold());
    let corner_sz = 5.0_f64;
    for (cx, cy) in [
        (12.0, 12.0),
        (w - 12.0 - corner_sz, 12.0),
        (12.0, h - 12.0 - corner_sz),
        (w - 12.0 - corner_sz, h - 12.0 - corner_sz),
    ] {
        current_layer.add_rect(Rect::new(
            mm(cx),
            mm(cy),
            mm(cx + corner_sz),
            mm(cy + corner_sz),
        ));
    }

    // ── Garis dekoratif horizontal (gold) ──────────────────────────────────

    current_layer.set_outline_color(gold());
    current_layer.set_outline_thickness(0.5 * MM_TO_PT);
    draw_h_line(&current_layer, 28.0, h - 50.0, w - 56.0); // atas konten
    draw_h_line(&current_layer, 28.0, 35.0, w - 56.0); // bawah konten

    // ── Font ────────────────────────────────────────────────────────────────

    let font_regular = doc
        .add_builtin_font(BuiltinFont::Helvetica)
        .map_err(|e| AppError::Internal(format!("Gagal load font regular: {e}")))?;
    let font_bold = doc
        .add_builtin_font(BuiltinFont::HelveticaBold)
        .map_err(|e| AppError::Internal(format!("Gagal load font bold: {e}")))?;
    let font_italic = doc
        .add_builtin_font(BuiltinFont::HelveticaOblique)
        .map_err(|e| AppError::Internal(format!("Gagal load font italic: {e}")))?;

    let center = w / 2.0;

    // ── EduSync branding ────────────────────────────────────────────────────

    current_layer.set_fill_color(blue());
    write_centered(&current_layer, &font_bold, 6.0, "EduSync", center, h - 28.0);

    // ── Judul ───────────────────────────────────────────────────────────────

    current_layer.set_fill_color(blue());
    write_centered(
        &current_layer,
        &font_bold,
        11.0,
        "SERTIFIKAT PENYELESAIAN",
        center,
        h - 42.0,
    );

    // ── "Diberikan kepada:" ─────────────────────────────────────────────────

    current_layer.set_fill_color(gray());
    write_centered(
        &current_layer,
        &font_italic,
        5.0,
        "Diberikan kepada:",
        center,
        h - 65.0,
    );

    // ── Nama siswa ──────────────────────────────────────────────────────────

    current_layer.set_fill_color(dark());
    write_centered(
        &current_layer,
        &font_bold,
        13.0,
        &data.student_name,
        center,
        h - 82.0,
    );

    // Garis bawah nama
    current_layer.set_outline_color(blue());
    current_layer.set_outline_thickness(0.7 * MM_TO_PT);
    let name_line_half = (data.student_name.len() as f64 * 2.5).min(70.0);
    draw_h_line(
        &current_layer,
        center - name_line_half,
        h - 86.0,
        name_line_half * 2.0,
    );

    // ── "Telah berhasil menyelesaikan kursus:" ──────────────────────────────

    current_layer.set_fill_color(gray());
    write_centered(
        &current_layer,
        &font_regular,
        5.0,
        "Telah berhasil menyelesaikan kursus:",
        center,
        h - 97.0,
    );

    // ── Judul kursus ────────────────────────────────────────────────────────

    current_layer.set_fill_color(dark());
    write_centered(
        &current_layer,
        &font_bold,
        8.0,
        &data.course_name,
        center,
        h - 110.0,
    );

    // ── Tanggal penyelesaian ────────────────────────────────────────────────

    current_layer.set_fill_color(gray());
    let date_label = format!(
        "Tanggal penyelesaian: {}",
        format_tanggal(data.completion_date)
    );
    write_centered(
        &current_layer,
        &font_regular,
        4.5,
        &date_label,
        center,
        h - 126.0,
    );

    // ── Nama penerbit (tenant) ──────────────────────────────────────────────

    current_layer.set_fill_color(dark());
    write_centered(
        &current_layer,
        &font_bold,
        5.5,
        &data.issuer_name,
        center,
        h - 140.0,
    );

    // ── Nomor sertifikat (bawah) ────────────────────────────────────────────

    current_layer.set_fill_color(gray());
    let cert_label = format!("No. Sertifikat: {}", data.certificate_number);
    write_centered(
        &current_layer,
        &font_regular,
        3.5,
        &cert_label,
        center,
        20.0,
    );

    // ── Serialize ke bytes ──────────────────────────────────────────────────

    let bytes = doc
        .save_to_bytes()
        .map_err(|e| AppError::Internal(format!("Gagal menyimpan PDF: {e}")))?;

    Ok(bytes)
}

// ── Helper drawing ────────────────────────────────────────────────────────────

fn draw_rect_outline(layer: &printpdf::PdfLayerReference, x: f64, y: f64, w: f64, h: f64) {
    use printpdf::{Line, Point};
    let pts = vec![
        (Point::new(mm(x), mm(y)), false),
        (Point::new(mm(x + w), mm(y)), false),
        (Point::new(mm(x + w), mm(y + h)), false),
        (Point::new(mm(x), mm(y + h)), false),
    ];
    let line = Line {
        points: pts,
        is_closed: true,
    };
    layer.add_line(line);
}

fn draw_h_line(layer: &printpdf::PdfLayerReference, x: f64, y: f64, length: f64) {
    use printpdf::{Line, Point};
    let pts = vec![
        (Point::new(mm(x), mm(y)), false),
        (Point::new(mm(x + length), mm(y)), false),
    ];
    let line = Line {
        points: pts,
        is_closed: false,
    };
    layer.add_line(line);
}

fn write_centered(
    layer: &printpdf::PdfLayerReference,
    font: &printpdf::IndirectFontRef,
    font_size_mm: f64,
    text: &str,
    center_x: f64,
    baseline_y: f64,
) {
    // Estimasi lebar teks (approx — printpdf tidak menyediakan metric untuk built-in font)
    // Kita gunakan pendekatan konservatif: ~0.6 * font_size per karakter
    let approx_char_width_mm = font_size_mm * 0.52;
    let text_width = text.len() as f64 * approx_char_width_mm;
    let x = (center_x - text_width / 2.0).max(10.0);

    layer.use_text(
        text,
        font_size_mm * MM_TO_PT, // pt
        mm(x),
        mm(baseline_y),
        font,
    );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn format_tanggal_test() {
        let d = NaiveDate::from_ymd_opt(2026, 4, 11).unwrap();
        assert_eq!(format_tanggal(d), "11 April 2026");
        let d2 = NaiveDate::from_ymd_opt(2026, 1, 1).unwrap();
        assert_eq!(format_tanggal(d2), "1 Januari 2026");
    }

    #[test]
    fn generate_certificate_produces_pdf() {
        let data = CertificateData {
            student_name: "Budi Santoso".to_string(),
            course_name: "Matematika Dasar".to_string(),
            completion_date: NaiveDate::from_ymd_opt(2026, 4, 11).unwrap(),
            certificate_number: "CERT-2026-00001".to_string(),
            issuer_name: "SMPN 1 Jakarta".to_string(),
        };
        let bytes = generate_certificate(data).expect("PDF harus berhasil dibuat");
        // PDF magic bytes: %PDF
        assert!(bytes.starts_with(b"%PDF"), "Output harus berupa PDF");
        assert!(bytes.len() > 1_000, "PDF harus lebih dari 1KB");
    }
}
