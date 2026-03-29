import { X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useId, useRef } from 'react'

import { cn } from '@/src/utils/cn'

/* ─── Modal ────────────────────────────────────────────────── */

export interface ModalProps {
  open: boolean
  onClose: () => void
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Optional aria-label for modals without a ModalHeader */
  ariaLabel?: string
  children: React.ReactNode
}

const modalSizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
} as const

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function Modal({ open, onClose, size = 'md', ariaLabel, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      // Focus trap: cycle Tab within modal
      if (e.key === 'Tab' && contentRef.current) {
        const focusableEls = contentRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        if (focusableEls.length === 0) return
        const first = focusableEls[0]
        const last = focusableEls[focusableEls.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    },
    [onClose]
  )

  // Focus trap + escape key
  useEffect(() => {
    if (!open) return

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    // Focus first focusable element
    const timer = setTimeout(() => {
      const focusable = contentRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
      focusable?.focus()
    }, 50)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      clearTimeout(timer)
    }
  }, [open, handleKeyDown])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />

      {/* Content */}
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabel ? undefined : titleId}
        aria-label={ariaLabel}
        className={cn(
          'relative w-full bg-white dark:bg-slate-900 shadow-xl',
          'border border-slate-200 dark:border-slate-700/60',
          'flex flex-col',
          'animate-in fade-in zoom-in-95 duration-200',
          // Bottom-sheet on mobile, centered rounded modal on sm+
          'max-h-[90dvh] sm:max-h-[85vh]',
          'rounded-t-2xl sm:rounded-2xl',
          modalSizes[size]
        )}
      >
        <ModalTitleIdContext.Provider value={titleId}>{children}</ModalTitleIdContext.Provider>
      </div>
    </div>
  )
}

/* ─── Internal context to pass title ID to ModalHeader ────── */

const ModalTitleIdContext = createContext<string | undefined>(undefined)

/* ─── ModalHeader ──────────────────────────────────────────── */

export interface ModalHeaderProps {
  title: string
  onClose?: () => void
  className?: string
}

export function ModalHeader({ title, onClose, className }: ModalHeaderProps) {
  const titleId = useContext(ModalTitleIdContext)

  return (
    <div
      className={cn(
        'flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700/60 shrink-0',
        className
      )}
    >
      <h2 id={titleId} className="text-lg font-bold text-slate-900 dark:text-white">
        {title}
      </h2>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="p-2.5 -mr-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}

/* ─── ModalBody ────────────────────────────────────────────── */

export interface ModalBodyProps {
  children: React.ReactNode
  className?: string
}

export function ModalBody({ children, className }: ModalBodyProps) {
  return <div className={cn('px-6 py-4 overflow-y-auto flex-1', className)}>{children}</div>
}

/* ─── ModalFooter ──────────────────────────────────────────── */

export interface ModalFooterProps {
  children: React.ReactNode
  className?: string
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700/60 shrink-0',
        className
      )}
    >
      {children}
    </div>
  )
}
