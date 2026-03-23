import { ArrowRight, Building, KeyRound, Loader2, LogOut } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useToast } from '@/src/components/ui'
import { usePageTitle } from '@/src/hooks/usePageTitle'
import { supabase } from '@/src/services/supabase/client'

import { useAuth } from '../contexts/AuthContext'

export function WorkspaceSelector() {
  usePageTitle('Pilih Ruang Kerja')
  const { memberships, activeTenant, setActiveTenant, loading, signOut, user } = useAuth()
  const navigate = useNavigate()
  const addToast = useToast((s) => s.addToast)

  // Onboarding States
  const [onboardingMode, setOnboardingMode] = useState<'select' | 'create' | 'join'>('select')
  const [schoolName, setSchoolName] = useState('')
  const [fullName, setFullName] = useState('')
  const [inviteToken, setInviteToken] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (activeTenant && memberships.length > 0) {
      navigate('/app')
    }
  }, [activeTenant, memberships, navigate])

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!schoolName.trim() || !fullName.trim()) {
      addToast({ type: 'error', message: 'Harap isi nama lengkap dan nama sekolah.' })
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase.rpc('create_school_tenant', {
        p_school_name: schoolName.trim(),
        p_full_name: fullName.trim(),
      })

      if (error) throw error

      addToast({ type: 'success', message: `Selamat datang di ${schoolName.trim()}!` })

      // Paksa reload agar auth context mendapat membership baru
      window.location.href = '/'
    } catch (err: unknown) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal mendaftarkan sekolah baru.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleJoinSchool = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteToken.trim()) {
      addToast({ type: 'error', message: 'Harap masukkan token undangan.' })
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase.rpc('join_school_via_token', {
        p_token: inviteToken.trim(),
      })

      if (error) throw error

      addToast({ type: 'success', message: 'Berhasil bergabung dengan sekolah!' })

      // Paksa reload agar auth context mendapat membership baru
      window.location.href = '/'
    } catch (err: unknown) {
      addToast({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Gagal bergabung. Token tidak valid atau kadaluarsa.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  // ONBOARDING NEW USER (No Memberships)
  if (memberships.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-xl">
          <div className="text-center mb-8">
            <div className="h-16 w-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Selamat Datang di EduSync!</h2>
            <p className="text-slate-400 text-sm">
              Akun Anda <span className="text-white font-medium">{user?.email}</span> berhasil
              masuk, namun Anda belum terdaftar di ruang kerja atau sekolah mana pun.
            </p>
          </div>

          {onboardingMode === 'select' && (
            <div className="space-y-4">
              <button
                onClick={() => setOnboardingMode('create')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-4 transition-colors flex items-center justify-between group"
              >
                <div className="text-left">
                  <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                    <Building size={18} />
                    Daftarkan Sekolah Baru
                  </h3>
                  <p className="text-blue-200 text-sm">Saya adalah Administrator Sekolah.</p>
                </div>
                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => setOnboardingMode('join')}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white rounded-xl p-4 transition-colors flex items-center justify-between group"
              >
                <div className="text-left">
                  <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                    <KeyRound size={18} />
                    Gabung dengan Undangan
                  </h3>
                  <p className="text-slate-300 text-sm">Saya memiliki Kode Token Undangan.</p>
                </div>
                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}

          {onboardingMode === 'create' && (
            <form onSubmit={handleCreateSchool} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Nama Lengkap Anda
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Misal: Budi Santoso"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Nama Sekolah Anda
                </label>
                <input
                  type="text"
                  required
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Misal: SMA Negeri 1 Jakarta"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setOnboardingMode('select')}
                  className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 transition-colors font-bold flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : 'Buat Sekolah'}
                </button>
              </div>
            </form>
          )}

          {onboardingMode === 'join' && (
            <form onSubmit={handleJoinSchool} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Token / URL Undangan
                </label>
                <input
                  type="text"
                  required
                  value={inviteToken}
                  onChange={(e) => {
                    // Extract UUID token if user pastes the full URL
                    const val = e.target.value
                    const tokenMatch = val.match(
                      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
                    )
                    setInviteToken(tokenMatch ? tokenMatch[0] : val)
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                  placeholder="Paste token atau URL undangan di sini..."
                />
                <p className="text-xs text-slate-500 mt-2">
                  Jika Anda diberi tautan (link) pendaftaran oleh admin, salin dan tempel link
                  tersebut ke kotak ini.
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setOnboardingMode('select')}
                  className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 transition-colors font-bold flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : 'Gabung Sekolah'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 border-t border-slate-700 pt-6">
            <button
              onClick={() => signOut()}
              className="flex items-center justify-center space-x-2 w-full px-4 py-2 bg-transparent hover:bg-slate-700/50 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <LogOut size={18} />
              <span>Gunakan Akun Lain</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // EXISTING USERS (Has Memberships)
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Pilih Ruang Kerja</h1>
          <p className="text-slate-400">Pilih organisasi sekolah untuk melanjutkan</p>
        </div>

        <div className="space-y-4">
          {memberships.map((membership) => (
            <button
              key={membership.tenant_id}
              onClick={() => setActiveTenant(membership.tenant_id)}
              className="w-full text-left bg-slate-800 hover:bg-slate-700 hover:border-blue-500 border border-slate-700 rounded-xl p-6 transition-all duration-200 group flex items-center justify-between"
            >
              <div>
                <h3 className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors">
                  {membership.tenant_name}
                </h3>
                <p className="text-slate-400 mt-1 capitalize">Peran: {membership.role}</p>
              </div>
              <div className="h-10 w-10 bg-slate-700 rounded-full flex items-center justify-center group-hover:bg-blue-500/20 group-hover:text-blue-400 text-slate-400 transition-colors">
                <ArrowRight size={20} />
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => signOut()}
            className="text-slate-500 hover:text-slate-300 transition-colors flex items-center justify-center space-x-2 mx-auto"
          >
            <LogOut size={16} />
            <span>Keluar dari akun</span>
          </button>
        </div>
      </div>
    </div>
  )
}
