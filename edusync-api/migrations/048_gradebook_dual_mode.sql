-- 048_gradebook_dual_mode.sql
-- Fase 2 Unit 21: Gradebook dual-mode (numerik + deskriptor Kurmer)
--
-- Kurmer descriptors: BB (Belum Berkembang), MB (Mulai Berkembang),
-- BSH (Berkembang Sesuai Harapan), SB (Sangat Berkembang).
--
-- Existing gradebook_entries stores `score` numeric. Add `descriptor` enum
-- column + `mode` column. UI choses display mode per gradebook_setting.

DO $$ BEGIN
    CREATE TYPE public.kurmer_descriptor AS ENUM ('BB', 'MB', 'BSH', 'SB');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.gradebook_entries
    ADD COLUMN IF NOT EXISTS descriptor public.kurmer_descriptor,
    ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'numeric'
        CHECK (mode IN ('numeric', 'descriptor', 'both'));

ALTER TABLE public.gradebook_settings
    ADD COLUMN IF NOT EXISTS default_mode TEXT NOT NULL DEFAULT 'numeric'
        CHECK (default_mode IN ('numeric', 'descriptor', 'both')),
    ADD COLUMN IF NOT EXISTS descriptor_thresholds JSONB
        DEFAULT '{"SB": 90, "BSH": 75, "MB": 60, "BB": 0}'::jsonb;

-- Helper: convert numeric score to descriptor using settings thresholds.
CREATE OR REPLACE FUNCTION public.score_to_descriptor(
    p_score NUMERIC,
    p_thresholds JSONB
) RETURNS public.kurmer_descriptor
LANGUAGE plpgsql IMMUTABLE AS $fn$
DECLARE
    sb NUMERIC := COALESCE((p_thresholds->>'SB')::numeric, 90);
    bsh NUMERIC := COALESCE((p_thresholds->>'BSH')::numeric, 75);
    mb  NUMERIC := COALESCE((p_thresholds->>'MB')::numeric, 60);
BEGIN
    IF p_score IS NULL THEN RETURN NULL; END IF;
    IF p_score >= sb  THEN RETURN 'SB';  END IF;
    IF p_score >= bsh THEN RETURN 'BSH'; END IF;
    IF p_score >= mb  THEN RETURN 'MB';  END IF;
    RETURN 'BB';
END
$fn$;
