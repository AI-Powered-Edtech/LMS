import { useMemo, useState } from 'react'

import { useCourses } from '@/src/features/courses/queries/courseQueries'
import type { Course } from '@/src/features/courses/types'
import { Assignment, useGradebook } from '@/src/features/gradebook/hooks/useGradebookQueries'
import { useDebounce } from '@/src/hooks/useDebounce'
import { usePageTitle } from '@/src/hooks/usePageTitle'

export function useGradebookState() {
  usePageTitle('Buku Nilai')
  const { students, assignments, grades, updateGrade, addAssignment } = useGradebook()
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)
  const [editingCell, setEditingCell] = useState<{
    studentId: string
    assignmentId: string
  } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newAssignment, setNewAssignment] = useState<Partial<Assignment>>({
    title: '',
    type: 'assignment',
    maxScore: 100,
    date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
  })

  // Course-based gradebook (real API data)
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const coursesQuery = useCourses({ limit: 50 })
  const courses: Course[] = coursesQuery.data?.courses ?? []

  const handleAddAssignment = (e: React.FormEvent) => {
    e.preventDefault()
    if (newAssignment.title && newAssignment.type && newAssignment.maxScore) {
      const id = `a${Date.now()}`
      addAssignment({
        id,
        title: newAssignment.title,
        type: newAssignment.type as Assignment['type'],
        maxScore: Number(newAssignment.maxScore),
        date:
          newAssignment.date ||
          new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      })
      setIsAddModalOpen(false)
      setNewAssignment({
        title: '',
        type: 'assignment',
        maxScore: 100,
        date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      })
    }
  }

  const studentStatsMap = useMemo(() => {
    const map = new Map<string, { average: number; total: number }>()
    for (const student of students) {
      const studentGrades = grades[student.id]
      if (!studentGrades) {
        map.set(student.id, { average: 0, total: 0 })
        continue
      }
      const scores = Object.values(studentGrades)
        .map((entry) => entry.score)
        .filter((score): score is number => score !== null)
      if (scores.length === 0) {
        map.set(student.id, { average: 0, total: 0 })
        continue
      }
      const total = scores.reduce((a, b) => a + b, 0)
      map.set(student.id, { average: Math.round(total / scores.length), total })
    }
    return map
  }, [students, grades])

  const { classAverage, highestScore, lowestScore, highestStudent, lowestStudent } = useMemo(() => {
    const averages: { name: string; avg: number }[] = []
    for (const student of students) {
      const avg = studentStatsMap.get(student.id)?.average ?? 0
      if (avg > 0) averages.push({ name: student.name, avg })
    }
    if (averages.length === 0) {
      return {
        classAverage: 0,
        highestScore: 0,
        lowestScore: 0,
        highestStudent: '-',
        lowestStudent: '-',
      }
    }
    const sum = averages.reduce((a, b) => a + b.avg, 0)
    const best = averages.reduce((a, b) => (b.avg > a.avg ? b : a))
    const worst = averages.reduce((a, b) => (b.avg < a.avg ? b : a))
    return {
      classAverage: Math.round(sum / averages.length),
      highestScore: best.avg,
      lowestScore: worst.avg,
      highestStudent: best.name,
      lowestStudent: worst.name,
    }
  }, [students, studentStatsMap])

  const filteredStudents = useMemo(
    () =>
      students.filter(
        (s) =>
          s.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          s.nis.includes(debouncedSearch)
      ),
    [students, debouncedSearch]
  )

  const handleCellClick = (
    studentId: string,
    assignmentId: string,
    currentScore: number | null
  ) => {
    setEditingCell({ studentId, assignmentId })
    setEditValue(currentScore !== null ? currentScore.toString() : '')
  }

  const handleSaveEdit = () => {
    if (editingCell) {
      const numValue = editValue === '' ? null : parseInt(editValue, 10)
      if (numValue === null || (!isNaN(numValue) && numValue >= 0 && numValue <= 100)) {
        updateGrade(editingCell.studentId, editingCell.assignmentId, numValue)
      }
      setEditingCell(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      setEditingCell(null)
    }
  }

  return {
    // Data
    students,
    assignments,
    grades,
    filteredStudents,
    studentStatsMap,
    courses,
    selectedCourseId,

    // Stats
    classAverage,
    highestScore,
    lowestScore,
    highestStudent,
    lowestStudent,

    // Edit state
    editingCell,
    editValue,
    searchQuery,

    // Modal
    isAddModalOpen,
    newAssignment,

    // Actions
    setSelectedCourseId,
    setSearchQuery,
    setEditingCell,
    setEditValue,
    setIsAddModalOpen,
    setNewAssignment,
    handleAddAssignment,
    handleCellClick,
    handleSaveEdit,
    handleKeyDown,
  }
}

export function getGradeColor(score: number | null) {
  if (score === null || score === 0) return 'text-slate-400'
  if (score >= 85) return 'text-green-600 font-bold'
  if (score >= 70) return 'text-blue-600 font-bold'
  if (score >= 60) return 'text-yellow-600 font-bold'
  return 'text-red-600 font-bold'
}

export function getGradeBg(score: number | null) {
  if (score === null || score === 0) return 'bg-slate-50 dark:bg-slate-800/50'
  if (score >= 85) return 'bg-green-50 dark:bg-green-900/20'
  if (score >= 70) return 'bg-blue-50 dark:bg-blue-900/20'
  if (score >= 60) return 'bg-yellow-50 dark:bg-yellow-900/20'
  return 'bg-red-50 dark:bg-red-900/20'
}

export function getTypeLabel(type: string) {
  switch (type) {
    case 'quiz':
      return 'Auto-grade'
    case 'assignment':
      return 'Tugas'
    case 'project':
      return 'Proyek'
    case 'exam':
      return 'Ujian'
    case 'presentation':
      return 'Presentasi'
    case 'offline':
      return 'Offline'
    default:
      return type
  }
}

export function getTypeColor(type: string) {
  switch (type) {
    case 'quiz':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    case 'exam':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    case 'project':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
    case 'presentation':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    case 'offline':
      return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
  }
}
