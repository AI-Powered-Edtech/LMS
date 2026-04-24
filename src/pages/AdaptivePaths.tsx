import { BookOpen, GitBranch } from 'lucide-react'
import { useState } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { PathRuleList } from '@/features/adaptive-paths/components/PathRuleList'
import { useCourses } from '@/features/courses/queries/courseQueries'
import { usePageTitle } from '@/hooks/usePageTitle'

// ─────────────────────────────────────────────────────────────────────────────
// Course picker skeleton
// ─────────────────────────────────────────────────────────────────────────────
function CourseSkeleton() {
  return <div className="h-10 w-full rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state when no course is selected
// ─────────────────────────────────────────────────────────────────────────────
function NoCourseSelected() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center mb-4">
        <BookOpen className="w-7 h-7 text-indigo-400 dark:text-indigo-500" />
      </div>
      <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
        Pilih kursus terlebih dahulu
      </p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
        Pilih kursus dari menu di atas untuk melihat dan mengelola aturan jalur adaptif.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export function AdaptivePaths() {
  usePageTitle('Jalur Adaptif')
  const { tenantId } = useAuth()
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')

  const { data: coursesData, isLoading: isLoadingCourses } = useCourses()

  const courses = coursesData?.courses ?? []

  const inputClass =
    'w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all'

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center shrink-0">
          <GitBranch className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Jalur Adaptif
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
              Beta
            </span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Konfigurasikan aturan pembelajaran adaptif berdasarkan performa siswa
          </p>
        </div>
      </div>

      {/* Course selector */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
        <label
          htmlFor="course-select"
          className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
        >
          Pilih Kursus
        </label>
        {isLoadingCourses ? (
          <CourseSkeleton />
        ) : (
          <select
            id="course-select"
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className={inputClass}
          >
            <option value="">-- Pilih kursus --</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        )}
        {!isLoadingCourses && courses.length === 0 && (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Tidak ada kursus tersedia. Buat kursus terlebih dahulu.
          </p>
        )}
      </div>

      {/* Path rules section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
        {selectedCourseId && tenantId ? (
          <PathRuleList courseId={selectedCourseId} tenantId={tenantId} lessons={[]} />
        ) : (
          <NoCourseSelected />
        )}
      </div>
    </div>
  )
}
