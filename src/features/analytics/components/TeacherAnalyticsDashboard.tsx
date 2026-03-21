import { useState } from 'react'
import { X, Clock, Loader2, Award, Radio, FileText, LayoutDashboard, Activity } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/src/utils/cn'
import { relativeTime } from '../utils/formatters'
import {
  useCourseDashboard,
  useLessonDashboard,
  useStudentSignals,
} from '../queries/analyticsQueries'
import { StruggleAlertBanner } from './StruggleAlertBanner'
import { CourseOverviewCard } from './CourseOverviewCard'
import { LessonBreakdownTable } from './LessonBreakdownTable'
import { StudentProgressTable } from './StudentProgressTable'
import { FunnelComparison } from './FunnelComparison'
import { CohortBuilder } from './CohortBuilder'
import { EngagementDashboard } from './EngagementDashboard'
import { EarlyWarningPanel } from './EarlyWarningPanel'
import { PathAnalysisDashboard } from './PathAnalysisDashboard'
import { GuideAnalytics } from './GuideAnalytics'
import { LiveActivityFeed } from './LiveActivityFeed'
import { LiveLessonMap } from './LiveLessonMap'
import { ActiveNowIndicator } from './ActiveNowIndicator'
import { BadgeManager } from '@/src/features/gamification/components/BadgeManager'
import { ReportList } from '@/src/features/reports/components/ReportList'
import { ReportScheduler } from '@/src/features/reports/components/ReportScheduler'

interface TeacherAnalyticsDashboardProps {
  courseId: string
}

type Tab = 'overview' | 'live' | 'reports'

export function TeacherAnalyticsDashboard({ courseId }: TeacherAnalyticsDashboardProps) {
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [activeUserCount, setActiveUserCount] = useState(0)
  const [activeLessonIds, setActiveLessonIds] = useState<Set<string>>(new Set())

  const { data: courseData, isLoading: courseLoading } = useCourseDashboard(courseId)

  const { data: lessonData, isLoading: lessonLoading } = useLessonDashboard(courseId)

  const { data: studentData, isLoading: studentLoading } = useStudentSignals(
    courseId,
    selectedLessonId ?? undefined
  )

  const selectedLessonTitle = lessonData?.find(
    (l) => l.lesson_id === selectedLessonId
  )?.lesson_title

  const handleLessonSelect = (lessonId: string) => {
    setSelectedLessonId((prev) => (prev === lessonId ? null : lessonId))
  }

  const isAnyLoading = courseLoading || lessonLoading

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Activity className="h-4 w-4" /> },
    { id: 'live', label: 'Live', icon: <Radio className="h-4 w-4" /> },
    { id: 'reports', label: 'Laporan', icon: <FileText className="h-4 w-4" /> },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Analitik Kursus
          </h1>
          {courseData && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {courseData.course_title}
            </p>
          )}
          {!courseData && courseLoading && (
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Memuat data...
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <ActiveNowIndicator count={activeUserCount} />
          <Link
            to="/teaching/dashboards"
            className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard Kustom
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 flex-1 justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-all',
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.id === 'live' && activeUserCount > 0 && (
              <span className="ml-1 rounded-full bg-emerald-500 w-2 h-2 shrink-0" />
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Struggle Banner */}
          {lessonData && lessonData.length > 0 && (
            <StruggleAlertBanner lessonAnalytics={lessonData} />
          )}

          {/* Early Warning Panel (SP-19) */}
          <EarlyWarningPanel courseId={courseId} />

          {/* Overview Stats */}
          <CourseOverviewCard data={courseData ?? null} isLoading={courseLoading} />

          {/* Lesson Breakdown */}
          <LessonBreakdownTable
            data={lessonData ?? []}
            isLoading={lessonLoading}
            selectedLessonId={selectedLessonId}
            onLessonSelect={handleLessonSelect}
          />

          {/* Funnel Analysis */}
          <FunnelComparison courseId={courseId} />

          {/* Retention & Cohort Analysis */}
          <CohortBuilder courseId={courseId} />

          {/* Engagement Scoring */}
          <EngagementDashboard courseId={courseId} />

          {/* Learning Path Analysis (SP-17) */}
          <PathAnalysisDashboard courseId={courseId} />

          {/* In-App Guidance Management (SP-18) */}
          <GuideAnalytics courseId={courseId} />

          {/* Achievement Management (SP-20) */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Pencapaian</h2>
            </div>
            <BadgeManager />
          </div>

          {/* Student Signals (shown when lesson selected) */}
          <AnimatePresence>
            {selectedLessonId && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-slate-800 dark:text-white">
                      Siswa &mdash;{' '}
                      <span className="text-indigo-600 dark:text-indigo-400">
                        {selectedLessonTitle ?? 'Pelajaran'}
                      </span>
                    </h3>
                    <button
                      onClick={() => setSelectedLessonId(null)}
                      className={cn(
                        'flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium',
                        'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
                        'dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200',
                        'transition-colors'
                      )}
                    >
                      <X className="h-3.5 w-3.5" />
                      Tutup
                    </button>
                  </div>

                  <StudentProgressTable
                    data={studentData ?? []}
                    isLoading={studentLoading}
                    lessonTitle={selectedLessonTitle}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Last Aggregated Footer */}
          {courseData?.last_aggregated_at && !isAnyLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              <span>Diperbarui: {relativeTime(courseData.last_aggregated_at)}</span>
            </div>
          )}
        </div>
      )}

      {/* Live Tab */}
      {activeTab === 'live' && (
        <div className="space-y-6">
          <LiveActivityFeed
            onActiveUsersChange={setActiveUserCount}
            onActiveLessonsChange={setActiveLessonIds}
          />
          <LiveLessonMap courseId={courseId} activeLessonIds={activeLessonIds} />
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <ReportScheduler />
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-500" />
              Laporan Tersimpan
            </h3>
            <ReportList />
          </div>
        </div>
      )}
    </div>
  )
}
