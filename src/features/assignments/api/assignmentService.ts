 
import { db } from "@/services/db";
import { getStorageProvider } from "@/services/storage";
import { logDevError } from "@/utils/logDevError";
import { logger } from "@/utils/logger";

export type AssignmentStatus = "draft" | "published" | "archived";
export type SubmissionStatus =
  | "draft"
  | "submitted"
  | "late"
  | "graded"
  | "returned";

export interface Assignment {
  id: string;
  tenant_id: string;
  course_id: string | null;
  class_id: string | null;
  lesson_id: string | null;
  title: string;
  description: string | null;
  instructions: string | null;
  max_points: number;
  max_attempts: number;
  is_published: boolean;
  status: AssignmentStatus;
  due_date: string | null;
  available_from: string | null;
  late_penalty_percent: number;
  allow_text_submission: boolean;
  allow_file_submission: boolean;
  allow_link_submission: boolean;
  reminder_enabled: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssignmentSubmission {
  id: string;
  tenant_id: string;
  assignment_id: string;
  student_id: string;
  submission_text: string | null;
  file_url: string | null;
  link_url: string | null;
  status: SubmissionStatus;
  attempt_number: number;
  submitted_at: string | null;
  graded_at: string | null;
  raw_score: number | null;
  score: number | null;
  feedback: string | null;
  is_late: boolean;
  late_penalty_percent: number;
  client_request_id: string | null;
  user_profiles?:
    | {
        full_name: string;
        avatar_url?: string | null;
      }
    | { full_name: string; avatar_url?: string | null }[];
}

export interface AssignmentSubmissionWithProfile extends AssignmentSubmission {
  user_profiles:
    | {
        full_name: string;
        avatar_url?: string | null;
      }
    | undefined;
}

export interface AssignmentSubmissionContent {
  text?: string;
  fileUrl?: string | null;
  linkUrl?: string;
  clientRequestId?: string;
}

export interface AssignmentAttemptRecord {
  id: string;
  attempt_number: number;
  status: SubmissionStatus;
  submitted_at: string | null;
  submission_text: string | null;
  file_url: string | null;
  link_url: string | null;
  is_late: boolean;
  late_penalty_percent: number;
  raw_score: number | null;
  score: number | null;
  feedback: string | null;
  graded_at: string | null;
}

export interface AssignmentSubmissionBundle {
  assignment: Pick<
    Assignment,
    | "id"
    | "title"
    | "description"
    | "due_date"
    | "available_from"
    | "max_points"
    | "max_attempts"
    | "late_penalty_percent"
    | "allow_text_submission"
    | "allow_file_submission"
    | "allow_link_submission"
    | "reminder_enabled"
    | "status"
  >;
  latest_attempt: AssignmentAttemptRecord | null;
  attempts: AssignmentAttemptRecord[];
  remaining_attempts: number;
  can_resubmit: boolean;
}

export interface AssignmentGradingQueueStudent {
  student_id: string;
  student_name: string;
  submission_id: string | null;
  attempt_number: number | null;
  status: "not_submitted" | "submitted" | "late" | "graded";
  submitted_at: string | null;
  score: number | null;
  raw_score: number | null;
}

export interface AssignmentGradingQueue {
  students: AssignmentGradingQueueStudent[];
  counts: {
    total: number;
    not_submitted: number;
    submitted: number;
    late: number;
    graded: number;
  };
}

export interface AssignmentAnalytics {
  total_students: number;
  submission_count: number;
  graded_count: number;
  late_count: number;
  not_submitted_count: number;
  submission_rate: number;
  avg_raw_score: number;
  avg_effective_score: number;
  avg_time_to_grade_hours: number;
  score_distribution: Array<{ bucket: string; count: number }>;
}

export interface AssignmentWithSubmission extends Assignment {
  submission?: AssignmentSubmission;
}

export interface AssignmentWithRelations extends Assignment {
  course: { title: string } | null;
  class: { name: string } | null;
  lesson: { title: string } | null;
}

export interface CreateAssignmentInput {
  tenant_id: string;
  course_id: string | null;
  class_id: string | null;
  lesson_id: string | null;
  title: string;
  description: string | null;
  instructions: string | null;
  max_points: number;
  max_attempts: number;
  status: AssignmentStatus;
  is_published: boolean;
  late_penalty_percent: number;
  due_date: string | null;
  available_from: string | null;
  allow_text_submission: boolean;
  allow_file_submission: boolean;
  allow_link_submission: boolean;
  reminder_enabled: boolean;
  created_by: string | null;
}

const ASSIGNMENT_COLUMNS =
  "id, tenant_id, course_id, class_id, lesson_id, title, description, instructions, max_points, max_attempts, is_published, status, late_penalty_percent, due_date, available_from, allow_text_submission, allow_file_submission, allow_link_submission, reminder_enabled, created_by, created_at, updated_at";

const SUBMISSION_COLUMNS =
  "id, tenant_id, assignment_id, student_id, submission_text, file_url, link_url, status, attempt_number, submitted_at, graded_at, raw_score, score, feedback, is_late, late_penalty_percent, client_request_id";

function normalizeAssignmentStatus(
  status: string | null | undefined,
  isPublished = false,
): AssignmentStatus {
  if (status === "published" || status === "archived" || status === "draft")
    return status;
  return isPublished ? "published" : "draft";
}

function normalizeSubmissionStatus(
  status: string | null | undefined,
): SubmissionStatus {
  switch (status?.toUpperCase()) {
    case "SUBMITTED":
      return "submitted";
    case "LATE":
      return "late";
    case "GRADED":
      return "graded";
    case "RETURNED":
      return "returned";
    default:
      return "draft";
  }
}

function mapAssignmentSubmission(
  row: Record<string, unknown>,
): AssignmentSubmission {
  const profile =
    (row.user_profiles as
      | { full_name: string; avatar_url?: string | null }
      | { full_name: string; avatar_url?: string | null }[]
      | undefined) || {};
  const fullName = Array.isArray(profile)
    ? profile[0]?.full_name || "Student"
    : (profile as { full_name?: string }).full_name || "Student";

  return {
    id: String(row.id),
    tenant_id: String(row.tenant_id),
    assignment_id: String(row.assignment_id),
    student_id: String(row.student_id),
    submission_text: (row.submission_text as string | null) ?? null,
    file_url: (row.file_url as string | null) ?? null,
    link_url: (row.link_url as string | null) ?? null,
    status: normalizeSubmissionStatus(row.status as string | null | undefined),
    attempt_number: Number(row.attempt_number ?? 1),
    submitted_at: (row.submitted_at as string | null) ?? null,
    graded_at: (row.graded_at as string | null) ?? null,
    raw_score:
      row.raw_score === null || row.raw_score === undefined
        ? null
        : Number(row.raw_score),
    score:
      row.score === null || row.score === undefined ? null : Number(row.score),
    feedback: (row.feedback as string | null) ?? null,
    is_late: Boolean(row.is_late),
    late_penalty_percent: Number(row.late_penalty_percent ?? 0),
    client_request_id: (row.client_request_id as string | null) ?? null,
    user_profiles: {
      full_name: fullName,
      avatar_url: Array.isArray(profile)
        ? profile[0]?.avatar_url
        : (profile as { avatar_url?: string }).avatar_url,
    },
  };
}

function calculateEffectiveScore(
  rawScore: number,
  latePenaltyPercent: number,
): number {
  const penaltyValue = (rawScore * latePenaltyPercent) / 100;
  return Math.max(Math.round((rawScore - penaltyValue) * 100) / 100, 0);
}

async function ensureSubmitRateLimit(_userKey: string): Promise<void> {
  // TODO: Phase 6 — check-rate-limit adalah internal service.
  // Saat VIL mengimplementasi /api/v1/rate-limit, aktifkan kembali server-side check.
  // Sementara, client-side rate limiting menjadi primary defense.
  // Parameter _userKey disimpan untuk kompatibilitas dengan implementasi mendatang.
}

export const assignmentService = {
  async createAssignment(input: CreateAssignmentInput): Promise<Assignment> {
    const payload = {
      ...input,
      status: normalizeAssignmentStatus(input.status, input.is_published),
      is_published: input.status === "published" || input.is_published,
    };

    const { data, error } = await db
      .from<any>("assignments")
      .insert(payload)
      .select(ASSIGNMENT_COLUMNS)
      .single();

    if (error) {
      logDevError("assignmentService", "Error creating assignment:", error);
      throw error;
    }

    return {
      ...(data as Assignment),
      status: normalizeAssignmentStatus(
        (data as Assignment).status,
        (data as Assignment).is_published,
      ),
    };
  },

  async submitAssignmentAttempt(
    assignmentId: string,
    studentId: string,
    tenantId: string,
    submission: AssignmentSubmissionContent,
  ): Promise<AssignmentSubmission> {
    await ensureSubmitRateLimit(studentId);

    const { data, error } = await db.rpc("submit_assignment_attempt", {
      p_assignment_id: assignmentId,
      p_submission_text: submission.text?.trim() || null,
      p_file_url: submission.fileUrl ?? null,
      p_link_url: submission.linkUrl?.trim() || null,
      p_client_request_id: submission.clientRequestId ?? null,
    });

    if (error) {
      logDevError(
        "assignmentService",
        "Error submitting assignment attempt:",
        error,
      );
      throw error;
    }

    const mapped = mapAssignmentSubmission({
      ...(data as Record<string, unknown>),
      tenant_id: (data as Record<string, unknown>).tenant_id ?? tenantId,
      student_id: (data as Record<string, unknown>).student_id ?? studentId,
      assignment_id:
        (data as Record<string, unknown>).assignment_id ?? assignmentId,
    });

    return mapped;
  },

  async unsubmitAssignment(
    assignmentId: string,
    studentId: string,
    tenantId: string,
  ): Promise<AssignmentSubmission> {
    const { data, error } = await db
      .from<any>("assignment_submissions")
      .update({
        status: "DRAFT",
        submitted_at: null,
      })
      .eq("assignment_id", assignmentId)
      .eq("student_id", studentId)
      .eq("tenant_id", tenantId)
      .in("status", ["SUBMITTED", "LATE"])
      .order("attempt_number", { ascending: false })
      .limit(1)
      .select(SUBMISSION_COLUMNS)
      .single();

    if (error) {
      logDevError("assignmentService", "Error unsubmitting assignment:", error);
      throw error;
    }

    return mapAssignmentSubmission(data as Record<string, unknown>);
  },

  async gradeSubmission(
    submissionId: string,
    tenantId: string,
    rawScore: number,
    feedback: string,
    status: SubmissionStatus = "graded",
  ): Promise<AssignmentSubmission> {
    const { data: existing, error: existingError } = (await db
      .from<any>("assignment_submissions")
      .select("late_penalty_percent")
      .eq("id", submissionId)
      .eq("tenant_id", tenantId)
      .single()) as {
      data: { late_penalty_percent: number } | null;
      error: Error | null;
    };

    if (existingError) {
      logDevError(
        "assignmentService",
        "Error loading submission before grading:",
        existingError,
      );
      throw existingError;
    }

    const latePenaltyPercent = Number(existing?.late_penalty_percent ?? 0);
    const score = calculateEffectiveScore(rawScore, latePenaltyPercent);

    const { data, error } = await db
      .from<any>("assignment_submissions")
      .update({
        raw_score: rawScore,
        score,
        feedback,
        graded_at: new Date().toISOString(),
        status: status === "returned" ? "RETURNED" : "GRADED",
      })
      .eq("id", submissionId)
      .eq("tenant_id", tenantId)
      .select(SUBMISSION_COLUMNS)
      .single();

    if (error) {
      logDevError("assignmentService", "Error grading submission:", error);
      throw error;
    }

    return mapAssignmentSubmission(data as Record<string, unknown>);
  },

  async getAssignmentByClass(
    classId: string,
    tenantId: string,
  ): Promise<Assignment | null> {
    const { data, error } = await db
      .from<any>("assignments")
      .select(ASSIGNMENT_COLUMNS)
      .eq("class_id", classId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (error) {
      logDevError(
        "assignmentService",
        "Error fetching assignment by class:",
        error,
      );
      throw error;
    }

    if (!data) return null;

    return {
      ...(data as Assignment),
      status: normalizeAssignmentStatus(
        (data as Assignment).status,
        (data as Assignment).is_published,
      ),
    } as Assignment;
  },

  async getAssignmentDetails(
    assignmentId: string,
    studentId: string,
    tenantId: string,
  ): Promise<AssignmentWithSubmission | null> {
    const { data, error } = await db
      .from<any>("assignments")
      .select(ASSIGNMENT_COLUMNS)
      .eq("id", assignmentId)
      .eq("tenant_id", tenantId)
      .single();

    if (error) {
      logDevError(
        "assignmentService",
        "Error fetching assignment details:",
        error,
      );
      throw error;
    }

    if (!data) return null;

    const submission = await this.getLatestSubmission(
      assignmentId,
      studentId,
      tenantId,
    );

    return {
      ...(data as Assignment),
      submission: submission ?? undefined,
    } as AssignmentWithSubmission;
  },

  async getAssignmentSubmissions(
    assignmentId: string,
    tenantId: string,
    limit: number = 100,
  ): Promise<AssignmentSubmission[]> {
    const { data, error } = await db
      .from<any>("assignment_submissions")
      .select(SUBMISSION_COLUMNS)
      .eq("assignment_id", assignmentId)
      .eq("tenant_id", tenantId)
      .order("attempt_number", { ascending: false })
      .limit(limit);

    if (error) {
      logDevError(
        "assignmentService",
        "Error fetching assignment submissions:",
        error,
      );
      throw error;
    }

    const submissions = (data ?? []) as Record<string, unknown>[];
    const studentIds = submissions
      .map((row) => String(row.student_id))
      .filter(Boolean);
    const { data: profiles, error: profileError } =
      studentIds.length > 0
        ? await db
            .from<Array<{ id: string; full_name: string | null; email: string | null }>>("profiles")
            .select("id, full_name, avatar_url")
            .eq("tenant_id", tenantId)
            .in("id", studentIds)
        : { data: [], error: null };

    if (profileError) {
      logDevError(
        "assignmentService",
        "Error fetching submission profiles:",
        profileError,
      );
      throw profileError;
    }

    const profileMap = new Map(
      ((profiles ?? []) as Array<Record<string, unknown>>).map((profile) => [
        String(profile.id),
        profile,
      ]),
    );

    return submissions.map((row) =>
      mapAssignmentSubmission({
        ...row,
        user_profiles: profileMap.get(String(row.student_id)),
      }),
    );
  },

  async getStudentAssignments(
    tenantId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    data:
      | (AssignmentWithRelations & {
          assignment_submissions: AssignmentSubmissionWithProfile[];
        })[]
      | null;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    return this.getAssignments(tenantId, page, limit);
  },

  async getTeacherAssignments(
    tenantId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    data: AssignmentWithRelations[] | null;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    return this.getAssignments(tenantId, page, limit);
  },

  async getAssignmentsByTenant(
    tenantId: string,
    page: number = 0,
    pageSize: number = 50,
  ): Promise<Assignment[]> {
    const { data, error } = (await db
      .from<any>("assignments")
      .select(ASSIGNMENT_COLUMNS)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1)) as {
      data: Assignment[];
      error: Error | null;
    };

    if (error) {
      logDevError(
        "assignmentService",
        "Error fetching assignments by tenant:",
        error,
      );
      throw error;
    }

    return ((data ?? []) as Array<Assignment>).map((assignment) => ({
      ...assignment,
      status: normalizeAssignmentStatus(
        assignment.status,
        assignment.is_published,
      ),
    }));
  },

  async getAssignmentById(
    assignmentId: string,
    tenantId: string,
  ): Promise<Assignment | null> {
    const { data, error } = await db
      .from<any>("assignments")
      .select(ASSIGNMENT_COLUMNS)
      .eq("id", assignmentId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (error) {
      logDevError(
        "assignmentService",
        "Error fetching assignment by ID:",
        error,
      );
      throw error;
    }

    if (!data) return null;

    return {
      ...(data as Assignment),
      status: normalizeAssignmentStatus(
        (data as Assignment).status,
        (data as Assignment).is_published,
      ),
    };
  },

  async getSubmissionText(
    assignmentId: string,
    studentId: string,
    tenantId: string,
  ): Promise<string | null> {
    const submission = await this.getLatestSubmission(
      assignmentId,
      studentId,
      tenantId,
    );
    return submission?.submission_text ?? null;
  },

  async getLatestSubmission(
    assignmentId: string,
    studentId: string,
    tenantId: string,
  ): Promise<AssignmentSubmission | null> {
    const { data, error } = await db
      .from<any>("assignment_submissions")
      .select(SUBMISSION_COLUMNS)
      .eq("assignment_id", assignmentId)
      .eq("student_id", studentId)
      .eq("tenant_id", tenantId)
      .order("attempt_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      logDevError(
        "assignmentService",
        "Error fetching latest submission:",
        error,
      );
      return null;
    }

    if (!data) return null;
    return mapAssignmentSubmission(data as Record<string, unknown>);
  },

  async getSubmission(
    assignmentId: string,
    studentId: string,
    tenantId: string,
  ): Promise<{ id: string; submission_text: string | null } | null> {
    const submission = await this.getLatestSubmission(
      assignmentId,
      studentId,
      tenantId,
    );
    if (!submission) return null;

    return {
      id: submission.id,
      submission_text: submission.submission_text,
    };
  },

  async getAssignments(
    tenantId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    data:
      | (AssignmentWithRelations & {
          assignment_submissions: AssignmentSubmissionWithProfile[];
        })[]
      | null;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await db
      .from<any>("assignments")
      .select(ASSIGNMENT_COLUMNS, { count: "exact" })
      .eq("tenant_id", tenantId)
      .order("due_date", { ascending: true })
      .range(from, to);

    if (error) {
      logDevError("assignmentService", "Error fetching assignments:", error);
      throw error;
    }

    const assignments = (data ?? []) as Assignment[];
    const courseIds = assignments
      .map((row) => row.course_id)
      .filter(Boolean) as string[];
    const classIds = assignments
      .map((row) => row.class_id)
      .filter(Boolean) as string[];
    const lessonIds = assignments
      .map((row) => row.lesson_id)
      .filter(Boolean) as string[];
    const assignmentIds = assignments
      .map((row) => String(row.id))
      .filter(Boolean);

    const [
      { data: courses, error: courseError },
      { data: classes, error: classError },
      { data: lessons, error: lessonError },
      { data: submissions, error: submissionError },
    ] = await Promise.all([
      courseIds.length > 0
        ? db
            .from<any>("courses")
            .select("id, title")
            .eq("tenant_id", tenantId)
            .in("id", courseIds)
        : Promise.resolve({ data: [], error: null }),
      classIds.length > 0
        ? db
            .from<any>("classes")
            .select("id, name")
            .eq("tenant_id", tenantId)
            .in("id", classIds)
        : Promise.resolve({ data: [], error: null }),
      lessonIds.length > 0
        ? db
            .from<any>("lessons")
            .select("id, title")
            .eq("tenant_id", tenantId)
            .in("id", lessonIds)
        : Promise.resolve({ data: [], error: null }),
      assignmentIds.length > 0
        ? db
            .from<any>("assignment_submissions")
            .select(SUBMISSION_COLUMNS)
            .eq("tenant_id", tenantId)
            .in("assignment_id", assignmentIds)
            .order("attempt_number", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (courseError) throw courseError;
    if (classError) throw classError;
    if (lessonError) throw lessonError;
    if (submissionError) throw submissionError;

    const submissionRows = (submissions ?? []) as Record<string, unknown>[];
    const submissionStudentIds = submissionRows
      .map((row) => String(row.student_id))
      .filter(Boolean);
    const { data: profiles, error: profileError } =
      submissionStudentIds.length > 0
        ? await db
            .from<Array<{ id: string; full_name: string | null; email: string | null }>>("profiles")
            .select("id, full_name")
            .eq("tenant_id", tenantId)
            .in("id", submissionStudentIds)
        : { data: [], error: null };

    if (profileError) throw profileError;

    const courseMap = new Map(
      ((courses ?? []) as Array<Record<string, unknown>>).map((course) => [
        String(course.id),
        course,
      ]),
    );
    const classMap = new Map(
      ((classes ?? []) as Array<Record<string, unknown>>).map((classroom) => [
        String(classroom.id),
        classroom,
      ]),
    );
    const lessonMap = new Map(
      ((lessons ?? []) as Array<Record<string, unknown>>).map((lesson) => [
        String(lesson.id),
        lesson,
      ]),
    );
    const profileMap = new Map(
      ((profiles ?? []) as Array<Record<string, unknown>>).map((profile) => [
        String(profile.id),
        profile,
      ]),
    );
    const submissionsByAssignment = new Map<
      string,
      AssignmentSubmissionWithProfile[]
    >();
    submissionRows.forEach((submission) => {
      const assignmentKey = String(submission.assignment_id);
      const current = submissionsByAssignment.get(assignmentKey) ?? [];
      current.push(
        mapAssignmentSubmission({
          ...submission,
          user_profiles: profileMap.get(String(submission.student_id)),
        }) as AssignmentSubmissionWithProfile,
      );
      submissionsByAssignment.set(assignmentKey, current);
    });

    const transformedData: Array<
      AssignmentWithRelations & {
        assignment_submissions: AssignmentSubmissionWithProfile[];
      }
    > = assignments.map((assignment) => ({
      ...assignment,
      course: assignment.course_id
        ? {
            title: String(
              courseMap.get(String(assignment.course_id))?.title ?? "",
            ),
          }
        : null,
      class: assignment.class_id
        ? {
            name: String(classMap.get(String(assignment.class_id))?.name ?? ""),
          }
        : null,
      lesson: assignment.lesson_id
        ? {
            title: String(
              lessonMap.get(String(assignment.lesson_id))?.title ?? "",
            ),
          }
        : null,
      assignment_submissions:
        submissionsByAssignment.get(String(assignment.id)) ?? [],
    }));

    return {
      data: transformedData,
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    };
  },

  async uploadSubmissionFile(
    file: File,
    tenantId: string,
    assignmentId: string,
    userId: string,
  ): Promise<string> {
    const ALLOWED_TYPES = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];

    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error(
        `Tipe file "${file.type}" tidak didukung. Upload PDF, gambar, atau dokumen Word.`,
      );
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${tenantId}/assignments/${assignmentId}/${userId}/${Date.now()}-${safeName}`;
    const { data: uploadData, error: uploadError } = await getStorageProvider()
      .from("assignment-submissions")
      .upload(storagePath, file, { upsert: false });

    if (uploadError) throw uploadError;
    return uploadData?.path ?? storagePath;
  },

  async createSignedSubmissionUrl(
    filePath: string,
    expiresInSeconds = 3600,
  ): Promise<string | null> {
    if (!filePath) return null;

    const { data, error } = await getStorageProvider()
      .from("assignment-submissions")
      .createSignedUrl(filePath, expiresInSeconds);

    if (error) {
      logDevError(
        "assignmentService",
        "Error creating signed submission URL:",
        error,
      );
      return null;
    }

    return data?.signedUrl ?? null;
  },

  async getPendingAssignmentCount(
    tenantId: string,
    userId: string,
  ): Promise<number> {
    const { data: enrollments, error: eErr } = (await db
      .from<any>("course_enrollments")
      .select("course_id")
      .eq("user_id", userId)
      .eq("tenant_id", tenantId)
      .eq("status", "ACTIVE")) as {
      data: Array<{ course_id: string }>;
      error: Error | null;
    };

    if (eErr) {
      if (import.meta.env.DEV)
        logger.error(
          "[assignmentService] getPendingAssignmentCount enrollments error:",
          eErr,
        );
      return 0;
    }

    if (!enrollments || enrollments.length === 0) return 0;

    const enrolledCourseIds = enrollments.map((e) => e.course_id);

    const { data: allAssignments, error: aErr } = (await db
      .from<any>("assignments")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("status", "published")
      .in("course_id", enrolledCourseIds)) as {
      data: Array<{ id: string }>;
      error: Error | null;
    };

    if (aErr) {
      if (import.meta.env.DEV)
        logger.error(
          "[assignmentService] getPendingAssignmentCount error:",
          aErr,
        );
      return 0;
    }

    if (!allAssignments || allAssignments.length === 0) return 0;

    const { data: submitted, error: sErr } = (await db
      .from<any>("assignment_submissions")
      .select("assignment_id")
      .eq("student_id", userId)
      .eq("tenant_id", tenantId)
      .neq("status", "DRAFT")
      .in(
        "assignment_id",
        allAssignments.map((a) => a.id),
      )) as { data: Array<{ assignment_id: string }>; error: Error | null };

    if (sErr) {
      if (import.meta.env.DEV)
        logger.error(
          "[assignmentService] getPendingAssignmentCount submissions error:",
          sErr,
        );
      return allAssignments.length;
    }

    const submittedIds = new Set(
      (submitted ?? []).map((submission) => submission.assignment_id),
    );
    return allAssignments.filter(
      (assignment) => !submittedIds.has(assignment.id),
    ).length;
  },

  async getAssignmentSubmissionBundle(
    assignmentId: string,
    studentId: string,
    _tenantId: string,
  ): Promise<AssignmentSubmissionBundle> {
    const { data, error } = await db.rpc("get_assignment_submission_bundle", {
      p_assignment_id: assignmentId,
      p_student_id: studentId,
    });

    if (error) {
      logDevError(
        "assignmentService",
        "Error fetching submission bundle:",
        error,
      );
      throw error;
    }

    const bundle = data as AssignmentSubmissionBundle;

    if (bundle.latest_attempt?.file_url) {
      const signedUrl = await this.createSignedSubmissionUrl(
        bundle.latest_attempt.file_url,
      );
      if (signedUrl) {
        bundle.latest_attempt.file_url = signedUrl;
      }
    }

    if (bundle.attempts?.length) {
      await Promise.all(
        bundle.attempts.map(async (attempt) => {
          if (attempt.file_url) {
            const signedUrl = await this.createSignedSubmissionUrl(
              attempt.file_url,
            );
            if (signedUrl) attempt.file_url = signedUrl;
          }
        }),
      );
    }

    return bundle;
  },

  async getAssignmentGradingQueue(
    assignmentId: string,
    _tenantId: string,
  ): Promise<AssignmentGradingQueue> {
    const { data, error } = await db.rpc("get_assignment_grading_queue", {
      p_assignment_id: assignmentId,
    });

    if (error) {
      logDevError("assignmentService", "Error fetching grading queue:", error);
      throw error;
    }

    return data as AssignmentGradingQueue;
  },

  async getAssignmentAnalytics(
    assignmentId: string,
    _tenantId: string,
  ): Promise<AssignmentAnalytics> {
    const { data, error } = await db.rpc("get_assignment_analytics", {
      p_assignment_id: assignmentId,
    });

    if (error) {
      logDevError(
        "assignmentService",
        "Error fetching assignment analytics:",
        error,
      );
      throw error;
    }

    return data as AssignmentAnalytics;
  },

  async sendAssignmentReminders(
    assignmentId: string,
    _tenantId: string,
  ): Promise<{ recipient_count: number; assignment_id: string }> {
    const { data, error } = await db.rpc("send_assignment_reminders", {
      p_assignment_id: assignmentId,
    });

    if (error) {
      logDevError(
        "assignmentService",
        "Error sending assignment reminders:",
        error,
      );
      throw error;
    }

    return data as { recipient_count: number; assignment_id: string };
  },
};
