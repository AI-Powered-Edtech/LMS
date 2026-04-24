import { useMutation,useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, ClipboardList, Loader2, MessageSquare, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { Breadcrumb } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/useToast'
import { buildRequestHeaders, createRequestId } from '@/services/api/shadow'
import { getDbClient } from '@/services/db'

// ============================================================
// Types
// ============================================================

interface PendingCourse {
  id: string
  title: string
  description: string | null
  subject: string | null
  level: string | null
  updated_at: string
  created_by: string
  tenant_id: string
}

interface TeacherProfile {
  id: string
  full_name: string | null
  email: string | null
}

// ============================================================
// API helpers (call BE review workflow endpoints)
// ============================================================

const VIL_BASE_URL = import.meta.env.VITE_API_URL || ''

async function callReviewEndpoint(
  courseId: string,
  action: 'approve' | 'request_changes',
  comment?: string
): Promise<void> {
  const path = `/api/v1/courses/${courseId}/review`
  const url = VIL_BASE_URL
    ? `${VIL_BASE_URL}${path}`
    : new URL(path, window.location.origin).toString()

  const response = await fetch(url, {
    method: 'POST',
    headers: buildRequestHeaders(
      { 'Content-Type': 'application/json' },
      { withAuth: true, requestId: createRequestId() }
    ),
    body: JSON.stringify({ action, comment: comment ?? null }),
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string
      detail?: string
    } | null
    throw new Error(payload?.detail ?? payload?.message ?? `HTTP ${response.status}`)
  }
}

// ============================================================
// Page component
// ============================================================

export function ReviewQueue() {
  const { activeTenant } = useAuth()
  const tenantId = activeTenant?.id
  const queryClient = useQueryClient()
  const addToast = useToast((s) => s.addToast)

  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null)

  // Fetch courses currently awaiting review in this tenant
  const pendingQuery = useQuery({
    queryKey: ['admin-review-queue', tenantId],
    enabled: Boolean(tenantId),
    queryFn: async (): Promise<{ courses: PendingCourse[]; teachers: Record<string, TeacherProfile> }> => {
      if (!tenantId) return { courses: [], teachers: {} }

      const { data: coursesData, error } = await getDbClient()
        .from('courses')
        .select('id, title, description, subject, level, updated_at, created_by, tenant_id')
        .eq('tenant_id', tenantId)
        .eq('status', 'in_review')
        .order('updated_at', { ascending: false })

      if (error) throw error

      const courses = (coursesData ?? []) as unknown as PendingCourse[]
      const teacherIds = Array.from(
        new Set(courses.map((c) => c.created_by).filter((id): id is string => Boolean(id)))
      )
      let teachers: Record<string, TeacherProfile> = {}

      if (teacherIds.length > 0) {
        const { data: profilesData } = await getDbClient()
          .from('profiles')
          .select('id, full_name, email')
          .in('id', teacherIds)
        const profiles = (profilesData ?? []) as unknown as TeacherProfile[]
        teachers = Object.fromEntries(profiles.map((p) => [p.id, p]))
      }

      return { courses, teachers }
    },
    staleTime: 30_000,
  })

  const approveMutation = useMutation({
    mutationFn: async ({ courseId, comment }: { courseId: string; comment?: string }) => {
      await callReviewEndpoint(courseId, 'approve', comment)
    },
    onSuccess: (_, { courseId }) => {
      addToast({ type: 'success', message: 'Kursus disetujui' })
      setCommentDrafts((prev) => {
        const next = { ...prev }
        delete next[courseId]
        return next
      })
      void queryClient.invalidateQueries({ queryKey: ['admin-review-queue', tenantId] })
    },
    onError: (err: Error) => {
      addToast({ type: 'error', message: 'Gagal menyetujui', description: err.message })
    },
    onSettled: () => setActiveCourseId(null),
  })

  const requestChangesMutation = useMutation({
    mutationFn: async ({ courseId, comment }: { courseId: string; comment: string }) => {
      await callReviewEndpoint(courseId, 'request_changes', comment)
    },
    onSuccess: (_, { courseId }) => {
      addToast({ type: 'success', message: 'Permintaan perubahan terkirim' })
      setCommentDrafts((prev) => {
        const next = { ...prev }
        delete next[courseId]
        return next
      })
      void queryClient.invalidateQueries({ queryKey: ['admin-review-queue', tenantId] })
    },
    onError: (err: Error) => {
      addToast({ type: 'error', message: 'Gagal mengirim catatan', description: err.message })
    },
    onSettled: () => setActiveCourseId(null),
  })

  const isBusy = approveMutation.isPending || requestChangesMutation.isPending

  const courses = pendingQuery.data?.courses ?? []
  const teachers = pendingQuery.data?.teachers ?? {}

  const teacherLabel = useMemo(
    () => (teacherId: string) => {
      const t = teachers[teacherId]
      return t?.full_name || t?.email || teacherId.slice(0, 8)
    },
    [teachers]
  )

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <Breadcrumb
        items={[
          { label: 'Admin', href: '/app/admin/dashboard' },
          { label: 'Antrean Review' },
        ]}
      />

      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            Antrean Review Kursus
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kursus yang diajukan guru untuk ditinjau di tenant ini. Setujui untuk mengaktifkan tombol Terbitkan, atau minta perubahan dengan catatan.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void pendingQuery.refetch()}
          disabled={pendingQuery.isFetching}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
        >
          {pendingQuery.isFetching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Segarkan
        </button>
      </header>

      {pendingQuery.isLoading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat…
        </div>
      ) : pendingQuery.isError ? (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-rose-700 dark:text-rose-300 text-sm">Gagal memuat antrean</p>
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
              {(pendingQuery.error as Error)?.message ?? 'Terjadi kesalahan tak terduga.'}
            </p>
          </div>
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-800/80 border border-emerald-100 dark:border-emerald-800/40 rounded-2xl p-8 text-center">
          <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
          </div>
          <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Antrean kosong</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Semua kursus yang diajukan sudah ditinjau. Guru akan muncul di sini ketika mengajukan kursus baru.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {courses.map((course) => {
            const draft = commentDrafts[course.id] ?? ''
            const isActive = activeCourseId === course.id
            return (
              <li
                key={course.id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-4 md:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/app/admin/courses/${course.id}`}
                        className="text-base font-semibold text-slate-900 dark:text-slate-50 hover:underline"
                      >
                        {course.title}
                      </Link>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium">
                        Menunggu review
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Diajukan oleh <span className="font-medium">{teacherLabel(course.created_by)}</span>
                      {' · '}
                      {new Date(course.updated_at).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                    {course.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">
                        {course.description}
                      </p>
                    )}
                    <div className="mt-2 flex gap-2 text-[11px] text-slate-400">
                      {course.subject && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700">{course.subject}</span>
                      )}
                      {course.level && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700">{course.level}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                    <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                    Catatan untuk guru (opsional saat setuju, wajib saat minta perubahan)
                  </label>
                  <textarea
                    value={draft}
                    onChange={(e) =>
                      setCommentDrafts((prev) => ({ ...prev, [course.id]: e.target.value }))
                    }
                    placeholder="Contoh: Struktur modul sudah baik, tambahkan kuis akhir sebelum terbit."
                    rows={2}
                    className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    disabled={isBusy && isActive}
                  />
                  <div className="flex flex-wrap gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (!draft.trim()) {
                          addToast({
                            type: 'error',
                            message: 'Isi catatan terlebih dahulu untuk minta perubahan.',
                          })
                          return
                        }
                        setActiveCourseId(course.id)
                        requestChangesMutation.mutate({ courseId: course.id, comment: draft.trim() })
                      }}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-50"
                    >
                      {isActive && requestChangesMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <MessageSquare className="w-4 h-4" />
                      )}
                      Minta Perubahan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCourseId(course.id)
                        approveMutation.mutate({
                          courseId: course.id,
                          comment: draft.trim() || undefined,
                        })
                      }}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                    >
                      {isActive && approveMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      Setujui
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default ReviewQueue
