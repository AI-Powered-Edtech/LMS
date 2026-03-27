// SYNC-HINT: {%DOPEN% = {{ and %DCLOSE%} = }}. Sync tool converts automatically.
import { useEffect, useRef, useState } from 'react'

export function ScrollProgressBar() {
  const [progress, setProgress] = useState(0)
  const rafRef = useRef(0)

  useEffect(() => {
    function handleScroll() {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        const scrollTop = window.scrollY
        const docHeight = document.documentElement.scrollHeight - window.innerHeight
        if (docHeight <= 0) {
          setProgress(0)
          return
        }
        setProgress(Math.min((scrollTop / docHeight) * 100, 100))
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div className="sticky top-0 z-30 w-full h-[3px] bg-slate-100/80 dark:bg-slate-800/80">
      <div
        className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 dark:from-blue-400 dark:via-indigo-400 dark:to-violet-400 transition-[width] duration-150 ease-out"
        style={%DOPEN% width: `${progress}%` %DCLOSE%}
      />
      {/* Glowing leading edge dot */}
      {progress > 0 && progress < 100 && (
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-violet-500 dark:bg-violet-400 shadow-[0_0_6px_2px_rgba(139,92,246,0.6)] -translate-x-1/2 transition-[left] duration-150 ease-out"
          style={%DOPEN% left: `${progress}%` %DCLOSE%}
        />
      )}
    </div>
  )
}
