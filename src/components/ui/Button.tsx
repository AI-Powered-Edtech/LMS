import { forwardRef, memo } from 'react'

import { cn } from '@/utils/cn'
import { logger } from '@/utils/logger'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
  fullWidth?: boolean
}

const variants = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.97] active:opacity-90 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900',
  secondary:
    'bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-[0.97] active:opacity-90 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus-visible:ring-offset-slate-900',
  ghost:
    'text-slate-600 hover:bg-slate-100 active:scale-[0.97] active:opacity-90 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900',
  danger:
    'bg-red-600 text-white hover:bg-red-700 active:scale-[0.97] active:opacity-90 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900',
} as const

const sizes = {
  sm: 'text-xs px-2 py-0.5 rounded-sm gap-1',
  md: 'text-xs px-2.5 py-1 rounded-md gap-1.5',
  lg: 'text-sm px-3 py-1.5 rounded-md gap-2',
} as const

export const Button = memo(
  forwardRef<HTMLButtonElement, ButtonProps>(
    (
      {
        variant = 'primary',
        size = 'md',
        loading = false,
        icon,
        fullWidth = false,
        className,
        children,
        disabled,
        'aria-label': ariaLabel,
        ...props
      },
      ref
    ) => {
      // Warn in development when icon is used without accessible label
      if (
        process.env.NODE_ENV === 'development' &&
        icon &&
        !children &&
        !ariaLabel &&
        !props['aria-labelledby']
      ) {
        logger.warn('Button: Icon-only buttons require an aria-label for accessibility')
      }

      return (
        <button
          ref={ref}
          className={cn(
            'inline-flex items-center justify-center font-semibold transition-all duration-200 outline-none',
            variants[variant],
            sizes[size],
            fullWidth && 'w-full',
            (disabled || loading) && 'opacity-50 cursor-not-allowed pointer-events-none',
            className
          )}
          disabled={disabled || loading}
          aria-label={ariaLabel}
          {...props}
        >
          {loading ? (
            <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            icon
          )}
          {children}
        </button>
      )
    }
  )
)

Button.displayName = 'Button'
