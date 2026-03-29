import {
  BookOpen,
  Calendar as CalendarIcon,
  Edit2,
  FileText,
  Settings,
  Sparkles,
  UploadCloud,
} from 'lucide-react'
import { useRoleBasedPath } from '@/src/hooks/useRoleBasedPath'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

  const getPath = useRoleBasedPath()
import { useToast } from '@/src/components/ui'
import { useAuth } from '@/src/contexts/AuthContext'
// TODO: AI generation will be routed through backend API (Phase 5)
import { useAddCalendarEvent } from '@/src/features/calendar/hooks/useCalendarQueries'
import { creatorService } from '@/src/features/creator/api/creatorService'
import { useSendNotification } from '@/src/features/notifications'
import { usePageTitle } from '@/src/hooks/usePageTitle'
import { cn } from '@/src/utils/cn'

// Maps loadingText values to a step index (0-based)
const LOADING_STEPS = [
  { label: 'Membaca file', icon: '📄' },
  { label: 'Menganalisis konten', icon: '🔍' },
  { label: 'Membuat soal dengan AI', icon: '🤖' },
  { label: 'Menyusun hasil', icon: '✅' },
] as const

function getActiveStep(loadingText: string): number {
  if (loadingText.includes('Membaca')) return 0
  if (loadingText.includes('Menganalisis')) return 1
  if (loadingText.includes('Membuat soal')) return 2
  if (loadingText.includes('Menyusun') || loadingText.includes('Hampir')) return 3
  return 0
}

