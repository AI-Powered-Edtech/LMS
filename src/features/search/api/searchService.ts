import { db } from "@/services/db";
import { captureError } from "@/utils/sentry";

export type SearchCourse = {
  id: string;
  type: "course";
  title: string;
  description: string;
  url: string;
  tenantId: string;
};

export type SearchLesson = {
  id: string;
  type: "lesson";
  title: string;
  description: string;
  url: string;
  tenantId: string;
};

export type SearchModule = {
  id: string;
  type: "module";
  title: string;
  description: string;
  url: string;
  tenantId: string;
};

export type SearchQuestion = {
  id: string;
  type: "question";
  title: string;
  description: string;
  url: string;
  tenantId: string;
};

export type SearchUser = {
  id: string;
  type: "user";
  title: string;
  description: string;
  url: string;
  fullName: string;
  avatarUrl: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

export type SearchAssignment = {
  id: string;
  type: "assignment";
  title: string;
  description: string;
  url: string;
  tenantId: string;
};

export type SearchQuiz = {
  id: string;
  type: "quiz";
  title: string;
  description: string;
  url: string;
  tenantId: string;
};

export type SearchDiscussion = {
  id: string;
  type: "discussion";
  title: string;
  description: string;
  url: string;
  tenantId: string;
};

export type SearchResult =
  | SearchCourse
  | SearchLesson
  | SearchModule
  | SearchQuestion
  | SearchUser
  | SearchAssignment
  | SearchQuiz
  | SearchDiscussion;

// ─── Courses ─────────────────────────────────────────────────────────────────

export async function searchCourses(
  query: string,
  tenantId: string,
): Promise<SearchCourse[]> {
  const results: SearchCourse[] = [];

  try {
    const { data } = await db
      .from("courses")
      .select("id, title, description, tenant_id")
      .eq("tenant_id", tenantId)
      .ilike("title", `%${query}%`)
      .limit(5);

    results.push(
      ...(Array.isArray(data) ? data : []).map((c: any) => ({
        id: c.id,
        type: "course" as const,
        title: c.title,
        description: c.description ?? "",
        url: `/app/student/courses/${c.id}`,
        tenantId: c.tenant_id,
      })),
    );
  } catch (err) {
    captureError(err, { tags: { feature: "search-courses" } });
  }

  return results;
}

// ─── Lessons ─────────────────────────────────────────────────────────────────

export async function searchLessons(
  query: string,
  tenantId: string,
): Promise<SearchLesson[]> {
  const results: SearchLesson[] = [];

  try {
    const { data } = await db
      .from("lessons")
      .select("id, title, description, tenant_id, module_id")
      .eq("tenant_id", tenantId)
      .ilike("title", `%${query}%`)
      .limit(5);

    results.push(
      ...(Array.isArray(data) ? data : []).map((l: any) => ({
        id: l.id,
        type: "lesson" as const,
        title: l.title,
        description: l.description ?? "",
        url: `/app/student/courses/${l.module_id}/lessons/${l.id}`,
        tenantId: l.tenant_id,
      })),
    );
  } catch (err) {
    captureError(err, { tags: { feature: "search-lessons" } });
  }

  return results;
}

// ─── Modules ─────────────────────────────────────────────────────────────────

export async function searchModules(
  query: string,
  tenantId: string,
): Promise<SearchModule[]> {
  const results: SearchModule[] = [];

  try {
    const { data } = await db
      .from("modules")
      .select("id, title, description, tenant_id")
      .eq("tenant_id", tenantId)
      .ilike("title", `%${query}%`)
      .limit(5);

    results.push(
      ...(Array.isArray(data) ? data : []).map((a: any) => ({
        id: a.id,
        type: "module" as const,
        title: a.title,
        description: a.description ?? "",
        url: `/app/student/courses/${a.id}`,
        tenantId: a.tenant_id,
      })),
    );
  } catch (err) {
    captureError(err, { tags: { feature: "search-modules" } });
  }

  return results;
}

// ─── Questions ────────────────────────────────────────────────────────────────

export async function searchQuestions(
  query: string,
  tenantId: string,
): Promise<SearchQuestion[]> {
  const results: SearchQuestion[] = [];

  try {
    const { data } = await db
      .from("questions")
      .select("id, title, description, tenant_id")
      .eq("tenant_id", tenantId)
      .ilike("title", `%${query}%`)
      .limit(5);

    results.push(
      ...(Array.isArray(data) ? data : []).map((q: any) => ({
        id: q.id,
        type: "question" as const,
        title: q.title,
        description: q.description ?? "",
        url: `/app/student/courses/question/${q.id}`,
        tenantId: q.tenant_id,
      })),
    );
  } catch (err) {
    captureError(err, { tags: { feature: "search-questions" } });
  }

  return results;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function searchUsers(
  query: string,
  tenantId: string,
  limit: number,
): Promise<SearchUser[]> {
  const results: SearchUser[] = [];

  try {
    const { data: filteredUsers } = await db
      .from("profiles")
      .select("id, full_name, avatar_url, first_name, last_name, email")
      .eq("tenant_id", tenantId)
      .ilike("full_name", `%${query}%`)
      .limit(limit);

    results.push(
      ...(Array.isArray(filteredUsers) ? filteredUsers : []).map((u: any) => ({
        id: u.id,
        type: "user" as const,
        title: u.full_name ?? "",
        description: u.email ?? "",
        url: `/app/student/profile/${u.id}`,
        fullName: u.full_name,
        avatarUrl: u.avatar_url,
        firstName: u.first_name,
        lastName: u.last_name,
        email: u.email,
      })),
    );
  } catch (err) {
    captureError(err, { tags: { feature: "search-users" } });
  }

  return results.slice(0, limit);
}

interface GlobalSearchParams {
  tenantId: string;
  query: string;
}

export async function globalSearch({
  tenantId,
  query,
}: GlobalSearchParams): Promise<SearchResult[]> {
  const [courses, lessons, modules, questions, users] = await Promise.all([
    searchCourses(query, tenantId),
    searchLessons(query, tenantId),
    searchModules(query, tenantId),
    searchQuestions(query, tenantId),
    searchUsers(query, tenantId, 5),
  ]);

  return [...courses, ...lessons, ...modules, ...questions, ...users];
}
