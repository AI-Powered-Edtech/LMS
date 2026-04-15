import { AlertTriangle } from 'lucide-react'

// ---------------------------------------------------------------------------
// ConflictResolutionDialog — Dialog konflik versi offline vs server
// ---------------------------------------------------------------------------
// Ditampilkan saat builder mendeteksi bahwa server memiliki versi lebih baru
// dari draft lokal saat perangkat kembali online. Pengguna memilih versi mana
// yang akan dipertahankan.

export interface ConflictResolutionDialogProps {
  isOpen: boolean
  /** Waktu draft lokal terakhir disimpan (ISO timestamp atau epoch ms sebagai string) */
  localUpdatedAt: string
  /** Waktu kursus di server terakhir diperbarui (ISO timestamp) */
  serverUpdatedAt: string
  /** Pengguna memilih mempertahankan draft lokal dan mendorong ke server */
  onUseLocal: () => void
  /** Pengguna memilih membuang draft lokal dan memakai versi server */
  onUseServer: () => void
  onClose: () => void
}

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(isNaN(Number(ts)) ? ts : Number(ts))
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ts
  }
}

export function ConflictResolutionDialog({
  isOpen,
  localUpdatedAt,
  serverUpdatedAt,
  onUseLocal,
  onUseServer,
  onClose,
}: ConflictResolutionDialogProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-dialog-title"
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-start gap-3 p-6 pb-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
            <AlertTriangle
              className="h-5 w-5 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
          </div>
          <div>
            <h2 id="conflict-dialog-title" className="font-semibold text-gray-900 dark:text-white">
              Konflik Perubahan Terdeteksi
            </h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Versi lokal (offline) dan versi server berbeda
            </p>
          </div>
        </div>

        {/* Version cards */}
        <div className="space-y-3 px-6 pt-5">
          <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/30">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Versi Lokal (offline)
            </p>
            <p className="mt-0.5 text-xs text-blue-600 dark:text-blue-300">
              Disimpan: {formatTimestamp(localUpdatedAt)}
            </p>
          </div>
          <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/30">
            <p className="text-sm font-medium text-green-900 dark:text-green-100">Versi Server</p>
            <p className="mt-0.5 text-xs text-green-600 dark:text-green-300">
              Diperbarui: {formatTimestamp(serverUpdatedAt)}
            </p>
          </div>
        </div>

        {/* Body */}
        <p className="px-6 pt-4 text-sm text-gray-600 dark:text-gray-300">
          Versi mana yang ingin Anda pertahankan? Perubahan yang tidak dipilih akan{' '}
          <span className="font-medium text-red-600 dark:text-red-400">hilang permanen</span>.
        </p>

        {/* Actions */}
        <div className="flex gap-3 p-6 pt-4">
          <button
            type="button"
            onClick={onUseServer}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Gunakan Versi Server
          </button>
          <button
            type="button"
            onClick={onUseLocal}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            Gunakan Versi Lokal
          </button>
        </div>

        {/* Dismiss link */}
        <div className="border-t border-gray-100 px-6 py-3 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="w-full text-center text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            Putuskan nanti (abaikan sementara)
          </button>
        </div>
      </div>
    </div>
  )
}
