import { BookOpen, Clock, Layers, Loader2, Plus, RefreshCw, Search, Users } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { AssignCourseModal } from '@/components/Classroom/AssignCourseModal'
import { useAuth } from '@/contexts/AuthContext'
import { Course, courseService } from '@/features/courses'
import { useInfiniteCoursesQuery } from '@/features/courses/queries/courseQueries'
import { useDebounce } from '@/hooks/useDebounce'
import { useRoleBasedPath } from '@/hooks/useRoleBasedPath'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/utils/cn'

// Gradient palette rotated per card index
const CARD_GRADIENTS = [
  'from-indigo-500 via-indigo-600 to-purple-600',
  'from-blue-500 via-cyan-500 to-teal-500',
  'from-rose-500 via-pink-500 to-fuchsia-600',
  'from-amber-500 via-orange-500 to-red-500',
  'from-emerald-500 via-teal-500 to-cyan-600',
  'from-violet-500 via-purple-600 to-indigo-600',
]

// M-10: Deterministic gradient based on course.id to prevent flicker on search filter
// L-11: Guard against null/undefined courseId to prevent crash on split('')
function getCourseGradient(courseId: string | null | undefined, gradients: string[]): string {
  if (!courseId) return gradients[0]
  const hash = courseId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return gradients[hash % gradients.length]
}

