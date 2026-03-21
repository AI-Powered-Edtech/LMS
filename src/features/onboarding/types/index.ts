export interface OnboardingStep {
  id: string
  title: string
  description: string
  completed: boolean
  href: string
}

export interface OnboardingProgress {
  id: string
  tenant_id: string
  user_id: string
  steps_completed: Record<string, boolean>
  completed_at: string | null
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'create_course',
    title: 'Buat kursus pertama',
    description: 'Mulai dengan membuat konten pembelajaran',
    completed: false,
    href: '/#/app/teacher/course-builder',
  },
  {
    id: 'invite_teacher',
    title: 'Undang guru',
    description: 'Tambahkan anggota tim pengajar',
    completed: false,
    href: '/#/app/admin/users',
  },
  {
    id: 'invite_students',
    title: 'Undang siswa',
    description: 'Daftarkan siswa ke platform',
    completed: false,
    href: '/#/app/admin/users',
  },
  {
    id: 'setup_grading',
    title: 'Atur skala penilaian',
    description: 'Konfigurasi sistem nilai',
    completed: false,
    href: '/#/app/admin/settings',
  },
  {
    id: 'enable_gamification',
    title: 'Aktifkan gamifikasi',
    description: 'Motivasi siswa dengan poin dan lencana',
    completed: false,
    href: '/#/app/admin/settings',
  },
]
