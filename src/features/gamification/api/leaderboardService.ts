/**
 * Leaderboard API Service
 *
 * Provides methods for fetching leaderboard data and subscribing to real-time updates.
 * All methods require tenantId for proper multi-tenant isolation.
 *
 * NOTE: The VIL generic data API does not support Supabase-style nested
 * relational selects (e.g. `profiles(full_name, avatar_url)`). We fetch the
 * leaderboard rows first, then hydrate profile info with a second query.
 */

import { db } from "@/services/db";

import type { LeaderboardEntry } from "../types";

type ProfileLite = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

async function fetchProfiles(
  userIds: string[],
): Promise<Map<string, ProfileLite>> {
  if (userIds.length === 0) return new Map();
  const { data, error } = await db
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", userIds);
  if (error) {
    // Profiles table may not exist in some test setups — just return empty.
    if (error.code === "42P01") return new Map();
    throw error;
  }
  return new Map(((data ?? []) as ProfileLite[]).map((p) => [p.id, p]));
}

function hydrate<T extends { user_id?: string | null }>(
  rows: T[],
  profiles: Map<string, ProfileLite>,
): Array<
  T & { profiles: Pick<ProfileLite, "full_name" | "avatar_url"> | null }
> {
  return rows.map((r) => {
    const p = r.user_id ? (profiles.get(r.user_id) ?? null) : null;
    return {
      ...r,
      profiles: p ? { full_name: p.full_name, avatar_url: p.avatar_url } : null,
    };
  });
}

/**
 * Service for leaderboard-related API calls
 */
export const leaderboardService = {
  /**
   * Fetches the top 20 students for a given class from the leaderboards table within a tenant.
   * @param _classId - The class ID (currently unused; leaderboards has no class_id col)
   * @param tenantId - The tenant ID for isolation
   */
  async getLeaderboard(
    _classId: string,
    tenantId: string,
  ): Promise<LeaderboardEntry[]> {
    const { data, error } = await db
      .from("leaderboards")
      .select("points, rank, user_id")
      .eq("tenant_id", tenantId)
      .order("rank", { ascending: true })
      .limit(20);

    if (error) {
      // Table/column missing, forbidden by data-plane allow-list, or bad request —
      // degrade gracefully to an empty leaderboard instead of breaking the dashboard.
      if (
        error.code === "42P01" ||
        error.code === "42703" ||
        error.code === "400" ||
        error.code === "403" ||
        error.code === "404" ||
        error.message?.includes("400") ||
        error.message?.includes("403") ||
        error.message?.includes("Forbidden")
      ) {
        return [];
      }
      throw error;
    }

    const rows = (data ?? []) as Array<{
      points?: number;
      rank?: number;
      user_id?: string | null;
    }>;
    const userIds = rows
      .map((r) => r.user_id)
      .filter((x): x is string => typeof x === "string" && x.length > 0);
    const profiles = await fetchProfiles(userIds);
    const hydrated = hydrate(rows, profiles);

    // Map points → score for LeaderboardEntry type compatibility.
    return hydrated.map((e) => ({
      ...e,
      score:
        (e as { points?: number; score?: number }).points ??
        (e as { points?: number; score?: number }).score ??
        0,
    })) as unknown as LeaderboardEntry[];
  },

  /**
   * Fetches the top 20 students for the weekly leaderboard within a tenant.
   * @param classId - The class ID
   * @param tenantId - The tenant ID for isolation
   */
  async getWeeklyLeaderboard(
    classId: string,
    tenantId: string,
  ): Promise<LeaderboardEntry[]> {
    const now = new Date();
    const day = now.getUTCDay() || 7; // 1-7 (Mon-Sun)
    now.setUTCDate(now.getUTCDate() + 1 - day);
    now.setUTCHours(0, 0, 0, 0);
    const weekStart = now.toISOString();

    let query = db
      .from("leaderboards_weekly")
      .select("score, rank, user_id")
      .eq("tenant_id", tenantId)
      .eq("week_start", weekStart)
      .order("rank", { ascending: true })
      .limit(20);

    if (classId) {
      query = query.eq("class_id", classId);
    }

    const { data, error } = await query;

    if (error) {
      // Table/column might not exist yet, be forbidden by data-plane allow-list,
      // or the request may be malformed — degrade gracefully to an empty list.
      if (
        error.code === "42P01" ||
        error.code === "42703" ||
        error.code === "400" ||
        error.code === "403" ||
        error.code === "404" ||
        error.message?.includes("400") ||
        error.message?.includes("403") ||
        error.message?.includes("Forbidden")
      ) {
        return [];
      }
      throw error;
    }

    const rows = (data ?? []) as Array<{
      score?: number;
      rank?: number;
      user_id?: string | null;
    }>;
    const userIds = rows
      .map((r) => r.user_id)
      .filter((x): x is string => typeof x === "string" && x.length > 0);
    const profiles = await fetchProfiles(userIds);
    return hydrate(rows, profiles) as unknown as LeaderboardEntry[];
  },
};
