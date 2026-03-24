import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Shield, Trash2, User } from 'lucide-react'
import { useState } from 'react'

import { useAuth } from '@/src/contexts/AuthContext'
import { useDebounce } from '@/src/hooks/useDebounce'
import { useToast } from '@/src/hooks/useToast'
import { supabase } from '@/src/services/supabase/client'

interface Collaborator {
  id: string
  user_id: string
  role: 'author' | 'reviewer' | 'publisher'
  profile: { full_name: string; email: string }
}

export function CourseCollaborators({ courseId }: { courseId: string }) {
  const { tenantId } = useAuth()
  const addToast = useToast((s) => s.addToast)
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [selectedRole, setSelectedRole] = useState<'author' | 'reviewer' | 'publisher'>('reviewer')

  const { data: collaborators, isLoading } = useQuery({
    queryKey: ['course-collaborators', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_collaborators')
        .select(
          `
          id, user_id, role,
          profiles:user_id ( full_name, email )
        `
        )
        .eq('course_id', courseId)
        .eq('tenant_id', tenantId)

      if (error) throw error
      return (data || []).map((c: any) => ({
        id: c.id,
        user_id: c.user_id,
        role: c.role,
        profile: c.profiles,
      })) as Collaborator[]
    },
    enabled: !!courseId && !!tenantId,
  })

  const { data: searchResults } = useQuery({
    queryKey: ['teachers-search', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch) return []
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('tenant_id', tenantId)
        .ilike('full_name', `%${debouncedSearch}%`)
        // Ensure we only search teachers or admins, this requires joining user_roles or relying on the fact that only they can be added
        .limit(5)
      if (error) throw error
      return data || []
    },
    enabled: !!debouncedSearch && !!tenantId,
  })

  const addCollabMut = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from('course_collaborators').insert({
        course_id: courseId,
        user_id: userId,
        role: selectedRole,
        tenant_id: tenantId!,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-collaborators', courseId] })
      addToast({ type: 'success', message: 'Kolaborator ditambahkan' })
      setSearch('')
    },
    onError: (err: any) => {
      addToast({ type: 'error', message: err.message || 'Gagal menambahkan kolaborator' })
    },
  })

  const removeCollabMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('course_collaborators')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId!)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-collaborators', courseId] })
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama guru..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
            {searchResults && searchResults.length > 0 && search && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => addCollabMut.mutate(user.id)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm font-bold">{user.full_name}</div>
                      <div className="text-xs text-slate-500">{user.email}</div>
                    </div>
                    <Plus className="w-4 h-4 text-slate-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as any)}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium"
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
                    onClick={() => removeCollabMut.mutate(c.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
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
