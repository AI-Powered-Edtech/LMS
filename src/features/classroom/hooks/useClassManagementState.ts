import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/src/contexts/AuthContext'
import { classroomService } from '@/src/features/classroom/api/classroomService'
import { useClassroom } from '@/src/features/classroom/hooks/useClassroomQueries'
import { useDebounce } from '@/src/hooks/useDebounce'
import { usePageTitle } from '@/src/hooks/usePageTitle'
import { useToast } from '@/src/hooks/useToast'
import { apiFetch } from '@/src/lib/api'

export interface EnrolledStudent {
  id: string
  student_id: string
  full_name: string
  email: string
  enrolled_at: string
  status: string
}

export function useClassManagementState() {
  usePageTitle('Class Management')
  const addToast = useToast((s) => s.addToast)
  const navigate = useNavigate()
  const {
    classrooms,
    addClassroom,
    updateClassroom,
    setActiveClassroomId,
    loading: classLoading,
  } = useClassroom()
  const { tenantId } = useAuth()

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [students, setStudents] = useState<EnrolledStudent[]>([])
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({})
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Create class
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newClassName, setNewClassName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Rename
  const [renamingClassId, setRenamingClassId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Delete
  const [classToDelete, setClassToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const selectedClass = classrooms.find((c) => c.id === selectedClassId)

  // Fetch student counts for all classes
  useEffect(() => {
    if (!tenantId || classrooms.length === 0) return

    const fetchCounts = async () => {
      const classIds = classrooms.map((c) => c.id)

      const counts: Record<string, number> = {}
      await Promise.all(
        classIds.map(async (id) => {
          const { count } = await apiFetch('/enrollments')
          counts[id] = count ?? 0
        })
      )

      setStudentCounts(counts)
    }
    fetchCounts()
  }, [classrooms, tenantId])

  // Fetch enrolled students for selected class
  const fetchStudents = useCallback(
    async (_classId: string) => {
      if (!tenantId) return
      setLoadingStudents(true)
      try {
        const { data: enrollmentData, error: enrollmentError } = await apiFetch('/enrollments')
        if (enrollmentError) throw enrollmentError

        setStudents(
          (enrollmentData || []).map(
            (e: {
              id: string
              joined_at: string
              student:
                | { id: string; full_name: string; email: string }
                | { id: string; full_name: string; email: string }[]
            }) => {
              const student = Array.isArray(e.student) ? e.student[0] : e.student
              return {
                id: e.id,
                student_id: student?.id ?? '',
                full_name: student?.full_name || 'Unnamed',
                email: student?.email || '-',
                enrolled_at: e.joined_at,
                status: 'ACTIVE' as const,
              }
            }
          )
        )
      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to fetch students:', err)
        setStudents([])
      } finally {
        setLoadingStudents(false)
      }
    },
    [tenantId]
  )

  useEffect(() => {
    if (selectedClassId) fetchStudents(selectedClassId)
  }, [selectedClassId, fetchStudents])

  // Auto-select first class
  useEffect(() => {
    if (!selectedClassId && classrooms.length > 0) {
      setSelectedClassId(classrooms[0].id)
    }
  }, [classrooms, selectedClassId])

  const handleCreateClass = async () => {
    if (!newClassName.trim()) return
    setIsCreating(true)
    try {
      await addClassroom(newClassName.trim())
      setNewClassName('')
      setShowCreateForm(false)
    } catch (err: unknown) {
      addToast({
        type: 'error',
        message:
          'Gagal membuat kelas: ' +
          (err instanceof Error ? err.message : 'Kesalahan tidak diketahui'),
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleRename = async (classId: string) => {
    if (!renameValue.trim()) return
    try {
      await updateClassroom(classId, renameValue.trim())
      setRenamingClassId(null)
    } catch (err: unknown) {
      addToast({
        type: 'error',
        message:
          'Gagal mengubah nama: ' +
          (err instanceof Error ? err.message : 'Kesalahan tidak diketahui'),
      })
    }
  }

  const confirmDeleteClass = async () => {
    if (!classToDelete) return

    setIsDeleting(true)
    try {
      await classroomService.deleteClassroom(classToDelete)
      if (selectedClassId === classToDelete) setSelectedClassId(null)
      setClassToDelete(null)
    } catch (err: unknown) {
      addToast({
        type: 'error',
        message:
          'Gagal menghapus kelas: ' +
          (err instanceof Error ? err.message : 'Kesalahan tidak diketahui'),
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleRemoveStudent = async (student: EnrolledStudent) => {
    if (!confirm(`Keluarkan ${student.full_name} dari kelas ini?`)) return
    try {
      const { error } = await apiFetch('/enrollments')
      if (error) throw error
      // Refresh student list
      fetchStudents(selectedClassId!)
      // Update count
      setStudentCounts((prev) => ({
        ...prev,
        [selectedClassId!]: Math.max((prev[selectedClassId!] || 1) - 1, 0),
      }))
    } catch (err: unknown) {
      addToast({
        type: 'error',
        message:
          'Gagal mengeluarkan siswa: ' +
          (err instanceof Error ? err.message : 'Kesalahan tidak diketahui'),
      })
    }
  }

  const debouncedSearch = useDebounce(searchQuery, 300)

  const filteredClassrooms = useMemo(
    () => classrooms.filter((c) => c.name.toLowerCase().includes(debouncedSearch.toLowerCase())),
    [classrooms, debouncedSearch]
  )

  return {
    // Data
    classrooms,
    filteredClassrooms,
    selectedClass,
    selectedClassId,
    students,
    studentCounts,
    classLoading,
    loadingStudents,
    searchQuery,

    // Create form
    showCreateForm,
    newClassName,
    isCreating,

    // Rename
    renamingClassId,
    renameValue,

    // Copy
    copiedId,

    // Delete
    classToDelete,
    isDeleting,

    // Actions
    navigate,
    setSelectedClassId,
    setSearchQuery,
    setShowCreateForm,
    setNewClassName,
    setRenamingClassId,
    setRenameValue,
    setClassToDelete,
    setActiveClassroomId,
    handleCreateClass,
    handleRename,
    confirmDeleteClass,
    handleCopy,
    handleRemoveStudent,
  }
}
