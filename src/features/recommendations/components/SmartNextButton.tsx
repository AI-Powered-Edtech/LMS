import { ArrowRight, Loader2, Sparkles } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { useAuth } from '@/src/contexts/AuthContext'
import { cn } from '@/src/utils/cn'

import { useRecommendations, useRecordRecommendationAction } from '../queries/recommendationQueries'

interface SmartNextButtonProps {
  courseId: string
  currentLessonId: string
  sequentialNextLessonId?: string
  className?: string
}

export function SmartNextButton({
  courseId,
  currentLessonId: _currentLessonId,
  sequentialNextLessonId,
  className,
}: SmartNextButtonProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const currentModuleId = searchParams.get('moduleId')
  const { data: recommendations, isLoading: isLoadingRecs } = useRecommendations(user?.id ?? '', 10)
  const { mutate: recordAction } = useRecordRecommendationAction()

  const nextLessonRec = recommendations?.find(
    (r) => r.recommendation_type === 'next_lesson' && r.course_id === courseId
  )

  const targetId = nextLessonRec?.target_id ?? sequentialNextLessonId
  const hasSmartRec = !!nextLessonRec

  const handleClick = () => {
    if (nextLessonRec) {
      recordAction({ id: nextLessonRec.id, action: 'accepted' })
    }
    if (targetId && currentModuleId) {
      navigate(`/app/student/courses/${courseId}?moduleId=${currentModuleId}&lessonId=${targetId}`)
    } else {
      navigate(`/app/student/courses/${courseId}`)
    }
  }

  if (isLoadingRecs) {
    return (
      <button
        disabled
        className={cn(
          'flex items-center gap-2 rounded-xl px-5 py-2.5 font-semibold text-sm opacity-70 cursor-wait',
          'bg-indigo-600 text-white',
          className
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Memuat...</span>
      </button>
    )
  }

  if (!targetId && !sequentialNextLessonId) return null

  return (
    <button
      onClick={handleClick}
      title={nextLessonRec?.reason}
      className={cn(
        'flex items-center gap-2 rounded-xl px-5 py-2.5 font-semibold text-sm transition-all',
        hasSmartRec
          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-md'
          : 'bg-indigo-600 text-white hover:bg-indigo-700',
        className
      )}
    >
      {hasSmartRec && <Sparkles className="h-4 w-4" />}
      <span>Pelajaran Berikutnya</span>
      <ArrowRight className="h-4 w-4" />
    </button>
  )
}
