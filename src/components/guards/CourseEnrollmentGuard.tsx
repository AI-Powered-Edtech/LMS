import React, { useEffect, useState } from 'react'
import { Navigate, useLocation, useParams } from 'react-router-dom'

import { logger } from '@/src/utils/logger'

import { useAuth } from '../../contexts/AuthContext'
import { courseService } from '../../features/courses'

interface CourseEnrollmentGuardProps {
  children: React.ReactNode
}

export const CourseEnrollmentGuard: React.FC<CourseEnrollmentGuardProps> = ({ children }) => {
  const { courseId } = useParams<{ courseId: string }>()
  const { user, role, tenantId, loading: authLoading } = useAuth()
  const [isEnrolled, setIsEnrolled] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const location = useLocation()

  useEffect(() => {
    const verifyEnrollment = async () => {
      if (authLoading || !user || !tenantId || !courseId) return

      // Teachers and Admins bypass enrollment checks
      if (role === 'teacher' || role === 'admin') {
        setIsEnrolled(true)
        setLoading(false)
        return
      }

      try {
        const enrolled = await courseService.checkEnrollment(courseId, user.id, tenantId)
        setIsEnrolled(enrolled)
      } catch (err: unknown) {
        if (import.meta.env.DEV) logger.error('Enrollment verification failed:', err)
        const msg = err instanceof Error ? err.message : 'Gagal memverifikasi status pendaftaran'
        setError(msg)
        setIsEnrolled(false)
      } finally {
        setLoading(false)
      }
    }

    verifyEnrollment()
  }, [courseId, user, role, tenantId, authLoading])

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
        <div className="bg-red-50 text-red-600 p-4 rounded-xl max-w-md">
          <h3 className="font-bold mb-2">Terjadi Kesalahan</h3>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg font-medium"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    )
  }

  if (!isEnrolled) {
    // Redirect to courses list if not enrolled
    return (
      <Navigate
        to="/courses"
        state={{ from: location, error: 'You are not enrolled in this course.' }}
        replace
      />
    )
  }

  return <>{children}</>
}
