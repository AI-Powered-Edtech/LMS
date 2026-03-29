// SYNC-HINT: {{ = {{ and }} = }}. Sync tool converts automatically.
import {
  AlertTriangle,
  Award,
  CheckCircle,
  ChevronLeft,
  FileText,
  HelpCircle,
  Menu,
  PlayCircle,
} from 'lucide-react'
import { Info, MessageSquare, Sparkles } from 'lucide-react'

import { Breadcrumb } from '@/src/components/ui'
import { SmartNextButton } from '@/src/features/recommendations'
import { cn } from '@/src/utils/cn'

import type { Lesson } from '../../index'

type ActiveTab = 'content' | 'discussion' | 'ai_tutor'

interface LessonTopBarProps {
  lesson: Lesson
  moduleTitle: string
  moduleLessons: Lesson[]
  currentLessonIndex: number
  completedLessonCount: number
  status: string
  progressPercentage: number
  courseId?: string
  lessonId?: string | null
  prevLesson: Lesson | null
  nextLesson: Lesson | null
  isLastLesson: boolean
  activeTab: ActiveTab
  onSelectLesson: (id: string) => void
  onCompletionMet: () => void
  onMobileSidebarOpen: () => void
  onTabChange: (tab: ActiveTab) => void
}

function getLessonTypeIcon(type: string) {
  switch (type) {
    case 'video':
      return <PlayCircle className="w-4 h-4" />
    case 'article':
      return <FileText className="w-4 h-4" />
    case 'quiz':
      return <HelpCircle className="w-4 h-4 text-purple-500" />
    case 'assignment':
      return <FileText className="w-4 h-4 text-rose-500" />
    default:
      return <AlertTriangle className="w-4 h-4" />
  }
}

export function LessonTopBar({
  lesson,
  moduleTitle,
  moduleLessons,
  currentLessonIndex,
  completedLessonCount,
  status,
  progressPercentage,
  courseId,
  lessonId,
  prevLesson,
  nextLesson,
  isLastLesson,
  activeTab,
  onSelectLesson,
  onCompletionMet,
  onMobileSidebarOpen,
  onTabChange,
}: LessonTopBarProps) {
  return (
    <div className="bg-gradient-to-r from-white to-slate-50/50 border-b border-slate-100 flex flex-col shrink-0 dark:from-slate-900 dark:to-slate-800 dark:border-slate-700">
      <div className="px-8 py-6 flex flex-col gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={onMobileSidebarOpen}
              aria-label="Buka daftar pelajaran"
              className="lg:hidden shrink-0 p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Menu className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>
            <Breadcrumb
              items={[
                { label: 'Materi', href: '/lesson' },
                { label: moduleTitle || 'Modul' },
                { label: lesson.title },
              ]}
            />
          </div>
          {moduleLessons.length > 0 && currentLessonIndex >= 0 && (
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Pelajaran {currentLessonIndex + 1} / {moduleLessons.length}
              </span>
              <div
                className="flex-1 max-w-[200px] h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={completedLessonCount}
                aria-valuemin={0}
                aria-valuemax={moduleLessons.length}
              >
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${(completedLessonCount / moduleLessons.length) * 100}%` }}
                />
              </div>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {completedLessonCount}/{moduleLessons.length} selesai
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-blue-600 font-bold mb-2">
            {getLessonTypeIcon(lesson.type)}
            <span className="capitalize">{lesson.type}</span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white break-words tracking-tight leading-tight">
            {lesson.title}
          </h1>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {prevLesson && (
            <button
              onClick={() => onSelectLesson(prevLesson.id)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-semibold text-sm shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              Sebelumnya
            </button>
          )}

          {status === 'completed' ? (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-bold text-sm shadow-sm transition-all hover:bg-green-100 dark:hover:bg-green-900/50">
                <CheckCircle className="w-4 h-4" />
                Selesai
              </div>
              {nextLesson ? (
                <SmartNextButton
                  courseId={courseId ?? ''}
                  currentLessonId={lessonId ?? ''}
                  sequentialNextLessonId={nextLesson.id}
                  className="rounded-full px-6 py-2.5 text-sm font-bold shadow-sm"
                />
              ) : isLastLesson ? (
                <div className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold text-sm shadow-sm">
                  <Award className="w-4 h-4" />
                  Modul Selesai!
                </div>
              ) : null}
            </div>
          ) : (
            <button
              onClick={onCompletionMet}
              disabled={
                status === 'loading' || (lesson.type === 'video' && progressPercentage < 95)
              }
              className={cn(
                'flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-sm shadow-sm border transition-all',
                progressPercentage >= 95 || lesson.type !== 'video'
                  ? 'border-green-600 text-green-600 dark:border-green-500 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed hidden'
              )}
            >
              <CheckCircle className="w-5 h-5" />
              Tandai Selesai
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex px-8 gap-1" role="tablist" aria-label="Navigasi Pelajaran">
        <button
          role="tab"
          id="tab-content"
          aria-selected={activeTab === 'content'}
          aria-controls="panel-content"
          onClick={() => onTabChange('content')}
          className={cn(
            'px-4 py-3 text-sm font-bold flex items-center gap-2 transition-all border-b-2',
            activeTab === 'content'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          )}
        >
          <Info className="w-4 h-4" />
          Materi
        </button>
        <button
          role="tab"
          id="tab-discussion"
          aria-selected={activeTab === 'discussion'}
          aria-controls="panel-discussion"
          onClick={() => onTabChange('discussion')}
          className={cn(
            'px-4 py-3 text-sm font-bold flex items-center gap-2 transition-all border-b-2',
            activeTab === 'discussion'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          )}
        >
          <MessageSquare className="w-4 h-4" />
          Diskusi
        </button>
        <button
          role="tab"
          id="tab-ai-tutor"
          aria-selected={activeTab === 'ai_tutor'}
          aria-controls="panel-ai-tutor"
          onClick={() => onTabChange('ai_tutor')}
          className={cn(
            'px-4 py-3 text-sm font-bold flex items-center gap-2 transition-all border-b-2',
            activeTab === 'ai_tutor'
              ? 'border-violet-600 text-violet-600'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          )}
        >
          <Sparkles className="w-4 h-4" />
          Tutor AI
        </button>
      </div>
    </div>
  )
}
