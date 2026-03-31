import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/contexts/AuthContext'
import { classroomService, type EnrolledStudent } from '@/features/classroom/api/classroomService'
import { useClassroom } from '@/features/classroom/hooks/useClassroomQueries'
import { useDebounce } from '@/hooks/useDebounce'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useToast } from '@/hooks/useToast'
import { useUndoableAction } from '@/hooks/useUndoableAction'
import { captureError } from '@/utils/sentry'

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
  const { tenantId, user } = useAuth()

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
  const [_isDeleting, setIsDeleting] = useState(false)

  const selectedClass = classrooms.find((c) => c.id === selectedClassId)

  // Fetch student counts for all classes
  useEffect(() => {
    if (!tenantId || classrooms.length === 0) return

    const fetchCounts = async () => {
      const classIds = classrooms.map((c) => c.id)

      const counts: Record<string, number> = {}
      await Promise.all(
        classIds.map(async (id) => {
          counts[id] = await classroomService.getActiveEnrollmentCount(id, tenantId!)
        })
      )

      setStudentCounts(counts)
    }
    fetchCounts()
  }, [classrooms, tenantId])

  // Fetch enrolled students for selected class
  const fetchStudents = useCallback(
    async (classId: string) => {
      if (!tenantId) return
      setLoadingStudents(true)
      try {
        const enrolledStudents = await classroomService.getEnrolledStudents(classId, tenantId)
        setStudents(enrolledStudents)
      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to fetch students:', err)
        captureError(err, { context: 'useClassManagementState.fetchStudents' })
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

  // Undoable delete — shows a 5-second toast with "Batal" before executing
  const undoableDeleteState = useRef<{ classId: string; className: string } | null>(null)
  const { execute: _executeDelete } = useUndoableAction({
    message: undoableDeleteState.current
      ? `Kelas "${undoableDeleteState.current.className}" akan dihapus.`
      : 'Kelas akan dihapus.',
    delay: 5000,
    onExecute: async () => {
      if (!undoableDeleteState.current) return
      const { classId } = undoableDeleteState.current
      setIsDeleting(true)
      try {
        await classroomService.deleteClassroom(classId, tenantId!)
        if (selectedClassId === classId) setSelectedClassId(null)
      } catch (err: unknown) {
        addToast({
          type: 'error',
          message:
            'Gagal menghapus kelas: ' +
            (err instanceof Error ? err.message : 'Kesalahan tidak diketahui'),
        })
      } finally {
        setIsDeleting(false)
        undoableDeleteState.current = null
      }
    },
    onUndo: () => {
      undoableDeleteState.current = null
    },
  })

  const handleDeleteClass = useCallback(
    (classId: string, className: string) => {
      undoableDeleteState.current = { classId, className }
      _executeDelete()
    },
    [_executeDelete]
  )

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleRemoveStudent = async (student: EnrolledStudent) => {
    if (!confirm(`Keluarkan ${student.full_name} dari kelas ini?`)) return
    try {
      await classroomService.removeStudent(student.id, user!.id, tenantId!)

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

    // Actions
    navigate,
    setSelectedClassId,
    setSearchQuery,
    setShowCreateForm,
    setNewClassName,
    setRenamingClassId,
    setRenameValue,
    setActiveClassroomId,
    handleCreateClass,
    handleRename,
    /** Undoable delete: shows a 5-second "Batal" toast before executing. */
    handleDeleteClass,
    handleCopy,
    handleRemoveStudent,
  }
}
