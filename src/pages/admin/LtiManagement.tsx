import {
  ExternalLink,
  Link2,
  MoreVertical,
  Pencil,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Search,
  Shield,
  Trash2,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

import { EmptyState, useToast } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { LtiPlatformFormModal } from '@/features/lti/components/LtiPlatformFormModal'
import {
  useCreateLtiPlatform,
  useDeleteLtiPlatform,
  useLtiPlatforms,
  useToggleLtiPlatform,
  useUpdateLtiPlatform,
} from '@/features/lti/queries/ltiQueries'
import type { CreateLtiPlatformParams, LtiPlatformRegistration } from '@/features/lti/types'
import { usePageTitle } from '@/hooks/usePageTitle'

export function LtiManagement() {
  usePageTitle('Pengaturan LTI')
  useAuth() // ensure auth context is available
  const addToast = useToast((s) => s.addToast)

  // ── State ────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPlatform, setEditingPlatform] = useState<LtiPlatformRegistration | null>(null)
  const [actionMenuId, setActionMenuId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // ── Queries ──────────────────────────────────────────────────
  const { data: platforms = [], isLoading, refetch } = useLtiPlatforms()
  const createMutation = useCreateLtiPlatform()
  const updateMutation = useUpdateLtiPlatform()
  const deleteMutation = useDeleteLtiPlatform()
  const toggleMutation = useToggleLtiPlatform()

  // ── Filtered list ────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return platforms
    const q = search.toLowerCase()
    return platforms.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.issuer.toLowerCase().includes(q) ||
        p.client_id.toLowerCase().includes(q)
    )
  }, [platforms, search])

  const activeCount = platforms.filter((p) => p.is_active).length

  // ── Handlers ─────────────────────────────────────────────────
  const openCreate = useCallback(() => {
    setEditingPlatform(null)
    setModalOpen(true)
  }, [])

  const openEdit = useCallback((platform: LtiPlatformRegistration) => {
    setEditingPlatform(platform)
    setModalOpen(true)
    setActionMenuId(null)
  }, [])

  const handleSave = useCallback(
    (data: CreateLtiPlatformParams) => {
      if (editingPlatform) {
        updateMutation.mutate(
          { id: editingPlatform.id, ...data },
          {
            onSuccess: () => {
              addToast({ type: 'success', message: 'Platform berhasil diperbarui.' })
              setModalOpen(false)
            },
            onError: () => {
              addToast({ type: 'error', message: 'Gagal memperbarui platform.' })
            },
          }
        )
      } else {
        createMutation.mutate(data, {
          onSuccess: () => {
            addToast({ type: 'success', message: 'Platform berhasil ditambahkan.' })
            setModalOpen(false)
          },
          onError: () => {
            addToast({ type: 'error', message: 'Gagal menambahkan platform.' })
          },
        })
      }
    },
    [editingPlatform, createMutation, updateMutation, addToast]
  )

  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          addToast({ type: 'success', message: 'Platform berhasil dihapus.' })
          setDeleteConfirmId(null)
          setActionMenuId(null)
        },
        onError: () => {
          addToast({ type: 'error', message: 'Gagal menghapus platform.' })
        },
      })
    },
    [deleteMutation, addToast]
  )

  const handleToggle = useCallback(
    (id: string, currentActive: boolean) => {
      toggleMutation.mutate(
        { id, isActive: !currentActive },
        {
          onSuccess: () => {
            addToast({
              type: 'success',
              message: currentActive ? 'Platform dinonaktifkan.' : 'Platform diaktifkan.',
            })
            setActionMenuId(null)
          },
        }
      )
    },
    [toggleMutation, addToast]
  )

  // ── Loading skeleton ─────────────────────────────────────────
  if (isLoading && platforms.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
        <div className="h-4 w-96 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 bg-slate-100 dark:bg-slate-700 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6" data-testid="lti-management-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Shield className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            Pengaturan LTI
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Kelola platform LTI 1.3 yang terhubung (Canvas, Moodle, dll).
          </p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2.5 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 text-sm"
          data-testid="add-platform-btn"
        >
          <Plus className="w-4 h-4" />
          Tambah Platform
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Total Platform
          </p>
          <p className="text-2xl font-black text-slate-800 dark:text-slate-200">
            {platforms.length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Aktif
          </p>
          <p className="text-2xl font-black text-green-600 dark:text-green-400">{activeCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Nonaktif
          </p>
          <p className="text-2xl font-black text-slate-400 dark:text-slate-500">
            {platforms.length - activeCount}
          </p>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari platform..."
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition-all"
              data-testid="search-input"
            />
          </div>
          <button
            onClick={() => refetch()}
            className="p-2.5 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 text-left">Platform</th>
                <th className="px-6 py-3 text-left hidden md:table-cell">Issuer</th>
                <th className="px-6 py-3 text-left hidden lg:table-cell">Client ID</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {isLoading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    <span className="text-slate-500 dark:text-slate-400">Memuat data...</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12">
                    <EmptyState
                      icon={<Link2 className="w-10 h-10" />}
                      title={search ? 'Tidak ditemukan' : 'Belum ada platform LTI'}
                      description={
                        search
                          ? `Tidak ada platform yang cocok dengan "${search}".`
                          : 'Tambahkan platform LTI pertama Anda untuk mengaktifkan integrasi.'
                      }
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-750/50 transition-colors"
                    data-testid={`platform-row-${p.id}`}
                  >
                    {/* Name */}
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{p.name}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 md:hidden truncate max-w-[200px]">
                          {p.issuer}
                        </p>
                      </div>
                    </td>

                    {/* Issuer */}
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className="text-slate-600 dark:text-slate-300 text-xs font-mono truncate block max-w-[250px]">
                        {p.issuer}
                      </span>
                    </td>

                    {/* Client ID */}
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <span className="text-slate-600 dark:text-slate-300 text-xs font-mono">
                        {p.client_id}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          p.is_active
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600'
                        }`}
                      >
                        {p.is_active ? (
                          <>
                            <Power className="w-3 h-3" /> Aktif
                          </>
                        ) : (
                          <>
                            <PowerOff className="w-3 h-3" /> Nonaktif
                          </>
                        )}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setActionMenuId(actionMenuId === p.id ? null : p.id)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          data-testid={`action-btn-${p.id}`}
                        >
                          <MoreVertical className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        </button>

                        {actionMenuId === p.id && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20 py-1">
                            <button
                              onClick={() => openEdit(p)}
                              className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                            >
                              <Pencil className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => handleToggle(p.id, p.is_active)}
                              className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                            >
                              {p.is_active ? (
                                <>
                                  <PowerOff className="w-3.5 h-3.5" /> Nonaktifkan
                                </>
                              ) : (
                                <>
                                  <Power className="w-3.5 h-3.5" /> Aktifkan
                                </>
                              )}
                            </button>
                            <a
                              href={p.issuer}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => setActionMenuId(null)}
                              className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> Buka Issuer
                              <span className="sr-only">(buka di tab baru)</span>
                            </a>
                            <div className="border-t border-slate-100 dark:border-slate-700 my-1" />
                            {deleteConfirmId === p.id ? (
                              <div className="px-4 py-2 space-y-2">
                                <p className="text-xs text-red-600 dark:text-red-400 font-bold">
                                  Yakin hapus platform ini?
                                </p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleDelete(p.id)}
                                    disabled={deleteMutation.isPending}
                                    className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 disabled:opacity-50"
                                  >
                                    Hapus
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-3 py-1 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                  >
                                    Batal
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirmId(p.id)}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Hapus
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 text-sm text-blue-700 dark:text-blue-300">
        <p className="font-bold mb-1">Informasi Konfigurasi LTI</p>
        <p className="text-xs text-blue-600 dark:text-blue-400">
          Pastikan environment variables berikut sudah di-set sebelum deploy:{' '}
          <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/50 rounded text-xs font-mono">
            LTI_RSA_PRIVATE_KEY
          </code>
          ,{' '}
          <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/50 rounded text-xs font-mono">
            LTI_RSA_PUBLIC_KEY
          </code>
          ,{' '}
          <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/50 rounded text-xs font-mono">
            LTI_LAUNCH_URL
          </code>
          ,{' '}
          <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/50 rounded text-xs font-mono">
            APP_URL
          </code>
        </p>
      </div>

      {/* Modal */}
      <LtiPlatformFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingPlatform(null)
        }}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
        platform={editingPlatform}
      />
    </div>
  )
}
