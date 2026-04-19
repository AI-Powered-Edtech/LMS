import { db } from "@/services/db";
import { logger } from "@/utils/logger";
import { logDevError } from "@/utils/logDevError";

import type { DigestChannel, DigestSettings } from "../types";
export type { DigestChannel };

// ─── Get Digest Settings ────────────────────────────────────────────────────

export async function getDigestSettings(
  userId: string,
): Promise<DigestSettings | null> {
  const { data, error } = await db
    .from("digest_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logDevError("[DigestApi] getDigestSettings error:", error);
    throw new Error("Gagal memuat pengaturan digest.");
  }

  return data as DigestSettings | null;
}

// ─── Update Digest Settings ────────────────────────────────────────────────────

export async function updateDigestSettings(
  userId: string,
  tenantId: string,
  settings: Partial<DigestSettings>,
): Promise<DigestSettings> {
  const { data, error } = await db
    .from<any>("digest_settings")
    .upsert(
      { user_id: userId, tenant_id: tenantId, ...settings },
      { onConflict: "user_id,tenant_id" },
    )
    .select("*")
    .maybeSingle();

  if (error) {
    logger.error("[DigestApi] updateDigestSettings error:", error);
    throw new Error("Gagal menyimpan pengaturan digest. Silakan coba lagi.");
  }

  if (!data) {
    throw new Error("Failed to update digest settings");
  }

  return data as DigestSettings;
}
