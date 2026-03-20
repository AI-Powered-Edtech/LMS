import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/src/utils/cn';
import { useRecommendations, useRecordRecommendationAction } from '../queries/recommendationQueries';
import { useAuth } from '@/src/contexts/AuthContext';

interface SmartNextButtonProps {
  courseId: string;
  currentLessonId: string;
  sequentialNextLessonId?: string;
  className?: string;
}

export function SmartNextButton({ courseId, currentLessonId, sequentialNextLessonId, className }: SmartNextButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentModuleId = searchParams.get('moduleId');
  const { data: recommendations } = useRecommendations(user?.id ?? '', 10);
  const { mutate: recordAction } = useRecordRecommendationAction();

  const nextLessonRec = recommendations?.find(
    r => r.recommendation_type === 'next_lesson' && r.course_id === courseId
  );

  const targetId = nextLessonRec?.target_id ?? sequentialNextLessonId;
  const hasSmartRec = !!nextLessonRec;

  const handleClick = () => {
    if (nextLessonRec) {
      recordAction({ id: nextLessonRec.id, action: 'accepted' });
    }
    if (targetId && currentModuleId) {
      navigate(`/courses/${courseId}?moduleId=${currentModuleId}&lessonId=${targetId}`);
    } else {
      navigate(`/courses/${courseId}`);
    }
  };

  if (!targetId && !sequentialNextLessonId) return null;

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
  );
}
