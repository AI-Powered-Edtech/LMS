/**
 * FeatureFlags.tsx — Halaman pengaturan fitur (backward-compatible wrapper).
 *
 * Konten telah dipindahkan ke FeatureManagement (tab "Fitur Lanjutan").
 * Route /app/admin/feature-flags tetap dipertahankan untuk backward compatibility.
 */
import { ArrowRight, Flag } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/contexts/AuthContext'
import { FeatureManagement } from '@/features/administration/components/FeatureManagement'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function FeatureFlagsPage() {
  usePageTitle('Pengaturan Fitur')
  const navigate = useNavigate()
  const { role } = useAuth()

  // SECURITY: RBAC check — only admin can access this page
  if (role !== 'admin') {
    return (
      <div className="p-6 max-w-5xl mx-auto text-center">
        <p className="text-red-600 dark:text-red-400 font-bold">
          Akses ditolak. Hanya admin yang dapat mengakses halaman ini.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Flag className="w-7 h-7 text-blue-600" />
          Pengaturan Fitur
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Aktifkan atau nonaktifkan fitur eksperimen dan modul lanjutan.
        </p>
      </div>
      {/* Notice banner — informasi pemindahan fitur */}
      <div className="flex items-start gap-4 px-5 py-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-xl shrink-0">
          <Flag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-blue-900 dark:text-blue-100 text-sm">
            Manajemen fitur telah dipindahkan
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-0.5">
            Pengaturan fitur kini tersedia di halaman Administrasi bersama konfigurasi modul
            sekolah. Halaman ini tetap dapat diakses untuk kompatibilitas.
          </p>
        </div>
        <button
          onClick={() => navigate('/app/admin/dashboard')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shrink-0"
        >
          Buka Administrasi
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Render FeatureManagement langsung dengan tab Fitur Lanjutan aktif */}
      <FeatureManagement defaultTab="flags" />
    </div>
  )
}
