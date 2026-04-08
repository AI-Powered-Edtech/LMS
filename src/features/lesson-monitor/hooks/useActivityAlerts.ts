import { useEffect, useState } from 'react'

import type { StudentActivityData } from '../types'

export interface ActivityAlert {
  id: string
  studentId: string
  studentName: string
  type: 'stuck' | 'inactive' | 'slow_progress'
  message: string
  severity: 'low' | 'medium' | 'high'
  timestamp: Date
}

export function useActivityAlerts(studentActivity: StudentActivityData[]) {
  const [alerts, setAlerts] = useState<ActivityAlert[]>([])

  useEffect(() => {
    const newAlerts: ActivityAlert[] = []

    studentActivity.forEach((student) => {
      const now = new Date()
      const lastActivity = new Date(student.lastActivity)
      const minutesSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60)

      // Alert if student has been inactive for more than 5 minutes
      if (minutesSinceActivity > 5 && student.status === 'inactive') {
        newAlerts.push({
          id: `inactive-${student.studentId}`,
          studentId: student.studentId,
          studentName: student.studentName,
          type: 'inactive',
          message: `Belum aktif selama ${Math.round(minutesSinceActivity)} menit`,
          severity: minutesSinceActivity > 15 ? 'high' : 'medium',
          timestamp: now,
        })
      }

      // Alert if student seems stuck (low progress, been active but not progressing)
      if (student.status === 'active' && student.progress < 30 && student.timeSpent > 10) {
        newAlerts.push({
          id: `stuck-${student.studentId}`,
          studentId: student.studentId,
          studentName: student.studentName,
          type: 'stuck',
          message: `Sepertinya terjebak - progress rendah (${student.progress}%) setelah ${student.timeSpent} menit`,
          severity: 'medium',
          timestamp: now,
        })
      }

      // Alert if student is progressing very slowly
      if (
        student.status === 'active' &&
        student.progress > 0 &&
        student.timeSpent > 20 &&
        student.progress / student.timeSpent < 1
      ) {
        newAlerts.push({
          id: `slow-${student.studentId}`,
          studentId: student.studentId,
          studentName: student.studentName,
          type: 'slow_progress',
          message: `Progress lambat - hanya ${student.progress}% dalam ${student.timeSpent} menit`,
          severity: 'low',
          timestamp: now,
        })
      }
    })

    setAlerts(newAlerts)
  }, [studentActivity])

  const dismissAlert = (alertId: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId))
  }

  const getAlertsBySeverity = (severity: ActivityAlert['severity']) => {
    return alerts.filter((alert) => alert.severity === severity)
  }

  return {
    alerts,
    dismissAlert,
    getAlertsBySeverity,
    highPriorityAlerts: getAlertsBySeverity('high'),
    mediumPriorityAlerts: getAlertsBySeverity('medium'),
    lowPriorityAlerts: getAlertsBySeverity('low'),
  }
}
