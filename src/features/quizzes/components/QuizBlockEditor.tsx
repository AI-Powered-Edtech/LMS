import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Loader2,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { useAuth } from '@/src/contexts/AuthContext'
import { useBuilder } from '@/src/contexts/BuilderContext'
import {
  builderQuizService,
  type QuizBlockData,
} from '@/src/features/courses/api/builder/quizBuilderService'
import { QuestionSearchModal } from '@/src/features/question-bank/components/QuestionSearchModal'
import type { QuestionType, QuizMode } from '@/src/features/quizzes'
import { QuizAnalyticsPanel } from '@/src/features/quizzes/components/analytics'
import { QuizStatus } from '@/src/features/quizzes/types/quizzes.types'
import { cn } from '@/src/utils/cn'

export function QuizBlockEditor({ blockId: _blockId }: { blockId: string }) {
  const { tenantId } = useAuth()
  const { state } = useBuilder()
  const activeLesson = state.modules
    .flatMap((m) => m.lessons)
    .find((l) => l.id === state.activeLesson?.id)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedQuizId, setSavedQuizId] = useState<string | undefined>(undefined)
  const [quizStatus, setQuizStatus] = useState<QuizStatus>('draft')
  const [showQuestionModal, setShowQuestionModal] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)

  const [quizData, setQuizData] = useState<QuizBlockData>({
    title: 'Kuis Baru',
    instructions: '',
    max_attempts: 1,
    passing_score: 70,
    shuffle_questions: false,
    shuffle_options: false,
    status: 'draft',
    questions: [],
  })

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!activeLesson) return
    async function load() {
      try {
        const data = await builderQuizService.getQuizByLesson(activeLesson!.id, tenantId!)
        if (data) {
          setSavedQuizId(data.id)
          setQuizStatus((data.status as QuizStatus) || 'draft')
          setQuizData({
            id: data.id,
            title: data.title || '',
            instructions: data.instructions || '',
            max_attempts: data.max_attempts || 1,
            passing_score: data.passing_score || 70,
            shuffle_questions: data.shuffle_questions || false,
            shuffle_options: data.shuffle_options || false,
            status: data.status || 'draft',
            questions: (data.quiz_questions || [])
              .sort((a: { order: number }, b: { order: number }) => a.order - b.order)
              .map(
                (q: {
                  id: string
                  text: string
                  order: number
                  question_type?: string
                  points?: number
                  explanation?: string
                  quiz_options?: unknown[]
                }) => ({
                  id: q.id,
                  text: q.text,
                  order: q.order,
                  question_type: (q.question_type || 'MCQ') as QuestionType,
                  points: q.points ?? 1,
                  explanation: q.explanation || '',
                  options: (q.quiz_options || []) as {
                    id?: string
                    text: string
                    is_correct: boolean
                  }[],
                })
              ),
          })
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Kesalahan tidak diketahui')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [activeLesson?.id])
  /* eslint-enable react-hooks/exhaustive-deps */

  const handleSave = async (targetStatus: QuizStatus = quizStatus) => {
    if (!activeLesson) return
    setIsSaving(true)
    setError(null)
    try {
      const payload: QuizBlockData = {
        ...quizData,
        id: savedQuizId,
        status: targetStatus,
      }
      const result = await builderQuizService.saveQuizData(
        activeLesson.id,
        activeLesson.tenantId,
        payload
      )
      setSavedQuizId(result.quiz_id)
      setQuizStatus(targetStatus)
      setQuizData((prev) => ({ ...prev, id: result.quiz_id, status: targetStatus }))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Kesalahan tidak diketahui')
    } finally {
      setIsSaving(false)
      setIsPublishing(false)
    }
  }

  const handlePublishToggle = async () => {
    setIsPublishing(true)
    const next: QuizStatus = quizStatus === 'published' ? 'draft' : 'published'
    await handleSave(next)
  }

  const addQuestion = () => {
    setQuizData((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          text: '',
          order: prev.questions.length + 1,
          question_type: 'MCQ' as QuestionType,
          points: 1,
          explanation: '',
          options: [
            { text: 'Opsi A', is_correct: true },
            { text: 'Opsi B', is_correct: false },
          ],
        },
      ],
    }))
  }

  const updateQuestion = (idx: number, text: string) => {
    const qs = [...quizData.questions]
    qs[idx] = { ...qs[idx], text }
    setQuizData({ ...quizData, questions: qs })
  }

  const removeQuestion = (idx: number) => {
    const qs = [...quizData.questions]
    qs.splice(idx, 1)
    setQuizData({ ...quizData, questions: qs })
  }

  const addOption = (qIdx: number) => {
    const qs = [...quizData.questions]
    qs[qIdx].options.push({ text: 'Opsi Baru', is_correct: false })
    setQuizData({ ...quizData, questions: qs })
  }

  const updateOption = (qIdx: number, oIdx: number, text: string) => {
    const qs = [...quizData.questions]
    qs[qIdx].options[oIdx].text = text
    setQuizData({ ...quizData, questions: qs })
  }

  const removeOption = (qIdx: number, oIdx: number) => {
    const qs = [...quizData.questions]
    qs[qIdx].options.splice(oIdx, 1)
    setQuizData({ ...quizData, questions: qs })
  }

  const setCorrectOption = (qIdx: number, oIdx: number) => {
    const qs = [...quizData.questions]
    const qType = qs[qIdx].question_type || 'MCQ'
    if (qType === 'MULTIPLE_SELECT') {
      // Toggle for multi-select
      qs[qIdx].options[oIdx].is_correct = !qs[qIdx].options[oIdx].is_correct
    } else {
      // Single correct for MCQ/TRUE_FALSE
      qs[qIdx].options.forEach((o, i) => {
        o.is_correct = i === oIdx
      })
    }
    setQuizData({ ...quizData, questions: qs })
  }

  const updateQuestionType = (qIdx: number, newType: QuestionType) => {
    const qs = [...quizData.questions]
    qs[qIdx] = { ...qs[qIdx], question_type: newType }
    // Auto-set options for TRUE_FALSE
    if (newType === 'TRUE_FALSE') {
      qs[qIdx].options = [
        { text: 'Benar', is_correct: true },
        { text: 'Salah', is_correct: false },
      ]
    }
    // Clear options for text types
    if (newType === 'SHORT_ANSWER' || newType === 'ESSAY') {
      qs[qIdx].options = []
    }
    // Add default options if switching back to MCQ/MULTIPLE_SELECT
    if ((newType === 'MCQ' || newType === 'MULTIPLE_SELECT') && qs[qIdx].options.length === 0) {
      qs[qIdx].options = [
        { text: 'Opsi A', is_correct: true },
        { text: 'Opsi B', is_correct: false },
      ]
    }
    setQuizData({ ...quizData, questions: qs })
  }

  const updateQuestionPoints = (qIdx: number, pts: number) => {
    const qs = [...quizData.questions]
    qs[qIdx] = { ...qs[qIdx], points: pts }
    setQuizData({ ...quizData, questions: qs })
  }

  const questionTypeLabels: Record<string, string> = {
    MCQ: 'Pilihan Ganda',
    TRUE_FALSE: 'Benar/Salah',
    MULTIPLE_SELECT: 'Pilih Beberapa',
    SHORT_ANSWER: 'Jawaban Singkat',
    ESSAY: 'Esai',
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">Memuat data kuis...</span>
      </div>
    )
  }

  const isPublished = quizStatus === 'published'

  return (
    <div className="w-full space-y-6">
      {/* Header with status */}
      <div className="flex items-start justify-between gap-4 p-6 bg-white rounded-[24px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[20px] bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 shadow-inner">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">Pengaturan Kuis</h3>
            <div
              className={cn(
                'inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.1em] px-3 py-1 rounded-full mt-1 shadow-sm',
                isPublished
                  ? 'bg-emerald-500 text-white shadow-emerald-100'
                  : 'bg-amber-400 text-amber-900 shadow-amber-100'
              )}
            >
              {isPublished ? (
                <CheckCircle className="w-3.5 h-3.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5" />
              )}
              {isPublished ? 'Terbit' : 'Draft'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => handleSave()}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-black text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all flex items-center gap-2 shadow-sm"
          >
            {isSaving && !isPublishing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            SIMPAN DRAFT
          </button>
          <button
            onClick={handlePublishToggle}
            disabled={isSaving}
            className={cn(
              'px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-2 shadow-lg',
              isPublished
                ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 shadow-amber-100'
                : 'text-white bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'
            )}
          >
            {isPublishing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isPublished ? 'BATALKAN TERBIT' : 'TERBITKAN KUIS'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Quiz Settings */}
      <div className="grid grid-cols-1 gap-6 p-8 bg-slate-50/50 rounded-[32px] border border-slate-200/50">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">
            Judul Kuis
          </label>
          <input
            type="text"
            value={quizData.title}
            onChange={(e) => setQuizData({ ...quizData, title: e.target.value })}
            disabled={isPublished}
            className="w-full px-5 py-3 bg-white border border-slate-200 rounded-[18px] focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 outline-none transition-all disabled:opacity-60 font-bold text-slate-700 placeholder:text-slate-200 shadow-sm"
            placeholder="Masukkan judul kuis..."
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">
            Instruksi Pengerjaan
          </label>
          <textarea
            value={quizData.instructions || ''}
            onChange={(e) => setQuizData({ ...quizData, instructions: e.target.value })}
            disabled={isPublished}
            rows={2}
            className="w-full px-5 py-3 bg-white border border-slate-200 rounded-[18px] focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 outline-none transition-all resize-none disabled:opacity-60 font-medium text-slate-600 placeholder:text-slate-200 shadow-sm"
            placeholder="Tuliskan panduan singkat untuk kuis ini..."
          />
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">
              Maks. Percobaan
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={quizData.max_attempts}
              onChange={(e) => setQuizData({ ...quizData, max_attempts: parseInt(e.target.value) })}
              disabled={isPublished}
              className="w-full px-5 py-3 bg-white border border-slate-200 rounded-[18px] focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 outline-none transition-all disabled:opacity-60 font-black text-slate-700 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">
              Lulus Min. (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={quizData.passing_score}
              onChange={(e) =>
                setQuizData({ ...quizData, passing_score: parseInt(e.target.value) })
              }
              disabled={isPublished}
              className="w-full px-5 py-3 bg-white border border-slate-200 rounded-[18px] focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 outline-none transition-all disabled:opacity-60 font-black text-slate-700 shadow-sm"
            />
          </div>
          <div className="flex flex-col justify-end gap-3 pb-1">
            <label className="flex items-center gap-3 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={quizData.shuffle_questions}
                onChange={(e) => setQuizData({ ...quizData, shuffle_questions: e.target.checked })}
                disabled={isPublished}
                className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 transition-colors">
                Acak Pertanyaan
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={quizData.shuffle_options}
                onChange={(e) => setQuizData({ ...quizData, shuffle_options: e.target.checked })}
                disabled={isPublished}
                className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 transition-colors">
                Acak Opsi Pilihan
              </span>
            </label>
          </div>
        </div>

        {/* Quiz Mode & Availability */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Mode Kuis
            </label>
            <select
              value={quizData.mode || 'graded'}
              onChange={(e) => setQuizData({ ...quizData, mode: e.target.value as QuizMode })}
              disabled={isPublished}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 text-sm"
            >
              <option value="practice">Latihan (unlimited)</option>
              <option value="graded">Dinilai (max attempt)</option>
              <option value="exam">Ujian (1 attempt)</option>
            </select>
          </div>
          <div className="flex items-end gap-2 pb-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={quizData.show_correct_answers ?? false}
                onChange={(e) =>
                  setQuizData({ ...quizData, show_correct_answers: e.target.checked })
                }
                disabled={isPublished}
                className="w-4 h-4 rounded accent-blue-600"
              />
              <span className="text-xs text-slate-600 font-medium">Tampilkan jawaban benar</span>
            </label>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-slate-800 text-sm">
            Daftar Pertanyaan
            <span className="ml-2 text-xs font-normal text-slate-400">
              ({quizData.questions.length} soal)
            </span>
          </h4>
          {!isPublished && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowQuestionModal(true)}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors"
              >
                <Search className="w-3.5 h-3.5" /> Ambil dari Bank Soal
              </button>
              <button
                onClick={addQuestion}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Buat Baru
              </button>
            </div>
          )}
        </div>

        {quizData.questions.length === 0 ? (
          <div className="text-center p-12 border-2 border-dashed border-slate-200 rounded-[32px] bg-white/50">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <HelpCircle className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
              Belum ada soal
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Klik "Buat Baru" untuk mulai menyusun pertanyaan kuis.
            </p>
          </div>
        ) : (
          quizData.questions.map((q, qIdx) => (
            <div
              key={q.id || qIdx}
              className="p-6 border border-slate-200/60 rounded-[28px] bg-white shadow-sm space-y-4 group relative hover:border-indigo-200 transition-all"
            >
              {/* Question type + number + delete */}
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 text-xs font-black flex items-center justify-center shrink-0 shadow-inner">
                  {qIdx + 1}
                </span>
                <select
                  value={q.question_type || 'MCQ'}
                  onChange={(e) => updateQuestionType(qIdx, e.target.value as QuestionType)}
                  disabled={isPublished}
                  className="px-3 py-2 text-[10px] font-black uppercase tracking-wider bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 font-medium disabled:opacity-60 transition-all"
                >
                  {Object.entries(questionTypeLabels).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={q.points ?? 1}
                    onChange={(e) => updateQuestionPoints(qIdx, parseInt(e.target.value) || 1)}
                    disabled={isPublished}
                    className="w-10 bg-transparent text-xs font-black text-slate-700 outline-none disabled:opacity-60"
                  />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    PTS
                  </span>
                </div>
                <input
                  type="text"
                  value={q.text}
                  onChange={(e) => updateQuestion(qIdx, e.target.value)}
                  disabled={isPublished}
                  className="flex-1 px-4 py-2 bg-slate-50 border border-slate-100 rounded-[14px] focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 outline-none font-bold text-sm text-slate-700 placeholder:text-slate-200 disabled:opacity-60 transition-all"
                  placeholder="Tulis pertanyaan di sini..."
                />
                {!isPublished && (
                  <button
                    onClick={() => removeQuestion(qIdx)}
                    className="p-2 opacity-0 group-hover:opacity-100 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Options — hide for SHORT_ANSWER / ESSAY */}
              {q.question_type !== 'SHORT_ANSWER' && q.question_type !== 'ESSAY' && (
                <div className="pl-8 space-y-2">
                  {q.question_type === 'MULTIPLE_SELECT' && (
                    <p className="text-[10px] text-slate-400 italic">
                      Klik untuk toggle jawaban benar (bisa lebih dari 1)
                    </p>
                  )}
                  {q.options.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2">
                      <button
                        onClick={() => !isPublished && setCorrectOption(qIdx, oIdx)}
                        disabled={isPublished}
                        title={opt.is_correct ? 'Jawaban benar' : 'Jadikan jawaban benar'}
                        className={cn(
                          'w-5 h-5 border-2 flex items-center justify-center shrink-0 transition-colors',
                          q.question_type === 'MULTIPLE_SELECT' ? 'rounded' : 'rounded-full',
                          opt.is_correct
                            ? 'border-emerald-500 bg-emerald-500'
                            : 'border-slate-300 bg-white hover:border-emerald-400',
                          isPublished && 'cursor-not-allowed'
                        )}
                      >
                        {opt.is_correct && (
                          <svg
                            className="w-2.5 h-2.5 text-white"
                            fill="currentColor"
                            viewBox="0 0 12 12"
                          >
                            <path d="M10 3L5 8.5 2 5.5l-1 1L5 10.5l6-7-1-0.5z" />
                          </svg>
                        )}
                      </button>
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                        disabled={isPublished || q.question_type === 'TRUE_FALSE'}
                        className={cn(
                          'flex-1 px-4 py-2 text-sm border rounded-xl outline-none focus:ring-4 focus:ring-indigo-50 transition-all font-medium',
                          opt.is_correct
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 focus:ring-emerald-50'
                            : 'bg-white border-slate-200 text-slate-600',
                          (isPublished || q.question_type === 'TRUE_FALSE') &&
                            'opacity-60 cursor-not-allowed'
                        )}
                        placeholder="Teks opsi..."
                      />
                      {!isPublished && q.options.length > 2 && q.question_type !== 'TRUE_FALSE' && (
                        <button
                          onClick={() => removeOption(qIdx, oIdx)}
                          className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {!isPublished && q.question_type !== 'TRUE_FALSE' && (
                    <button
                      onClick={() => addOption(qIdx)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-1 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Tambah Opsi
                    </button>
                  )}
                </div>
              )}

              {/* Text hint for essay/short-answer types */}
              {(q.question_type === 'SHORT_ANSWER' || q.question_type === 'ESSAY') && (
                <div className="pl-8">
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-dashed border-slate-200">
                    {q.question_type === 'SHORT_ANSWER'
                      ? '🖊️ Siswa akan mengetik jawaban singkat (dinilai manual oleh guru)'
                      : '📝 Siswa akan menulis esai panjang (dinilai manual oleh guru)'}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {isPublished && (
        <p className="text-xs text-center text-slate-400 pb-2">
          Kuis sudah dipublish. Kembalikan ke Draft untuk mengedit soal.
        </p>
      )}
      {/* Question Search Modal */}
      {savedQuizId && (
        <QuestionSearchModal
          quizId={savedQuizId}
          isOpen={showQuestionModal}
          onClose={() => setShowQuestionModal(false)}
          onAddSuccess={(question) => {
            // Optimistically update the UI
            setQuizData((prev) => ({
              ...prev,
              questions: [
                ...prev.questions,
                {
                  id: question.id,
                  text: question.question_text,
                  order: prev.questions.length + 1,
                  question_type: question.question_type as QuestionType,
                  points: 1,
                  explanation: question.explanation || '',
                  options: (question.options || []).map((o) => ({
                    text: o.option_text,
                    is_correct: o.is_correct,
                  })),
                },
              ],
            }))
            setShowQuestionModal(false)
          }}
        />
      )}

      {/* Quiz Analytics - Only show for published quizzes with saved ID */}
      {savedQuizId && isPublished && (
        <div className="mt-6 border-t border-slate-200 pt-6">
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-slate-900 transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            Analitik Kuis
            {showAnalytics ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showAnalytics && (
            <div className="mt-4">
              <QuizAnalyticsPanel quizId={savedQuizId} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
