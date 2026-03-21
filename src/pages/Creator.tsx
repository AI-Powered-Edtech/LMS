import { useState, useCallback } from 'react'
import {
  UploadCloud,
  FileText,
  Settings,
  Sparkles,
  Edit2,
  Calendar as CalendarIcon,
  BookOpen,
} from 'lucide-react'
import { cn } from '@/src/utils/cn'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '@/src/contexts/AuthContext'
// TODO: AI generation will be routed through backend API (Phase 5)
import { useAddCalendarEvent } from '@/src/features/calendar/hooks/useCalendarQueries'
import { useSendNotification } from '@/src/features/notifications'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/src/lib/supabase'

export function Creator() {
  const { user } = useAuth()
  const { addEvent } = useAddCalendarEvent()
  const sendNotification = useSendNotification()
  const navigate = useNavigate()

  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [assignmentType, setAssignmentType] = useState('quiz') // quiz, reading, writing
  const [questionCount, setQuestionCount] = useState(10)
  const [difficulty, setDifficulty] = useState('C3')
  const [isGenerating, setIsGenerating] = useState(false)
  const [loadingText, setLoadingText] = useState('Mengekstrak teks...')
  const [result, setResult] = useState<any>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0]
      // Validation
      if (droppedFile.size > 50 * 1024 * 1024) {
        alert('Ukuran file maksimal 50MB')
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
        alert('Format file tidak didukung. Gunakan .pdf, .docx, .txt, atau .mp4')
        return
      }
      setFile(droppedFile)
    }
  }, [])

  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!file) return
    setIsGenerating(true)
    setError(null)
    setLoadingText('Membaca file...')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('assignmentType', assignmentType)
      formData.append('questionCount', questionCount.toString())
      formData.append('difficulty', difficulty)

      const { data, error: supaError } = await supabase.functions.invoke('generate-ai-content', {
        body: formData,
      })

      if (supaError) {
        console.error('Supabase edge function error:', supaError)
        // Specifically catch a common indication of a 404 from invoke
        if (
          supaError.message &&
          (supaError.message.includes('404') ||
            supaError.message.includes('not found') ||
            supaError.message.includes('FetchError'))
        ) {
          throw new Error('⚠️ Layanan AI (Backend API) belum tersedia saat ini.')
        }
        throw new Error(supaError.message || 'Gagal memproses materi dengan AI.')
      }

      if (data?.error) {
        throw new Error(data.error)
      }

      // Check if response contains expected data structure
      if (data && data.questions && Array.isArray(data.questions)) {
        setResult(data)
      } else {
        throw new Error('Respons API tidak valid.')
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Terjadi kesalahan saat memproses materi.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveToCalendar = () => {
    if (!result) return

    // Mock date: 3 days from now
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 3)
    dueDate.setHours(23, 59, 0, 0)

    addEvent({
      title: `Kuis: ${file?.name.split('.')[0] || 'Materi Baru'}`,
      date: dueDate,
      time: '23:59',
      type: 'quiz',
      location: 'Online',
      description: result.summary.substring(0, 100) + '...',
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
    navigate('/teaching/course-builder', {
      state: {
        action: result.type === 'quiz' ? 'add-quiz' : 'add-assignment',
        quizData: {
          title: file?.name.split('.')[0] || 'AI Generated Content',
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
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            AI Course & Quiz Generator
          </h1>
          <p className="text-slate-500 mt-2">
            Gunakan AI untuk membuat materi kursus dan kuis secara otomatis dari dokumen atau video.
          </p>
          <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
            <strong>AI Creator:</strong> Otomatisasi pembuatan konten dari materi yang ada.
          </div>
        </div>
      </div>

      {!result ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Upload Area */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
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
                  ? 'border-blue-500 bg-blue-50 scale-[1.02]'
                  : 'border-slate-300 bg-slate-50 hover:bg-slate-100',
                file && 'border-green-500 bg-green-50'
              )}
            >
              {file ? (
                <>
                  <FileText className="w-12 h-12 text-green-500 mb-4" />
                  <p className="font-bold text-slate-700">{file.name}</p>
                  <p className="text-sm text-slate-500 mt-1">
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
                  <p className="font-bold text-slate-700">Tarik & Lepas file di sini</p>
                  <p className="text-sm text-slate-500 mt-2">
                    Mendukung .pdf, .docx, .mp4 (Maks 50MB)
                  </p>
                  <button className="mt-6 px-6 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50 shadow-sm">
                    Pilih File
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Configuration Area */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Settings className="w-6 h-6 text-slate-500" />
              Konfigurasi AI
            </h2>

            <div className="space-y-8">
              <div>
                <label className="font-bold text-slate-700 block mb-3">Jenis Tugas</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'quiz', label: 'Kuis (PG)' },
                    { id: 'reading', label: 'Reading' },
                    { id: 'writing', label: 'Writing' },
                  ].map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setAssignmentType(type.id)}
                      className={cn(
                        'px-4 py-3 rounded-xl border text-sm font-medium text-center transition-all',
                        assignmentType === type.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      )}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="font-bold text-slate-700">
                    {assignmentType === 'writing' ? 'Jumlah Topik' : 'Jumlah Soal'}
                  </label>
                  <span className="font-bold text-blue-600">
                    {assignmentType === 'writing' ? Math.min(questionCount, 3) : questionCount}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max={assignmentType === 'writing' ? '3' : '50'}
                  value={assignmentType === 'writing' ? Math.min(questionCount, 3) : questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-3">
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
                            ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        )}
                      >
                        {level}
                      </button>
                    )
                  })}
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium flex items-start gap-3">
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
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
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
                    Generate with AI
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
          <div className="md:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col min-h-[300px] md:min-h-0">
            <h2 className="text-xl font-bold text-slate-800 mb-4">
              {result.type === 'reading'
                ? 'Teks Bacaan'
                : result.type === 'writing'
                  ? 'Konteks Topik'
                  : 'Rangkuman Materi'}
            </h2>
            <div className="flex-1 overflow-y-auto pr-2 text-slate-600 leading-relaxed">
              {result.summary}
            </div>
            <button
              onClick={() => setResult(null)}
              className="mt-4 py-3 border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50"
            >
              Buat Baru
            </button>
          </div>

          {/* Right: Quiz Cards */}
          <div className="md:col-span-2 bg-slate-100 p-4 md:p-6 rounded-3xl border border-slate-200 flex flex-col min-h-[500px] md:min-h-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 sm:gap-0">
              <h2 className="text-xl font-bold text-slate-800">
                {result.type === 'writing' ? 'Daftar Topik' : 'Daftar Soal'} (
                {result.questions.length})
              </h2>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={handleSaveToCalendar}
                  className="flex-1 sm:flex-none px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <CalendarIcon className="w-4 h-4" />
                  Jadwalkan
                </button>
                <button
                  onClick={handleAddToCourse}
                  className="flex-1 sm:flex-none px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-transform active:scale-95"
                >
                  <BookOpen className="w-4 h-4" />
                  Add to Course Module
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {result.questions.map((q: any, i: number) => (
                <div
                  key={q.id}
                  className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-slate-800 flex gap-3">
                      <span className="text-blue-500">{i + 1}.</span>
                      {q.text}
                    </h3>
                    <button className="text-slate-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                  {result.type === 'quiz' && q.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {q.options.map((opt: string, j: number) => (
                        <div
                          key={j}
                          className={cn(
                            'px-4 py-3 rounded-xl text-sm font-medium border',
                            j === q.answer
                              ? 'bg-green-50 border-green-200 text-green-700'
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                          )}
                        >
                          {String.fromCharCode(65 + j)}. {opt}
                        </div>
                      ))}
                    </div>
                  )}
                  {result.type !== 'quiz' && q.answer && (
                    <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-sm font-bold text-slate-700 mb-1">
                        {result.type === 'reading'
                          ? 'Kunci Jawaban / Poin Penting:'
                          : 'Kriteria Penilaian / Rubrik:'}
                      </p>
                      <p className="text-sm text-slate-600">{q.answer}</p>
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
            className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="w-full max-w-2xl bg-white p-8 rounded-3xl shadow-2xl border border-slate-100">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-blue-600 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">AI sedang bekerja...</h3>
                  <p className="text-slate-500">{loadingText}</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Skeleton Card */}
                {[1, 2].map((i) => (
                  <div key={i} className="border border-slate-100 rounded-2xl p-5 space-y-4">
                    <div className="h-6 bg-slate-200 rounded-md w-3/4 animate-pulse" />
                    <div className="grid grid-cols-2 gap-3">
                      {[1, 2, 3, 4].map((j) => (
                        <div key={j} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
