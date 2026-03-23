import { forwardRef, memo } from 'react'

import { cn } from '@/src/utils/cn'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
  border?: boolean
}

const paddings = {
  none: '',
  sm: 'p-3',
  md: 'p-4 sm:p-6',
  lg: 'p-6 sm:p-8',
} as const

export const Card = memo(
  forwardRef<HTMLDivElement, CardProps>(
    ({ padding = 'md', hover = false, border = true, className, children, ...props }, ref) => {
      return (
        <div
          ref={ref}
          className={cn(
            'bg-white rounded-2xl dark:bg-slate-900',
            border && 'border border-slate-200 dark:border-slate-700/60',
            'shadow-sm',
            paddings[padding],
            hover &&
              'transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer',
            className
          )}
          {...props}
        >
          {children}
        </div>
      )
    }
  )
)

Card.displayName = 'Card'
