// Quiz Answer Review Component
// Shows graded answers with explanations after quiz submission
// Only displays when show_correct_answers is enabled

import { ArrowLeft, CheckCircle, HelpCircle, XCircle } from 'lucide-react'

import { cn } from '@/src/utils/cn'

import type { QuestionType, QuizAttemptQuestion } from '../../types/quizzes.types'

interface QuizAnswerReviewProps {
  questions: QuizAttemptQuestion[]
  showCorrectAnswers: boolean
  onBack: () => void
}

export function QuizAnswerReview({ questions, showCorrectAnswers, onBack }: QuizAnswerReviewProps) {
  // Get the question type label
  const getQuestionTypeLabel = (type: QuestionType): string => {
    switch (type) {
      case 'MCQ':
        return 'Pilihan Ganda'
      case 'TRUE_FALSE':
        return 'Benar / Salah'
      case 'MULTIPLE_SELECT':
        return 'Pilihan Banyak'
      case 'SHORT_ANSWER':
        return 'Jawaban Singkat'
      case 'ESSAY':
        return 'Esai'
      default:
        return 'Soal'
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 flex-1 w-full pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Review Jawaban</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Berikut adalah jawaban Anda beserta penjelasan
          </p>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-6">
        {questions.map((question, index) => {
          const qType = question.question_type || 'MCQ'
          const isCorrect = question.is_correct ?? false

          // Get correct option IDs from question_snapshot
          const correctOptionIds =
            question.question_snapshot?.options
              ?.filter((opt) => opt.is_correct)
              ?.map((opt) => opt.id) || []

          // Get student's selected option IDs
          const studentOptionIds = question.selected_option_ids || []

          // Get student's text answer
          const studentTextAnswer = question.text_answer || ''

          return (
            <div
              key={question.question_id}
              className={cn(
                'bg-white dark:bg-slate-800 rounded-3xl border-2 shadow-sm overflow-hidden',
                isCorrect ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'
              )}
            >
              {/* Question Header */}
              <div className={cn('p-4 md:p-6 border-b', isCorrect ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20')}>
                <div className="flex items-start gap-4">
                  {/* Status Icon */}
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                      isCorrect ? 'bg-green-100' : 'bg-red-100'
                    )}
                  >
                    {isCorrect ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                        Pertanyaan {index + 1}
                      </span>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-lg text-xs font-bold',
                          isCorrect ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        )}
                      >
                        {isCorrect ? 'Benar' : 'Salah'}
                      </span>
                      {question.points_earned !== null && (
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          {question.points_earned}/{question.max_points} poin
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-medium text-slate-900 dark:text-white">{question.text}</h3>

                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className={cn(
                          'inline-block px-2 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider',
                          qType === 'ESSAY'
                            ? 'bg-purple-100 text-purple-700'
                            : qType === 'SHORT_ANSWER'
                              ? 'bg-amber-100 text-amber-700'
                              : qType === 'MULTIPLE_SELECT'
                                ? 'bg-cyan-100 text-cyan-700'
                                : qType === 'TRUE_FALSE'
                                  ? 'bg-teal-100 text-teal-700'
                                  : 'bg-blue-100 text-blue-700'
                        )}
                      >
                        {getQuestionTypeLabel(qType)}
                      </span>
                      {question.max_points > 0 && (
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                          {question.max_points} poin
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Answer Section */}
              <div className="p-4 md:p-6">
                {/* For MCQ, TRUE_FALSE, MULTIPLE_SELECT */}
                {['MCQ', 'TRUE_FALSE', 'MULTIPLE_SELECT'].includes(qType) && (
                  <div className="space-y-3">
                    {/* Student's Answer */}
                    <div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Jawaban Anda:</p>
                      <div className="space-y-2">
                        {question.quiz_options?.map((option) => {
                          const isSelected = studentOptionIds.includes(option.id)
                          const isOptionCorrectAnswer = correctOptionIds.includes(option.id)

                          if (!isSelected && !isOptionCorrectAnswer) return null

                          return (
                            <div
                              key={option.id}
                              className={cn(
                                'p-3 rounded-xl border-2 flex items-center gap-3',
                                isSelected && isOptionCorrectAnswer
                                  ? 'border-green-500 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                                  : isSelected && !isOptionCorrectAnswer
                                    ? 'border-red-500 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
                                    : 'border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                              )}
                            >
                              {isSelected && isOptionCorrectAnswer && (
                                <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                              )}
                              {isSelected && !isOptionCorrectAnswer && (
                                <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                              )}
                              {!isSelected && isOptionCorrectAnswer && (
                                <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                              )}
                              <span
                                className={cn(
                                  'font-medium',
                                  isSelected ? 'text-slate-900 dark:text-white' : 'text-green-700 dark:text-green-300'
                                )}
                              >
                                {option.text}
                              </span>
                              {isSelected && !isOptionCorrectAnswer && (
                                <span className="text-xs text-red-600 dark:text-red-400 ml-auto">Jawaban Anda</span>
                              )}
                              {!isSelected && isOptionCorrectAnswer && (
                                <span className="text-xs text-green-600 dark:text-green-400 ml-auto">
                                  Jawaban Benar
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Show correct answer if student got it wrong */}
                    {!isCorrect &&
                      showCorrectAnswers &&
                      correctOptionIds.length > 0 &&
                      !studentOptionIds.includes(correctOptionIds[0]) && (
                        <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                          <p className="text-sm font-bold text-green-800 dark:text-green-300 mb-1">
                            Jawaban yang benar:
                          </p>
                          {question.question_snapshot?.options
                            ?.filter((opt) => opt.is_correct)
                            ?.map((opt) => (
                              <p key={opt.id} className="text-sm text-green-700 dark:text-green-300">
                                {opt.text}
                              </p>
                            ))}
                        </div>
                      )}
                  </div>
                )}

                {/* For SHORT_ANSWER and ESSAY */}
                {['SHORT_ANSWER', 'ESSAY'].includes(qType) && (
                  <div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Jawaban Anda:</p>
                    <div
                      className={cn(
                        'p-4 rounded-xl border-2',
                        isCorrect ? 'border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20' : 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20'
                      )}
                    >
                      <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                        {studentTextAnswer || '(Tidak ada jawaban)'}
                      </p>
                    </div>
                    {question.grader_comment && (
                      <div className="mt-3 p-3 bg-purple-50 rounded-xl border border-purple-200">
                        <p className="text-sm font-bold text-purple-800 mb-1">Komentar Penilai:</p>
                        <p className="text-sm text-purple-700">{question.grader_comment}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Explanation - Only show if show_correct_answers is true */}
                {showCorrectAnswers && question.explanation && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-bold text-blue-800 dark:text-blue-200 flex items-center gap-2">
                      <HelpCircle className="w-4 h-4" />
                      Penjelasan:
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                      {question.explanation}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Back Button */}
      <div className="flex justify-center pt-4">
        <button
          onClick={onBack}
          className="px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Kembali ke Hasil
        </button>
      </div>
    </div>
  )
}
