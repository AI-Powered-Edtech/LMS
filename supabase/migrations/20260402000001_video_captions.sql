-- Video Caption Support (WCAG 1.2.2 Level A)
-- Creates table for storing WebVTT caption tracks per lesson video

CREATE TABLE IF NOT EXISTS public.lesson_video_captions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    block_id uuid,
    language_code varchar(5) NOT NULL DEFAULT 'id',
    label text NOT NULL,
    vtt_url text NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.lesson_video_captions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view their video captions"
    ON public.lesson_video_captions FOR SELECT
    USING (tenant_id = public.get_my_tenant_id());

CREATE POLICY "Teachers can insert video captions"
    ON public.lesson_video_captions FOR INSERT
    WITH CHECK (tenant_id = public.get_my_tenant_id());

CREATE POLICY "Teachers can update their video captions"
    ON public.lesson_video_captions FOR UPDATE
    USING (tenant_id = public.get_my_tenant_id());

CREATE POLICY "Teachers can delete their video captions"
    ON public.lesson_video_captions FOR DELETE
    USING (tenant_id = public.get_my_tenant_id());

CREATE TRIGGER set_tenant_id_lesson_video_captions
    BEFORE INSERT ON public.lesson_video_captions
    FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

CREATE TRIGGER set_updated_at_lesson_video_captions
    BEFORE UPDATE ON public.lesson_video_captions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_lesson_video_captions_lesson
    ON public.lesson_video_captions (lesson_id);

CREATE INDEX IF NOT EXISTS idx_lesson_video_captions_tenant
    ON public.lesson_video_captions (tenant_id);

CREATE INDEX IF NOT EXISTS idx_lesson_video_captions_lesson_block
    ON public.lesson_video_captions (lesson_id, block_id);

GRANT ALL ON TABLE public.lesson_video_captions TO authenticated;
