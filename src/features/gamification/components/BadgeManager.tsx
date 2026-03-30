import { AlertTriangle, Pencil, Plus, Save, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import { SkeletonCard } from '@/src/components/ui'
import { useAuth } from '@/src/contexts/AuthContext'
import { useToast } from '@/src/hooks/useToast'
import { cn } from '@/src/utils/cn'

import { useBadgeDefinitions, useSaveBadgeDefinition } from '../queries/gamificationQueries'
import type { BadgeRarity, BadgeType } from '../types'
import { RARITY_CONFIG } from '../types'

interface BadgeDefinitionRow {
  id: string
  name: string
  description: string
  icon_emoji: string
  badge_type: BadgeType
  criteria: { type: string; threshold?: number } | null
  xp_reward: number
  rarity: BadgeRarity
  is_active: boolean
  tenant_id: string | null
}

const BADGE_TYPES: { value: BadgeType; label: string }[] = [
  { value: 'completion', label: 'Penyelesaian' },
  { value: 'streak', label: 'Streak' },
  { value: 'mastery', label: 'Penguasaan' },
  { value: 'speed', label: 'Kecepatan' },
  { value: 'social', label: 'Sosial' },
]

const RARITIES: { value: BadgeRarity; label: string }[] = [
  { value: 'common', label: 'Umum' },
  { value: 'rare', label: 'Langka' },
  { value: 'epic', label: 'Epik' },
  { value: 'legendary', label: 'Legendaris' },
]

const CRITERIA_TYPES = [
  { value: 'lessons_completed', label: 'Pelajaran selesai', hasThreshold: true },
  { value: 'streak_days', label: 'Streak hari', hasThreshold: true },
  { value: 'quiz_perfect_score', label: 'Nilai sempurna kuis', hasThreshold: true },
  { value: 'course_completed', label: 'Kursus selesai', hasThreshold: false },
  { value: 'courses_completed', label: 'Banyak kursus selesai', hasThreshold: true },
  { value: 'course_master', label: 'Master kursus (≥90%)', hasThreshold: false },
  { value: 'speed_learner', label: 'Pelajar cepat', hasThreshold: false },
]

interface BadgeFormState {
  id?: string
  name: string
  description: string
  icon_emoji: string
  badge_type: BadgeType
  criteria_type: string
  criteria_threshold: number
  xp_reward: number
  rarity: BadgeRarity
  is_active: boolean
}

const emptyForm: BadgeFormState = {
  name: '',
  description: '',
  icon_emoji: '🏅',
  badge_type: 'completion',
  criteria_type: 'lessons_completed',
  criteria_threshold: 1,
  xp_reward: 10,
  rarity: 'common',
  is_active: true,
}

export function BadgeManager() {
  const { tenantId } = useAuth()
  const { addToast } = useToast()
  const { data: badges, isLoading, isError } = useBadgeDefinitions()
  const saveMutation = useSaveBadgeDefinition()
  const [editing, setEditing] = useState<BadgeFormState | null>(null)

  const handleEdit = (badge: BadgeDefinitionRow) => {
    setEditing({
      id: badge.id,
      name: badge.name,
      description: badge.description,
      icon_emoji: badge.icon_emoji,
      badge_type: badge.badge_type,
      criteria_type: badge.criteria?.type ?? 'lessons_completed',
      criteria_threshold: badge.criteria?.threshold ?? 1,
      xp_reward: badge.xp_reward,
      rarity: badge.rarity,
      is_active: badge.is_active,
    })
  }

  const handleSave = async () => {
    if (!editing || !tenantId) return
    const criteriaObj: Record<string, unknown> = { type: editing.criteria_type }
    const ct = CRITERIA_TYPES.find((c) => c.value === editing.criteria_type)
    if (ct?.hasThreshold) criteriaObj.threshold = editing.criteria_threshold

    try {
      await saveMutation.mutateAsync({
        id: editing.id,
        name: editing.name,
        description: editing.description,
        icon_emoji: editing.icon_emoji,
        badge_type: editing.badge_type,
        criteria: criteriaObj,
        xp_reward: editing.xp_reward,
        rarity: editing.rarity,
        is_active: editing.is_active,
        tenant_id: tenantId,
      })
      addToast({ message: 'Lencana berhasil disimpan', type: 'success' })
      setEditing(null)
    } catch {
      addToast({ message: 'Gagal menyimpan lencana', type: 'error' })
    }
  }

  if (isLoading) return <SkeletonCard lines={3} />

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="w-10 h-10 text-red-400 mb-3" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
          Gagal Memuat Badge
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Terjadi kesalahan saat memuat daftar badge. Silakan coba lagi nanti.
        </p>
      </div>
    )
  }

  const tenantBadges = (badges ?? []).filter((b: BadgeDefinitionRow) => b.tenant_id === tenantId)
  const systemBadges = (badges ?? []).filter((b: BadgeDefinitionRow) => b.tenant_id === null)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Kelola Badge</h3>
        <button
          onClick={() => setEditing(emptyForm)}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Badge Baru
        </button>
      </div>

      {/* Edit Form */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Nama
                  </label>
                  <input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                    placeholder="Nama lencana..."
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Emoji
                  </label>
                  <input
                    value={editing.icon_emoji}
                    onChange={(e) => setEditing({ ...editing, icon_emoji: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                    placeholder="🏅"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Deskripsi
                </label>
                <input
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  placeholder="Deskripsi lencana..."
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Tipe
                  </label>
                  <select
                    value={editing.badge_type}
                    onChange={(e) =>
                      setEditing({ ...editing, badge_type: e.target.value as BadgeType })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  >
                    {BADGE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Raritas
                  </label>
                  <select
                    value={editing.rarity}
                    onChange={(e) =>
                      setEditing({ ...editing, rarity: e.target.value as BadgeRarity })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  >
                    {RARITIES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    XP Reward
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editing.xp_reward}
                    onChange={(e) => setEditing({ ...editing, xp_reward: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editing.is_active}
                      onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                      className="rounded"
                    />
                    Aktif
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Kriteria
                  </label>
                  <select
                    value={editing.criteria_type}
                    onChange={(e) => setEditing({ ...editing, criteria_type: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  >
                    {CRITERIA_TYPES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                {CRITERIA_TYPES.find((c) => c.value === editing.criteria_type)?.hasThreshold && (
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      Threshold
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={editing.criteria_threshold}
                      onChange={(e) =>
                        setEditing({ ...editing, criteria_threshold: Number(e.target.value) })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saveMutation.isPending || !editing.name}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  <Save className="h-3.5 w-3.5" />
                  Simpan
                </button>
                <button
                  onClick={() => setEditing(null)}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  Batal
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Badge Lists */}
      {tenantBadges.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Badge Kustom
          </h4>
          <div className="space-y-2">
            {tenantBadges.map((b: BadgeDefinitionRow) => (
              <BadgeRow key={b.id} badge={b} onEdit={() => handleEdit(b)} />
            ))}
          </div>
        </div>
      )}

      {systemBadges.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Badge Sistem
          </h4>
          <div className="space-y-2">
            {systemBadges.map((b: BadgeDefinitionRow) => (
              <BadgeRow key={b.id} badge={b} isSystem />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function BadgeRow({
  badge,
  onEdit,
  isSystem,
}: {
  badge: BadgeDefinitionRow
  onEdit?: () => void
  isSystem?: boolean
}) {
  const rarity = RARITY_CONFIG[badge.rarity as BadgeRarity] ?? RARITY_CONFIG.common

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-3 py-2',
        'border-slate-200 dark:border-slate-700',
        !badge.is_active && 'opacity-50'
      )}
    >
      <span className="text-2xl">{badge.icon_emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">
            {badge.name}
          </span>
          <span
            className={cn(
              'rounded-full px-1.5 py-0.5 text-[9px] font-bold',
              rarity.bg,
              'text-slate-600 dark:text-slate-300'
            )}
          >
            {rarity.label}
          </span>
          {!badge.is_active && (
            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-600">
              Nonaktif
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-500 truncate">{badge.description}</p>
      </div>
      <span className="text-xs font-bold text-yellow-600 shrink-0">+{badge.xp_reward} XP</span>
      {!isSystem && onEdit && (
        <button
          onClick={onEdit}
          aria-label="Edit lencana"
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Pencil className="h-3.5 w-3.5 text-slate-400" />
        </button>
      )}
    </div>
  )
}
