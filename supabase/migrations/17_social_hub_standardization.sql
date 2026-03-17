-- Phase 5B: Social Hub Standardization
-- Transitioning from legacy discussion_threads/posts to a unified discussions engine.
-- Enhancing notifications for better interactivity.

----------------------------------------------------
-- 1. Cleanup Legacy Tables
----------------------------------------------------
DROP TABLE IF EXISTS public.discussion_posts;
DROP TABLE IF EXISTS public.discussion_threads;

----------------------------------------------------
-- 2. Create Unified discussions table
----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Contextual Links (All optional, at least one should usually be set)
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
  announcement_id uuid REFERENCES public.announcements(id) ON DELETE CASCADE,

  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.discussions(id) ON DELETE CASCADE,

  content text NOT NULL,

  -- Status Flags
  is_pinned boolean DEFAULT false,
  is_edited boolean DEFAULT false,
  is_deleted boolean DEFAULT false,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS set_discussions_updated_at ON public.discussions;
CREATE TRIGGER set_discussions_updated_at
  BEFORE UPDATE ON public.discussions
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

----------------------------------------------------
-- 3. Enhance notifications table
----------------------------------------------------
-- Add missing columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='actor_id') THEN
        ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='entity_id') THEN
        ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS entity_id uuid;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='link') THEN
        ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link text;
    END IF;
END $$;

----------------------------------------------------
-- 4. Add Indexes for Social Hub
----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_discussions_tenant ON public.discussions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_discussions_course ON public.discussions(course_id);
CREATE INDEX IF NOT EXISTS idx_discussions_announcement ON public.discussions(announcement_id);
CREATE INDEX IF NOT EXISTS idx_discussions_parent ON public.discussions(parent_id);
CREATE INDEX IF NOT EXISTS idx_discussions_created_at ON public.discussions(created_at DESC);

----------------------------------------------------
-- 5. RLS Policies for discussions
----------------------------------------------------
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;

-- Read Policy: Basic visibility check
DROP POLICY IF EXISTS "users_read_discussions" ON public.discussions;
CREATE POLICY "users_read_discussions"
ON public.discussions FOR SELECT
USING (
  tenant_id::text = auth.jwt() ->> 'tenant_id'
);

-- Note: In a production scenario, we'd add more complex checks like
-- "can only see course discussions if enrolled", but for now, tenant isolation is the priority.

-- Insert Policy
DROP POLICY IF EXISTS "users_create_discussions" ON public.discussions;
CREATE POLICY "users_create_discussions"
ON public.discussions FOR INSERT
WITH CHECK (
  tenant_id::text = auth.jwt() ->> 'tenant_id' AND
  author_id = auth.uid()
);

-- Update Policy: Only author can update
DROP POLICY IF EXISTS "authors_update_discussions" ON public.discussions;
CREATE POLICY "authors_update_discussions"
ON public.discussions FOR UPDATE
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

-- Delete Policy: Author or Admin
DROP POLICY IF EXISTS "authors_delete_discussions" ON public.discussions;
CREATE POLICY "authors_delete_discussions"
ON public.discussions FOR DELETE
USING (
  author_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'ADMIN'
  )
);

----------------------------------------------------
-- 6. Trigger for Discussion Notifications
----------------------------------------------------
CREATE OR REPLACE FUNCTION notify_discussion_reply()
RETURNS TRIGGER AS $$
DECLARE
  v_parent_author uuid;
  v_actor_name text;
BEGIN
  -- GUARD: Only if it's a reply
  IF NEW.parent_id IS NOT NULL THEN
    SELECT author_id INTO v_parent_author
    FROM public.discussions
    WHERE id = NEW.parent_id;

    -- Don't notify self
    IF v_parent_author IS NOT NULL AND v_parent_author != NEW.author_id THEN
      SELECT first_name || ' ' || last_name INTO v_actor_name FROM public.profiles WHERE id = NEW.author_id;

      INSERT INTO public.notifications (
        tenant_id, user_id, actor_id, title, message, type, entity_id, link
      ) VALUES (
        NEW.tenant_id,
        v_parent_author,
        NEW.author_id,
        'Balasan Baru',
        v_actor_name || ' membalas diskusi Anda.',
        'INFO', -- Using standard notification_type
        COALESCE(NEW.announcement_id, NEW.course_id),
        CASE
          WHEN NEW.announcement_id IS NOT NULL THEN '/announcements'
          ELSE '/learning/' || NEW.course_id
        END
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_discussion_reply ON public.discussions;
CREATE TRIGGER on_discussion_reply
  AFTER INSERT ON public.discussions
  FOR EACH ROW
  EXECUTE FUNCTION notify_discussion_reply();
