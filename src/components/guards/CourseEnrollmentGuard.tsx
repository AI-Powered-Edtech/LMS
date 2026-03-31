import React, { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'

import { useAuth } from '../../contexts/AuthContext'
import { courseService } from '../../features/courses'

interface CourseEnrollmentGuardProps {
  children: React.ReactNode
}

export const CourseEnrollmentGuard: React.FC<CourseEnrollmentGuardProps> = ({ children }) => {
  const { courseId } = useParams<{ courseId: string }>()
  const { user, role, activeRole, tenantId, loading: authLoading } = useAuth()
  const [isEnrolled, setIsEnrolled] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const location = useLocation()
  const navigate = useNavigate()

  // Use activeRole (role for the current active tenant) if available,
  // fall back to global role. This prevents a user who is 'teacher' in Tenant A
  // from bypassing enrollment checks in Tenant B where they are only a 'student'.
  const effectiveRole = activeRole ?? role

  useEffect(() => {
    // Safety timeout: if auth takes too long, show error instead of hanging forever
    const authTimeoutId = setTimeout(() => {
      if (authLoading) {
        setError('Verifikasi memakan terlalu lama. Silakan refresh halaman.')
        setLoading(false)
      }
    }, 15000) // 15 second timeout

    const verifyEnrollment = async () => {
      if (authLoading || !user || !tenantId) return

      // No courseId means we're not on a specific course page — allow through
      if (!courseId) {
        setIsEnrolled(true)
        setLoading(false)
        return
      }

      // Teachers and Admins bypass enrollment checks (using tenant-scoped role)
      if (effectiveRole === 'teacher' || effectiveRole === 'admin') {
        setIsEnrolled(true)
        setLoading(false)
        return
      }

      setError(null)
      setLoading(true)

      try {
        const enrolled = await courseService.checkEnrollment(courseId, user.id, tenantId)
        setIsEnrolled(enrolled)
      } catch (err: unknown) {
        if (import.meta.env.DEV) console.error('Enrollment verification failed:', err)
        const msg = err instanceof Error ? err.message : 'Gagal memverifikasi status pendaftaran'
        setError(msg)
        setIsEnrolled(false)
      } finally {
        setLoading(false)
      }
    }

    verifyEnrollment()
    return () => clearTimeout(authTimeoutId)
  }, [courseId, user, effectiveRole, tenantId, authLoading, retryCount])

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-xl max-w-md border border-red-200 dark:border-red-800">
          <h3 className="font-bold mb-2 text-red-700 dark:text-red-300">Terjadi Kesalahan</h3>
          <p className="text-sm mb-4">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setRetryCount((c) => c + 1)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              Coba Lagi
            </button>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg font-medium hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
            >
              Kembali
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!isEnrolled) {
    // Redirect to courses list if not enrolled
    return (
      <Navigate
        to="/app/student/courses"
        state={{ from: location, error: 'Kamu belum terdaftar di kursus ini.' }}
        replace
      />
    )
  }

  return <>{children}</>
}
