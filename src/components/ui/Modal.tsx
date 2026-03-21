import { useEffect, useRef, useCallback } from 'react'
import { cn } from '@/src/utils/cn'
import { X } from 'lucide-react'

/* ─── Modal ────────────────────────────────────────────────── */

export interface ModalProps {
  open: boolean
  onClose: () => void
  size?: 'sm' | 'md' | 'lg' | 'xl'
  children: React.ReactNode
}

const modalSizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
} as const

export function Modal({ open, onClose, size = 'md', children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
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
      const focusable = contentRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden />

      {/* Content */}
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl',
          'border border-slate-200 dark:border-slate-700/60',
          'max-h-[85vh] flex flex-col',
          'animate-in fade-in zoom-in-95 duration-200',
          modalSizes[size]
        )}
      >
        {children}
      </div>
    </div>
  )
}

/* ─── ModalHeader ──────────────────────────────────────────── */

export interface ModalHeaderProps {
  title: string
  onClose?: () => void
  className?: string
}

export function ModalHeader({ title, onClose, className }: ModalHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700/60 shrink-0',
        className
      )}
    >
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
