import { db } from "@/services/db";
import { getStorageProvider } from "@/services/storage";

export interface VideoCaption {
  id: string;
  tenant_id: string;
  lesson_id: string;
  block_id: string | null;
  language_code: string;
  label: string;
  vtt_url: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export const videoCaptionService = {
  async getCaptions(
    lessonId: string,
    blockId?: string,
  ): Promise<VideoCaption[]> {
    let query = db
      .from("lesson_video_captions")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("language_code");

    if (blockId) {
      query = query.eq("block_id", blockId);
    } else {
      query = query.is("block_id", null);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch captions: ${error.message}`);
    return (data ?? []) as VideoCaption[];
  },

  async uploadCaption(
    tenantId: string,
    lessonId: string,
    blockId: string | null,
    languageCode: string,
    label: string,
    file: File,
  ): Promise<VideoCaption> {
    const extension = file.name.split(".").pop()?.toLowerCase() || "vtt";
    const objectPath = `${tenantId}/${lessonId}/${blockId || "global"}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await getStorageProvider()
      .from("video-captions")
      .upload(objectPath, file, { contentType: "text/vtt" });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: urlData } = getStorageProvider()
      .from("video-captions")
      .getPublicUrl(objectPath);

    if (!urlData?.publicUrl) throw new Error("Failed to get public URL");

    const { data, error } = await db
      .from("lesson_video_captions")
      .insert({
        tenant_id: tenantId,
        lesson_id: lessonId,
        block_id: blockId,
        language_code: languageCode,
        label,
        vtt_url: urlData.publicUrl,
        is_default: false,
      })
      .select("*")
      .single();

    if (error) throw new Error(`Failed to save caption: ${error.message}`);
    return data as VideoCaption;
  },

  async deleteCaption(captionId: string): Promise<void> {
    const { data: caption, error: selectError } = await db
      .from("lesson_video_captions")
      .select("vtt_url")
      .eq("id", captionId)
      .single();

    if (selectError)
      throw new Error(`Failed to fetch caption: ${selectError.message}`);

    const typedCaption = caption as { vtt_url: string };
    const url = typedCaption.vtt_url;
    const pathParts = url.split("/video-captions/");
    if (pathParts.length > 1) {
      const objectPath = pathParts[1];
      await getStorageProvider()
        .from("video-captions")
        .remove([objectPath])
        .catch(() => {});
    }

    const { error } = await db
      .from("lesson_video_captions")
      .delete()
      .eq("id", captionId);

    if (error) throw new Error(`Failed to delete caption: ${error.message}`);
  },

  async setDefaultCaption(captionId: string, lessonId: string): Promise<void> {
    await db
      .from("lesson_video_captions")
      .update({ is_default: false })
      .eq("lesson_id", lessonId);

    const { error } = await db
      .from("lesson_video_captions")
      .update({ is_default: true })
      .eq("id", captionId);

    if (error)
      throw new Error(`Failed to set default caption: ${error.message}`);
  },
};
