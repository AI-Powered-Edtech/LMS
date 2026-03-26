<<<<<<< Updated upstream
import { useEffect, useState } from 'react'
=======
import { useEffect,useState } from 'react'
>>>>>>> Stashed changes

export interface NetworkStatus {
  isOnline: boolean
  wasOffline: boolean
  resetWasOffline: () => void
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setWasOffline(true) // flag to trigger sync
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const resetWasOffline = () => setWasOffline(false)

  return { isOnline, wasOffline, resetWasOffline }
}
