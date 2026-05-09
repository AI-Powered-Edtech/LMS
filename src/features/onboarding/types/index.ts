export interface OnboardingStep {
  id: string;
  href: string;
}

export interface OnboardingProgress {
  id: string;
  tenant_id: string;
  user_id: string;
  steps_completed: Record<string, boolean>;
  completed_at: string | null;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  { id: "create_course", href: "/app/teacher/course-builder" },
  { id: "invite_teacher", href: "/app/admin/users" },
  { id: "invite_students", href: "/app/admin/users" },
  { id: "setup_grading", href: "/app/admin/settings" },
  { id: "enable_gamification", href: "/app/admin/settings" },
];
