import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Calendar, CheckCircle, Clock, XCircle } from 'lucide-react'
import { useMemo } from 'react'

import { EmptyState } from '@/src/components/ui'
import { useAuth } from '@/src/contexts/AuthContext'
import { ProgressSkeleton } from '@/src/features/progress/components/ProgressSkeleton'
import { usePageTitle } from '@/src/hooks/usePageTitle'
import { supabase } from '@/src/services/supabase/client'

const STATUS_CONFIG = {
  hadir: {
    label: 'Hadir',
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-100',
    icon: CheckCircle,
  },
  sakit: {
    label: 'Sakit',
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-100',
    icon: AlertCircle,
  },
  izin: {
    label: 'Izin',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    icon: Clock,
  },
  alpha: {
    label: 'Alpha',
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-100',
    icon: XCircle,
  },
}

export function StudentAttendance() {
  usePageTitle('Kehadiran Siswa')
  const { user, tenantId, profile } = useAuth()

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['student-attendance', user?.id, tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_records')
        .select(
          'id, scan_date, present_count, absent_count, sick_count, permit_count, details, class_id, classes(name)'
        )
        .eq('tenant_id', tenantId!)
        .order('scan_date', { ascending: false })
        .limit(60)
      if (error) throw error
      return data ?? []
    },
    enabled: !!tenantId && !!user,
  })

  // Find this student's status in each record
  const myName = profile ? `${profile.first_name} ${profile.last_name}`.toLowerCase() : ''

  // Bolt: Combine mapping and counting into a single pass to improve performance (O(n) instead of O(4n))
  const { myRecords, totalHadir, totalAlpha, totalSakit } = useMemo(() => {
    const recordsList = (records || []) as unknown as Array<
      Record<string, unknown> & {
        id: string
        scan_date: string
        details?: Array<{ name: string; status: string }>
        classes?: { name: string } | { name: string }[]
        present_count?: number
        absent_count?: number
        sick_count?: number
        permit_count?: number
      }
    >

    return recordsList.reduce(
      (acc, r) => {
        const details: { name: string; status: string }[] = r.details ?? []
        const entry = details.find((d) => d.name?.toLowerCase().includes(myName.split(' ')[0]))
        const status = entry?.status ?? 'hadir' // default to hadir if in the records

        acc.myRecords.push({
          id: r.id,
          date: r.scan_date,
          className: (Array.isArray(r.classes) ? r.classes[0]?.name : r.classes?.name) ?? 'Kelas',
          status,
          present: r.present_count ?? 0,
          total:
            (r.present_count ?? 0) +
            (r.absent_count ?? 0) +
            (r.sick_count ?? 0) +
            (r.permit_count ?? 0),
        })

        if (status === 'hadir') acc.totalHadir++
        else if (status === 'alpha') acc.totalAlpha++
        else if (status === 'sakit') acc.totalSakit++

        return acc
      },
      {
        myRecords: [] as Array<{
          id: string
          date: string
          className: string
          status: string
          present: number
          total: number
        }>,
        totalHadir: 0,
        totalAlpha: 0,
        totalSakit: 0,
      }
    )
  }, [records, myName])

  const pct = myRecords.length > 0 ? Math.round((totalHadir / myRecords.length) * 100) : 0

  if (isLoading) {
    return <ProgressSkeleton />
  }

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-700/50 p-4 md:p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            Rekap Kehadiran
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Riwayat kehadiran kamu berdasarkan data scan guru.
          </p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: 'Kehadiran',
              value: `${pct}%`,
              sub: `${totalHadir} pertemuan`,
              color: 'bg-green-600 text-white',
            },
            {
              label: 'Hadir',
              value: totalHadir,
              sub: 'pertemuan',
              color: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
            },
            {
              label: 'Sakit',
              value: totalSakit,
              sub: 'pertemuan',
              color: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
            },
            {
              label: 'Alpha',
              value: totalAlpha,
              sub: 'pertemuan',
              color: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
            },
          ].map((s) => (
            <div key={s.label} className={`rounded-2xl p-4 shadow-sm ${s.color}`}>
              <p
                className={`text-xs font-bold uppercase tracking-wider mb-1 ${s.color.includes('green-600') ? 'text-green-100' : 'text-slate-500 dark:text-slate-400'}`}
              >
                {s.label}
              </p>
              <p
                className={`text-3xl font-black ${s.color.includes('green-600') ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}
              >
                {s.value}
              </p>
              <p
                className={`text-xs mt-0.5 ${s.color.includes('green-600') ? 'text-green-100' : 'text-slate-400'}`}
              >
                {s.sub}
              </p>
            </div>
          ))}
        </div>

        {/* Records list */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50">
            <h2 className="font-bold text-slate-800 dark:text-slate-200">Riwayat Pertemuan</h2>
          </div>
          {isLoading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : myRecords.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<Calendar className="w-10 h-10" />}
                title="Belum ada data kehadiran"
                description="Data akan muncul setelah guru melakukan scan absensi."
              />
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {myRecords.map((r) => {
                const cfg =
                  STATUS_CONFIG[r.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.hadir
                const Icon = cfg.icon
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-200 text-sm">
                        {r.className}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(r.date).toLocaleDateString('id-ID', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {cfg.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
