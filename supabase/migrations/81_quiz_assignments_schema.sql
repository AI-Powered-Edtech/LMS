-- ============================================================
-- Migration: 81_quiz_assignments_schema
-- Purpose: Create quiz_assignments junction table, migrate
--          existing data, add assignment_id to attempts,
--          and add origin_class_id to quizzes.
-- ============================================================

-- 1. Create assignment status enum
DO $$ BEGIN
  CREATE TYPE quiz_assignment_status AS ENUM ('draft', 'active', 'scheduled', 'ended');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create quiz_assignments table
CREATE TABLE IF NOT EXISTS public.quiz_assignments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id         uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  class_id        uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id),
  status          quiz_assignment_status NOT NULL DEFAULT 'active',
  available_from  timestamptz,
  available_until timestamptz,
  assigned_by     uuid REFERENCES auth.users(id),
  assigned_at     timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_quiz_class UNIQUE (quiz_id, class_id)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_qa_quiz_id      ON public.quiz_assignments(quiz_id);
CREATE INDEX IF NOT EXISTS idx_qa_class_id     ON public.quiz_assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_qa_tenant_id    ON public.quiz_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qa_status       ON public.quiz_assignments(status);
CREATE INDEX IF NOT EXISTS idx_qa_class_tenant ON public.quiz_assignments(class_id, tenant_id);

-- 4. Enable RLS
ALTER TABLE public.quiz_assignments ENABLE ROW LEVEL SECURITY;

-- 5. RLS: SELECT — teachers of class, enrolled students, admins
CREATE POLICY "qa_select" ON public.quiz_assignments FOR SELECT TO authenticated
  USING (
    tenant_id = (SELECT public.get_my_tenant_id())
    AND (
      EXISTS (SELECT 1 FROM public.classes c WHERE c.id = quiz_assignments.class_id AND c.teacher_id = (SELECT auth.uid()) AND c.tenant_id = quiz_assignments.tenant_id)
      OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.class_id = quiz_assignments.class_id AND e.student_id = (SELECT auth.uid()) AND e.tenant_id = quiz_assignments.tenant_id AND e.status = 'ACTIVE')
      OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'ADMIN')
    )
  );

-- 6. RLS: INSERT — teachers of class, admins
CREATE POLICY "qa_insert" ON public.quiz_assignments FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = (SELECT public.get_my_tenant_id())
    AND (
      EXISTS (SELECT 1 FROM public.classes c WHERE c.id = quiz_assignments.class_id AND c.teacher_id = (SELECT auth.uid()) AND c.tenant_id = quiz_assignments.tenant_id)
      OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'ADMIN')
    )
  );

-- 7. RLS: UPDATE — teachers of class, admins
CREATE POLICY "qa_update" ON public.quiz_assignments FOR UPDATE TO authenticated
  USING (
    tenant_id = (SELECT public.get_my_tenant_id())
    AND (
      EXISTS (SELECT 1 FROM public.classes c WHERE c.id = quiz_assignments.class_id AND c.teacher_id = (SELECT auth.uid()) AND c.tenant_id = quiz_assignments.tenant_id)
      OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'ADMIN')
    )
  )
  WITH CHECK (tenant_id = (SELECT public.get_my_tenant_id()));

-- 8. RLS: DELETE — teachers of class, admins
CREATE POLICY "qa_delete" ON public.quiz_assignments FOR DELETE TO authenticated
  USING (
    tenant_id = (SELECT public.get_my_tenant_id())
    AND (
      EXISTS (SELECT 1 FROM public.classes c WHERE c.id = quiz_assignments.class_id AND c.teacher_id = (SELECT auth.uid()) AND c.tenant_id = quiz_assignments.tenant_id)
      OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'ADMIN')
    )
  );

-- 9. Migrate existing data
INSERT INTO public.quiz_assignments (quiz_id, class_id, tenant_id, status, assigned_at)
SELECT q.id, q.class_id, q.tenant_id,
  CASE WHEN q.status = 'published' THEN 'active'::quiz_assignment_status ELSE 'draft'::quiz_assignment_status END,
  COALESCE(q.created_at, now())
FROM public.quizzes q WHERE q.class_id IS NOT NULL
ON CONFLICT (quiz_id, class_id) DO NOTHING;

-- 10. Add assignment_id to attempt tables
ALTER TABLE public.quiz_attempts ADD COLUMN IF NOT EXISTS assignment_id uuid REFERENCES public.quiz_assignments(id);
ALTER TABLE public.quiz_attempts_v2 ADD COLUMN IF NOT EXISTS assignment_id uuid REFERENCES public.quiz_assignments(id);

-- 11. Backfill assignment_id for existing attempts
UPDATE public.quiz_attempts qa SET assignment_id = qas.id
FROM public.quiz_assignments qas JOIN public.quizzes q ON q.id = qas.quiz_id
WHERE qa.quiz_id = qas.quiz_id AND q.class_id = qas.class_id AND qa.assignment_id IS NULL;

-- 12. Add origin_class_id to quizzes
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS origin_class_id uuid REFERENCES public.classes(id);
UPDATE public.quizzes SET origin_class_id = class_id WHERE origin_class_id IS NULL AND class_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quizzes_origin_class_id ON public.quizzes(origin_class_id);

-- 13. Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_quiz_assignment_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
DROP TRIGGER IF EXISTS trg_qa_updated_at ON public.quiz_assignments;
CREATE TRIGGER trg_qa_updated_at BEFORE UPDATE ON public.quiz_assignments FOR EACH ROW EXECUTE FUNCTION public.update_quiz_assignment_updated_at();

-- 14. Comments
COMMENT ON TABLE public.quiz_assignments IS 'Junction table linking quizzes to classes with per-class scheduling and status.';
COMMENT ON COLUMN public.quizzes.origin_class_id IS 'The class where this quiz was originally created. Visibility is determined by quiz_assignments.';
