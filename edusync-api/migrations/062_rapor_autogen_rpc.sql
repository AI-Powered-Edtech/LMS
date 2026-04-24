-- 062_rapor_autogen_rpc.sql
-- Fase 3 Unit 27 follow-up: auto-generate rapor_documents from gradebook
--
-- Build rapor for one rombel × semester. Reads from gradebook + nilai_per_cp +
-- subjects, produces rapor_documents (one per student) + rapor_subject_grades
-- (one per mapel × student).

CREATE OR REPLACE FUNCTION public.generate_rapor_for_rombel(
    p_tenant_id UUID,
    p_rombel_id UUID,
    p_semester_id UUID
) RETURNS INTEGER
LANGUAGE plpgsql AS $fn$
DECLARE
    student_rec RECORD;
    subject_rec RECORD;
    rapor_id UUID;
    rapor_count INT := 0;
    rombel_name_v TEXT;
    academic_year_id_v UUID;
    avg_score NUMERIC;
    descriptor_v public.kurmer_descriptor;
    thresholds JSONB;
BEGIN
    -- Resolve rombel context
    SELECT r.name, r.academic_year_id INTO rombel_name_v, academic_year_id_v
      FROM public.rombel r
     WHERE r.id = p_rombel_id AND r.tenant_id = p_tenant_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'rombel not found' USING ERRCODE = 'P0002';
    END IF;

    -- Get descriptor thresholds (default if no settings row)
    SELECT COALESCE(default_mode, 'numeric'), descriptor_thresholds
      INTO descriptor_v, thresholds
      FROM public.gradebook_settings
     WHERE tenant_id = p_tenant_id
     LIMIT 1;
    IF thresholds IS NULL THEN
        thresholds := '{"SB": 90, "BSH": 75, "MB": 60, "BB": 0}'::jsonb;
    END IF;

    -- For each active member of the rombel
    FOR student_rec IN
        SELECT m.student_id, p.full_name, sd.nisn
          FROM public.rombel_members m
          JOIN public.profiles p ON p.id = m.student_id
          LEFT JOIN public.student_dossier sd ON sd.profile_id = m.student_id
         WHERE m.rombel_id = p_rombel_id
           AND m.left_at IS NULL
    LOOP
        INSERT INTO public.rapor_documents (
            tenant_id, student_id, semester_id, academic_year_id, rombel_id,
            student_name, nisn, rombel_name, status
        )
        VALUES (
            p_tenant_id, student_rec.student_id, p_semester_id, academic_year_id_v, p_rombel_id,
            student_rec.full_name, student_rec.nisn, rombel_name_v, 'draft'
        )
        ON CONFLICT (student_id, semester_id) DO UPDATE SET
            student_name = EXCLUDED.student_name,
            nisn = EXCLUDED.nisn,
            rombel_name = EXCLUDED.rombel_name,
            updated_at = now()
        RETURNING id INTO rapor_id;

        -- For each subject in the catalog (with at least one curriculum_item),
        -- compute the student's avg score across all CPs of that subject.
        FOR subject_rec IN
            SELECT s.id, s.name AS subject_name
              FROM public.subjects s
             WHERE s.tenant_id = p_tenant_id AND s.is_active = true
        LOOP
            SELECT AVG(npc.avg_score) INTO avg_score
              FROM public.nilai_per_cp_mv npc
              JOIN public.curriculum_items ci ON ci.id = npc.curriculum_item_id
             WHERE npc.student_id = student_rec.student_id
               AND ci.subject_id = subject_rec.id;

            INSERT INTO public.rapor_subject_grades (
                rapor_id, subject_id, tenant_id, subject_name, nilai_akhir, descriptor
            )
            VALUES (
                rapor_id, subject_rec.id, p_tenant_id, subject_rec.subject_name,
                avg_score,
                public.score_to_descriptor(avg_score, thresholds)
            )
            ON CONFLICT DO NOTHING;
        END LOOP;

        rapor_count := rapor_count + 1;
    END LOOP;

    RETURN rapor_count;
END
$fn$;

GRANT EXECUTE ON FUNCTION public.generate_rapor_for_rombel(UUID, UUID, UUID) TO PUBLIC;
