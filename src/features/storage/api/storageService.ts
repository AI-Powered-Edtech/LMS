import { db } from "@/services/db";
import { getStorageProvider } from "@/services/storage";

import type { FileUploadResult, UploadOptions } from "@/features/storage/types";

export const storageService = {
  /**
   * Upload a file to storage and track it in the database.
   */
  async uploadFile(
    file: File,
    opts: UploadOptions & { [key: string]: any },
  ): Promise<FileUploadResult> {
    const { data: insertData, error: insertError } = (await db
      .from("storage_objects")
      .insert({
        bucket: opts.bucket,
        object_path: opts.objectPath,
        file_name: file.name,
        mime_type: file.type,
        file_size: file.size,
        uploaded_by: opts.uploadedBy,
      })
      .select("id")
      .single()) as { data: { id: string } | null; error: Error | null };

    if (insertError) {
      // Cleanup: delete the uploaded file if INSERT fails
      await getStorageProvider().from(opts.bucket).remove([opts.objectPath]);
      throw new Error(`Failed to track storage object: ${insertError.message}`);
    }

    if (!insertData?.id) {
      // Cleanup: delete the uploaded file if no ID returned
      await getStorageProvider().from(opts.bucket).remove([opts.objectPath]);
      throw new Error("Failed to retrieve storage object ID");
    }

    // Get public URL
    const { data: urlData } = getStorageProvider()
      .from(opts.bucket)
      .getPublicUrl(opts.objectPath);

    const publicUrl = urlData?.publicUrl;
    if (!publicUrl) {
      throw new Error("Failed to get public URL");
    }

    return {
      storageObjectId: insertData!.id,
      publicUrl: publicUrl!,
      objectPath: opts.objectPath,
    };
  },

  /**
   * Delete a file from both storage_objects table and storage bucket.
   */
  async deleteFile(storageObjectId: string): Promise<void> {
    // Get the record first to know which bucket/object to delete
    const { data: record, error: selectError } = (await db
      .from("storage_objects")
      .select("bucket, object_path")
      .eq("id", storageObjectId)
      .single()) as {
      data: { bucket: string; object_path: string } | null;
      error: Error | null;
    };

    if (selectError) {
      throw selectError;
    }

    if (!record) {
      throw new Error("File record not found");
    }

    // Delete from database
    const { error: deleteError } = await db
      .from("storage_objects")
      .delete()
      .eq("id", storageObjectId);

    if (deleteError) throw deleteError;

    // Delete from storage bucket
    await getStorageProvider().from(record.bucket).remove([record.object_path]);
  },
};
