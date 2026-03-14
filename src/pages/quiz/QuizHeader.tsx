import { AutosaveIndicator, SaveStatus } from './AutosaveIndicator';
import { QuizTimer } from './QuizTimer';

interface QuizHeaderProps {
  title: string;
  currentQuestionIdx: number;
  totalQuestions: number;
  saveStatus: SaveStatus;
  isOnline: boolean;
  timeLeft: number | null;
}

export function QuizHeader({
  title,
  currentQuestionIdx,
  totalQuestions,
  saveStatus,
  isOnline,
  timeLeft
}: QuizHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-slate-900">{title}</h1>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-sm font-medium text-slate-500">
            Soal {currentQuestionIdx + 1} dari {totalQuestions}
          </p>
          <AutosaveIndicator status={!isOnline ? 'offline' : saveStatus} />
        </div>
      </div>
      <QuizTimer timeLeft={timeLeft} />
    </div>
  );
}
