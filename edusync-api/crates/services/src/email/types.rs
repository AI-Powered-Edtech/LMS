// DEPENDENCY: chrono = { version = "0.4", features = ["serde"] }
// DEPENDENCY: serde = { version = "1", features = ["derive"] }

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Satu penerima email.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmailRecipient {
    pub email: String,
    pub name: Option<String>,
}

/// Satu item notifikasi dalam digest.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DigestItem {
    /// Judul notifikasi.
    pub title: String,
    /// Isi notifikasi (opsional).
    pub body: String,
    /// Tipe notifikasi (grade_posted, announcement, dst).
    pub notification_type: String,
    /// Waktu notifikasi dibuat (UTC).
    pub created_at: DateTime<Utc>,
}

/// Data untuk membangun email digest harian.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmailDigestData {
    pub recipient: EmailRecipient,
    pub items: Vec<DigestItem>,
    pub tenant_name: String,
}

/// Aktivitas anak untuk laporan orang tua.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParentDigestData {
    pub recipient: EmailRecipient,
    /// Nama depan anak.
    pub child_name: String,
    /// Daftar aktivitas hari ini.
    pub activities: Vec<DigestItem>,
    /// Jumlah hari hadir (minggu ini / bulan ini).
    pub attendance_days: i32,
    /// Rata-rata nilai (jika tersedia).
    pub average_grade: Option<f64>,
}

/// Hasil operasi pengiriman batch.
#[derive(Debug, Default, Serialize, Deserialize)]
pub struct DigestResult {
    /// Jumlah email berhasil dikirim.
    pub sent: usize,
    /// Jumlah pengguna dilewati (preferensi mati / tidak ada notifikasi).
    pub skipped: usize,
    /// Jumlah pengguna yang gagal dikirim.
    pub errors: usize,
}
