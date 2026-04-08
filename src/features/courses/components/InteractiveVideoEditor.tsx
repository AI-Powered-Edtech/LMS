import { Check, Clock, FileText, Plus, Trash2, Upload, VideoIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'

import { Modal, ModalBody, ModalFooter, ModalHeader, Tabs } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import {
  type VideoCaption,
  videoCaptionService,
} from '@/features/courses/services/videoCaptionService'
import type { InteractiveEvent, InteractiveVideoMetadata } from '@/features/lessons/types'
import { getTeacherQuizzes } from '@/features/quizzes/api/quizManager.service'
import { type VideoAsset, VideoProcessingStatus, VideoUploader } from '@/features/video'

interface InteractiveVideoEditorProps {
  metadata: InteractiveVideoMetadata
  onSave: (metadata: InteractiveVideoMetadata) => void
  onClose: () => void
  lessonId?: string // optional — enables caption tab when provided
  blockId?: string // optional — for per-block caption scoping
  /** Called when a video is uploaded so the parent can auto-fill the URL field */
  onVideoUploaded?: (videoUrl: string, hlsUrl: string | null) => void
}

const LANGUAGE_OPTIONS = [
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'en', label: 'English' },
  { code: 'jv', label: 'Basa Jawa' },
  { code: 'su', label: 'Basa Sunda' },
]

type ActiveTab = 'upload' | 'events' | 'captions'

