import { forwardRef, useId } from 'react'
import { cn } from '@/src/utils/cn'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
  inputSize?: 'sm' | 'md' | 'lg'
}

const inputSizes = {
  sm: 'text-sm px-3 py-1.5 rounded-lg',
  md: 'text-sm px-4 py-2.5 rounded-xl',
  lg: 'text-base px-4 py-3 rounded-xl',
} as const

const iconPadding = {
  sm: 'pl-9',
  md: 'pl-10',
  lg: 'pl-11',
} as const

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, inputSize = 'md', className, id: externalId, ...props }, ref) => {
    const autoId = useId()
    const id = externalId || autoId

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div
              aria-hidden="true"
              className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500"
            >
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            className={cn(
              'w-full border bg-white text-slate-900 placeholder:text-slate-400 transition-colors duration-200 outline-none',
              'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
              'dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500',
              error
                ? 'border-red-400 focus:ring-red-500 focus:border-red-500 dark:border-red-500'
                : 'border-slate-300 dark:border-slate-600',
              inputSizes[inputSize],
              icon && iconPadding[inputSize],
              props.disabled && 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800',
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p id={`${id}-error`} className="mt-1.5 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
