import { db } from "@/services/db";
import { logger } from "@/utils/logger";

/**
 * Onboarding Progress Service
 *
 * Skema tabel: onboarding_progress
 *   id              UUID PRIMARY KEY
 *   tenant_id       UUID NOT NULL
 *   user_id         UUID NOT NULL UNIQUE   ← satu baris per user
 *   steps_completed JSONB NOT NULL DEFAULT '{}'
 *                   Format: { step_name: { done: boolean, at: string, meta?: object } }
 *   completed_at    TIMESTAMPTZ
 *   created_at      TIMESTAMPTZ
 *
 * Untuk update atomik JSONB, delegasi ke RPC complete_onboarding_step.
 */
export const onboardingService = {
  /**
   * Ambil progress onboarding user.
   * Mengembalikan array langkah yang sudah selesai dalam format
   * { step, completed_at }[] agar kompatibel dengan pemanggil lama.
   */
  async getProgress(
    userId: string,
  ): Promise<Array<{ step: string; completed_at: string }>> {
    const { data, error } = await db
      .from<any>("onboarding_progress")
      .select("steps_completed, completed_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      if (import.meta.env.DEV)
        logger.warn(
          "[onboardingService] onboarding_progress unavailable:",
          error.message,
        );
      return [];
    }
    const row = data as {
      steps_completed?: Record<string, { done?: boolean; at?: string }>;
      completed_at?: string;
    } | null;
    if (!row) return [];

    const steps = (row.steps_completed ?? {}) as Record<
      string,
      { done?: boolean; at?: string }
    >;
    return Object.entries(steps)
      .filter(([, v]) => v?.done)
      .map(([step, v]) => ({
        step,
        completed_at: v.at ?? row.completed_at ?? new Date().toISOString(),
      }));
  },

  /**
   * Tandai step onboarding sebagai selesai.
   * Menggunakan RPC complete_onboarding_step untuk merge JSONB yang atomik.
   * Parameter userId dan tenantId dipertahankan untuk kompatibilitas signature,
   * tetapi auth context di RPC yang dipakai untuk menentukan user.
   */
  async completeStep(
    _userId: string,
    _tenantId: string,
    step: string,
  ): Promise<void> {
    const { error } = await db.rpc("complete_onboarding_step", {
      p_step_name: step,
      p_metadata: {},
    });
    if (error) throw error;
  },

  /**
   * Ambil semua data onboarding (untuk admin).
   */
  async getAll(tenantId: string): Promise<
    Array<{
      id: string;
      user_id: string;
      tenant_id: string;
      steps_completed: Record<string, unknown>;
      completed_at: string | null;
    }>
  > {
    const { data, error } = await db
      .from<any>("onboarding_progress")
      .select("id, user_id, steps_completed, completed_at, tenant_id")
      .eq("tenant_id", tenantId);

    if (error) {
      if (import.meta.env.DEV)
        logger.warn(
          "[onboardingService] onboarding_progress unavailable:",
          error.message,
        );
      return [];
    }
    return (data ?? []) as Array<{
      id: string;
      user_id: string;
      tenant_id: string;
      steps_completed: Record<string, unknown>;
      completed_at: string | null;
    }>;
  },

  /**
   * Upsert data onboarding untuk satu langkah.
   * Menggunakan RPC complete_onboarding_step agar tidak menimpa langkah lain
   * yang sudah tersimpan di JSONB.
   */
  async upsert(payload: {
    user_id: string;
    tenant_id: string;
    step: string;
  }): Promise<void> {
    const { error } = await db.rpc("complete_onboarding_step", {
      p_step_name: payload.step,
      p_metadata: {},
    });
    if (error) throw error;
  },
};
