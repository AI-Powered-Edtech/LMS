import { AnimatePresence, motion } from 'motion/react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useToast } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { useAddCalendarEvent } from '@/features/calendar/hooks/useCalendarQueries'
import {
  type AIGeneratedContent,
  type AssignmentType,
  BLOOM_DESCRIPTIONS,
  BLOOM_LABELS,
  type BloomLevel,
  type GeneratedQuestion,
  useGenerateAIContent,
  useMarkContentUsed,
} from '@/features/creator'
import { saveQuestionsToBank } from '@/features/creator/api/questionBankIntegration'
import { EditQuestionModal } from '@/features/creator/components/EditQuestionModal'
import { HistoryPanel } from '@/features/creator/components/HistoryPanel'
import { QuestionCard } from '@/features/creator/components/QuestionCard'
import { UsageQuotaBar } from '@/features/creator/components/UsageQuotaBar'
import { useCreatorBridgeStore } from '@/features/creator/store/creatorBridge.store'
import { exportQuestionsToCSV } from '@/features/creator/utils/exportToCSV'
import { useSendNotification } from '@/features/notifications'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useRoleBasedPath } from '@/hooks/useRoleBasedPath'
import {
  BookOpen,
  Calendar as CalendarIcon,
  CheckSquare,
  ChevronDown,
  Clock,
  Database,
  Download,
  FileText,
  Settings,
  Sparkles,
  Square,
  UploadCloud,
} from '@/icons'
import { cn } from '@/utils/cn'

// ─── Loading Progress Steps ───────────────────────────────────────────────────

const LOADING_STEPS = [
  { label: 'Membaca & mengekstrak teks dokumen', icon: '📄' },
  { label: 'Menganalisis konten materi', icon: '🔍' },
  { label: 'Membuat soal dengan AI (Groq)', icon: '🤖' },
  { label: 'Menyimpan hasil generasi', icon: '💾' },
] as const

const VALID_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
] as const

