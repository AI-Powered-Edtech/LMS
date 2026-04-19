import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { db } from "@/services/db";
import { STALE } from "@/utils/queryConstants";

import type { OnboardingProgress } from "../types";
import { onboardingKeys } from "./onboardingKeys";

// ─── Query Hooks ────────────────────────────────────────────────────────────

export function useOnboardingProgress(tenantId: string, userId: string) {
  return useQuery({
    queryKey: onboardingKeys.progress(tenantId, userId),
    queryFn: () => fetchOnboardingProgress(tenantId, userId),
    staleTime: STALE.DYNAMIC,
  });
}

async function fetchOnboardingProgress(
  tenantId: string,
  userId: string,
): Promise<OnboardingProgress | null> {
  const { data, error } = await db
    .from("onboarding_progress")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn(
      "[onboardingQueries] Failed to fetch progress:",
      error.message,
    );
    return null;
  }

  return data as OnboardingProgress;
}

// ─── Mutation Hooks ────────────────────────────────────────────────────────

export function useUpdateOnboardingProgress(tenantId: string, userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      progressId,
      stepsCompleted,
    }: {
      progressId: string;
      stepsCompleted: Record<string, boolean>;
    }) => updateOnboardingProgress(progressId, stepsCompleted),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: onboardingKeys.progress(tenantId, userId),
      });
    },
  });
}

async function updateOnboardingProgress(
  progressId: string,
  stepsCompleted: Record<string, boolean>,
): Promise<OnboardingProgress> {
  const allDone = Object.values(stepsCompleted).every(Boolean);
  const { data, error } = await db
    .from("onboarding_progress")
    .update({
      steps_completed: stepsCompleted,
      completed_at: allDone ? new Date().toISOString() : null,
    })
    .eq("id", progressId)
    .select("*")
    .single();

  if (error) throw error;
  if (!data) {
    throw new Error("Failed to update onboarding progress");
  }

  return data as OnboardingProgress;
}

// ─── Mark Onboarding Step Complete ────────────────────────────────────────────

export async function markOnboardingStepComplete(
  progressId: string,
  stepsCompleted: Record<string, boolean>,
): Promise<OnboardingProgress> {
  const allDone = Object.values(stepsCompleted).every(Boolean);
  const { data, error } = await db
    .from("onboarding_progress")
    .update({
      steps_completed: stepsCompleted,
      completed_at: allDone ? new Date().toISOString() : null,
    })
    .eq("id", progressId)
    .select("*")
    .single();

  if (error) throw error;
  if (!data) {
    throw new Error("Failed to update onboarding progress");
  }

  return data as OnboardingProgress;
}
