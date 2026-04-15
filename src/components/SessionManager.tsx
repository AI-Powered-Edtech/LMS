import { useEffect, useRef } from 'react'

import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../hooks/useToast'

const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes

export function SessionManager() {
  const { user, signOut } = useAuth()
  const addToast = useToast((s) => s.addToast)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!user) return

    const resetTimer = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(async () => {
        await signOut()
        addToast({ type: 'error', message: 'Sesi Anda telah berakhir karena tidak ada aktivitas.' })
      }, SESSION_TIMEOUT)
    }

    resetTimer()

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']

    events.forEach((event) => {
      document.addEventListener(event, resetTimer, { passive: true })
    })

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer)
      })
    }
  }, [user, signOut, addToast])

  return null
}
