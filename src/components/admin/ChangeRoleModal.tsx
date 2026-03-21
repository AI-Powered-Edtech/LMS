import React, { useState } from 'react'

interface ChangeRoleModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (newRole: string) => Promise<void>
  userName: string
  currentRoles: string[]
}

const ROLES = [
  { value: 'STUDENT', label: '🎓 Student', desc: 'Akses kelas dan materi' },
  { value: 'TEACHER', label: '👩‍🏫 Teacher', desc: 'Kelola kelas dan nilai' },
  { value: 'ADMIN', label: '🛡️ Admin', desc: 'Kelola seluruh sekolah' },
]

export function ChangeRoleModal({
  isOpen,
  onClose,
  onConfirm,
  userName,
  currentRoles,
}: ChangeRoleModalProps) {
  const [selectedRole, setSelectedRole] = useState(currentRoles[0] || 'STUDENT')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const primaryRole = currentRoles[0] || 'STUDENT'
  const isDowngrade =
    (primaryRole === 'ADMIN' && selectedRole !== 'ADMIN') ||
    (primaryRole === 'TEACHER' && selectedRole === 'STUDENT')

  const handleConfirm = async () => {
    setError('')
    setLoading(true)
    try {
      await onConfirm(selectedRole)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Gagal mengubah role.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900">Ubah Role</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">
            ✕
          </button>
        </div>

        <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <p className="text-sm text-slate-600">
            Mengubah role untuk <strong className="text-slate-900">{userName}</strong>
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Role saat ini: <span className="font-semibold text-blue-600">{primaryRole}</span>
          </p>
        </div>

        <div className="space-y-2 mb-4">
          {ROLES.map((r) => (
            <button
              key={r.value}
              onClick={() => setSelectedRole(r.value)}
              className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                selectedRole === r.value
                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div>
                <p
                  className={`text-sm font-semibold ${selectedRole === r.value ? 'text-blue-700' : 'text-slate-700'}`}
                >
                  {r.label}
                </p>
                <p className="text-xs text-slate-500">{r.desc}</p>
              </div>
              {r.value === primaryRole && (
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-slate-200 text-slate-600 rounded">
                  Current
                </span>
              )}
            </button>
          ))}
        </div>

        {isDowngrade && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs text-amber-700 font-medium">
              ⚠️ Ini adalah <strong>downgrade</strong>. User akan kehilangan akses fitur{' '}
              {primaryRole}.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-xs text-red-600 font-medium">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || selectedRole === primaryRole}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Menyimpan...' : 'Konfirmasi'}
          </button>
        </div>
      </div>
    </div>
  )
}
