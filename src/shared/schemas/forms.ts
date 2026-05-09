import * as v from 'valibot'

// ── Auth ──────────────────────────────────────────────────────────────────────

export const LoginFormSchema = v.object({
  email: v.pipe(v.string(), v.email('Email tidak valid')),
  password: v.pipe(v.string(), v.minLength(8, 'Password minimal 8 karakter')),
})

export type LoginFormData = v.InferOutput<typeof LoginFormSchema>

export const RegisterFormSchema = v.object({
  firstName: v.pipe(v.string(), v.nonEmpty('Nama depan wajib diisi')),
  lastName: v.pipe(v.string(), v.nonEmpty('Nama belakang wajib diisi')),
  email: v.pipe(v.string(), v.email('Email tidak valid')),
  password: v.pipe(
    v.string(),
    v.minLength(8, 'Password minimal 8 karakter'),
    v.regex(/[A-Z]/, 'Password harus mengandung huruf besar'),
    v.regex(/[0-9]/, 'Password harus mengandung angka')
  ),
})

export type RegisterFormData = v.InferOutput<typeof RegisterFormSchema>

export const ForgotPasswordFormSchema = v.object({
  email: v.pipe(v.string(), v.email('Email tidak valid.')),
})

export type ForgotPasswordFormData = v.InferOutput<typeof ForgotPasswordFormSchema>

export const ResetPasswordFormSchema = v.pipe(
  v.object({
    password: v.pipe(v.string(), v.minLength(8, 'Password minimal 8 karakter.')),
    confirmPassword: v.string(),
  }),
  v.forward(
    v.partialCheck(
      [['password'], ['confirmPassword']],
      (input) => input.password === input.confirmPassword,
      'Password tidak cocok.'
    ),
    ['confirmPassword']
  )
)

export type ResetPasswordFormData = v.InferOutput<typeof ResetPasswordFormSchema>

// ── Classroom ─────────────────────────────────────────────────────────────────

export const ClassroomFormSchema = v.object({
  name: v.pipe(
    v.string(),
    v.minLength(3, 'Nama kelas minimal 3 karakter'),
    v.maxLength(100, 'Nama kelas maksimal 100 karakter')
  ),
  description: v.optional(
    v.pipe(v.string(), v.maxLength(500, 'Deskripsi maksimal 500 karakter')),
    ''
  ),
  subject: v.optional(v.string(), ''),
})

export type ClassroomFormData = v.InferOutput<typeof ClassroomFormSchema>

export const JoinClassFormSchema = v.object({
  code: v.pipe(v.string(), v.minLength(1, 'Kode kelas wajib diisi')),
})

export type JoinClassFormData = v.InferOutput<typeof JoinClassFormSchema>

// ── Assignment ────────────────────────────────────────────────────────────────

export const AssignmentFormSchema = v.pipe(
  v.object({
    title: v.pipe(
      v.string(),
      v.minLength(3, 'Judul tugas minimal 3 karakter'),
      v.maxLength(200, 'Judul tugas maksimal 200 karakter')
    ),
    description: v.optional(v.string(), ''),
    due_date: v.pipe(v.string(), v.nonEmpty('Tenggat waktu wajib diisi')),
    max_score: v.pipe(
      v.number('Poin maksimal harus berupa angka'),
      v.minValue(1, 'Poin maksimal minimal 1'),
      v.maxValue(1000, 'Poin maksimal tidak boleh lebih dari 1000')
    ),
    available_from: v.optional(v.string(), ''),
    max_attempts: v.pipe(
      v.number('Max attempts harus berupa angka'),
      v.minValue(1, 'Max attempts minimal 1')
    ),
    late_penalty_percent: v.pipe(
      v.number('Late penalty percent harus berupa angka'),
      v.minValue(0, 'Late penalty percent minimal 0'),
      v.maxValue(100, 'Late penalty percent maksimal 100')
    ),
    allow_text_submission: v.boolean(),
    allow_file_submission: v.boolean(),
    allow_link_submission: v.boolean(),
    reminder_enabled: v.boolean(),
  }),
  v.forward(
    v.partialCheck(
      [['allow_text_submission'], ['allow_file_submission'], ['allow_link_submission']],
      (input) =>
        input.allow_text_submission || input.allow_file_submission || input.allow_link_submission,
      'Aktifkan minimal satu metode pengumpulan.'
    ),
    ['allow_text_submission']
  )
)

export type AssignmentFormData = v.InferOutput<typeof AssignmentFormSchema>

// ── Announcement ──────────────────────────────────────────────────────────────

