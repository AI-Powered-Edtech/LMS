import * as v from 'valibot'

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

export const CourseFormSchema = v.object({
  name: v.pipe(v.string(), v.nonEmpty('Nama kursus wajib diisi')),
  description: v.optional(v.string(), ''),
})

export type CourseFormData = v.InferOutput<typeof CourseFormSchema>

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
  subject: v.pipe(v.string(), v.nonEmpty('Mata pelajaran wajib diisi')),
})

export type ClassroomFormData = v.InferOutput<typeof ClassroomFormSchema>

// ── Assignment ────────────────────────────────────────────────────────────────

export const AssignmentFormSchema = v.object({
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
})

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
