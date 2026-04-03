import { captureError } from '@/utils/sentry'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SupabaseError {
  message: string
  code?: string
  details?: string
  hint?: string
}

/**
 * Minimal interface untuk Supabase query builder yang mendukung `.eq()` dan `.range()`.
 * Digunakan agar utilities tidak bergantung pada tipe internal Supabase secara eksplisit.
 */
interface FilterableQuery<T> {
  eq(column: string, value: unknown): T
  range(from: number, to: number): T
}

// ── withTenantId ─────────────────────────────────────────────────────────────

/**
 * Menambahkan filter `.eq('tenant_id', tenantId)` ke query Supabase secara otomatis.
 *
 * Gunakan ini pada semua query yang membutuhkan tenant isolation untuk
 * memastikan tidak ada kebocoran data lintas tenant.
 *
 * @example
 * const { data } = await withTenantId(
 *   supabase.from('courses').select('*'),
 *   tenantId
 * )
 */
export function withTenantId<T extends FilterableQuery<T>>(query: T, tenantId: string): T {
  return query.eq('tenant_id', tenantId)
}

// ── paginate ──────────────────────────────────────────────────────────────────

/**
 * Menambahkan `.range()` untuk pagination berbasis page/limit ke query Supabase.
 *
 * @param query  - Query builder Supabase
 * @param page   - Nomor halaman (0-indexed)
 * @param limit  - Jumlah item per halaman (default: 20)
 *
 * @example
 * const { data } = await paginate(
 *   supabase.from('students').select('*'),
 *   page,
 *   20
 * )
 */
export function paginate<T extends FilterableQuery<T>>(query: T, page: number, limit = 20): T {
  const from = page * limit
  const to = from + limit - 1
  return query.range(from, to)
}

// ── withTimeout ───────────────────────────────────────────────────────────────

/**
 * Wrapper untuk Supabase query dengan timeout menggunakan AbortSignal.
 *
 * Jika query melebihi `ms` milliseconds, request dibatalkan dan
 * melempar Error dengan pesan timeout.
 *
 * @param queryFn  - Fungsi async yang mengembalikan promise
 * @param ms       - Timeout dalam milliseconds (default: 10_000 = 10 detik)
 *
 * @example
 * const { data, error } = await withTimeout(
 *   () => supabase.from('courses').select('*').eq('tenant_id', tenantId),
 *   5000
 * )
 */
export async function withTimeout<T>(
  queryFn: (signal: AbortSignal) => Promise<T>,
  ms = 10_000
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)

  try {
    return await queryFn(controller.signal)
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error(`Query timeout setelah ${ms}ms`)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

// ── handleSupabaseError ───────────────────────────────────────────────────────

/**
 * Penanganan error Supabase yang konsisten — log ke Sentry (production)
 * atau console (development), lalu melempar Error baru yang user-friendly.
 *
 * Gunakan ini di semua service layer untuk error handling yang seragam.
 *
 * @param error    - Error object dari Supabase (`.error` property dari response)
 * @param context  - Konteks tambahan untuk logging (nama fungsi / modul)
 *
 * @throws Error dengan pesan yang sesuai
 *
 * @example
 * const { data, error } = await supabase.from('courses').select('*')
 * if (error) handleSupabaseError(error, 'fetchCourses')
 */
export function handleSupabaseError(error: SupabaseError | null, context?: string): never {
  if (!error) {
    throw new Error('Terjadi kesalahan tidak diketahui')
  }

  const message = error.message || 'Terjadi kesalahan pada database'
  const errorCode = error.code

  // Log ke console di development
  if (import.meta.env.DEV) {
    console.error(`[Supabase Error]${context ? ` (${context})` : ''}:`, {
      message,
      code: errorCode,
      details: error.details,
      hint: error.hint,
    })
  }

  // Kirim ke Sentry di production (non-RLS errors saja)
  // Kode PGRST3xx = RLS policy violation — jangan lapor sebagai error kritis
  const isRlsViolation = typeof errorCode === 'string' && errorCode.startsWith('PGRST3')
  if (!isRlsViolation) {
    captureError(new Error(message), {
      context: context ?? 'supabaseUtils',
      errorCode: errorCode ?? 'unknown',
    })
  }

  // Terjemahkan kode error umum ke pesan Indonesia yang user-friendly
  const userMessage = getLocalizedErrorMessage(errorCode, message)
  throw new Error(userMessage)
}

/** Terjemahkan kode error Supabase/PostgreSQL ke pesan Bahasa Indonesia */
function getLocalizedErrorMessage(code: string | undefined, fallback: string): string {
  switch (code) {
    case 'PGRST116':
      return 'Data tidak ditemukan'
    case 'PGRST301':
    case '42501':
      return 'Anda tidak memiliki izin untuk operasi ini'
    case '23505':
      return 'Data sudah ada (duplikat)'
    case '23503':
      return 'Data terkait tidak ditemukan'
    case '23514':
      return 'Data tidak valid (constraint violation)'
    case '42P01':
      return 'Tabel tidak ditemukan'
    case 'PGRST204':
      return 'Kolom tidak ditemukan'
    default:
      return fallback || 'Terjadi kesalahan pada database'
  }
}

// ── selectColumns ─────────────────────────────────────────────────────────────

/**
 * Helper untuk membangun string kolom SELECT yang aman dari array.
 * Menghindari SELECT * yang tidak efisien.
 *
 * @example
 * const cols = selectColumns(['id', 'name', 'email'])
 * // → 'id, name, email'
 * supabase.from('users').select(cols)
 */
export function selectColumns(columns: string[]): string {
  if (columns.length === 0) return '*'
  return columns.join(', ')
}
