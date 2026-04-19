export const onboardingKeys = {
  progress: (tenantId: string, userId: string) =>
    ["onboarding", tenantId, "progress", userId] as const,
};
