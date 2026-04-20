import { FileText, Loader2, X } from 'lucide-react'
import { useState } from 'react'

import { sanitizeUrl } from '@/utils/sanitize'

import type { PPDBRegistration, PPDBRegistrationStatus } from '../../types/ppdb'

const ID_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
]

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const wibOffset = 7 * 60
  const utcMs = d.getTime() + d.getTimezoneOffset() * 60_000
  const wib = new Date(utcMs + wibOffset * 60_000)
  return `${String(wib.getDate()).padStart(2, '0')} ${ID_MONTHS[wib.getMonth()]} ${wib.getFullYear()}`
}

function translateGender(g: string): string {
  return g === 'L' ? 'Laki-laki' : 'Perempuan'
}

interface PPDBDetailModalProps {
  registration: PPDBRegistration
  onClose: () => void
  onStatusChange: (id: string, status: PPDBRegistrationStatus, notes?: string) => Promise<void>
}

export function PPDBDetailModal({ registration, onClose, onStatusChange }: PPDBDetailModalProps) {
  const [status, setStatus] = useState<PPDBRegistrationStatus>(registration.status)
  const [notes, setNotes] = useState(registration.notes ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await onStatusChange(registration.id, status, notes)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const docs = registration.documents ?? {}
  const docEntries = Object.entries(docs).filter(([, v]) => v)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-800 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Detail Pendaftar
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {registration.registration_number}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Data Calon Siswa
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-slate-500 dark:text-slate-400">Nama</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {registration.student_name}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Tanggal Lahir</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {formatDate(registration.birth_date)}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Jenis Kelamin</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {translateGender(registration.gender)}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Asal Sekolah</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {registration.previous_school || '—'}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Data Orang Tua/Wali
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-slate-500 dark:text-slate-400">Nama</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {registration.parent_name}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Telepon</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {registration.parent_phone}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Email</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {registration.parent_email || '—'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Alamat</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {registration.address || '—'}
                </p>
              </div>
            </div>
          </div>

          {docEntries.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Dokumen
              </h3>
              <div className="space-y-2">
                {docEntries.map(([key, url]) => (
                  <a
                    key={key}
                    href={sanitizeUrl(url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <FileText className="w-4 h-4" />
                    {key}
                    <span className="sr-only">(buka di tab baru)</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Perbarui Status
            </h3>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PPDBRegistrationStatus)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            >
              <option value="pending">Menunggu</option>
              <option value="reviewed">Direview</option>
              <option value="accepted">Diterima</option>
              <option value="rejected">Ditolak</option>
              <option value="waitlisted">Cadangan</option>
            </select>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Catatan
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Tambahkan catatan..."
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-none"
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-slate-800 px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Simpan
          </button>
        </div>
      </div>
    </div>
  )
}
