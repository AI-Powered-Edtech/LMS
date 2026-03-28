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

export const ProfileFormSchema = v.object({
  fullName: v.pipe(
    v.string(),
    v.nonEmpty('Nama lengkap wajib diisi'),
    v.maxLength(100, 'Nama lengkap maksimal 100 karakter')
  ),
})

export type ProfileFormData = v.InferOutput<typeof ProfileFormSchema>
