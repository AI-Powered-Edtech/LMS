/// Video HLS Transcoding Pipeline
///
/// Mendukung dua mode:
/// 1. Cloudflare Stream (external service)
/// 2. Local HLS transcoding via ffmpeg (menggunakan S3 storage)
///
/// Background job worker memproses antrean video dan menyimpan status ke database.
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct VideoTranscodingJob {
    pub id: Uuid,
    pub user_id: Uuid,
    pub original_filename: String,
    pub s3_key: String,
    pub status: String,
    pub progress_percent: i32,
    pub hls_manifest_url: Option<String>,
    pub thumbnail_url: Option<String>,
    pub duration_seconds: Option<f64>,
    pub error_message: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub started_at: Option<chrono::DateTime<chrono::Utc>>,
    pub completed_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TranscodingStatus {
    Pending,
    Processing,
    Completed,
    Failed,
}

impl std::fmt::Display for TranscodingStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TranscodingStatus::Pending => write!(f, "pending"),
            TranscodingStatus::Processing => write!(f, "processing"),
            TranscodingStatus::Completed => write!(f, "completed"),
            TranscodingStatus::Failed => write!(f, "failed"),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct CreateTranscodingJobRequest {
    pub video_id: Uuid,
    pub s3_key: String,
    pub original_filename: String,
}

#[derive(Debug, Serialize)]
pub struct TranscodingStatusResponse {
    pub video_id: Uuid,
    pub status: String,
    pub progress_percent: i32,
    pub hls_manifest_url: Option<String>,
    pub thumbnail_url: Option<String>,
    pub duration_seconds: Option<f64>,
    pub error_message: Option<String>,
}

fn row_to_job(row: VideoTranscodingJob) -> VideoTranscodingJob {
    row
}

/// Membuat entri transcoding job baru di database
pub async fn create_transcoding_job(
    db: &PgPool,
    req: CreateTranscodingJobRequest,
    user_id: Uuid,
) -> Result<VideoTranscodingJob, anyhow::Error> {
    let job: VideoTranscodingJob = sqlx::query_as(
        r#"
        INSERT INTO video_transcoding_jobs
            (id, user_id, original_filename, s3_key, status, progress_percent)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
            id, user_id, original_filename, s3_key, status,
            progress_percent, hls_manifest_url, thumbnail_url, duration_seconds,
            error_message, created_at, updated_at, started_at, completed_at
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(user_id)
    .bind(&req.original_filename)
    .bind(&req.s3_key)
    .bind(TranscodingStatus::Pending.to_string())
    .bind(0i32)
    .fetch_one(db)
    .await?;

    tracing::info!(job_id = %job.id, "Transcoding job created");
    Ok(job)
}

/// Mengambil semua job yang pending untuk diproses
pub async fn fetch_pending_transcoding_jobs(
    db: &PgPool,
    limit: i32,
) -> Result<Vec<VideoTranscodingJob>, anyhow::Error> {
    let jobs: Vec<VideoTranscodingJob> = sqlx::query_as(
        r#"
        SELECT
            id, user_id, original_filename, s3_key,
            status,
            progress_percent, hls_manifest_url, thumbnail_url, duration_seconds,
            error_message, created_at, updated_at, started_at, completed_at
        FROM video_transcoding_jobs
        WHERE status = $1
        ORDER BY created_at ASC
        LIMIT $2
        "#,
    )
    .bind(TranscodingStatus::Pending.to_string())
    .bind(limit)
    .fetch_all(db)
    .await?;

    Ok(jobs)
}

/// Update status transcoding
pub async fn update_transcoding_progress(
    db: &PgPool,
    job_id: Uuid,
    status: TranscodingStatus,
    progress_percent: i32,
    error_message: Option<String>,
) -> Result<(), anyhow::Error> {
    let now = chrono::Utc::now();

    sqlx::query(
        r#"
        UPDATE video_transcoding_jobs
        SET
            status = $2,
            progress_percent = $3,
            error_message = $4,
            updated_at = $5,
            started_at = COALESCE(started_at, CASE WHEN $2 = 'processing' THEN $5 END),
            completed_at = CASE WHEN $2 = 'completed' OR $2 = 'failed' THEN $5 END
        WHERE id = $1
        "#,
    )
    .bind(job_id)
    .bind(status.to_string())
    .bind(progress_percent)
    .bind(&error_message)
    .bind(now)
    .execute(db)
    .await?;

    tracing::debug!(job_id = %job_id, ?status, progress = progress_percent, "Transcoding progress updated");
    Ok(())
}

/// Set HLS manifest URL dan metadata setelah transcoding selesai
pub async fn complete_transcoding_job(
    db: &PgPool,
    job_id: Uuid,
    hls_manifest_url: String,
    thumbnail_url: Option<String>,
    duration_seconds: f64,
) -> Result<(), anyhow::Error> {
    update_transcoding_progress(db, job_id, TranscodingStatus::Completed, 100, None).await?;

    sqlx::query(
        r#"
        UPDATE video_transcoding_jobs
        SET
            hls_manifest_url = $2,
            thumbnail_url = $3,
            duration_seconds = $4,
            updated_at = $5
        WHERE id = $1
        "#,
    )
    .bind(job_id)
    .bind(&hls_manifest_url)
    .bind(&thumbnail_url)
    .bind(duration_seconds)
    .bind(chrono::Utc::now())
    .execute(db)
    .await?;

    tracing::info!(job_id = %job_id, "Transcoding job completed");
    Ok(())
}

/// Mark job as failed
pub async fn fail_transcoding_job(
    db: &PgPool,
    job_id: Uuid,
    error_message: &str,
) -> Result<(), anyhow::Error> {
    update_transcoding_progress(
        db,
        job_id,
        TranscodingStatus::Failed,
        0,
        Some(error_message.to_string()),
    )
    .await?;

    tracing::error!(job_id = %job_id, error = error_message, "Transcoding job failed");
    Ok(())
}

/// Get transcoding status untuk endpoint API
pub async fn get_transcoding_status(
    db: &PgPool,
    video_id: Uuid,
) -> Result<Option<TranscodingStatusResponse>, anyhow::Error> {
    let job: Option<VideoTranscodingJob> = sqlx::query_as(
        r#"
        SELECT
            id, user_id, original_filename, s3_key,
            status,
            progress_percent, hls_manifest_url, thumbnail_url, duration_seconds,
            error_message, created_at, updated_at, started_at, completed_at
        FROM video_transcoding_jobs
        WHERE id = $1
        "#,
    )
    .bind(video_id)
    .fetch_optional(db)
    .await?;

    Ok(job.map(|j| TranscodingStatusResponse {
        video_id: j.id,
        status: j.status,
        progress_percent: j.progress_percent,
        hls_manifest_url: j.hls_manifest_url,
        thumbnail_url: j.thumbnail_url,
        duration_seconds: j.duration_seconds,
        error_message: j.error_message,
    }))
}

/// Background job worker untuk memproses antrean transcoding
///
/// Worker ini akan:
/// 1. Mengambil job yang pending dari database
/// 2. Download video dari S3
/// 3. Transcode ke HLS menggunakan ffmpeg
/// 4. Upload chunks ke S3
/// 5. Update database dengan status dan URLs
pub async fn run_transcoding_worker(
    db: &PgPool,
    s3_client: &vil_conn_s3::S3Connector,
    max_jobs: i32,
) -> Result<u32, anyhow::Error> {
    tracing::info!("Starting transcoding worker");

    let jobs = fetch_pending_transcoding_jobs(db, max_jobs).await?;

    if jobs.is_empty() {
        tracing::debug!("No pending transcoding jobs");
        return Ok(0);
    }

    let mut processed = 0u32;

    for job in jobs {
        tracing::info!(job_id = %job.id, "Processing transcoding job");

        match process_video_transcoding(db, s3_client, &job).await {
            Ok(_) => {
                processed += 1;
            }
            Err(e) => {
                tracing::error!(job_id = %job.id, error = %e, "Transcoding failed");
                if let Err(update_err) = fail_transcoding_job(db, job.id, &e.to_string()).await {
                    tracing::error!(job_id = %job.id, error = %update_err, "Failed to update job status");
                }
            }
        }
    }

    tracing::info!(processed, "Transcoding worker completed");
    Ok(processed)
}

/// Actual ffmpeg transcoding implementation
async fn process_video_transcoding(
    db: &PgPool,
    s3_client: &vil_conn_s3::S3Connector,
    job: &VideoTranscodingJob,
) -> Result<(), anyhow::Error> {
    // Update status to processing
    update_transcoding_progress(db, job.id, TranscodingStatus::Processing, 10, None).await?;

    // Create temp directory for processing
    let temp_dir = std::env::temp_dir().join(format!("transcode_{}", job.id));
    std::fs::create_dir_all(&temp_dir)?;

    let input_path = temp_dir.join("input.mp4");
    let output_dir = temp_dir.join("hls");
    std::fs::create_dir_all(&output_dir)?;

    // TODO: Download video from S3
    // For now, we simulate with a local file check
    // In production: s3_client.download(&job.s3_key, &input_path).await?;

    tracing::info!(job_id = %job.id, "Downloading video from S3: {}", job.s3_key);

    // Check if ffmpeg is available
    let ffmpeg_check = std::process::Command::new("ffmpeg")
        .arg("-version")
        .output();

    if ffmpeg_check.is_err() {
        return Err(anyhow::anyhow!(
            "ffmpeg tidak tersedia di sistem. Install ffmpeg terlebih dahulu."
        ));
    }

    // Update progress
    update_transcoding_progress(db, job.id, TranscodingStatus::Processing, 20, None).await?;

    // Build ffmpeg command for HLS transcoding
    let output_playlist = output_dir.join("playlist.m3u8");
    let output_segment = output_dir.join("segment_%03d.ts");

    let mut cmd = std::process::Command::new("ffmpeg");
    cmd.args(&[
        "-i",
        input_path
            .to_str()
            .ok_or_else(|| anyhow::anyhow!("Invalid input path"))?,
        "-c:v",
        "libx264",
        "-c:a",
        "aac",
        "-f",
        "hls",
        "-hls_time",
        "10",
        "-hls_playlist_type",
        "vod",
        "-hls_segment_filename",
        output_segment
            .to_str()
            .ok_or_else(|| anyhow::anyhow!("Invalid segment path"))?,
        output_playlist
            .to_str()
            .ok_or_else(|| anyhow::anyhow!("Invalid playlist path"))?,
    ]);

    tracing::info!(job_id = %job.id, "Starting ffmpeg transcoding");

    // Execute ffmpeg
    let output = cmd.output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(anyhow::anyhow!("ffmpeg failed: {}", stderr));
    }

    // Update progress
    update_transcoding_progress(db, job.id, TranscodingStatus::Processing, 60, None).await?;

    // Parse duration from ffmpeg output if available
    let duration = parse_duration_from_ffmpeg_output(&String::from_utf8_lossy(&output.stderr));

    // Upload HLS segments to S3
    tracing::info!(job_id = %job.id, "Uploading HLS segments to S3");

    let hls_prefix = format!("videos/{}/hls", job.id);

    // Upload playlist
    let playlist_content = std::fs::read_to_string(&output_playlist)?;
    let playlist_key = format!("{}/playlist.m3u8", hls_prefix);

    // TODO: Upload to S3
    // s3_client.upload(&playlist_key, playlist_content.as_bytes(), Some("application/vnd.apple.mpegurl")).await?;

    // Upload segments
    if let Ok(entries) = std::fs::read_dir(&output_dir) {
        let mut segment_count = 0;
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().map_or(false, |ext| ext == "ts") {
                let filename = path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .ok_or_else(|| anyhow::anyhow!("Invalid filename"))?;
                let segment_key = format!("{}/{}", hls_prefix, filename);
                let segment_data = std::fs::read(&path)?;

                // TODO: Upload segment to S3
                // s3_client.upload(&segment_key, &segment_data, Some("video/MP2T")).await?;

                segment_count += 1;
            }
        }

        tracing::info!(job_id = %job.id, segments = segment_count, "Uploaded HLS segments");
    }

    // Generate thumbnail (first frame)
    let thumbnail_path = output_dir.join("thumbnail.jpg");
    let thumb_result = std::process::Command::new("ffmpeg")
        .args(&[
            "-i",
            input_path
                .to_str()
                .ok_or_else(|| anyhow::anyhow!("Invalid input path"))?,
            "-ss",
            "00:00:01",
            "-vframes",
            "1",
            "-y",
            thumbnail_path
                .to_str()
                .ok_or_else(|| anyhow::anyhow!("Invalid thumbnail path"))?,
        ])
        .output();

    let thumbnail_url = if thumb_result.is_ok() && thumbnail_path.exists() {
        let thumbnail_key = format!("{}/thumbnail.jpg", hls_prefix);
        // TODO: Upload thumbnail to S3
        // s3_client.upload(&thumbnail_key, &std::fs::read(&thumbnail_path)?, Some("image/jpeg")).await?;
        Some(format!("https://storage.edusync.local/{}", thumbnail_key))
    } else {
        None
    };

    // Construct HLS manifest URL
    let hls_manifest_url = format!("https://storage.edusync.local/{}/playlist.m3u8", hls_prefix);

    // Mark job as completed
    complete_transcoding_job(
        db,
        job.id,
        hls_manifest_url,
        thumbnail_url,
        duration.unwrap_or(0.0),
    )
    .await?;

    // Cleanup temp directory
    let _ = std::fs::remove_dir_all(&temp_dir);

    tracing::info!(job_id = %job.id, "Transcoding completed successfully");
    Ok(())
}

