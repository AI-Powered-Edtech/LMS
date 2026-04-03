import { ChevronRight, School } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { classroomService } from '@/features/classroom/api/classroomService'

interface StepCreateClassProps {
  onNext: () => void
  onSkip: () => void
  onClassCreated: (classId: string, joinCode: string) => void
  existingClassId?: string | null
  existingJoinCode?: string | null
}

/**
 * Step 2 — Buat Kelas Pertama: guru membuat kelas virtual pertama.
 */
export function StepCreateClass({
  onNext,
  onSkip,
  onClassCreated,
  existingClassId,
  existingJoinCode,
}: StepCreateClassProps) {
  const { user, tenantId } = useAuth()
  const [className, setClassName] = useState('')
  const [mapel, setMapel] = useState('')
  const [tahunAjaran, setTahunAjaran] = useState('2025/2026')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (existingClassId && existingJoinCode) {
    return (
      <div className="flex flex-col items-center text-center py-4">
        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-4">
          <School className="w-8 h-8 text-emerald-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
          Kelas sudah dibuat!
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
          Kelas Anda telah berhasil dibuat sebelumnya.
        </p>
        <Button fullWidth onClick={onNext}>
          Lanjut ke Undang Siswa <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  async function handleCreateClass() {
    if (!className.trim()) {
      setError('Nama kelas wajib diisi.')
      return
    }
    if (!user || !tenantId) return

    setIsCreating(true)
    setError(null)

    try {
      const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let joinCode = ''
      const randomBytes = new Uint8Array(16)
      while (joinCode.length < 6) {
        globalThis.crypto.getRandomValues(randomBytes)
        for (let i = 0; i < randomBytes.length; i++) {
          if (randomBytes[i] < 252 && joinCode.length < 6) {
            joinCode += charset[randomBytes[i] % 36]
          }
        }
      }

      const fullName = [className.trim(), mapel.trim(), tahunAjaran.trim()]
        .filter(Boolean)
        .join(' — ')

      await classroomService.createClassroom(user.id, fullName, tenantId)

      const { data, error: fetchErr } = await (await import('@/services/supabase/client')).supabase
        .from('classes')
        .select('id, join_code')
        .eq('teacher_id', user.id)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (fetchErr || !data) {
        throw new Error('Gagal mengambil data kelas yang baru dibuat.')
      }

      onClassCreated(data.id, data.join_code)
      onNext()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat kelas. Coba lagi.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="py-2">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center">
          <School className="w-6 h-6 text-indigo-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Buat Kelas Pertama</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Isi detail kelas Anda</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Nama Kelas <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder="Contoh: Kelas 9A, XII IPA 1"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Mata Pelajaran
          </label>
          <input
            type="text"
            value={mapel}
            onChange={(e) => setMapel(e.target.value)}
            placeholder="Contoh: Matematika, Bahasa Indonesia"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Tahun Ajaran
          </label>
          <input
            type="text"
            value={tahunAjaran}
            onChange={(e) => setTahunAjaran(e.target.value)}
            placeholder="Contoh: 2025/2026"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        {error && (
          <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="ghost" size="sm" onClick={onSkip} className="flex-1">
          Lewati
        </Button>
        <Button
          size="md"
          className="flex-[2] bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-0"
          loading={isCreating}
          onClick={handleCreateClass}
          disabled={!className.trim()}
        >
          Buat Kelas
        </Button>
      </div>
    </div>
  )
}
