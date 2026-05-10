// ==========================================================================
// Survey API — surveyApi.ts
//
// Query API untuk Satisfaction Survey System.
// ==========================================================================
import { db } from "@/services/db";
import { logger } from "@/utils/logger";

import type {
  CreateSurveyInput,
  QuestionResult,
  SatisfactionSurvey,
  SurveyResultsData,
} from "../types";

// ── List Surveys ───────────────────────────────────────────────

/**
 * Ambil semua survey untuk tenant saat ini.
 */
export async function getSurveys(): Promise<SatisfactionSurvey[]> {
  const { data, error } = await db
    .from<any>("satisfaction_surveys")
    .select(
      "id, title, target_audience, questions, status, start_date, end_date, created_at, created_by, tenant_id",
    )
    .order("created_at", { ascending: false });

  if (error) {
    if (import.meta.env.DEV) logger.error("[Survey] getSurveys error:", error);
    throw new Error("Gagal memuat daftar survey. Silakan coba lagi.");
  }

  return (data ?? []) as SatisfactionSurvey[];
}

// ── Create Survey ──────────────────────────────────────────────

export async function createSurvey(
  input: CreateSurveyInput,
): Promise<SatisfactionSurvey> {
  const { data, error } = await db
    .from<any>("satisfaction_surveys")
    .insert({
      title: input.title,
      target_audience: input.target_audience,
      questions: input.questions,
      start_date: input.start_date,
      end_date: input.end_date,
      status: "draft",
    })
    .select(
      "id, title, target_audience, questions, status, start_date, end_date, created_at, created_by, tenant_id",
    )
    .single();

  if (error) {
    if (import.meta.env.DEV)
      logger.error("[Survey] createSurvey error:", error);
    throw new Error("Gagal membuat survey. Silakan coba lagi.");
  }

  return data as SatisfactionSurvey;
}

// ── Update Survey ──────────────────────────────────────────────

export async function updateSurvey(
  id: string,
  input: Partial<CreateSurveyInput>,
): Promise<SatisfactionSurvey> {
  const { data, error } = await db
    .from<any>("satisfaction_surveys")
    .update({
      ...input,
    })
    .eq("id", id)
    .select(
      "id, title, target_audience, questions, status, start_date, end_date, created_at, created_by, tenant_id",
    )
    .single();

  if (error) {
    if (import.meta.env.DEV)
      logger.error("[Survey] updateSurvey error:", error);
    throw new Error("Gagal memperbarui survey. Silakan coba lagi.");
  }

  return data as SatisfactionSurvey;
}

// ── Publish Survey ─────────────────────────────────────────────

export async function publishSurvey(id: string): Promise<void> {
  const { error } = await db
    .from<any>("satisfaction_surveys")
    .update({ status: "active" })
    .eq("id", id);

  if (error) {
    if (import.meta.env.DEV)
      logger.error("[Survey] publishSurvey error:", error);
    throw new Error("Gagal mempublikasikan survey. Silakan coba lagi.");
  }
}

// ── Close Survey ───────────────────────────────────────────────

export async function closeSurvey(id: string): Promise<void> {
  const { error } = await db
    .from<any>("satisfaction_surveys")
    .update({ status: "closed" })
    .eq("id", id);

  if (error) {
    if (import.meta.env.DEV) logger.error("[Survey] closeSurvey error:", error);
    throw new Error("Gagal menutup survey. Silakan coba lagi.");
  }
}

// ── Delete Survey ──────────────────────────────────────────────

export async function deleteSurvey(id: string): Promise<void> {
  const { error } = await db
    .from<any>("satisfaction_surveys")
    .delete()
    .eq("id", id);

  if (error) {
    if (import.meta.env.DEV)
      logger.error("[Survey] deleteSurvey error:", error);
    throw new Error("Gagal menghapus survey. Silakan coba lagi.");
  }
}

// ── Get Survey Results ─────────────────────────────────────────

