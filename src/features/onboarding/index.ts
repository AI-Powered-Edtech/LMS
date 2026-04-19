export { OnboardingChecklist } from "./components/OnboardingChecklist";
export { StudentWelcome } from "./components/StudentWelcome";
export { TeacherOnboardingWizard } from "./components/TeacherOnboardingWizard";
export { TeacherWelcome } from "./components/TeacherWelcome";
export type { UseTeacherOnboardingReturn } from "./hooks/useTeacherOnboarding";
export { useTeacherOnboarding } from "./hooks/useTeacherOnboarding";
export {
  useOnboardingProgress,
  useUpdateOnboardingProgress,
} from "./queries/onboardingQueries";
export type { OnboardingProgress, OnboardingStep } from "./types";
export { ONBOARDING_STEPS } from "./types";
