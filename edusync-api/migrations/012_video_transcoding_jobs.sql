-- Migration: 012_video_transcoding_jobs.sql
-- Purpose: Tabel untuk melacak status transcoding video (MP4 -> HLS)

CREATE TABLE IF NOT EXISTS video_transcoding_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_filename TEXT NOT NULL,
    s3_key TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    progress_percent INTEGER NOT NULL DEFAULT 0,
    hls_manifest_url TEXT,
    thumbnail_url TEXT,
    duration_seconds DOUBLE PRECISION,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    CONSTRAINT valid_progress CHECK (progress_percent >= 0 AND progress_percent <= 100)
);

-- Index untuk query pending jobs
CREATE INDEX idx_video_transcoding_jobs_status ON video_transcoding_jobs(status) WHERE status = 'pending';

-- Index untuk lookup by user
CREATE INDEX idx_video_transcoding_jobs_user_id ON video_transcoding_jobs(user_id);

-- Index untuk sorting by created_at
CREATE INDEX idx_video_transcoding_jobs_created_at ON video_transcoding_jobs(created_at DESC);

-- Trigger untuk auto-update updated_at
CREATE OR REPLACE FUNCTION update_video_transcoding_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_video_transcoding_jobs_updated_at
    BEFORE UPDATE ON video_transcoding_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_video_transcoding_jobs_updated_at();

-- Comments
COMMENT ON TABLE video_transcoding_jobs IS 'Job queue untuk video transcoding (MP4 -> HLS)';
COMMENT ON COLUMN video_transcoding_jobs.status IS 'Status: pending, processing, completed, failed';
COMMENT ON COLUMN video_transcoding_jobs.s3_key IS 'Lokasi file video original di S3';
COMMENT ON COLUMN video_transcoding_jobs.hls_manifest_url IS 'URL ke HLS manifest (.m3u8) setelah transcoding selesai';