export async function getSurveyResults(
  surveyId: string,
  tenantId?: string,
): Promise<SurveyResultsData> {
  // Fetch survey detail
  const { data: survey, error: surveyError } = await db
    .from<any>("satisfaction_surveys")
    .select(
      "id, title, target_audience, questions, status, start_date, end_date, created_at, created_by, tenant_id",
    )
    .eq("id", surveyId)
    .single();

  if (surveyError || !survey) {
    throw new Error("Gagal memuat detail survey.");
  }

  const surveyData = survey as SatisfactionSurvey;

  if (typeof db.rpc !== "function") {
    const { data: responses, error: responsesError } = await db
      .from<any>("survey_responses")
      .select("id, survey_id, respondent_id, answers, created_at")
      .eq("survey_id", surveyId)
      .limit(500);

    if (responsesError) {
      throw new Error("Gagal memuat respons survey.");
    }

    const allResponses = (responses as Array<Record<string, unknown>>) ?? [];
    const fallbackQuestionResults: QuestionResult[] = surveyData.questions.map(
      (question) => {
        const answers = allResponses
          .map((response: any) => response.answers[question.id])
          .filter(
            (answer: any) =>
              answer !== undefined && answer !== null && answer !== "",
          );

        if (question.type === "rating") {
          const numericAnswers = answers
            .map((value: any) => Number(value))
            .filter(
              (value: any) => !Number.isNaN(value) && value >= 1 && value <= 5,
            );
          const distribution: Record<number, number> = {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0,
          };
          numericAnswers.forEach((value: any) => {
            distribution[value] = (distribution[value] ?? 0) + 1;
          });

          return {
            question,
            ratingAvg:
              numericAnswers.length > 0
                ? numericAnswers.reduce(
                    (sum: any, value: any) => sum + value,
                    0,
                  ) / numericAnswers.length
                : 0,
            ratingDistribution: distribution,
          };
        }

        if (question.type === "yesno") {
          return {
            question,
            yesCount: answers.filter((answer: any) =>
              [true, "true", "ya", "yes", 1, "1"].includes(answer as never),
            ).length,
            noCount: answers.filter((answer: any) =>
              [false, "false", "tidak", "no", 0, "0"].includes(answer as never),
            ).length,
          };
        }

        return {
          question,
          textAnswers: answers.map(String),
        };
      },
    );

    return {
      survey: surveyData,
      totalResponses: allResponses.length,
      questionResults: fallbackQuestionResults,
    };
  }

  const { data: rows, error: resultsError } = await db.rpc(
    "get_survey_results",
    {
      p_tenant_id: tenantId ?? surveyData.tenant_id,
      p_survey_id: surveyId,
    },
  );

  if (resultsError) {
    if (import.meta.env.DEV)
      logger.error("[Survey] getSurveyResults RPC error:", resultsError);
    throw new Error("Gagal memuat hasil survey.");
  }

  const questionResults: QuestionResult[] = (
    (rows ?? []) as Record<string, unknown>[]
  ).map((row) => {
    const questionId = String(row.question_id ?? "");
    const question = survey.questions.find(
      (item: SatisfactionSurvey["questions"][number]) => item.id === questionId,
    );
    if (!question) {
      return {
        question: {
          id: questionId,
          text: String(row.question_text ?? "Pertanyaan"),
          type:
            (row.question_type as QuestionResult["question"]["type"]) ?? "text",
          required: false,
        },
        ratingAvg: row.rating_avg ? Number(row.rating_avg) : undefined,
        ratingDistribution: row.rating_distribution as
          | Record<number, number>
          | undefined,
        yesCount: row.yes_count ? Number(row.yes_count) : undefined,
        noCount: row.no_count ? Number(row.no_count) : undefined,
        textAnswers: (row.text_answers as string[] | null) ?? undefined,
      };
    }

    return {
      question,
      ratingAvg: row.rating_avg ? Number(row.rating_avg) : undefined,
      ratingDistribution: row.rating_distribution as
        | Record<number, number>
        | undefined,
      yesCount: row.yes_count ? Number(row.yes_count) : undefined,
      noCount: row.no_count ? Number(row.no_count) : undefined,
      textAnswers: (row.text_answers as string[] | null) ?? undefined,
    };
  });

  return {
    survey: surveyData,
    totalResponses:
      rows && (rows as Array<unknown>).length > 0
        ? Number(
            (
              (rows as Array<Record<string, unknown>>)[0] as Record<
                string,
                unknown
              >
            ).total_responses ?? 0,
          )
        : 0,
    questionResults,
  };
}

// ── Get Active Surveys (for respondents) ──────────────────────

/**
 * Ambil semua survey aktif yang dapat diisi oleh responden.
 * RLS akan memfilter berdasarkan tenant secara otomatis.
 */
export async function getActiveSurveys(): Promise<SatisfactionSurvey[]> {
  const { data, error } = await db
    .from<any>("satisfaction_surveys")
    .select(
      "id, title, target_audience, questions, status, created_at, start_date, end_date, tenant_id, created_by",
    )
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    if (import.meta.env.DEV)
      logger.error("[Survey] getActiveSurveys error:", error);
    throw new Error("Gagal memuat daftar survei aktif. Silakan coba lagi.");
  }

  return (data ?? []) as SatisfactionSurvey[];
}

// ── Get Single Survey By ID ────────────────────────────────────

/**
 * Ambil detail satu survei berdasarkan ID.
 * Digunakan oleh SurveyResponseForm.
 */
export async function getSurveyById(
  surveyId: string,
): Promise<SatisfactionSurvey> {
  const { data, error } = await db
    .from<any>("satisfaction_surveys")
    .select(
      "id, title, target_audience, questions, status, created_at, start_date, end_date, tenant_id, created_by",
    )
    .eq("id", surveyId)
    .single();

  if (error) {
    if (import.meta.env.DEV)
      logger.error("[Survey] getSurveyById error:", error);
    throw new Error("Gagal memuat survei. Silakan coba lagi.");
  }

  return data as SatisfactionSurvey;
}

// ── Check Already Responded ────────────────────────────────────

/**
 * Cek apakah pengguna saat ini sudah mengisi survei ini.
 * Mengembalikan false jika tidak terautentikasi atau terjadi error.
 */
export async function hasRespondedToSurvey(surveyId: string): Promise<boolean> {
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return false;

  const { count, error } = await db
    .from<any>("survey_responses")
    .select("id", { count: "exact", head: true })
    .eq("survey_id", surveyId)
    .eq("respondent_id", user.id);

  if (error) {
    if (import.meta.env.DEV)
      logger.error("[Survey] hasRespondedToSurvey error:", error);
    return false;
  }

  return (count ?? 0) > 0;
}

// ── Submit Response ────────────────────────────────────────────

export async function submitSurveyResponse(
  surveyId: string,
  answers: Record<string, string | number | boolean>,
): Promise<void> {
  // Get current user ID — required by RLS policy (respondent_id = auth.uid())
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("Pengguna tidak terautentikasi");

  const { error } = await db
    .from<any>("survey_responses")
    .insert({
      survey_id: surveyId,
      respondent_id: user.id,
      answers,
    })
    .select("id, survey_id, respondent_id, answers, created_at")
    .single();

  if (error) {
    if (import.meta.env.DEV)
      logger.error("[Survey] submitSurveyResponse error:", error);
    throw new Error("Gagal mengirim respons survey. Silakan coba lagi.");
  }
}
