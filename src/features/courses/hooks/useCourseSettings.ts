import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/contexts/AuthContext'

import { courseService } from '../api/courseService'
import { courseKeys } from '../queries/courseKeys'

interface CourseSettingsData {
  title: string
  description: string
  subject: string
  level: string
}

interface CourseSettingsReturn {
  data: CourseSettingsData
  isLoading: boolean
  isSaving: boolean
  isSaved: boolean
  error: string | null
  updateField: (field: keyof CourseSettingsData, value: string) => void
}

export function useCourseSettings(courseId: string | null): CourseSettingsReturn {
  const { tenantId } = useAuth()
  const queryClient = useQueryClient()
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isSaved, setIsSaved] = useState(false)

  const {
    data: courseData,
    isLoading,
    error,
  } = useQuery({
    queryKey: courseKeys.detail(tenantId!, courseId!),
    queryFn: () => courseService.getCourseById(courseId!, tenantId!),
    enabled: !!courseId && !!tenantId,
  })

  const { mutate: updateCourse, isPending: isSaving } = useMutation({
    mutationFn: (updates: Parameters<typeof courseService.updateCourse>[1]) =>
      courseService.updateCourse(courseId!, updates, tenantId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(tenantId!, courseId!) })
      setIsSaved(true)
      savedTimerRef.current = setTimeout(() => setIsSaved(false), 3000)
    },
  })

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  const updateField = useCallback(
    (field: keyof CourseSettingsData, value: string) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      setIsSaved(false)

      saveTimerRef.current = setTimeout(() => {
        updateCourse({ [field]: value || null })
      }, 800)
    },
    [updateCourse]
  )

  const data: CourseSettingsData = {
    title: courseData?.title || '',
    description: courseData?.description || '',
    subject: courseData?.subject || '',
    level: courseData?.level || '',
  }

  return {
    data,
    isLoading,
    isSaving,
    isSaved,
    error: error?.message ?? null,
    updateField,
  }
}