function ProgressSteps({ loadingText }: { loadingText: string }) {
  const activeStep = getActiveStep(loadingText)
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

export function Creator() {
  const addToast = useToast((s) => s.addToast)
  usePageTitle('Kreator')
  const { user } = useAuth()
  const { addEvent } = useAddCalendarEvent()
  const sendNotification = useSendNotification()
  const navigate = useNavigate()

  // Default due date: 3 days from now at 23:59
  const defaultDueDate = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 3)
    return d.toISOString().slice(0, 10) // YYYY-MM-DD
  })()

  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [assignmentType, setAssignmentType] = useState('quiz') // quiz, reading, writing
  const [questionCount, setQuestionCount] = useState(10)
  const [difficulty, setDifficulty] = useState('C3')
  const [dueDateStr, setDueDateStr] = useState(defaultDueDate)
  const [isGenerating, setIsGenerating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [loadingText, setLoadingText] = useState('Mengekstrak teks...')
  const [result, setResult] = useState<{
    type?: string
    summary?: string
    questions: Array<{
      id: string
      question: string
      text?: string
      options?: Array<string | { id: string; text: string }>
      correctAnswer?: string
      answer?: string
      explanation?: string
      bloomLevel?: string
    }>
  } | null>(null)

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

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const droppedFile = e.dataTransfer.files[0]
        // Validation
        if (droppedFile.size > 10 * 1024 * 1024) {
          addToast({ type: 'error', message: 'Ukuran file maksimal 10MB' })
          return
        }
        const validTypes = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'video/mp4',
          'text/plain',
          'text/csv',
        ]
        if (!validTypes.includes(droppedFile.type)) {
          addToast({
            type: 'error',
            message: 'Format file tidak didukung. Gunakan .pdf, .docx, .txt, atau .mp4',
          })
          return
        }
        setFile(droppedFile)
      }
    },
    [addToast]
  )

  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!file) return
    setIsGenerating(true)
    setError(null)
    setLoadingText('Membaca file...')

    // Progress text updates to keep user informed
    const progressTimer = setTimeout(() => setLoadingText('Menganalisis konten...'), 3000)
    const progressTimer2 = setTimeout(() => setLoadingText('Membuat soal dengan AI...'), 7000)
    const progressTimer3 = setTimeout(
      () => setLoadingText('Hampir selesai, menyusun hasil...'),
      15000
    )

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('assignmentType', assignmentType)
      formData.append('questionCount', questionCount.toString())
      formData.append('difficulty', difficulty)

      const data = await creatorService.generateAIContent(formData)
      setResult(data)
    } catch (err: unknown) {
      if (import.meta.env.DEV) console.error(err)
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memproses materi.')
    } finally {
      clearTimeout(progressTimer)
      clearTimeout(progressTimer2)
      clearTimeout(progressTimer3)
      setIsGenerating(false)
    }
  }

  const handleSaveToCalendar = () => {
    if (!result) return

    const dueDate = new Date(dueDateStr + 'T23:59:00')

    addEvent({
      title: `Kuis: ${file?.name.split('.')[0] || 'Materi Baru'}`,
      date: dueDate,
      time: '23:59',
      type: 'quiz',
      location: 'Online',
      description: (result.summary ?? '').substring(0, 100) + '...',
      priority: 'medium',
      completed: false,
      duration: 60,
    })

    sendNotification.mutate({
      userId: user!.id,
      type: 'assignment',
      title: 'Kuis Dijadwalkan',
      message: 'Kuis telah ditambahkan ke kalender siswa.',
    })

    navigate('/calendar')
  }

  const handleAddToCourse = () => {
    if (!result) return
    navigate(getPath('/app/teacher/course-builder', '/app/admin/course-builder'), {
      state: {
        action: result.type === 'quiz' ? 'add-quiz' : 'add-assignment',
        quizData: {
          title: file?.name.split('.')[0] || 'Konten Buatan AI',
          type: result.type,
          questions: result.questions,
          summary: result.summary,
        },
      },
    })
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Generator Kursus & Kuis AI
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Gunakan AI untuk membuat materi kursus dan kuis secara otomatis dari dokumen atau video.
          </p>
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl text-sm text-blue-700 dark:text-blue-300">
            <strong>Kreator AI:</strong> Otomatisasi pembuatan konten dari materi yang ada.
          </div>
        </div>
      </div>

      {!result ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Upload Area */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <UploadCloud className="w-6 h-6 text-blue-500" />
              Unggah Materi
            </h2>

            <div
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
                  <p className="font-bold text-slate-700 dark:text-slate-200">{file.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button
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
                    Mendukung .pdf, .docx, .mp4 (Maks 10MB)
                  </p>
                  <input type="file" className="hidden" ref={fileInputRef} onChange={(e) => { if (e.target.files && e.target.files.length > 0) { const f = e.target.files[0]; if (f) { setFile(f);  } } }} />
                  <button onClick={() => fileInputRef.current?.click()} className="mt-6 px-6 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 shadow-sm">
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

            <div className="space-y-8">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-200 block mb-3">
                  Jenis Tugas
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'quiz', label: 'Kuis (PG)' },
                    { id: 'reading', label: 'Membaca' },
                    { id: 'writing', label: 'Menulis' },
                  ].map((type) => (
                    <button
                      key={type.id}
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
                  value={assignmentType === 'writing' ? Math.min(questionCount, 3) : questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-200 block mb-3">
                  Tingkat Kesulitan (Taksonomi Bloom)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    'C1-Mengingat',
                    'C2-Memahami',
                    'C3-Mengaplikasikan',
                    'C4-Menganalisis',
                    'C5-Mengevaluasi',
                    'C6-Mencipta',
                  ].map((level) => {
                    const code = level.split('-')[0]
                    return (
                      <button
                        key={code}
                        onClick={() => setDifficulty(code)}
                        className={cn(
                          'px-4 py-3 rounded-xl border text-sm font-medium text-left transition-all',
                          difficulty === code
                            ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                            : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 text-slate-600 dark:text-slate-400'
                        )}
                      >
                        {level}
                      </button>
                    )
                  })}
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-red-600 font-bold text-xs">!</span>
                  </div>
                  {error}
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={!file || isGenerating}
                className={cn(
                  'w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg',
                  !file || isGenerating
                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90 active:scale-95 shadow-blue-200'
                )}
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {loadingText}
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
      ) : (
        /* Result Phase: Split View */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 h-auto md:h-[700px]"
        >
          {/* Left: Summary */}
          <div className="md:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col min-h-[300px] md:min-h-0">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">
              {result.type === 'reading'
                ? 'Teks Bacaan'
                : result.type === 'writing'
                  ? 'Konteks Topik'
                  : 'Rangkuman Materi'}
            </h2>
            <div className="flex-1 overflow-y-auto pr-2 text-slate-600 dark:text-slate-400 leading-relaxed">
              {result.summary}
            </div>
            <button
              onClick={() => setResult(null)}
              className="mt-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Buat Baru
            </button>
          </div>

          {/* Right: Quiz Cards */}
          <div className="md:col-span-2 bg-slate-100 dark:bg-slate-900 p-4 md:p-6 rounded-3xl border border-slate-200 dark:border-slate-700 flex flex-col min-h-[500px] md:min-h-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 sm:gap-0">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                {result.type === 'writing' ? 'Daftar Topik' : 'Daftar Soal'} (
                {result.questions.length})
              </h2>
              <div className="flex gap-2 w-full sm:w-auto items-center">
                <input
                  type="date"
                  value={dueDateStr}
                  onChange={(e) => setDueDateStr(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Tanggal tenggat"
                />
                <button
                  onClick={handleSaveToCalendar}
                  className="flex-1 sm:flex-none px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <CalendarIcon className="w-4 h-4" />
                  Jadwalkan
                </button>
                <button
                  onClick={handleAddToCourse}
                  className="flex-1 sm:flex-none px-6 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 dark:shadow-blue-900 transition-transform active:scale-95"
                >
                  <BookOpen className="w-4 h-4" />
                  Tambahkan ke Modul Kursus
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {result.questions.map((q, i: number) => (
                <div
                  key={q.id}
                  className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 flex gap-3">
                      <span className="text-blue-500">{i + 1}.</span>
                      {q.text}
                    </h3>
                    <button
                      onClick={() => {
                        const newText = prompt("Edit soal:", q.text);
                        if (newText && newText !== q.text) {
                          setResult((prev: any) => prev ? { ...prev, questions: prev.questions.map((question: any, idx: number) => idx === i ? { ...question, text: newText } : question) } : null);
                        }
                      }}
                      className="text-slate-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Edit soal"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                  {result.type === 'quiz' && q.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {q.options.map((opt, j: number) => (
                        <div
                          key={j}
                          className={cn(
                            'px-4 py-3 rounded-xl text-sm font-medium border',
                            j === (q.answer as unknown as number)
                              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                              : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                          )}
                        >
                          {String.fromCharCode(65 + j)}. {typeof opt === 'string' ? opt : opt.text}
                        </div>
                      ))}
                    </div>
                  )}
                  {result.type !== 'quiz' && q.answer && (
                    <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
                        {result.type === 'reading'
                          ? 'Kunci Jawaban / Poin Penting:'
                          : 'Kriteria Penilaian / Rubrik:'}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{q.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Skeleton UI Phase */}
      <AnimatePresence>
        {isGenerating && !result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="w-full max-w-2xl bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center shrink-0">
                  <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    AI sedang bekerja...
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    Mohon tunggu sebentar
                  </p>
                </div>
              </div>
              <ProgressSteps loadingText={loadingText} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
