import { motion, useReducedMotion } from 'motion/react'
import { useId, useRef } from 'react'

import { cn } from '@/src/utils/cn'

export interface Tab {
  id: string
  label: string
  icon?: React.ReactNode
  count?: number
}

export interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onChange: (tabId: string) => void
  className?: string
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  const layoutId = useId()
  const containerRef = useRef<HTMLDivElement>(null)

  // ACCESSIBILITY: Respect the user's OS/browser preference for reduced motion.
  // Users with vestibular disorders can be harmed by unnecessary animations.
  const shouldReduceMotion = useReducedMotion()
  const tabTransition = shouldReduceMotion
    ? { duration: 0 }
    : { type: 'spring', stiffness: 400, damping: 30 }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const tabButtons = Array.from(
      containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []
    )
    const currentIndex = tabButtons.indexOf(document.activeElement as HTMLButtonElement)
    if (currentIndex === -1) return

    if (e.key === 'ArrowRight') {
      e.preventDefault()
      tabButtons[(currentIndex + 1) % tabButtons.length]?.focus()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      tabButtons[(currentIndex - 1 + tabButtons.length) % tabButtons.length]?.focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      tabButtons[0]?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      tabButtons[tabButtons.length - 1]?.focus()
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl relative',
        className
      )}
      role="tablist"
      onKeyDown={handleKeyDown}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 outline-none z-[1]',
              'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
              isActive
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            {isActive && (
              <motion.span
                layoutId={`tab-indicator-${layoutId}`}
                className="absolute inset-0 bg-white dark:bg-slate-700 rounded-lg shadow-sm"
                transition={tabTransition as any}
              />
            )}
            <span className="relative z-[1] flex items-center gap-2">
              {tab.icon}
              {tab.label}
              {tab.count != null && (
                <span
                  className={cn(
                    'text-xs px-1.5 py-0.5 rounded-md font-semibold min-w-[1.25rem] text-center',
                    isActive
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
