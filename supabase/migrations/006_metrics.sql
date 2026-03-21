-- =============================================================
-- EduSync LMS — Migration 006: Application Metrics
-- Tanggal: 2026-03-22
-- =============================================================
-- Tabel time-series untuk merekam metrik aplikasi: performa,
-- penggunaan fitur, error rates, dan KPI bisnis per tenant.
-- Menggunakan BIGSERIAL karena volume tinggi dan tidak perlu UUID.
-- =============================================================

-- ── Application Metrics ───────────────────────────────────────────────────
-- Tabel append-only. Tidak ada UPDATE/DELETE oleh aplikasi — data lama
-- dihapus oleh retention job (misalnya di cron atau pg_partman).
CREATE TABLE IF NOT EXISTS app_metrics (
  id           BIGSERIAL   PRIMARY KEY,
  tenant_id    UUID,           -- NULL untuk metrik global (infra-level)
  metric_name  TEXT        NOT NULL,
  metric_value FLOAT       NOT NULL,
  metadata     JSONB       NOT NULL DEFAULT '{}',
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE app_metrics ENABLE ROW LEVEL SECURITY;

-- ── Indexes ───────────────────────────────────────────────────────────────

-- Index utama: query metrik per tenant dalam rentang waktu
CREATE INDEX IF NOT EXISTS idx_app_metrics_tenant_name_time
  ON app_metrics(tenant_id, metric_name, recorded_at DESC);

-- Index global: query lintas tenant untuk metrik spesifik
CREATE INDEX IF NOT EXISTS idx_app_metrics_name_time
  ON app_metrics(metric_name, recorded_at DESC);

-- Partial index: hanya 30 hari terakhir — menutup sebagian besar query dashboard
-- Catatan: indeks ini perlu di-rebuild secara berkala atau diganti partisi tabel
-- jika data tumbuh sangat besar. Untuk sekarang cukup untuk skala awal.
CREATE INDEX IF NOT EXISTS idx_app_metrics_recent
  ON app_metrics(tenant_id, metric_name, recorded_at DESC)
  WHERE recorded_at > now() - INTERVAL '30 days';

-- ── RLS Policies ────────────────────────────────────────────────────────────

-- Hanya admin yang bisa membaca dan menulis metrik
-- Catatan: Edge Functions menggunakan service_role key (bypass RLS) untuk insert
CREATE POLICY "admins_read_metrics"
  ON app_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id   = auth.uid()
        AND tenant_id = (SELECT get_my_tenant_id())
        AND role      = 'admin'
    )
  );

CREATE POLICY "admins_insert_metrics"
  ON app_metrics FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT get_my_tenant_id())
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id   = auth.uid()
        AND tenant_id = (SELECT get_my_tenant_id())
        AND role      = 'admin'
    )
  );

-- ── RPC: Rekam metrik ────────────────────────────────────────────────────
-- Helper untuk insert yang mudah dipanggil dari Edge Functions.
-- Edge Functions memanggil ini dengan service_role (bypass RLS).
CREATE OR REPLACE FUNCTION record_metric(
  p_tenant_id    UUID,
  p_metric_name  TEXT,
  p_metric_value FLOAT,
  p_metadata     JSONB DEFAULT '{}'
) RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id BIGINT;
BEGIN
  INSERT INTO app_metrics (tenant_id, metric_name, metric_value, metadata)
  VALUES (p_tenant_id, p_metric_name, p_metric_value, COALESCE(p_metadata, '{}'))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ── RPC: Ambil ringkasan metrik per nama dalam rentang waktu ─────────────
-- Dipakai oleh halaman admin analytics. Mengembalikan agregasi per hari.
CREATE OR REPLACE FUNCTION get_metric_summary(
  p_tenant_id   UUID,
  p_metric_name TEXT,
  p_from        TIMESTAMPTZ,
  p_to          TIMESTAMPTZ DEFAULT now()
) RETURNS TABLE (
  bucket      TIMESTAMPTZ,
  avg_value   FLOAT,
  min_value   FLOAT,
  max_value   FLOAT,
  sample_count BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autentikasi diperlukan';
  END IF;

  RETURN QUERY
  SELECT
    date_trunc('hour', recorded_at) AS bucket,
    AVG(metric_value)               AS avg_value,
    MIN(metric_value)               AS min_value,
    MAX(metric_value)               AS max_value,
    COUNT(*)                        AS sample_count
  FROM app_metrics
  WHERE (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
    AND metric_name = p_metric_name
    AND recorded_at BETWEEN p_from AND p_to
  GROUP BY date_trunc('hour', recorded_at)
  ORDER BY bucket ASC;
END;
$$;

-- ── Catatan Retensi Data ──────────────────────────────────────────────────
-- Data metrik lebih dari 90 hari sebaiknya dihapus atau diarsip.
-- Contoh query untuk cleanup (jalankan via pg_cron atau Edge Function terjadwal):
--
--   DELETE FROM app_metrics
--   WHERE recorded_at < now() - INTERVAL '90 days';
--
-- Untuk volume sangat tinggi, pertimbangkan pg_partman dengan partisi bulanan.
-- Dokumentasi di docs/ANALYTICS.md.
