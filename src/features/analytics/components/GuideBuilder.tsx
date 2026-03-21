import { useState } from 'react'
import { Save, X, Loader2 } from 'lucide-react'
import { cn } from '@/src/utils/cn'
import { useUpsertGuide } from '@/src/features/guidance'
import type { LearningGuide, GuideType, GuideTrigger, GuideSegment } from '@/src/features/guidance'

interface Props {
  courseId: string
  guide?: LearningGuide | null
  defaultTargetId?: string
  onClose: () => void
}

const GUIDE_TYPES: { value: GuideType; label: string }[] = [
  { value: 'banner', label: 'Banner' },
  { value: 'tooltip', label: 'Tooltip' },
  { value: 'walkthrough', label: 'Walkthrough' },
  { value: 'checkpoint', label: 'Checkpoint' },
]

const SEGMENTS: { value: GuideSegment; label: string }[] = [
  { value: 'all', label: 'Semua Siswa' },
  { value: 'at_risk', label: 'Berisiko' },
  { value: 'low', label: 'Engagement Rendah' },
  { value: 'medium', label: 'Engagement Sedang' },
  { value: 'high', label: 'Engagement Tinggi' },
  { value: 'struggling', label: 'Kesulitan (Struggle)' },
]

const TRIGGERS: { value: GuideTrigger; label: string; hasValue: boolean }[] = [
  { value: 'on_enter', label: 'Saat memasuki pelajaran', hasValue: false },
  { value: 'after_seconds', label: 'Setelah X detik', hasValue: true },
  { value: 'on_struggle', label: 'Saat terdeteksi struggle', hasValue: false },
  { value: 'on_idle', label: 'Saat idle X detik', hasValue: true },
]

export function GuideBuilder({ guide, defaultTargetId, onClose }: Props) {
  const { mutate: upsertGuide, isPending } = useUpsertGuide()

  const [title, setTitle] = useState(guide?.title ?? '')
  const [content, setContent] = useState(guide?.content ?? '')
  const [guideType, setGuideType] = useState<GuideType>(guide?.guide_type ?? 'banner')
  const [targetId, setTargetId] = useState(guide?.target_id ?? defaultTargetId ?? '')
  const [segment, setSegment] = useState<GuideSegment>(guide?.segment ?? 'all')
  const [triggerType, setTriggerType] = useState<GuideTrigger>(guide?.trigger_type ?? 'on_enter')
  const [triggerValue, setTriggerValue] = useState(guide?.trigger_value ?? 30)
  const [priority, setPriority] = useState(guide?.priority ?? 0)
  const [isActive, setIsActive] = useState(guide?.is_active ?? true)

  const selectedTrigger = TRIGGERS.find((t) => t.value === triggerType)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim() || !targetId.trim()) return

    upsertGuide(
      {
        id: guide?.id,
        title: title.trim(),
        content: content.trim(),
        guide_type: guideType,
        target_type: 'lesson',
        target_id: targetId.trim(),
        segment,
        trigger_type: triggerType,
        trigger_value: selectedTrigger?.hasValue ? triggerValue : 0,
        priority,
        is_active: isActive,
      },
      { onSuccess: onClose }
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-teal-200 bg-teal-50/50 p-5 dark:border-teal-800/40 dark:bg-teal-900/10"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
          {guide ? 'Edit Panduan' : 'Panduan Baru'}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Title */}
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Judul *
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Tips mengerjakan quiz"
            required
            className={cn(
              'w-full rounded-lg border px-3 py-2 text-sm',
              'border-slate-200 bg-white text-slate-800',
              'dark:border-slate-700 dark:bg-slate-800 dark:text-white',
              'focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400'
            )}
          />
        </div>

        {/* Content */}
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Isi Panduan *{' '}
            {guideType === 'walkthrough' && (
              <span className="text-slate-400">(pisahkan langkah dengan "---")</span>
            )}
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={3}
            placeholder="Tulis panduan di sini..."
            className={cn(
              'w-full resize-y rounded-lg border px-3 py-2 text-sm',
              'border-slate-200 bg-white text-slate-800',
              'dark:border-slate-700 dark:bg-slate-800 dark:text-white',
              'focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400'
            )}
          />
        </div>

        {/* Target Lesson ID */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Target Lesson ID *
          </label>
          <input
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            placeholder="UUID pelajaran"
            required
            className={cn(
              'w-full rounded-lg border px-3 py-2 text-sm font-mono',
              'border-slate-200 bg-white text-slate-800',
              'dark:border-slate-700 dark:bg-slate-800 dark:text-white',
              'focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400'
            )}
          />
        </div>

        {/* Guide Type */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Tipe Panduan
          </label>
          <select
            value={guideType}
            onChange={(e) => setGuideType(e.target.value as GuideType)}
            className={cn(
              'w-full rounded-lg border px-3 py-2 text-sm',
              'border-slate-200 bg-white text-slate-800',
              'dark:border-slate-700 dark:bg-slate-800 dark:text-white',
              'focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400'
            )}
          >
            {GUIDE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Segment */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Target Segmen
          </label>
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value as GuideSegment)}
            className={cn(
              'w-full rounded-lg border px-3 py-2 text-sm',
              'border-slate-200 bg-white text-slate-800',
              'dark:border-slate-700 dark:bg-slate-800 dark:text-white',
              'focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400'
            )}
          >
            {SEGMENTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Trigger */}
        <div className={cn(selectedTrigger?.hasValue ? 'flex gap-2 items-end' : '')}>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Trigger
            </label>
            <select
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value as GuideTrigger)}
              className={cn(
                'w-full rounded-lg border px-3 py-2 text-sm',
                'border-slate-200 bg-white text-slate-800',
                'dark:border-slate-700 dark:bg-slate-800 dark:text-white',
                'focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400'
              )}
            >
              {TRIGGERS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          {selectedTrigger?.hasValue && (
            <div className="w-24">
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Detik
              </label>
              <input
                type="number"
                min={1}
                value={triggerValue}
                onChange={(e) => setTriggerValue(Number(e.target.value))}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-sm',
                  'border-slate-200 bg-white text-slate-800',
                  'dark:border-slate-700 dark:bg-slate-800 dark:text-white',
                  'focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400'
                )}
              />
            </div>
          )}
        </div>

        {/* Priority + Active */}
        <div className="flex items-end gap-4 sm:col-span-2">
          <div className="w-32">
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Prioritas
            </label>
            <input
              type="number"
              min={0}
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className={cn(
                'w-full rounded-lg border px-3 py-2 text-sm',
                'border-slate-200 bg-white text-slate-800',
                'dark:border-slate-700 dark:bg-slate-800 dark:text-white',
                'focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400'
              )}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-teal-600"
            />
            <span className="text-sm text-slate-600 dark:text-slate-400">Aktif</span>
          </label>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60 transition-colors"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Simpan
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}