export function Courses() {
  const navigate = useNavigate()
  const getPath = useRoleBasedPath()
  const { user, activeTenant } = useAuth()
  const addToast = useToast((s) => s.addToast)

  useEffect(() => {
    document.title = 'Kursus — EduSync'
    return () => {
      document.title = 'EduSync'
    }
  }, [])

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  // Create Course Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // FIX 6: courseId defaults to null instead of empty string
  // Assign Class Modal State
  const [assignModal, setAssignModal] = useState<{
    isOpen: boolean
    courseId: string | null
    courseTitle: string
  }>({
    isOpen: false,
    courseId: null,
    courseTitle: '',
  })

  // M-17: Ref for focus trap inside the create course modal
  const createModalRef = useRef<HTMLDivElement>(null)

  // M-2: Escape key handler via useEffect so document receives the event
  // FIX 1: Guard Escape key with !isCreating to prevent closing modal during submission
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen && !isCreating) setIsModalOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isModalOpen, isCreating])

  // M-17: Focus trap for create course modal
  useEffect(() => {
    if (!isModalOpen || !createModalRef.current) return
    const modal = createModalRef.current
    const focusableSelectors =
      'input, textarea, button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const focusable = modal.querySelectorAll<HTMLElement>(focusableSelectors)
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    first?.focus()
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isModalOpen])

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } =
    useInfiniteCoursesQuery(activeTenant?.id ?? '', debouncedSearch)

  const courses = data?.pages.flatMap((p) => p.courses) ?? []

  // Sentinel for IntersectionObserver — triggers loading the next page
  const sentinelRef = useRef<HTMLDivElement>(null)

  // M-18: Stable ref for the load-more callback — prevents observer recreation on dep changes
  const loadMoreRef = useRef<() => void>(() => {})
  loadMoreRef.current = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage()
  }

  // FIX 4: Re-attach observer when isLoading changes so sentinel is found after
  // the empty/loading state unmounts and the grid (with sentinel) remounts.
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMoreRef.current()
      },
      { rootMargin: '200px', threshold: 0.1 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [isLoading]) // re-attach sentinel after loading state changes

  // Server-side search covers title. Client-side filter covers description
  // (the service only does ilike on title, so we locally filter description as well)
  const filteredCourses = debouncedSearch
    ? courses.filter(
        (c) =>
          c.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          (c.description ?? '').toLowerCase().includes(debouncedSearch.toLowerCase())
      )
    : courses

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    // FIX 2: Guard against double-submission
    if (isCreating) return
    if (!activeTenant?.id || !user?.id || !newTitle.trim()) return

    try {
      setIsCreating(true)
      const newCourse = await courseService.createCourse({
        title: newTitle.trim(),
        description: newDescription.trim() || null,
        tenant_id: activeTenant.id,
        created_by: user.id,
      })

      setIsModalOpen(false)
      // FIX 3: Reset form state after successful creation
      setNewTitle('')
      setNewDescription('')
      navigate(
        `${getPath('/app/teacher/course-builder', '/app/admin/course-builder')}?courseId=${newCourse.id}`
      )
    } catch (err: unknown) {
      if (import.meta.env.DEV) console.error('Failed to create course:', err)
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal membuat materi baru.',
      })
    } finally {
      setIsCreating(false)
    }
  }

  const openModal = () => {
    setNewTitle('')
    setNewDescription('')
    setIsModalOpen(true)
  }

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto min-h-screen">
      {/* Header */}
      <div className="bg-white/50 dark:bg-gray-800/40 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-gray-200 dark:border-gray-700/50 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 mb-2">
            Kelola Materi
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-base max-w-2xl">
            Susun kurikulum, modul pembelajaran, dan kuis interaktif untuk siswa Anda.
          </p>
        </div>
        <button
          type="button"
          onClick={openModal}
          className="group relative flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/30 active:scale-95 overflow-hidden shrink-0"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <Plus className="w-5 h-5" />
          <span>Buat Materi Baru</span>
        </button>
      </div>

      {/* Search bar */}
      {!isLoading && !isError && courses.length > 0 && (
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
          {/* L-4: type="search" for proper semantics and browser UX (clear button, etc.) */}
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari materi..."
            aria-label="Cari materi"
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium shadow-sm"
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white/30 dark:bg-gray-800/20 backdrop-blur-sm rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Memuat daftar materi...</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-8 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-3xl max-w-md w-full shadow-xl">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <RefreshCw className="w-8 h-8" />
            </div>
            <p className="text-xl font-bold mb-3">Oops! Ada kendala</p>
            <p className="text-sm opacity-80 mb-6">Gagal memuat daftar materi.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="flex items-center justify-center w-full space-x-2 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg hover:shadow-red-500/20"
            >
              <span>Coba Muat Ulang</span>
            </button>
          </div>
        </div>
      ) : filteredCourses.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-32 bg-white/50 dark:bg-gray-800/30 backdrop-blur-md rounded-3xl border border-gray-200 dark:border-gray-700 shadow-xl"
        >
          {/* Illustration-like stacked icon */}
          <div className="relative mb-8">
            <div className="w-28 h-28 bg-gradient-to-tr from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 rounded-3xl flex items-center justify-center rotate-6 shadow-lg">
              <BookOpen className="w-14 h-14 text-indigo-400 dark:text-indigo-500" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-tr from-yellow-400 to-orange-400 rounded-xl flex items-center justify-center shadow-md -rotate-6">
              <Plus className="w-5 h-5 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
            {search ? 'Materi Tidak Ditemukan' : 'Mulai Petualangan Anda'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm mb-8 text-base">
            {search
              ? `Tidak ada materi yang cocok dengan "${search}". Coba kata kunci lain.`
              : 'Anda belum memiliki materi. Mari buat materi pertama yang menginspirasi siswa Anda!'}
          </p>
          {!search && (
            <button
              type="button"
              onClick={openModal}
              className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 transition-all hover:-translate-y-1 active:scale-95"
            >
              Buat Materi Pertama
            </button>
          )}
        </motion.div>
      ) : (
        <div
          data-testid="course-grid"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence>
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                // M-10: deterministic gradient by course.id — no flicker on search filter
                gradientClass={getCourseGradient(course.id, CARD_GRADIENTS)}
                onNavigate={() =>
                  navigate(
                    `${getPath('/app/teacher/course-builder', '/app/admin/course-builder')}?courseId=${course.id}`
                  )
                }
                onAssign={() =>
                  setAssignModal({ isOpen: true, courseId: course.id, courseTitle: course.title })
                }
              />
            ))}
          </AnimatePresence>

          {/* Sentinel — triggers loading next page when scrolled into view */}
          <div ref={sentinelRef} className="col-span-full h-1" />

          {/* Loading more indicator */}
          {isFetchingNextPage && (
            <div className="col-span-full flex justify-center items-center py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              <span className="ml-2 text-sm text-slate-500">Memuat lebih banyak...</span>
            </div>
          )}

          {/* End of list */}
          {!hasNextPage && filteredCourses.length > 0 && (
            <p className="col-span-full text-center text-sm text-slate-400 py-4">
              Semua {filteredCourses.length} kursus ditampilkan
            </p>
          )}
        </div>
      )}

      {/* Create Course Modal */}
      <AnimatePresence>
        {isModalOpen && (
          // M-3: Click outside the modal panel closes it
          // FIX 1: Guard backdrop click with !isCreating to prevent closing during submission
          <div
            role="presentation"
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-md"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isCreating) setIsModalOpen(false)
            }}
          >
            <motion.div
              ref={createModalRef}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              role="dialog"
              aria-modal="true"
              aria-label="Buat Materi Baru"
              className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-[min(28rem,calc(100vw-2rem))] p-6 md:p-8 shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-purple-600" />

              <h2 className="text-2xl font-black mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                Buat Materi Baru
              </h2>

              <form onSubmit={handleCreateCourse}>
                <div className="mb-5">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 ml-1">
                    Judul Materi <span className="text-red-500">*</span>
                  </label>
                  {/* M-4: maxLength prevents over-long titles from hitting DB constraint */}
                  <input
                    type="text"
                    required
                    maxLength={255}
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-base"
                    placeholder="Contoh: Dasar-dasar Design Thinking"
                    autoFocus
                  />
                </div>
                <div className="mb-8">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 ml-1">
                    Deskripsi Singkat
                  </label>
                  <textarea
                    rows={3}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium resize-none"
                    placeholder="Opsional: Jelaskan apa yang akan dipelajari siswa..."
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-3 text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                    disabled={isCreating}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || !newTitle.trim()}
                    className="flex-[2] flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      'Buat & Mulai Edit'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Assign Course Modal — FIX 6: only render when courseId is not null */}
      {assignModal.courseId && (
        <AssignCourseModal
          isOpen={assignModal.isOpen}
          onClose={() => setAssignModal((prev) => ({ ...prev, isOpen: false }))}
          courseId={assignModal.courseId}
          courseTitle={assignModal.courseTitle}
        />
      )}
    </div>
  )
}

