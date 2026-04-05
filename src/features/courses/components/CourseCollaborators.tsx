import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Shield, Trash2, User } from 'lucide-react'
import { useState } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import {
  type Collaborator,
  collaboratorService,
} from '@/features/course-builder/api/collaboratorService'
import { useDebounce } from '@/hooks/useDebounce'
import { useToast } from '@/hooks/useToast'

import { courseKeys } from '../queries/courseKeys'

export function CourseCollaborators({ courseId }: { courseId: string }) {
  const { tenantId } = useAuth()
  const addToast = useToast((s) => s.addToast)
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [selectedRole, setSelectedRole] = useState<Collaborator['role']>('reviewer')

  const { data: collaborators, isLoading } = useQuery({
    queryKey: courseKeys.collaborators(tenantId!, courseId),
    queryFn: () => collaboratorService.fetchCollaborators(courseId, tenantId!),
    enabled: !!courseId && !!tenantId,
  })

  const { data: searchResults } = useQuery({
    queryKey: ['teachers-search', tenantId, debouncedSearch],
    queryFn: () => collaboratorService.searchUsers(debouncedSearch, tenantId!),
    enabled: !!debouncedSearch && !!tenantId,
  })

  const addCollabMut = useMutation({
    mutationFn: (userId: string) =>
      collaboratorService.addCollaborator(courseId, userId, selectedRole, tenantId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: courseKeys.collaborators(tenantId!, courseId) })
      addToast({ type: 'success', message: 'Kolaborator ditambahkan' })
      setSearch('')
    },
    onError: (err: Error) => {
      addToast({ type: 'error', message: err.message || 'Gagal menambahkan kolaborator' })
    },
  })

  const removeCollabMut = useMutation({
    mutationFn: (id: string) => collaboratorService.removeCollaborator(id, tenantId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: courseKeys.collaborators(tenantId!, courseId) })
      addToast({ type: 'success', message: 'Kolaborator dihapus' })
    },
  })

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">
          Tambah Kolaborator
        </h3>
        <div className="flex gap-3 relative">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Cari nama guru..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              aria-label="Cari pengguna"
            />
            {searchResults && searchResults.length > 0 && search && (
              <div
                role="listbox"
                className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden"
              >
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    role="option"
                    onClick={() => addCollabMut.mutate(user.id)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm font-bold">{user.full_name}</div>
                      <div className="text-xs text-slate-500">{user.email}</div>
                    </div>
                    <Plus className="w-4 h-4 text-slate-500" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as Collaborator['role'])}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium"
            aria-label="Peran kolaborator"
          >
            <option value="reviewer">Peninjau</option>
            <option value="author">Penulis</option>
            <option value="publisher">Penerbit</option>
          </select>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">
          Daftar Kolaborator
        </h3>
        {isLoading ? (
          <div className="text-sm text-slate-500">Memuat...</div>
        ) : collaborators?.length === 0 ? (
          <div className="text-sm text-slate-500 p-4 text-center border border-dashed rounded-xl">
            Belum ada kolaborator
          </div>
        ) : (
          <div className="space-y-2">
            {collaborators?.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold dark:text-slate-200">
                      {c.profile?.full_name || 'User'}
                    </div>
                    <div className="text-xs text-slate-500">{c.profile?.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-700 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300">
                    <Shield className="w-3 h-3" />
                    <span>
                      {{ author: 'Penulis', reviewer: 'Peninjau', publisher: 'Penerbit' }[c.role]}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (!confirm('Hapus kolaborator ini dari kursus?')) return
                      removeCollabMut.mutate(c.id)
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                    aria-label="Hapus kolaborator"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
