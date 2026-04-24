import { Calendar } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Card } from '@/components/ui/Card'

import { useAuth } from '@/contexts/AuthContext'
import { useActiveAcademicYear } from '@/features/academic-years/hooks/useAcademicYears'
import { useRombelList } from '@/features/rombel/hooks/useRombel'
import { useSubjects } from '@/features/subjects/hooks/useSubjects'
import { timetableService, type TimetableSlot } from '@/features/timetable/api/timetableService'
import { useToast } from '@/hooks/useToast'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useQuery, useQueryClient } from '@tanstack/react-query'

const WEEKDAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8]

export function Timetable() {
  usePageTitle('Jadwal Pelajaran')
  const { tenantId } = useAuth()
  const { addToast } = useToast()
  const { data: activeYear } = useActiveAcademicYear()
  const { data: rombels = [] } = useRombelList(activeYear?.id ?? null)
  const { data: subjects = [] } = useSubjects()
  const qc = useQueryClient()

  const [selectedRombelId, setSelectedRombelId] = useState<string>('')
  const { data: slots = [] } = useQuery({
    queryKey: ['timetable_slots', selectedRombelId, activeYear?.id],
    queryFn: () =>
      selectedRombelId && tenantId
        ? timetableService.listForRombel(tenantId, selectedRombelId, activeYear?.id)
        : Promise.resolve([]),
    enabled: !!selectedRombelId && !!tenantId,
  })

  const slotMap = useMemo(() => {
    const m = new Map<string, TimetableSlot>()
    for (const s of slots) m.set(`${s.weekday}:${s.period_start}`, s)
    return m
  }, [slots])

  async function handleCellClick(weekday: number, period: number) {
    if (!selectedRombelId || !tenantId) return
    const existing = slotMap.get(`${weekday}:${period}`)
    if (existing) {
      if (!window.confirm(`Hapus slot di ${WEEKDAYS[weekday - 1]} jam ke-${period}?`)) return
      try {
        await timetableService.delete(existing.id, tenantId)
        addToast({ type: 'success', message: 'Slot dihapus' })
        void qc.invalidateQueries({ queryKey: ['timetable_slots'] })
      } catch (err) {
        addToast({ type: 'error', message: 'Gagal menghapus slot' })
      }
      return
    }
    const subjectCode = window.prompt('Kode mapel (contoh: MAT-WAJIB):')
    if (!subjectCode) return
    const subject = subjects.find((s) => s.code === subjectCode)
    if (!subject) {
      addToast({ type: 'error', message: 'Mapel tidak ditemukan' })
      return
    }
    try {
      await timetableService.upsert({
        tenant_id: tenantId,
        academic_year_id: activeYear?.id ?? null,
        rombel_id: selectedRombelId,
        subject_id: subject.id,
        teacher_id: null,
        weekday,
        period_start: period,
        period_end: period,
        room_label: null,
        note: null,
      })
      addToast({ type: 'success', message: 'Slot ditambahkan' })
      void qc.invalidateQueries({ queryKey: ['timetable_slots'] })
    } catch (err) {
      addToast({
        type: 'error',
        message: 'Gagal menambah slot',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
      })
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 pt-8 pb-20 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Calendar className="w-6 h-6 text-blue-500" />
          Jadwal Pelajaran
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Klik sel grid untuk menambah/menghapus jam pelajaran (JP).
        </p>
      </div>

      <Card>
        <div className="flex items-center gap-4 mb-4">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Rombel:</label>
          <select
            value={selectedRombelId}
            onChange={(e) => setSelectedRombelId(e.target.value)}
            className="w-64"
          >
            <option value="">— pilih rombel —</option>
            {rombels.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {!selectedRombelId ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Pilih rombel untuk melihat jadwal.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="border border-slate-200 dark:border-slate-700 p-2 text-slate-500 font-medium">
                    JP
                  </th>
                  {WEEKDAYS.map((day) => (
                    <th
                      key={day}
                      className="border border-slate-200 dark:border-slate-700 p-2 font-medium text-slate-700 dark:text-slate-300"
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map((p) => (
                  <tr key={p}>
                    <td className="border border-slate-200 dark:border-slate-700 p-2 text-center font-medium text-slate-500">
                      {p}
                    </td>
                    {WEEKDAYS.map((_, idx) => {
                      const wd = idx + 1
                      const slot = slotMap.get(`${wd}:${p}`)
                      const subj = slot ? subjects.find((s) => s.id === slot.subject_id) : undefined
                      return (
                        <td
                          key={wd}
                          className="border border-slate-200 dark:border-slate-700 p-0"
                        >
                          <button
                            type="button"
                            onClick={() => handleCellClick(wd, p)}
                            className={`w-full h-12 px-2 text-xs transition-colors ${slot ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-900 dark:text-blue-200 font-medium' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-400'}`}
                            aria-label={`${WEEKDAYS[idx]} jam ke-${p}`}
                          >
                            {subj?.code ?? '+'}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
