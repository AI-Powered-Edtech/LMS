import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { create } from 'zustand'

import { useAuth } from '@/src/contexts/AuthContext'
import { Classroom, classroomService } from '@/src/features/classroom/api/classroomService'
import { createQueryKeys } from '@/src/lib/queryKeys'

const classroomKeys = createQueryKeys('classrooms')

// Zustand store for client-side state (activeClassroomId)
interface ClassroomUIState {
  activeClassroomId: string | null
  setActiveClassroomId: (id: string) => void
}

const useClassroomStore = create<ClassroomUIState>((set) => ({
  activeClassroomId: null,
  setActiveClassroomId: (id) => set({ activeClassroomId: id }),
}))

function useClassroomsQuery() {
  const { user, role, tenantId } = useAuth()
  const setActiveClassroomId = useClassroomStore((s) => s.setActiveClassroomId)
  const activeClassroomId = useClassroomStore((s) => s.activeClassroomId)
  const queryClient = useQueryClient()

  const query = useQuery<Classroom[]>({
    queryKey: [...classroomKeys.all(tenantId!), user?.id, role],
    queryFn: () =>
      classroomService.fetchClassrooms(
        user!.id,
        role as 'student' | 'teacher' | 'admin',
        tenantId!
      ),
    enabled: !!user && !!tenantId,
  })

  // Auto-select first classroom when data loads and none selected
  useEffect(() => {
    if (query.data && query.data.length > 0 && !activeClassroomId) {
      setActiveClassroomId(query.data[0].id)
    }
  }, [query.data, activeClassroomId, setActiveClassroomId])

  // Realtime subscription — invalidate only this tenant's cache
  useEffect(() => {
    if (!user || !tenantId) return
    return classroomService.subscribeToChanges(() => {
      queryClient.invalidateQueries({ queryKey: classroomKeys.all(tenantId!) })
    })
  }, [user, tenantId, queryClient])

  return query
}

function useAddClassroom() {
  const { user, tenantId } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (name: string) => {
      if (!user || !tenantId) throw new Error('Not authenticated')
      await classroomService.createClassroom(user.id, name, tenantId)
    },
    onSuccess: () => {
      if (tenantId) queryClient.invalidateQueries({ queryKey: classroomKeys.all(tenantId!) })
    },
  })
}

function useUpdateClassroom() {
  const { tenantId } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      await classroomService.updateClassroom(id, name)
    },
    onSuccess: () => {
      if (tenantId) queryClient.invalidateQueries({ queryKey: classroomKeys.all(tenantId!) })
    },
  })
}

function useJoinClassroom() {
  const { tenantId } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (joinCode: string) => {
      await classroomService.joinClassroom(joinCode)
    },
    onSuccess: () => {
      if (tenantId) queryClient.invalidateQueries({ queryKey: classroomKeys.all(tenantId!) })
    },
  })
}

/**
 * Drop-in replacement for the old ClassroomContext useClassroom() hook.
 */
export function useClassroom() {
  const { data: classrooms = [], isLoading, error, refetch } = useClassroomsQuery()
  const { activeClassroomId, setActiveClassroomId } = useClassroomStore()
  const addClassroomMutation = useAddClassroom()
  const updateClassroomMutation = useUpdateClassroom()
  const joinClassroomMutation = useJoinClassroom()

  const addClassroom = async (name: string) => {
    await addClassroomMutation.mutateAsync(name)
  }

  const updateClassroom = async (id: string, name: string) => {
    await updateClassroomMutation.mutateAsync({ id, name })
  }

  const joinClassroom = async (joinCode: string) => {
    await joinClassroomMutation.mutateAsync(joinCode)
  }

  const refreshClassrooms = async () => {
    await refetch()
  }

  return {
    classrooms,
    activeClassroomId,
    loading: isLoading,
    error: error?.message ?? null,
    setActiveClassroomId,
    addClassroom,
    updateClassroom,
    joinClassroom,
    refreshClassrooms,
  }
}
