import { useState, useMemo } from 'react'
import { Calculator, Trophy, Target, BookOpen, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/src/lib/supabase'
import { useAuth } from '@/src/contexts/AuthContext'

interface Assignment {
  id: string
  title: string
  subject: string
  maxScore: number
  actualScore: number | null
  weight: number
}

const DEFAULT_ASSIGNMENTS: Assignment[] = [
  {
    id: '1',
    title: 'Ujian Tengah Semester',
    subject: 'Pelajaran',
    maxScore: 100,
    actualScore: null,
    weight: 30,
  },
  {
    id: '2',
    title: 'Tugas Kelompok',
    subject: 'Pelajaran',
    maxScore: 100,
    actualScore: null,
    weight: 20,
  },
  { id: '3', title: 'Kuis', subject: 'Pelajaran', maxScore: 100, actualScore: null, weight: 10 },
  {
    id: '4',
    title: 'Ujian Akhir Semester',
    subject: 'Pelajaran',
    maxScore: 100,
    actualScore: null,
    weight: 40,
  },
]

export function Grades() {
  const { user, tenantId } = useAuth()
  const [whatIfScores, setWhatIfScores] = useState<Record<string, number | null>>({})
  const [targetGrade, setTargetGrade] = useState<number>(90)

  const { data: submissionsData = [], isLoading } = useQuery({
    queryKey: ['student-grades', user?.id, tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .select(
          `id, score, status, submitted_at, assignments!inner(id, title, max_points, classes(name))`
        )
        .eq('student_id', user!.id)
        .eq('tenant_id', tenantId!)
        .order('submitted_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!user && !!tenantId,
  })

  const assignments: Assignment[] = useMemo(() => {
    if (submissionsData.length === 0) return DEFAULT_ASSIGNMENTS
    const equalWeight = Math.floor(100 / submissionsData.length)
    return (
      submissionsData as unknown as Array<{
        id: string
        score: number | null
        assignments: { title: string; max_points?: number; classes?: { name?: string } | null }
      }>
    ).map((s, i) => ({
      id: s.id,
      title: s.assignments.title,
      subject: (s.assignments.classes as { name?: string } | null)?.name ?? 'Pelajaran',
      maxScore: s.assignments.max_points ?? 100,
      actualScore: s.score ?? null,
      weight:
        i === submissionsData.length - 1
          ? 100 - equalWeight * (submissionsData.length - 1)
          : equalWeight,
    }))
  }, [submissionsData])

  const calculateGrade = (useWhatIf: boolean) => {
    let totalWeight = 0,
      earnedPoints = 0
    assignments.forEach((a) => {
      const score =
        a.actualScore !== null ? a.actualScore : useWhatIf ? (whatIfScores[a.id] ?? null) : null
      if (score !== null) {
        totalWeight += a.weight
        earnedPoints += (score / a.maxScore) * a.weight
      }
    })
    return totalWeight === 0 ? 0 : (earnedPoints / totalWeight) * 100
  }

  const currentGrade = calculateGrade(false)
  const projectedGrade = calculateGrade(true)

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 p-4 md:p-6 overflow-y-auto">
      <div className="max-w-4xl w-full mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Simulasi Nilai (What-If Grades)
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            {submissionsData.length > 0
              ? `Menampilkan ${submissionsData.length} tugas dari riwayat pengirimamu.`
              : 'Masukkan nilai "andaikan" untuk melihat proyeksi nilai akhirmu.'}
          </p>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center">
            <p className="text-sm font-bold text-slate-500 mb-1">Nilai Saat Ini</p>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black text-slate-800">{currentGrade.toFixed(1)}</span>
              <span className="text-slate-400 font-medium mb-1">/ 100</span>
            </div>
          </div>

          <div className="bg-blue-600 p-5 rounded-3xl shadow-lg shadow-blue-200 flex flex-col justify-center text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
            <p className="text-sm font-bold text-blue-100 mb-1 relative z-10">
              Proyeksi Nilai Akhir
            </p>
            <div className="flex items-end gap-2 relative z-10">
              <span className="text-4xl font-black">{projectedGrade.toFixed(1)}</span>
              <span className="text-blue-200 font-medium mb-1">/ 100</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center">
            <div className="flex justify-between items-center mb-1">
              <p className="text-sm font-bold text-slate-500">Target Nilai</p>
              <Target className="w-4 h-4 text-orange-500" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={targetGrade}
                onChange={(e) => setTargetGrade(Number(e.target.value))}
                className="text-4xl font-black text-slate-800 w-24 bg-transparent outline-none border-b-2 border-dashed border-slate-300 focus:border-orange-500 transition-colors"
                min="0"
                max="100"
              />
              <span className="text-slate-400 font-medium">/ 100</span>
            </div>
            {projectedGrade >= targetGrade ? (
              <p className="text-xs font-bold text-green-500 mt-2">Proyeksi mencapai target!</p>
            ) : (
              <p className="text-xs font-bold text-orange-500 mt-2">
                Kurang {(targetGrade - projectedGrade).toFixed(1)} poin lagi.
              </p>
            )}
          </div>
        </div>

        {/* Assignments list */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">Semua Tugas</h2>
              <p className="text-xs font-medium text-slate-500">Bobot total: 100%</p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {assignments.map((a) => (
              <div
                key={a.id}
                className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800">{a.title}</h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">
                    {a.subject} · Bobot: {a.weight}%
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  {a.actualScore !== null ? (
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Nilai Asli
                      </span>
                      <div className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200">
                        {a.actualScore} / {a.maxScore}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Calculator className="w-3 h-3" />
                        What-If Score
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="?"
                          value={
                            whatIfScores[a.id] === undefined || whatIfScores[a.id] === null
                              ? ''
                              : whatIfScores[a.id]!
                          }
                          onChange={(e) => {
                            const v =
                              e.target.value === ''
                                ? null
                                : Math.min(a.maxScore, Math.max(0, Number(e.target.value)))
                            setWhatIfScores((prev) => ({ ...prev, [a.id]: v }))
                          }}
                          className="w-20 px-3 py-2 bg-blue-50 border-2 border-blue-200 focus:border-blue-500 text-blue-700 font-bold rounded-xl outline-none text-center transition-colors placeholder:text-blue-300"
                        />
                        <span className="text-slate-400 font-medium">/ {a.maxScore}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