function ProgressSteps({ activeStep }: { activeStep: number }): React.JSX.Element {
  return (
    <ol className="space-y-3 mt-6">
      {LOADING_STEPS.map((step, i) => {
        const isDone = i < activeStep
        const isActive = i === activeStep
        return (
          <li
            key={step.label}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
              isDone &&
                'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300',
              isActive &&
                'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800',
              !isDone &&
                !isActive &&
                'bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500'
            )}
          >
            <span className="text-base leading-none w-5 text-center shrink-0">{step.icon}</span>
            <span className="flex-1">
              Langkah {i + 1}: {step.label}
            </span>
            {isDone && (
              <span className="text-emerald-500 dark:text-emerald-400 font-bold text-base leading-none">
                ✓
              </span>
            )}
            {isActive && (
              <span className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin shrink-0" />
            )}
          </li>
        )
      })}
    </ol>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Creator(): React.JSX.Element {
  usePageTitle('Kreator AI')
  const addToast = useToast((s) => s.addToast)
  const { user } = useAuth()
  const { addEvent } = useAddCalendarEvent()
  const sendNotification = useSendNotification()
  const navigate = useNavigate()
  const getPath = useRoleBasedPath()

  // Mutations
  const generateMutation = useGenerateAIContent()
  const markUsedMutation = useMarkContentUsed()

  // File upload state
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Configuration state
  const [assignmentType, setAssignmentType] = useState<AssignmentType>('quiz')
  const [questionCount, setQuestionCount] = useState(10)
  const [difficulty, setDifficulty] = useState<BloomLevel>('C3')
  const [curriculumExpanded, setCurriculumExpanded] = useState(false)
  const [subject, setSubject] = useState('')
  const [gradeLevel, setGradeLevel] = useState('')
  const [curriculumRef, setCurriculumRef] = useState('')
  const [dueDateStr, setDueDateStr] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() + 3)
    return d.toISOString().slice(0, 10)
  })

  // Result state
  const [resultId, setResultId] = useState<string | null>(null)
  const [resultType, setResultType] = useState<AssignmentType>('quiz')
  const [resultSummary, setResultSummary] = useState<string>('')
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [resultFileName, setResultFileName] = useState<string>('')
  const [resultGeneratedAt, setResultGeneratedAt] = useState<string | null>(null)

  // UI state
  const [activeStep, setActiveStep] = useState(0)
  const [showHistory, setShowHistory] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<GeneratedQuestion | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isSavingToBank, setIsSavingToBank] = useState(false)

  const hasResult = questions.length > 0
  const selectedCount = selectedIds.size
  const allSelected = questions.length > 0 && selectedIds.size === questions.length

  // Timer refs for progress steps (prevent memory leak)
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = useCallback(() => {
    timerRefs.current.forEach(clearTimeout)
    timerRefs.current = []
  }, [])

  useEffect(() => {
    return () => clearTimers()
  }, [clearTimers])

  // Start loading progress timers when mutation starts
  useEffect(() => {
    if (generateMutation.isPending) {
      setActiveStep(0)
      clearTimers()
      const t1 = setTimeout(() => setActiveStep(1), 2500)
      const t2 = setTimeout(() => setActiveStep(2), 6000)
      const t3 = setTimeout(() => setActiveStep(3), 20000)
      timerRefs.current = [t1, t2, t3]
    } else {
      clearTimers()
    }
  }, [generateMutation.isPending, clearTimers])

  // ─── File Validation ───────────────────────────────────────────────────────

  const validateAndSetFile = useCallback(
    (f: File) => {
      if (f.size > 10 * 1024 * 1024) {
        addToast({ type: 'error', message: 'Ukuran file maksimal 10MB.' })
        return
      }
      if (!VALID_FILE_TYPES.includes(f.type as (typeof VALID_FILE_TYPES)[number])) {
        addToast({
          type: 'error',
          message: 'Format tidak didukung. Gunakan .pdf, .docx, .txt, atau .csv.',
        })
        return
      }
      setFile(f)
    },
    [addToast]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const dropped = e.dataTransfer.files[0]
      if (dropped) validateAndSetFile(dropped)
    },
    [validateAndSetFile]
  )

  // ─── Generate ─────────────────────────────────────────────────────────────

  const handleGenerate = (): void => {
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('assignmentType', assignmentType)
    formData.append('questionCount', questionCount.toString())
    formData.append('difficulty', difficulty)
    if (subject.trim()) formData.append('subject', subject.trim())
    if (gradeLevel.trim()) formData.append('gradeLevel', gradeLevel.trim())
    if (curriculumRef.trim()) formData.append('curriculumRef', curriculumRef.trim())

    generateMutation.mutate(formData, {
      onSuccess: (data) => {
        setResultId(data.generation_id)
        setResultType(data.type as AssignmentType)
        setResultSummary(data.summary)
        setQuestions(data.questions)
        setSelectedIds(new Set(data.questions.map((q) => q.id)))
        setResultFileName(file?.name ?? '')
        setResultGeneratedAt(new Date().toISOString())
      },
      onError: (error) => {
        addToast({
          type: 'error',
          message: error instanceof Error ? error.message : 'Gagal memproses materi.',
        })
      },
    })
  }

  // ─── Question Management ───────────────────────────────────────────────────

  const handleToggleSelect = (id: string): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAll = (): void => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(questions.map((q) => q.id)))
    }
  }

  const handleEditQuestion = (q: GeneratedQuestion): void => {
    setEditingQuestion(q)
    setShowEditModal(true)
  }

  const handleSaveEdit = (updated: GeneratedQuestion): void => {
    setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)))
    setShowEditModal(false)
    setEditingQuestion(null)
  }

  const handleDeleteQuestion = (id: string): void => {
    setQuestions((prev) => prev.filter((q) => q.id !== id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  const getSelectedQuestions = (): GeneratedQuestion[] =>
    selectedCount > 0 ? questions.filter((q) => selectedIds.has(q.id)) : questions

  const handleAddToCourse = (): void => {
    const selectedQs = getSelectedQuestions()
    if (selectedQs.length === 0) {
      addToast({ type: 'error', message: 'Pilih minimal 1 soal untuk ditambahkan.' })
      return
    }

    if (resultId) {
      void markUsedMutation.mutate(resultId)
    }

    // Set bridge store — CourseBuilder will read this
    useCreatorBridgeStore.getState().setPendingQuiz({
      title: file?.name.replace(/\.[^/.]+$/, '') || 'Konten Buatan AI',
      type: resultType,
      questions: selectedQs,
      summary: resultSummary,
      bloomLevel: difficulty,
      questionCount: selectedQs.length,
    })

    void navigate(getPath('/app/teacher/course-builder', '/app/admin/course-builder'))
  }

  const handleSaveToCalendar = (): void => {
    const dueDate = new Date(dueDateStr + 'T23:59:00')

    addEvent({
      title: `${resultType === 'quiz' ? 'Kuis' : resultType === 'reading' ? 'Bacaan' : 'Menulis'}: ${file?.name.replace(/\.[^/.]+$/, '') || 'Materi Baru'}`,
      date: dueDate,
      time: '23:59',
      type: 'quiz',
      location: 'Online',
      description: resultSummary.substring(0, 120),
      priority: 'medium',
      completed: false,
      duration: 60,
    })

    void sendNotification.mutate({
      userId: user!.id,
      type: 'assignment',
      title: 'Tugas Dijadwalkan',
      message: 'Tugas telah ditambahkan ke kalender.',
    })

    addToast({ type: 'success', message: 'Berhasil ditambahkan ke kalender.' })
    void navigate(getPath('/app/teacher/calendar', '/app/admin/calendar'))
  }

  const handleReset = (): void => {
    setQuestions([])
    setSelectedIds(new Set())
    setResultId(null)
    setResultSummary('')
    setResultFileName('')
    setResultGeneratedAt(null)
    generateMutation.reset()
  }

  const handleExportCSV = (): void => {
    const selectedQs = getSelectedQuestions()
    if (selectedQs.length === 0) {
      addToast({ type: 'error', message: 'Pilih minimal 1 soal untuk diekspor.' })
      return
    }
    exportQuestionsToCSV(selectedQs, resultType, file?.name.replace(/\.[^/.]+$/, '') || 'soal_ai')
    addToast({ type: 'success', message: `${selectedQs.length} soal berhasil diekspor ke CSV.` })
  }

  const handleSaveToBank = async (): Promise<void> => {
    const selectedQs = getSelectedQuestions()
    if (selectedQs.length === 0) {
      addToast({ type: 'error', message: 'Pilih minimal 1 soal untuk disimpan.' })
      return
    }
    setIsSavingToBank(true)
    try {
      const result = await saveQuestionsToBank(selectedQs, resultType, difficulty)
      if (result.saved > 0) {
        addToast({
          type: 'success',
          message: `${result.saved} soal berhasil disimpan ke Bank Soal.${result.failed > 0 ? ` (${result.failed} gagal)` : ''}`,
        })
      } else {
        addToast({ type: 'error', message: 'Gagal menyimpan soal ke Bank Soal.' })
      }
    } catch {
      addToast({ type: 'error', message: 'Gagal menyimpan soal ke Bank Soal.' })
    } finally {
      setIsSavingToBank(false)
    }
  }

  const handleLoadFromHistory = (content: AIGeneratedContent): void => {
    setResultId(content.id)
    setResultType(content.assignment_type as AssignmentType)
    setResultSummary(content.summary ?? '')
    setQuestions(content.questions)
    setSelectedIds(new Set(content.questions.map((q) => q.id)))
    setResultFileName(content.file_name ?? '')
    setResultGeneratedAt(null)
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const ASSIGNMENT_TYPES: { id: AssignmentType; label: string }[] = [
    { id: 'quiz', label: 'Kuis (PG)' },
    { id: 'reading', label: 'Membaca' },
    { id: 'writing', label: 'Menulis' },
  ]

  const BLOOM_LEVELS = Object.keys(BLOOM_LABELS) as BloomLevel[]

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
            Generator Kursus & Kuis AI
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
              Beta
            </span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Unggah dokumen atau materi — AI akan otomatis membuat soal sesuai level Bloom.
          </p>
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl text-sm text-blue-700 dark:text-blue-300">
            <strong>Kreator AI:</strong> Otomatisasi pembuatan konten dari materi yang ada.
            Mendukung PDF, DOCX, TXT, CSV — maks 10MB.
          </div>
        </div>
        {/* History Button */}
        <button
          type="button"
          onClick={() => setShowHistory(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-sm transition-colors shrink-0 ml-4"
        >
          <Clock className="w-4 h-4" />
          Riwayat
        </button>
      </div>

      {/* ── Upload + Config Phase ── */}
      {!hasResult && (
        <>
          <UsageQuotaBar />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Upload Area */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <UploadCloud className="w-6 h-6 text-blue-500" />
                Unggah Materi
              </h2>

              <div
                role="presentation"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  'h-64 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 text-center transition-all duration-200',
                  isDragging
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 scale-[1.02]'
                    : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800',
                  file && 'border-green-500 bg-green-50 dark:bg-green-900/20'
                )}
              >
                {file ? (
                  <>
                    <FileText className="w-12 h-12 text-green-500 mb-4" />
                    <p className="font-bold text-slate-700 dark:text-slate-200 truncate max-w-full px-2">
                      {file.name}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="mt-4 text-sm text-red-500 font-medium hover:underline"
                    >
                      Hapus File
                    </button>
                  </>
                ) : (
                  <>
                    <UploadCloud
                      className={cn(
                        'w-12 h-12 mb-4 transition-colors',
                        isDragging ? 'text-blue-500' : 'text-slate-400'
                      )}
                    />
                    <p className="font-bold text-slate-700 dark:text-slate-200">
                      Tarik & Lepas file di sini
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                      Mendukung .pdf, .docx, .txt, .csv (Maks 10MB)
                    </p>
                    <input
                      type="file"
                      className="hidden"
                      ref={fileInputRef}
                      accept=".pdf,.docx,.txt,.csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) validateAndSetFile(f)
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-6 px-6 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 shadow-sm"
                    >
                      Pilih File
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Configuration Area */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
                <Settings className="w-6 h-6 text-slate-500" />
                Konfigurasi AI
              </h2>

              <div className="space-y-7">
                {/* Assignment Type */}
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-200 block mb-3">
                    Jenis Tugas
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {ASSIGNMENT_TYPES.map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setAssignmentType(type.id)}
                        className={cn(
                          'px-4 py-3 rounded-xl border text-sm font-medium text-center transition-all',
                          assignmentType === type.id
                            ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                            : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 text-slate-600 dark:text-slate-400'
                        )}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question Count */}
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="font-bold text-slate-700 dark:text-slate-200">
                      {assignmentType === 'writing' ? 'Jumlah Topik' : 'Jumlah Soal'}
                    </label>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {assignmentType === 'writing' ? Math.min(questionCount, 3) : questionCount}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max={assignmentType === 'writing' ? '3' : '50'}
                    value={
                      assignmentType === 'writing' ? Math.min(questionCount, 3) : questionCount
                    }
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  {assignmentType === 'writing' && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Tugas menulis dibatasi maksimal 3 topik.
                    </p>
                  )}
                </div>

                {/* Bloom's Level */}
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">
                    Tingkat Kesulitan (Taksonomi Bloom)
                  </label>
                  {difficulty && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                      {BLOOM_DESCRIPTIONS[difficulty]}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {BLOOM_LEVELS.map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setDifficulty(level)}
                        className={cn(
                          'px-4 py-2.5 rounded-xl border text-sm font-medium text-left transition-all',
                          difficulty === level
                            ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                            : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 text-slate-600 dark:text-slate-400'
                        )}
                      >
                        {BLOOM_LABELS[level]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Curriculum Alignment (optional) */}
                <div>
                  <button
                    type="button"
                    onClick={() => setCurriculumExpanded((p) => !p)}
                    className="flex items-center gap-2 w-full text-left font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    aria-expanded={curriculumExpanded}
                  >
                    <ChevronDown
                      className={cn(
                        'w-4 h-4 transition-transform text-slate-400',
                        curriculumExpanded && 'rotate-180'
                      )}
                    />
                    Penyelarasan Kurikulum
                    <span className="ml-auto text-xs font-normal text-slate-400 dark:text-slate-500">
                      opsional
                    </span>
                  </button>

                  {curriculumExpanded && (
                    <div className="mt-3 space-y-3 pl-1">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Mata Pelajaran
                        </label>
                        <input
                          type="text"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder="mis. Matematika, Bahasa Indonesia"
                          className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={generateMutation.isPending}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Kelas / Tingkat
                        </label>
                        <input
                          type="text"
                          value={gradeLevel}
                          onChange={(e) => setGradeLevel(e.target.value)}
                          placeholder="mis. VII, 10, SD Kelas 5"
                          className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={generateMutation.isPending}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Referensi Kurikulum
                        </label>
                        <input
                          type="text"
                          value={curriculumRef}
                          onChange={(e) => setCurriculumRef(e.target.value)}
                          placeholder="mis. CP Fase D, Kurikulum Merdeka"
                          className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={generateMutation.isPending}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Generate Button */}
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!file || generateMutation.isPending}
                  className={cn(
                    'w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg',
                    !file || generateMutation.isPending
                      ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90 active:scale-95 shadow-blue-200 dark:shadow-blue-900'
                  )}
                >
                  {generateMutation.isPending ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Memproses dokumen...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Buat dengan AI
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Result Phase ── */}
      {hasResult && (
        <>
          {/* Provenance Bar */}
          <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              {resultFileName || 'Dokumen tidak diketahui'}
            </span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 font-medium border border-violet-100 dark:border-violet-800">
              {BLOOM_LABELS[difficulty] ?? difficulty}
            </span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span>
              Dibuat{' '}
              {resultGeneratedAt
                ? new Date(resultGeneratedAt).toLocaleString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '—'}
            </span>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8"
          >
            {/* Left: Summary */}
            <div className="md:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  {resultType === 'reading'
                    ? 'Teks Bacaan'
                    : resultType === 'writing'
                      ? 'Konteks Topik'
                      : 'Rangkuman Materi'}
                </h2>
                {resultId && (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full border border-emerald-100 dark:border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    Tersimpan
                  </span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto pr-1 text-sm text-slate-600 dark:text-slate-400 leading-relaxed min-h-32">
                {resultSummary || (
                  <span className="text-slate-400 dark:text-slate-500 italic">
                    Tidak ada rangkuman.
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="mt-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                ← Buat Baru
              </button>
            </div>

            {/* Right: Questions */}
            <div className="md:col-span-2 bg-slate-100 dark:bg-slate-900 p-4 md:p-6 rounded-3xl border border-slate-200 dark:border-slate-700 flex flex-col min-h-[500px]">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                    {resultType === 'writing' ? 'Daftar Topik' : 'Daftar Soal'} ({questions.length})
                  </h2>
                  {/* Select all toggle */}
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title={allSelected ? 'Batalkan semua' : 'Pilih semua'}
                  >
                    {allSelected ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    {allSelected ? 'Batalkan Semua' : 'Pilih Semua'}
                  </button>
                  {selectedCount > 0 && selectedCount < questions.length && (
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      {selectedCount} dipilih
                    </span>
                  )}
                </div>

                <div className="flex gap-2 w-full sm:w-auto items-center">
                  <input
                    type="date"
                    value={dueDateStr}
                    onChange={(e) => setDueDateStr(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    title="Tanggal tenggat"
                  />
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    disabled={selectedCount === 0}
                    className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0 disabled:opacity-40"
                  >
                    <Download className="w-4 h-4" />
                    CSV
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveToBank}
                    disabled={selectedCount === 0 || isSavingToBank}
                    className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0 disabled:opacity-40"
                  >
                    <Database className="w-4 h-4" />
                    {isSavingToBank ? 'Menyimpan...' : 'Bank Soal'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveToCalendar}
                    className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    <CalendarIcon className="w-4 h-4" />
                    Jadwalkan
                  </button>
                  <button
                    type="button"
                    onClick={handleAddToCourse}
                    disabled={selectedCount === 0 && questions.length === 0}
                    className={cn(
                      'px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shrink-0',
                      selectedCount > 0 || questions.length > 0
                        ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-blue-900'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                    )}
                  >
                    <BookOpen className="w-4 h-4" />
                    Tambahkan ke Kursus
                    {selectedCount > 0 && selectedCount < questions.length && (
                      <span className="ml-0.5">({selectedCount})</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Question list */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {questions.map((q, i) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    index={i}
                    selected={selectedIds.has(q.id)}
                    onToggleSelect={handleToggleSelect}
                    onEdit={handleEditQuestion}
                    onDelete={handleDeleteQuestion}
                  />
                ))}
                {questions.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                      Semua soal telah dihapus.
                    </p>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="mt-3 text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline"
                    >
                      Buat ulang
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}

      {/* ── Loading Overlay ── */}
      <AnimatePresence>
        {generateMutation.isPending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="w-full max-w-lg bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center shrink-0">
                  <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    AI sedang bekerja...
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    Mohon tunggu, proses ini memakan 10–30 detik
                  </p>
                </div>
              </div>
              <ProgressSteps activeStep={activeStep} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Edit Question Modal ── */}
      <EditQuestionModal
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingQuestion(null)
        }}
        question={editingQuestion}
        onSave={handleSaveEdit}
      />

      {/* ── History Panel ── */}
      <HistoryPanel
        open={showHistory}
        onClose={() => setShowHistory(false)}
        onLoad={handleLoadFromHistory}
      />
    </div>
  )
}
