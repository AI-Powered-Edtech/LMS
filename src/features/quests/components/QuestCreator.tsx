/**
 * QuestCreator — form for teachers/admins to create new quests.
 * Phase 36A: Learning Quests System
 */

import { useState } from 'react'

import { useToast } from '@/hooks/useToast'
import { cn } from '@/utils/cn'

import { useCreateQuest } from '../queries/questQueries'
import type { QuestConditionType, QuestType } from '../types'
import { CONDITION_TYPE_LABELS, QUEST_TYPE_LABELS } from '../types'

interface QuestCreatorProps {
  onSave: () => void
  onCancel: () => void
}

const QUEST_TYPES: QuestType[] = ['daily', 'weekly', 'milestone', 'challenge']
const CONDITION_TYPES: QuestConditionType[] = [
  'complete_lessons',
  'quiz_score_above',
  'assignment_submit',
  'streak_maintain',
]

function FormLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-medium text-slate-700 dark:text-slate-300"
    >
      {children}
    </label>
  )
}

const inputCls = cn(
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900',
  'placeholder:text-slate-400',
  'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30',
  'dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500',
  'dark:focus:border-primary-400'
)

export function QuestCreator({ onSave, onCancel }: QuestCreatorProps) {
  const { addToast } = useToast()
  const createQuest = useCreateQuest()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [questType, setQuestType] = useState<QuestType>('weekly')
  const [icon, setIcon] = useState('🎯')
  const [xpReward, setXpReward] = useState(50)
  const [target, setTarget] = useState(1)
  const [conditionType, setConditionType] = useState<QuestConditionType>('complete_lessons')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!title.trim()) {
      addToast({ type: 'error', message: 'Judul misi tidak boleh kosong' })
      return
    }

    try {
      await createQuest.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        quest_type: questType,
        icon: icon.trim() || '🎯',
        xp_reward: xpReward,
        sort_order: 0,
        is_active: true,
        conditions: {
          type: conditionType,
          target,
        },
      })
      addToast({ type: 'success', message: 'Misi berhasil dibuat!' })
      onSave()
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal membuat misi',
      })
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800"
      noValidate
    >
      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Buat Misi Baru</h2>

      {/* Title */}
      <div className="space-y-1.5">
        <FormLabel htmlFor="quest-title">Judul Misi</FormLabel>
        <input
          id="quest-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Contoh: Selesaikan 3 pelajaran minggu ini"
          maxLength={120}
          required
          className={inputCls}
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <FormLabel htmlFor="quest-desc">Deskripsi (opsional)</FormLabel>
        <textarea
          id="quest-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Jelaskan cara menyelesaikan misi ini..."
          rows={3}
          maxLength={500}
          className={cn(inputCls, 'resize-none')}
        />
      </div>

      {/* Quest type + Icon row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <FormLabel htmlFor="quest-type">Tipe Misi</FormLabel>
          <select
            id="quest-type"
            value={questType}
            onChange={(e) => setQuestType(e.target.value as QuestType)}
            className={inputCls}
          >
            {QUEST_TYPES.map((t) => (
              <option key={t} value={t}>
                {QUEST_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <FormLabel htmlFor="quest-icon">Ikon (emoji)</FormLabel>
          <div className="flex items-center gap-2">
            <input
              id="quest-icon"
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="🎯"
              maxLength={4}
              className={cn(inputCls, 'w-20 shrink-0 text-center text-xl')}
            />
            <span className="text-2xl" aria-hidden="true">
              {icon || '🎯'}
            </span>
          </div>
        </div>
      </div>

      {/* XP Reward + Target row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <FormLabel htmlFor="quest-xp">Hadiah XP</FormLabel>
          <input
            id="quest-xp"
            type="number"
            value={xpReward}
            onChange={(e) => setXpReward(Math.max(1, Number(e.target.value)))}
            min={1}
            max={1000}
            className={inputCls}
          />
        </div>

        <div className="space-y-1.5">
          <FormLabel htmlFor="quest-target">Target (jumlah)</FormLabel>
          <input
            id="quest-target"
            type="number"
            value={target}
            onChange={(e) => setTarget(Math.max(1, Number(e.target.value)))}
            min={1}
            max={999}
            className={inputCls}
          />
        </div>
      </div>

      {/* Condition type */}
      <div className="space-y-1.5">
        <FormLabel htmlFor="quest-condition">Jenis Kondisi</FormLabel>
        <select
          id="quest-condition"
          value={conditionType}
          onChange={(e) => setConditionType(e.target.value as QuestConditionType)}
          className={inputCls}
        >
          {CONDITION_TYPES.map((c) => (
            <option key={c} value={c}>
              {CONDITION_TYPE_LABELS[c]}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Siswa harus memenuhi kondisi ini sebanyak <strong>{target}x</strong> untuk menyelesaikan
          misi.
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-700">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={createQuest.isPending || !title.trim()}
          className="rounded-xl bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50 dark:bg-primary-500 dark:hover:bg-primary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          {createQuest.isPending ? 'Menyimpan...' : 'Simpan Misi'}
        </button>
      </div>
    </form>
  )
}
