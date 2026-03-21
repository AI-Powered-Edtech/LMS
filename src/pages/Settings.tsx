import { useState } from 'react'
import { User, Bell, Lock, Globe, Moon, Sun, Monitor, LogOut } from 'lucide-react'
import { cn } from '@/src/utils/cn'
import { useAuth } from '@/src/contexts/AuthContext'

export function Settings() {
  const { role, user, profile } = useAuth()

  const displayName =
    profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : (user?.user_metadata?.full_name ?? '')
  const displayEmail = user?.email ?? ''
  const [theme, setTheme] = useState('system')
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Pengaturan
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Kelola preferensi akun, notifikasi, dan tampilan aplikasi.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Sidebar Settings */}
        <div className="space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl font-bold text-sm transition-colors">
            <User className="w-5 h-5" />
            Akun & Profil
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded-xl font-medium text-sm transition-colors">
            <Bell className="w-5 h-5" />
            Notifikasi
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded-xl font-medium text-sm transition-colors">
            <Lock className="w-5 h-5" />
            Keamanan
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded-xl font-medium text-sm transition-colors">
            <Monitor className="w-5 h-5" />
            Tampilan
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded-xl font-medium text-sm transition-colors">
            <Globe className="w-5 h-5" />
            Bahasa & Wilayah
          </button>
        </div>

        {/* Main Settings Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Account Section */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Informasi Akun</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Perbarui informasi dasar akun Anda.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center overflow-hidden border-4 border-white dark:border-slate-800 shadow-md">
                  <img
                    src={
                      profile?.avatar_url ??
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id ?? 'default'}`
                    }
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <button className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-sm transition-colors">
                    Ubah Foto
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    defaultValue={displayName}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Email
                  </label>
                  <input
                    type="email"
                    defaultValue={displayEmail}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Peran Akun
                  </label>
                  <input
                    type="text"
                    value={role === 'teacher' ? 'Guru' : 'Siswa'}
                    disabled
                    className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Nomor Induk
                  </label>
                  <input
                    type="text"
                    value={
                      (profile as unknown as { employee_id?: string; student_id?: string })
                        ?.employee_id ??
                      (profile as unknown as { student_id?: string })?.student_id ??
                      ''
                    }
                    disabled
                    placeholder={role === 'teacher' ? 'NIP' : 'NIS'}
                    className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm shadow-blue-200 active:scale-95 transition-transform">
                  Simpan Perubahan
                </button>
              </div>
            </div>
          </div>

          {/* Theme Section */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Tampilan</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Sesuaikan tema aplikasi.
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => setTheme('light')}
                  className={cn(
                    'flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all',
                    theme === 'light'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  )}
                >
                  <Sun
                    className={cn(
                      'w-8 h-8',
                      theme === 'light' ? 'text-blue-600' : 'text-slate-400 dark:text-slate-500'
                    )}
                  />
                  <span
                    className={cn(
                      'text-sm font-bold',
                      theme === 'light'
                        ? 'text-blue-700 dark:text-blue-400'
                        : 'text-slate-600 dark:text-slate-400'
                    )}
                  >
                    Terang
                  </span>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={cn(
                    'flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all',
                    theme === 'dark'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  )}
                >
                  <Moon
                    className={cn(
                      'w-8 h-8',
                      theme === 'dark' ? 'text-blue-600' : 'text-slate-400 dark:text-slate-500'
                    )}
                  />
                  <span
                    className={cn(
                      'text-sm font-bold',
                      theme === 'dark'
                        ? 'text-blue-700 dark:text-blue-400'
                        : 'text-slate-600 dark:text-slate-400'
                    )}
                  >
                    Gelap
                  </span>
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={cn(
                    'flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all',
                    theme === 'system'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  )}
                >
                  <Monitor
                    className={cn(
                      'w-8 h-8',
                      theme === 'system' ? 'text-blue-600' : 'text-slate-400 dark:text-slate-500'
                    )}
                  />
                  <span
                    className={cn(
                      'text-sm font-bold',
                      theme === 'system'
                        ? 'text-blue-700 dark:text-blue-400'
                        : 'text-slate-600 dark:text-slate-400'
                    )}
                  >
                    Sistem
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-red-200 dark:border-red-900/50 shadow-sm overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">
                Zona Berbahaya
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Tindakan di bawah ini tidak dapat dibatalkan.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <button className="flex-1 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                  <LogOut className="w-4 h-4" />
                  Keluar Akun
                </button>
                <button className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-xl transition-colors">
                  Hapus Akun
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
