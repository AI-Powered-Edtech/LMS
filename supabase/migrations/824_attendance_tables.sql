-- Attendance session records (one per scan/class/date)
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id),
  class_id    uuid REFERENCES public.classes(id),
  scan_date   date NOT NULL DEFAULT CURRENT_DATE,
  scanned_by  uuid NOT NULL REFERENCES public.profiles(id),
  present_count int NOT NULL DEFAULT 0,
  absent_count  int NOT NULL DEFAULT 0,
  sick_count    int NOT NULL DEFAULT 0,
  permit_count  int NOT NULL DEFAULT 0,
  details     jsonb NOT NULL DEFAULT '[]',
  created_at  timestamptz DEFAULT now(),
  UNIQUE (class_id, scan_date)
);

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher_manage_attendance" ON public.attendance_records;
CREATE POLICY "teacher_manage_attendance"
  ON public.attendance_records FOR ALL
  USING (public.has_role('TEACHER'::public.app_role) OR public.has_role('ADMIN'::public.app_role));

DROP POLICY IF EXISTS "student_read_class_attendance" ON public.attendance_records;
CREATE POLICY "student_read_class_attendance"
  ON public.attendance_records FOR SELECT
  USING (
    class_id IN (
      SELECT class_id FROM public.enrollments
      WHERE student_id = auth.uid() AND status = 'ACTIVE'
    )
  );

GRANT SELECT ON public.attendance_records TO authenticated;