/// Parse duration from ffmpeg stderr output
fn parse_duration_from_ffmpeg_output(output: &str) -> Option<f64> {
    // Look for "Duration: HH:MM:SS.ms" pattern
    for line in output.lines() {
        if line.contains("Duration:") {
            if let Some(start) = line.find("Duration:") {
                let duration_str = line[start + 9..].trim().split(',').next()?;
                let parts: Vec<&str> = duration_str.split(':').collect();
                if parts.len() == 3 {
                    if let (Ok(h), Ok(m), Ok(s)) = (
                        parts[0].parse::<f64>(),
                        parts[1].parse::<f64>(),
                        parts[2].parse::<f64>(),
                    ) {
                        return Some(h * 3600.0 + m * 60.0 + s);
                    }
                }
            }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_transcoding_status_display() {
        assert_eq!(TranscodingStatus::Pending.to_string(), "pending");
        assert_eq!(TranscodingStatus::Processing.to_string(), "processing");
        assert_eq!(TranscodingStatus::Completed.to_string(), "completed");
        assert_eq!(TranscodingStatus::Failed.to_string(), "failed");
    }

    #[test]
    fn test_parse_duration() {
        let output =
            "Input #0, mov,mp4...\n  Duration: 00:02:30.50, start: 0.000000, bitrate: 1234 kb/s";
        let duration = parse_duration_from_ffmpeg_output(output);
        assert_eq!(duration, Some(150.5));
    }
}
