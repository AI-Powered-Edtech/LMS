import { api } from "@/src/lib/api"
import { ArrowLeft, Eye, PenTool, Plus, RefreshCw, Users } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { OptimizedImage, useToast } from '@/src/components/ui'
import { cn } from '@/src/utils/cn'

export function TeacherGroupView() {
  const addToast = useToast((s) => s.addToast)
  const [teacherTab, setTeacherTab] = useState('overview')

  const handleSyncGCR = () => {
    addToast({
      type: 'info',
      message: 'Sinkronisasi Google Classroom belum tersedia. Fitur ini sedang dalam pengembangan.',
    })
  }

  // TODO: Replace with real data from API API
  const groups: {
    id: number
    name: string
    members: string[]
    status: string
    progress: number
  }[] = []

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              to="/assignments"
              className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
              <Users className="w-8 h-8 text-indigo-600" />
              Manajemen Tugas Kelompok
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-2 ml-12">
            Pantau kolaborasi siswa, atur kelompok, dan sinkronisasi dengan Google Classroom.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSyncGCR}
            className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            Sinkronkan GCR
          </button>
          <button className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2 transition-colors shadow-sm shadow-indigo-200">
            <Plus className="w-5 h-5" />
            Buat Kelompok Baru
          </button>
        </div>
      </div>

      {/* Teacher Tabs */}
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700">
        {['overview', 'groups', 'settings'].map((tab) => (
          <button
            key={tab}
            onClick={() => setTeacherTab(tab)}
            className={cn(
              'pb-4 px-2 text-sm font-bold transition-colors relative',
              teacherTab === tab
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            {tab === 'overview' ? 'Ringkasan' : tab === 'groups' ? 'Daftar Kelompok' : 'Pengaturan'}
            {teacherTab === tab && (
              <motion.div
                layoutId="teacherTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"
              />
            )}
          </button>
        ))}
      </div>

      {teacherTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm col-span-1 md:col-span-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
              Aktivitas Terbaru
            </h3>
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="font-medium">Belum ada aktivitas kelompok.</p>
              <p className="text-sm mt-1">Buat kelompok baru untuk memulai.</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Statistik</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500 dark:text-slate-400">Selesai</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">0/0 Kelompok</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-0 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {teacherTab === 'groups' && (
        <div>
          {groups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col"
                >
                  <div className="p-5 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                        {group.name}
                      </h3>
                      {group.status === 'turned_in' ? (
                        <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full">
                          Diserahkan
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold rounded-full">
                          Proses
                        </span>
                      )}
                    </div>
                    <div className="flex -space-x-2 mt-3">
                      {group.members.map((m, i) => (
                        <div
                          key={i}
                          className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 bg-slate-200 dark:bg-slate-700 overflow-hidden"
                          title={m}
                        >
                          <OptimizedImage
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${m}`}
                            alt={m}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-5 bg-slate-50 dark:bg-slate-900/50 flex-1">
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">
                          Progress Tugas
                        </span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {group.progress}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${group.progress}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                        <Eye className="w-4 h-4" /> Pantau
                      </button>
                      <button className="flex-1 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                        <PenTool className="w-4 h-4" /> Nilai
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700">
              <Users className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">
                Belum ada kelompok
              </h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Buat kelompok baru atau sinkronisasi dari Google Classroom untuk memulai.
              </p>
            </div>
          )}
        </div>
      )}

      {teacherTab === 'settings' && (
        <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm max-w-3xl">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Pengaturan Tugas Kelompok
          </h3>
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Metode Pembagian Kelompok
              </label>
              <select className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100">
                <option>Otomatis (Acak)</option>
                <option>Sinkronisasi dari Google Classroom (Kelompok Siswa)</option>
                <option>Pilih Manual</option>
                <option>Siswa Memilih Sendiri</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Opsi Kolaborasi Dokumen
              </label>
              <div className="p-4 border border-slate-200 dark:border-slate-600 rounded-xl space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="doc_collab"
                    className="mt-1 w-4 h-4 text-indigo-600"
                    defaultChecked
                  />
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                      Satu Dokumen per Kelompok
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Sistem akan membuat salinan template untuk setiap kelompok.
                    </p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="radio" name="doc_collab" className="mt-1 w-4 h-4 text-indigo-600" />
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                      Folder Bersama
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Buat folder Google Drive khusus untuk tiap kelompok.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Penilaian Sejawat
              </label>
              <label className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                  defaultChecked
                />
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    Wajibkan Penilaian Antar Anggota
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Siswa harus menilai kontribusi anggota kelompoknya sebelum tugas dianggap
                    selesai.
                  </p>
                </div>
              </label>
            </div>

            <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-sm">
                Simpan Pengaturan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