export const AnnouncementFormSchema = v.object({
  title: v.pipe(
    v.string(),
    v.minLength(3, 'Judul minimal 3 karakter'),
    v.maxLength(200, 'Judul maksimal 200 karakter')
  ),
  content: v.pipe(v.string(), v.minLength(10, 'Isi pengumuman minimal 10 karakter')),
  priority: v.optional(v.picklist(['low', 'normal', 'high'], 'Prioritas tidak valid'), 'normal'),
})

export type AnnouncementFormData = v.InferOutput<typeof AnnouncementFormSchema>

// ── Profile (Settings) ────────────────────────────────────────────────────────

export const ProfileFormSchema = v.object({
  fullName: v.pipe(
    v.string(),
    v.minLength(2, 'Nama minimal 2 karakter'),
    v.maxLength(100, 'Nama maksimal 100 karakter')
  ),
})

export type ProfileFormData = v.InferOutput<typeof ProfileFormSchema>

// ── Tenant Invite (Admin) ─────────────────────────────────────────────────────

export const InviteUserFormSchema = v.object({
  email: v.pipe(v.string(), v.email('Email tidak valid')),
  role: v.picklist(['STUDENT', 'TEACHER', 'ADMIN']),
})

export type InviteUserFormData = v.InferOutput<typeof InviteUserFormSchema>

// ── LTI Platform ──────────────────────────────────────────────────────────────

export const LtiPlatformFormSchema = v.object({
  name: v.pipe(
    v.string(),
    v.nonEmpty('Nama platform wajib diisi'),
    v.maxLength(200, 'Nama platform maksimal 200 karakter')
  ),
  issuer: v.pipe(
    v.string(),
    v.nonEmpty('Issuer URL wajib diisi'),
    v.url('Issuer harus berupa URL yang valid')
  ),
  client_id: v.pipe(v.string(), v.nonEmpty('Client ID wajib diisi')),
  auth_endpoint: v.pipe(
    v.string(),
    v.nonEmpty('Auth endpoint wajib diisi'),
    v.url('Auth endpoint harus berupa URL yang valid')
  ),
  token_endpoint: v.pipe(
    v.string(),
    v.nonEmpty('Token endpoint wajib diisi'),
    v.url('Token endpoint harus berupa URL yang valid')
  ),
  jwks_url: v.pipe(
    v.string(),
    v.nonEmpty('JWKS URL wajib diisi'),
    v.url('JWKS URL harus berupa URL yang valid')
  ),
  deployment_id: v.pipe(
    v.string(),
    v.transform((s) => s || '')
  ),
  is_active: v.boolean(),
})

export type LtiPlatformFormData = v.InferOutput<typeof LtiPlatformFormSchema>

// ── Quiz ──────────────────────────────────────────────────────────────────────

export const QuizOptionSchema = v.object({
  id: v.optional(v.string()),
  text: v.pipe(v.string(), v.minLength(1, 'Opsi tidak boleh kosong')),
  is_correct: v.boolean(),
})

export type QuizOption = v.InferInput<typeof QuizOptionSchema>

export const QuizQuestionSchema = v.object({
  id: v.optional(v.string()),
  text: v.pipe(v.string(), v.minLength(1, 'Pertanyaan wajib diisi')),
  order: v.number(),
  question_type: v.picklist([
    'MCQ',
    'TRUE_FALSE',
    'MULTIPLE_SELECT',
    'SHORT_ANSWER',
    'ESSAY',
  ] as const),
  points: v.pipe(v.number(), v.minValue(1, 'Poin minimal 1')),
  explanation: v.nullable(v.string()),
  tenant_id: v.optional(v.string()),
  options: v.array(QuizOptionSchema),
})

export type QuizQuestion = v.InferInput<typeof QuizQuestionSchema>

export const QuizFormSchema = v.object({
  id: v.optional(v.string()),
  title: v.pipe(v.string(), v.minLength(1, 'Judul kuis wajib diisi')),
  instructions: v.string(),
  mode: v.picklist(['practice', 'graded', 'exam'] as const),
  time_limit_minutes: v.nullable(v.pipe(v.number(), v.minValue(0, 'Waktu tidak boleh negatif'))),
  max_attempts: v.pipe(v.number(), v.minValue(1, 'Minimal 1 percobaan')),
  passing_score: v.pipe(
    v.number(),
    v.minValue(0, 'Nilai lulus minimal 0'),
    v.maxValue(100, 'Nilai lulus maksimal 100')
  ),
  shuffle_questions: v.boolean(),
  shuffle_options: v.boolean(),
  show_correct_answers: v.boolean(),
  available_from: v.string(),
  due_at: v.string(),
  status: v.picklist(['draft', 'published', 'archived'] as const),
  questions: v.array(QuizQuestionSchema),
})

export type QuizFormData = v.InferInput<typeof QuizFormSchema>
