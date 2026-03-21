import { CheckCircle, XCircle, Clock } from 'lucide-react'
import { cn } from '@/src/utils/cn'

export function QuizAttemptCard({ attempt, onReview }: { attempt: any; onReview: () => void }) {
  const quizTitle = attempt.quizzes?.title || 'Kuis Tidak Diketahui'
  const passed = attempt.passed
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center shrink-0',
            passed === true
              ? 'bg-green-100 text-green-600'
              : passed === false
                ? 'bg-red-100 text-red-600'
                : 'bg-amber-100 text-amber-600'
          )}
        >
          {passed === true ? (
            <CheckCircle className="w-6 h-6" />
          ) : passed === false ? (
            <XCircle className="w-6 h-6" />
          ) : (
            <Clock className="w-6 h-6" />
          )}
        </div>
        <div>
          <h4 className="font-bold text-slate-900">{quizTitle}</h4>
          <p className="text-sm text-slate-500">
            {attempt.submitted_at
              ? new Date(attempt.submitted_at).toLocaleDateString('id-ID')
              : 'Menunggu penilaian'}
          </p>
        </div>
      </div>
      <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
        <div className="text-left md:text-right">
          <p
            className={cn(
              'text-2xl font-black tracking-tight',
              passed === true
                ? 'text-green-600'
                : passed === false
                  ? 'text-red-600'
                  : 'text-amber-600'
            )}
          >
            {attempt.score ?? '-'}
            {attempt.score !== null ? '%' : ''}
          </p>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {passed === true ? 'Lulus' : passed === false ? 'Belum Lulus' : 'Menunggu'}
          </p>
        </div>
        <button
          onClick={onReview}
          className="md:mt-3 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-bold rounded-xl transition-colors shrink-0 whitespace-nowrap"
        >
          Review Answers
        </button>
      </div>
    </div>
  )
}
