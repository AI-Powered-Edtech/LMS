import { AlertTriangle, ArrowLeft, LogOut, RefreshCcw } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useAuth } from '@/contexts/AuthContext'
import { usePageTitle } from '@/hooks/usePageTitle'

function getErrorCopy(reason: string | null, message: string | null) {
  if (message) {
    return {
      title: 'Login Tidak Dapat Diselesaikan',
      description: message,
    }
  }

  switch (reason) {
    case 'no-active-workspace':
      return {
        title: 'Akses Ruang Kerja Belum Aktif',
        description:
          'Akun Anda berhasil masuk, tetapi tidak memiliki ruang kerja aktif. Hubungi admin sekolah jika akses Anda seharusnya sudah tersedia.',
      }
    case 'callback_timeout':
      return {
        title: 'Login Terlalu Lama Diproses',
        description:
          'Sesi login dari Google tidak selesai dalam waktu yang aman. Coba lagi dari awal atau gunakan login email.',
      }
    case 'malformed_callback':
      return {
        title: 'Tautan Login Tidak Valid',
        description:
          'Callback login yang diterima aplikasi tidak lengkap atau sudah berubah. Silakan mulai login lagi dari halaman masuk.',
      }
    default:
      return {
        title: 'Terjadi Masalah Saat Login',
        description:
          'Aplikasi tidak dapat menyelesaikan proses autentikasi. Coba lagi atau gunakan metode login lain.',
      }
  }
}

export function AuthError() {
  usePageTitle('Login Gagal')
  const { signOut } = useAuth()
  const searchParams = new URLSearchParams(window.location.search)
  const reason = searchParams.get('reason')
  const message = searchParams.get('message')
  const copy = getErrorCopy(reason, message)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-300">
          <AlertTriangle className="h-8 w-8" />
        </div>

        <h1 className="mb-2 text-2xl font-bold text-white">{copy.title}</h1>
        <p className="mb-8 text-sm leading-6 text-blue-100/80">{copy.description}</p>

        <div className="flex flex-col gap-3">
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <RefreshCcw className="h-4 w-4" />
            Coba Login Lagi
          </Link>

          <Link
            to="/forgot-password"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4" />
            Pakai Login Email
          </Link>

          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
          >
            <LogOut className="h-4 w-4" />
            Keluar dan Ganti Akun
          </button>
        </div>
      </div>
    </div>
  )
}
