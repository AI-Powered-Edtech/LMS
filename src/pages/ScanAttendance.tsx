import { useQuery } from '@tanstack/react-query'
import { Camera, FileText, Upload } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useToast } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { classroomService } from '@/features/classroom/api/classroomService'
import { usePageTitle } from '@/hooks/usePageTitle'

/**
 * ScanAttendance — AI-powered attendance book scanning.
 *
 * The scan feature requires a Supabase Edge Function (`scan-attendance`)
 * that accepts an image and returns structured attendance data via AI vision.
 * Until that Edge Function is deployed, the scan buttons show an informational
 * toast. The class selector queries real data from the `classes` table.
 */
export function ScanAttendance() {
  usePageTitle('Pindai Kehadiran')
  const { user, tenantId } = useAuth()
  const addToast = useToast((s) => s.addToast)
  const [selectedClassId, setSelectedClassId] = useState<string>('')

  const { data: classes = [] } = useQuery({
    queryKey: ['teacher-classes', tenantId],
    queryFn: async () => {
      const allClasses = await classroomService.fetchClassrooms(user!.id, 'teacher', tenantId!)
      return allClasses.map((c) => ({ id: c.id, name: c.name }))
    },
    enabled: !!tenantId && !!user,
  })

  const handleNotAvailable = () => {
    addToast({
      type: 'info',
      message:
        'Fitur pemindaian AI belum tersedia. Pencatatan kehadiran manual tersedia melalui halaman kelas.',
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Scan Buku Absensi
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Otomatisasi pencatatan kehadiran dengan memindai buku absensi kelas menggunakan AI.
        </p>
      </div>

      {/* Class selector — queries real data */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
          Pilih Kelas
        </label>
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="w-full md:w-80 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition-all"
        >
          <option value="">-- Pilih kelas (opsional) --</option>
          {(classes as { id: string; name: string }[]).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Scan area */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-12 flex flex-col items-center justify-center text-center">
        <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-6">
          <Camera className="w-12 h-12" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Pindai Buku Absensi
        </h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mb-4">
          Arahkan kamera ke halaman buku absensi atau unggah foto buku absensi untuk mendigitalkan
          data kehadiran secara otomatis.
        </p>

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm font-medium text-amber-700 dark:text-amber-300 mb-6">
          Fitur pemindaian AI sedang dalam pengembangan
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-8">
          Pemindaian memerlukan Edge Function{' '}
          <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs font-mono">
            scan-attendance
          </code>{' '}
          yang belum di-deploy.
        </p>

        <div className="flex gap-4">
          <button
            onClick={handleNotAvailable}
            className="px-6 py-3 bg-blue-600/60 dark:bg-blue-700/60 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm cursor-not-allowed"
          >
            <Camera className="w-5 h-5" />
            Buka Kamera
          </button>
          <button
            onClick={handleNotAvailable}
            className="px-6 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm cursor-not-allowed"
          >
            <Upload className="w-5 h-5" />
            Unggah Foto
          </button>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700 w-full flex flex-col items-center justify-center">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-4">
            Ingin melakukan pencatatan kehadiran secara manual?
          </p>
          <Link
            to="/app/teacher/classes"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-sm"
          >
            <FileText className="w-5 h-5" />
            Ke Manajemen Kelas
          </Link>
        </div>
      </div>
    </div>
  )
}