// ─── Course Card ────────────────────────────────────────────────────────────

interface CourseCardProps {
  course: Course
  gradientClass: string
  onNavigate: () => void
  onAssign: () => void
}

function CourseCard({ course, gradientClass, onNavigate, onAssign }: CourseCardProps) {
  const moduleCount = course.modules?.length ?? course.module_count ?? null

  return (
    <div
      role="button"
      tabIndex={0}
      // L-1: ARIA label for screen readers
      aria-label={`Buka kursus ${course.title}`}
      className={cn(
        'group cursor-pointer bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700/60',
        'overflow-hidden shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 dark:hover:shadow-indigo-900/20',
        'transition-all duration-300 hover:-translate-y-1'
      )}
      onClick={onNavigate}
      // FIX 5: Enter fires on keydown (standard); Space fires on keyup (native button spec)
      onKeyDown={(e) => {
        if (e.key === 'Enter') onNavigate()
        // Space is handled in onKeyUp per native button spec
      }}
      onKeyUp={(e) => {
        if (e.key === ' ') {
          e.preventDefault()
          onNavigate()
        }
      }}
    >
      {/* Thumbnail / gradient header */}
      <div
        className={cn(
          'h-40 bg-gradient-to-br relative p-6 flex flex-col justify-end overflow-hidden',
          gradientClass
        )}
      >
        {/* decorative blobs */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-black/10 rounded-full -ml-10 -mb-10 blur-xl" />

        {/* Module count badge */}
        {moduleCount !== null && (
          <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-bold">
            <Layers className="w-3.5 h-3.5" />
            {moduleCount} Modul
          </div>
        )}

        <h3 className="text-white font-black text-xl relative z-10 leading-tight line-clamp-2 drop-shadow-sm">
          {course.title}
        </h3>
      </div>

      {/* Body */}
      <div className="p-5">
        <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 mb-4 leading-relaxed min-h-[2.5rem]">
          {course.description || (
            <span className="italic text-slate-400 dark:text-slate-500 text-xs">
              Tidak ada deskripsi
            </span>
          )}
        </p>

        {/* Assigned classes tags */}
        {course.assigned_classes && course.assigned_classes.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {course.assigned_classes.map((ac) => (
              <span
                key={ac.class_id}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800"
              >
                {ac.class?.name || 'Kelas'}
              </span>
            ))}
          </div>
        )}

        {/* Footer row */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700/60">
          <div className="flex items-center text-gray-400 dark:text-gray-500 text-xs font-medium gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {/* M-1: Guard against null updated_at to avoid "Invalid Date" */}
            <span>
              {course.updated_at
                ? new Date(course.updated_at).toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : '-'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* L-2: aria-label for assistive technology */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onAssign()
              }}
              aria-label="Tugaskan ke Kelas"
              className="p-2 bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              title="Tugaskan ke Kelas"
            >
              <Users className="w-4 h-4" />
            </button>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
              Edit Materi
              <span aria-hidden="true">→</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
