import { useEffect, useMemo, useState } from 'react'

import { useToast } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { AnalyticsError } from '@/features/analytics'
import {
  useRefreshCourseStats,
  useTeacherAnalytics,
} from '@/features/analytics/queries/analyticsQueries'
import { Course, courseService } from '@/features/courses'
import { captureError } from '@/utils/sentry'

export function useAnalyticsPageState() {
  const addToast = useToast((s) => s.addToast)
  const { activeTenant, role } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')

  const { data, isLoading, error, refetch } = useTeacherAnalytics(selectedCourseId)
  const refreshMutation = useRefreshCourseStats()

  const [filter, setFilter] = useState('Semua')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  // Load courses for tenant
  useEffect(() => {
    async function loadCourses() {
      if (!activeTenant?.id) return
      try {
        const result = await courseService.fetchCourses({ tenantId: activeTenant.id, limit: 50 })
        setCourses(result.courses)
        if (result.courses.length > 0) {
          setSelectedCourseId(result.courses[0].id)
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to load courses', err)
        captureError(err, { context: 'useAnalyticsPageState.loadCourses' })
      }
    }
    loadCourses()
  }, [activeTenant?.id])

  // Handle error state from query
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (error) {
      if (error instanceof AnalyticsError) {
        switch (error.code) {
          case 'PERMISSION_DENIED':
            setErrorMessage(
              'Anda tidak memiliki akses ke analitik kursus ini. Hanya guru dan admin yang dapat melihat.'
            )
            break
          case 'RPC_NOT_FOUND':
            setErrorMessage(
              'Konfigurasi analitik belum lengkap. Silakan hubungi administrator sistem.'
            )
            break
          case 'COURSE_NOT_FOUND':
            setErrorMessage('Kursus tidak ditemukan atau telah dihapus.')
            break
          case 'TENANT_MISMATCH':
            setErrorMessage('Akses ditolak. Kursus tidak termasuk dalam organisasi Anda.')
            break
          case 'NETWORK_ERROR':
            setErrorMessage(
              'Koneksi internet bermasalah. Silakan periksa koneksi Anda dan coba lagi.'
            )
            break
          default:
            setErrorMessage(error.message)
        }
      } else {
        setErrorMessage('Gagal memuat analitik. Pastikan module dan quiz terhubung ke progress.')
      }
    } else {
      setErrorMessage(null)
    }
  }, [error])

  const handleManualRefresh = async () => {
    if (!selectedCourseId) return
    try {
      await refreshMutation.mutateAsync(selectedCourseId)
      refetch()
    } catch (err: unknown) {
      if (import.meta.env.DEV) console.error('Failed to refresh analytics', err)

      let refreshError = 'Gagal memperbarui data analitik manual.'

      if (err instanceof AnalyticsError) {
        switch (err.code) {
          case 'PERMISSION_DENIED':
            refreshError = 'Anda tidak memiliki akses untuk memperbarui analitik.'
            break
          case 'RPC_NOT_FOUND':
            refreshError = 'Fungsi refresh belum tersedia. Hubungi administrator.'
            break
          case 'NETWORK_ERROR':
            refreshError = 'Koneksi internet bermasalah.'
            break
        }
      }

      addToast({ type: 'error', message: String(refreshError) })
    }
  }

  const [aiInsightMessage, setAiInsightMessage] = useState<string | null>(null)

  const handleAnalyzeWithAI = async () => {
    setAiInsightMessage(
      'Fitur AI Analytics In-Depth sedang dalam pengembangan. Gunakan AI Tutor untuk pertanyaan spesifik.'
    )
    setTimeout(() => setAiInsightMessage(null), 4000)
  }

  const radarData = useMemo(
    () =>
      data?.module_completion.map((m) => ({
        subject: m.title.length > 15 ? m.title.substring(0, 15) + '...' : m.title,
        Completion: Math.round(m.completion_rate),
        fullMark: 100,
      })) || [],
    [data?.module_completion]
  )

  const studentsToShow = data?.students.top.concat(data?.students.at_risk || []) || []

  const getStatus = (progress: number, _lastActive: string | null) => {
    if (progress < 40) return 'Kritis'
    if (progress < 70) return 'Pemantauan'
    return 'Aman'
  }

  const filteredStudents = studentsToShow.filter((s) => {
    if (filter === 'Semua') return true
    return getStatus(s.progress, s.last_active) === filter
  })

  const formatLastUpdated = (timestamp: string | null) => {
    if (!timestamp) return 'Belum pernah dihitung'

    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.round(diffMs / (1000 * 60))
    const diffHours = Math.round(diffMs / (1000 * 60 * 60))

    if (diffMinutes < 1) return 'Baru saja'
    if (diffMinutes < 60) return `${diffMinutes} menit yang lalu`
    if (diffHours < 24) return `${diffHours} jam yang lalu`
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return {
    activeTenant,
    role,
    courses,
    selectedCourseId,
    setSelectedCourseId,
    data,
    isLoading,
    refreshMutation,
    errorMessage,
    handleManualRefresh,
    aiInsightMessage,
    handleAnalyzeWithAI,
    radarData,
    filter,
    setFilter,
    expandedRow,
    setExpandedRow,
    filteredStudents,
    getStatus,
    formatLastUpdated,
  }
}
