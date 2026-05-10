import { db } from "@/services/db";

export interface QuestionStimulus {
  id: string;
  tenant_id: string;
  title: string | null;
  body: string;
  media_url: string | null;
  media_type: "image" | "video" | "audio" | "pdf" | null;
  source: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const akmService = {
  async list(tenantId: string): Promise<QuestionStimulus[]> {
    const { data, error } = await db
      .from<Array<QuestionStimulus>>("question_stimuli")
      .select(
        "id, tenant_id, title, body, media_url, media_type, source, created_by, created_at, updated_at",
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []) as QuestionStimulus[];
  },

  async create(input: {
    tenantId: string;
    title?: string;
    body: string;
    mediaUrl?: string;
    mediaType?: "image" | "video" | "audio" | "pdf";
    source?: string;
    createdBy: string | null;
  }): Promise<QuestionStimulus> {
    const { data, error } = await db
      .from<Array<QuestionStimulus>>("question_stimuli")
      .insert({
        tenant_id: input.tenantId,
        title: input.title ?? null,
        body: input.body,
        media_url: input.mediaUrl ?? null,
        media_type: input.mediaType ?? null,
        source: input.source ?? null,
        created_by: input.createdBy,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as unknown as QuestionStimulus;
  },
};