export function InteractiveVideoEditor({
  metadata,
  onSave,
  onClose,
  lessonId,
  blockId,
  onVideoUploaded,
}: InteractiveVideoEditorProps) {
  const { tenantId } = useAuth()
  const [events, setEvents] = useState<InteractiveEvent[]>(metadata.interactiveEvents || [])
  const [quizzes, setQuizzes] = useState<{ id: string; title: string }[]>([])
  const [_loading, setLoading] = useState(true)

  // Tab state — 'upload' tab always first when lessonId is provided
  const [activeTab, setActiveTab] = useState<ActiveTab>('upload')

  // Upload state
  const [uploadedAsset, setUploadedAsset] = useState<VideoAsset | null>(null)

  // Caption state
  const [captions, setCaptions] = useState<VideoCaption[]>([])
  const [captionLoading, setCaptionLoading] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadLang, setUploadLang] = useState('id')
  const [uploadLabel, setUploadLabel] = useState('Bahasa Indonesia')
  const [captionUploading, setCaptionUploading] = useState(false)
  const [captionError, setCaptionError] = useState<string | null>(null)

  // Load quizzes for event selector
  useEffect(() => {
    async function loadQuizzes() {
      if (!tenantId) return
      try {
        const data = await getTeacherQuizzes(tenantId)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setQuizzes(data.map((q: any) => ({ id: String(q.id ?? ''), title: String(q.title ?? '') })))
      } catch (err) {
        console.error('Failed to load quizzes', err)
      } finally {
        setLoading(false)
      }
    }
    void loadQuizzes()
  }, [tenantId])

  // Load captions when lessonId is available
  useEffect(() => {
    if (!lessonId) return
    setCaptionLoading(true)
    videoCaptionService
      .getCaptions(lessonId, blockId)
      .then(setCaptions)
      .catch((err) => console.error('Failed to load captions', err))
      .finally(() => setCaptionLoading(false))
  }, [lessonId, blockId])

  // ─── Video upload handler ─────────────────────────────────────────────────

  const handleVideoUploaded = (asset: VideoAsset) => {
    setUploadedAsset(asset)
    // Notify parent to auto-fill video URL field
    const videoUrl = asset.hls_url ?? asset.mp4_url ?? ''
    onVideoUploaded?.(videoUrl, asset.hls_url ?? null)
  }

  // ─── Event handlers ───────────────────────────────────────────────────────

  const handleAddEvent = () => {
    setEvents([...events, { timeInSeconds: 0, type: 'quiz' }])
  }

  const handleUpdateEvent = (index: number, updates: Partial<InteractiveEvent>) => {
    const newEvents = [...events]
    newEvents[index] = { ...newEvents[index], ...updates }
    setEvents(newEvents)
  }

  const handleDeleteEvent = (index: number) => {
    const newEvents = [...events]
    newEvents.splice(index, 1)
    setEvents(newEvents)
  }

  const handleSave = () => {
    onSave({
      ...metadata,
      interactiveEvents: events.sort((a, b) => a.timeInSeconds - b.timeInSeconds),
    })
    onClose()
  }

  // ─── Caption handlers ─────────────────────────────────────────────────────

  const handleUploadCaption = async () => {
    if (!tenantId || !lessonId || !uploadFile) return
    setCaptionUploading(true)
    setCaptionError(null)
    try {
      const newCaption = await videoCaptionService.uploadCaption(
        tenantId,
        lessonId,
        blockId ?? null,
        uploadLang,
        uploadLabel,
        uploadFile
      )
      setCaptions((prev) => [...prev, newCaption])
      setUploadFile(null)
      setUploadLabel('Bahasa Indonesia')
      setUploadLang('id')
    } catch (err) {
      setCaptionError(err instanceof Error ? err.message : 'Upload gagal')
    } finally {
      setCaptionUploading(false)
    }
  }

  const handleDeleteCaption = async (captionId: string) => {
    try {
      await videoCaptionService.deleteCaption(captionId)
      setCaptions((prev) => prev.filter((c) => c.id !== captionId))
    } catch (err) {
      console.error('Failed to delete caption', err)
    }
  }

  const handleSetDefault = async (captionId: string) => {
    if (!lessonId) return
    try {
      await videoCaptionService.setDefaultCaption(captionId, lessonId)
      setCaptions((prev) => prev.map((c) => ({ ...c, is_default: c.id === captionId })))
    } catch (err) {
      console.error('Failed to set default caption', err)
    }
  }

  // ─── Time helpers ─────────────────────────────────────────────────────────

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const parseTime = (timeStr: string) => {
    const parts = timeStr.split(':')
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1])
    }
    return parseInt(timeStr) || 0
  }

  // ─── Tab config ───────────────────────────────────────────────────────────

  const tabItems = [
    {
      id: 'upload',
      label: 'Unggah Video',
      icon: <VideoIcon className="w-4 h-4" />,
    },
    { id: 'events', label: 'Event Interaktif', icon: <Clock className="w-4 h-4" /> },
    {
      id: 'captions',
      label: 'Teks & Subtitel',
      icon: <FileText className="w-4 h-4" />,
      count: captions.length > 0 ? captions.length : undefined,
    },
  ]

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Modal open={true} onClose={onClose} size="2xl">
      <ModalHeader title="Edit Interaksi Video" onClose={onClose} />

      {/* Tabs — only shown when lessonId is provided */}
      {lessonId && (
        <div className="px-6 pt-4 border-b border-neutral-100 dark:border-neutral-700">
          <Tabs
            tabs={tabItems}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as ActiveTab)}
          />
        </div>
      )}

      <ModalBody className="space-y-4">
        {/* ── Upload Video Tab ── */}
        {activeTab === 'upload' && lessonId && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <VideoIcon className="w-5 h-5 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">
                  Unggah video langsung ke EduSync
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                  Video akan disimpan di Supabase Storage. Setelah selesai, URL video akan otomatis
                  diisi ke kolom URL di atas.
                </p>
              </div>
            </div>

            <VideoUploader lessonId={lessonId} blockId={blockId} onUploaded={handleVideoUploaded} />

            {/* Show processing status if upload resulted in an asset still being processed */}
            {uploadedAsset && uploadedAsset.status === 'processing' && (
              <VideoProcessingStatus asset={uploadedAsset} />
            )}
          </div>
        )}

        {/* ── Events Tab ── */}
        {activeTab === 'events' && (
          <>
            <AnimatePresence mode="popLayout">
              {events.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-12 px-4 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50"
                >
                  <div className="w-16 h-16 bg-neutral-50 dark:bg-neutral-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <Clock className="w-8 h-8 text-neutral-400 dark:text-neutral-500" />
                  </div>
                  <h3 className="text-lg font-bold text-neutral-700 dark:text-neutral-200 mb-2">
                    Belum ada event
                  </h3>
                  <p className="text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto mb-6 text-sm">
                    Tambahkan event untuk memunculkan kuis saat video diputar.
                  </p>
                  <button
                    onClick={handleAddEvent}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Event Pertama
                  </button>
                </motion.div>
              ) : (
                events.map((event, idx) => (
                  <motion.div
                    key={idx}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center shadow-sm"
                  >
                    <div className="w-full md:w-32 shrink-0">
                      <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
                        Waktu (MM:SS)
                      </label>
                      <input
                        type="text"
                        placeholder="00:00"
                        value={formatTime(event.timeInSeconds)}
                        onChange={(e) => {
                          const val = e.target.value
                          if (/^[0-9:]*$/.test(val)) {
                            // Update on blur only
                          }
                        }}
                        onBlur={(e) =>
                          handleUpdateEvent(idx, { timeInSeconds: parseTime(e.target.value) })
                        }
                        className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm font-medium text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-neutral-50 dark:focus:bg-neutral-600 transition-colors"
                      />
                    </div>

                    <div className="w-full md:flex-1">
                      <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
                        Pilih Kuis
                      </label>
                      <select
                        value={event.quizId || ''}
                        onChange={(e) => handleUpdateEvent(idx, { quizId: e.target.value })}
                        className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm font-medium text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-neutral-50 dark:focus:bg-neutral-600 transition-colors"
                      >
                        <option value="">-- Pilih Kuis --</option>
                        {quizzes.map((q) => (
                          <option key={q.id} value={q.id}>
                            {q.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={() => handleDeleteEvent(idx)}
                      className="p-2 text-danger-400 hover:text-danger-600 dark:hover:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/30 rounded-lg transition-colors mt-6 md:mt-0"
                      title="Hapus Event"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
            {events.length > 0 && (
              <button
                onClick={handleAddEvent}
                className="w-full py-3 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-500 dark:text-neutral-400 font-medium hover:border-indigo-300 dark:hover:border-indigo-600 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Tambah Event Lagi
              </button>
            )}
          </>
        )}

        {/* ── Captions Tab ── */}
        {activeTab === 'captions' && lessonId && (
          <div className="space-y-6">
            {/* Existing captions list */}
            {captionLoading ? (
              <div className="text-center py-8 text-neutral-500 dark:text-neutral-400 text-sm">
                Memuat daftar subtitle...
              </div>
            ) : captions.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-2xl">
                <FileText className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
                <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                  Belum ada subtitle. Unggah file WebVTT di bawah.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Subtitle Tersedia
                </h4>
                {captions.map((caption) => (
                  <div
                    key={caption.id}
                    className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl"
                  >
                    <FileText className="w-4 h-4 text-neutral-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">
                        {caption.label}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {caption.language_code.toUpperCase()}
                        {caption.is_default && (
                          <span className="ml-2 text-green-600 dark:text-green-400 font-semibold">
                            • Default
                          </span>
                        )}
                      </p>
                    </div>
                    {!caption.is_default && (
                      <button
                        onClick={() => handleSetDefault(caption.id)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
                        title="Jadikan default"
                      >
                        Set default
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteCaption(caption.id)}
                      className="p-1.5 text-danger-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/30 rounded-lg transition-colors shrink-0"
                      title="Hapus subtitle"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload form */}
            <div className="border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4 space-y-4">
              <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                Unggah Subtitle Baru (WebVTT)
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
                    Bahasa
                  </label>
                  <select
                    value={uploadLang}
                    onChange={(e) => {
                      const opt = LANGUAGE_OPTIONS.find((o) => o.code === e.target.value)
                      setUploadLang(e.target.value)
                      if (opt) setUploadLabel(opt.label)
                    }}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm font-medium text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  >
                    {LANGUAGE_OPTIONS.map((opt) => (
                      <option key={opt.code} value={opt.code}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
                    Label Tampil
                  </label>
                  <input
                    type="text"
                    value={uploadLabel}
                    onChange={(e) => setUploadLabel(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm font-medium text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
                  File WebVTT
                </label>
                <label className="flex items-center gap-3 p-3 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-xl cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors">
                  <Upload className="w-5 h-5 text-neutral-400 shrink-0" />
                  <span className="text-sm text-neutral-500 dark:text-neutral-400 flex-1 truncate">
                    {uploadFile ? uploadFile.name : 'Klik untuk memilih file .vtt'}
                  </span>
                  <input
                    type="file"
                    accept=".vtt,text/vtt"
                    className="sr-only"
                    onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              {captionError && (
                <p className="text-sm text-danger-600 dark:text-danger-400">{captionError}</p>
              )}

              <button
                onClick={handleUploadCaption}
                disabled={!uploadFile || captionUploading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {captionUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Mengupload...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Unggah Subtitle
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <button
          onClick={onClose}
          className="px-5 py-2.5 text-neutral-600 dark:text-neutral-400 font-medium hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 rounded-xl transition-colors"
        >
          Batal
        </button>
        {activeTab === 'events' && (
          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors shadow-sm shadow-indigo-200 dark:shadow-indigo-900 flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Simpan Perubahan
          </button>
        )}
      </ModalFooter>
    </Modal>
  )
}
