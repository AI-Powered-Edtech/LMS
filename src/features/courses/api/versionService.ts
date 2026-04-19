import { db } from "@/services/db";
import { logDevError } from "@/utils/logDevError";

export interface CourseVersion {
  id: string;
  course_id: string;
  version_number: number;
  commit_message: string | null;
  created_at: string;
  created_by: string;
  tenant_id: string;
}

// ============================================================
// Version Diff types
// ============================================================

export interface VersionSnapshotModule {
  id: string;
  title: string;
  order: number;
  lessons: Array<{ id: string; title: string; is_published: boolean }>;
}

export type ImpactLevel = "low" | "medium" | "high";

export interface VersionDiff {
  /** Modules present in the snapshot but absent in the current state — will be restored */
  restoredModules: VersionSnapshotModule[];
  /** Modules present in the current state but absent in the snapshot — will be lost */
  lostModules: VersionSnapshotModule[];
  modifiedModuleTitles: Array<{
    id: string;
    oldTitle: string;
    newTitle: string;
  }>;
  /**
   * Net lesson delta: lessons present in snapshot but not current (will be added back).
   * NOTE: This is a net count across all modules, not a per-module breakdown.
   */
  addedLessonCount: number;
  /**
   * Net lesson delta: lessons present in current but not in snapshot (will be removed).
   * NOTE: This is a net count across all modules, not a per-module breakdown.
   */
  removedLessonCount: number;
  impactLevel: ImpactLevel;
}

// ============================================================
// Service
// ============================================================

export const versionService = {
  /**
   * Fetches the version history for a course without the heavy snapshot data.
   */
  async fetchCourseVersions(courseId: string, tenantId: string) {
    const { data, error } = await db
      .from<any>("course_versions")
      .select(
        "id, course_id, version_number, commit_message, created_at, created_by, tenant_id",
      )
      .eq("course_id", courseId)
      .eq("tenant_id", tenantId)
      .order("version_number", { ascending: false });

    if (error) {
      logDevError("versionService", "Error fetching course versions:", error);
      throw error;
    }

    return (data ?? []) as CourseVersion[];
  },

  /**
   * Saves a new version (checkpoint) of a course.
   */
  async saveCourseVersion(courseId: string, commitMessage: string) {
    const { data, error } = await db.rpc("save_course_version", {
      p_course_id: courseId,
      p_message: commitMessage,
    });

    if (error) {
      logDevError("versionService", "Error saving course version:", error);
      throw error;
    }

    return data;
  },

  /**
   * Restores a course to a specific version.
   */
  async restoreCourseVersion(versionId: string) {
    const { data, error } = await db.rpc("restore_course_version", {
      p_version_id: versionId,
    });

    if (error) {
      logDevError("versionService", "Error restoring course version:", error);
      throw error;
    }

    return data;
  },

  /**
   * Fetches the module+lesson structure stored in a specific version snapshot.
   * The snapshot JSONB column stores the full course structure at checkpoint time.
   */
  async fetchVersionSnapshot(
    versionId: string,
    tenantId: string,
  ): Promise<VersionSnapshotModule[]> {
    const { data, error } = await db
      .from<any>("course_versions")
      .select("snapshot")
      .eq("id", versionId)
      .eq("tenant_id", tenantId)
      .single();

    if (error) {
      logDevError("versionService", "Error fetching version snapshot:", error);
      throw error;
    }

    // The snapshot JSONB is expected to have shape: { modules: VersionSnapshotModule[] }
    // Gracefully handle both flat array and nested object formats.
    const raw = (data as { snapshot?: unknown } | null)?.snapshot;
    if (!raw) return [];

    if (Array.isArray(raw)) return raw as VersionSnapshotModule[];
    if (
      typeof raw === "object" &&
      raw !== null &&
      "modules" in raw &&
      Array.isArray((raw as { modules?: unknown }).modules)
    )
      return (raw as { modules: VersionSnapshotModule[] }).modules;

    return [];
  },
};

// ============================================================
// Pure diff computation (no DB access)
// ============================================================

/**
 * Computes a high-level structural diff between the current modules
 * (from builder state) and a historical version snapshot.
 *
 * Does NOT compare block-level content — only module and lesson presence.
 *
 * Lesson counts are net deltas across all modules (not per-module breakdowns).
 * restoredModules = in snapshot but not in current (will come back on restore).
 * lostModules     = in current but not in snapshot (will be dropped on restore).
 */
export function computeVersionDiff(
  currentModules: VersionSnapshotModule[],
  snapshotModules: VersionSnapshotModule[],
): VersionDiff {
  const currentById = new Map(currentModules.map((m) => [m.id, m]));
  const snapshotById = new Map(snapshotModules.map((m) => [m.id, m]));

  const restoredModules: VersionSnapshotModule[] = [];
  const lostModules: VersionSnapshotModule[] = [];
  const modifiedModuleTitles: VersionDiff["modifiedModuleTitles"] = [];

  // Modules in snapshot but not in current → will be added back (restored)
  for (const [id, mod] of snapshotById) {
    if (!currentById.has(id)) {
      restoredModules.push(mod);
    } else {
      const current = currentById.get(id)!;
      if (current.title !== mod.title) {
        modifiedModuleTitles.push({
          id,
          oldTitle: current.title,
          newTitle: mod.title,
        });
      }
    }
  }

  // Modules in current but not in snapshot → will be removed (lost)
  for (const [id, mod] of currentById) {
    if (!snapshotById.has(id)) {
      lostModules.push(mod);
    }
  }

  // Lesson counts (net delta — not per-module)
  const currentLessonCount = currentModules.reduce(
    (acc, m) => acc + m.lessons.length,
    0,
  );
  const snapshotLessonCount = snapshotModules.reduce(
    (acc, m) => acc + m.lessons.length,
    0,
  );
  const removedLessonCount = Math.max(
    0,
    currentLessonCount - snapshotLessonCount,
  );
  const addedLessonCount = Math.max(
    0,
    snapshotLessonCount - currentLessonCount,
  );

  // Impact level heuristic
  let impactLevel: ImpactLevel = "low";
  if (lostModules.length > 0 || removedLessonCount > 3) {
    impactLevel =
      lostModules.length > 1 || removedLessonCount > 8 ? "high" : "medium";
  }

  return {
    restoredModules,
    lostModules,
    modifiedModuleTitles,
    addedLessonCount,
    removedLessonCount,
    impactLevel,
  };
}
