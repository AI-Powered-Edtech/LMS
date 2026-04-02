-- Migration: Document Manager (school_documents)
-- Phase P2-2: Manajemen Surat & Dokumen Sekolah

CREATE TABLE IF NOT EXISTS school_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'umum' CHECK (category IN ('surat_masuk', 'surat_keluar', 'sk', 'pengumuman', 'rapor', 'umum')),
  file_url text,
  file_name text,
  file_size integer,
  file_type text,
  visibility text NOT NULL DEFAULT 'admin' CHECK (visibility IN ('admin', 'teacher', 'all')),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE school_documents ENABLE ROW LEVEL SECURITY;

-- Admin & Teacher full CRUD
CREATE POLICY "admin_teacher_manage_docs" ON school_documents
  FOR ALL USING (
    tenant_id = get_my_tenant_id() AND
    (has_role('ADMIN'::app_role) OR has_role('TEACHER'::app_role))
  );

-- Visibility-based read policy for all roles
CREATE POLICY "visibility_read_docs" ON school_documents
  FOR SELECT USING (
    tenant_id = get_my_tenant_id() AND
    (visibility = 'all' OR
     (visibility = 'teacher' AND (has_role('TEACHER'::app_role) OR has_role('ADMIN'::app_role))) OR
     (visibility = 'admin' AND has_role('ADMIN'::app_role)))
  );

-- Auto-set tenant_id on insert
CREATE TRIGGER auto_set_tenant_id_docs
  BEFORE INSERT ON school_documents FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();

-- Performance index
CREATE INDEX idx_docs_tenant_category ON school_documents(tenant_id, category);
