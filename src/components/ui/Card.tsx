import { forwardRef, memo } from 'react'

import { cn } from '@/utils/cn'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
  border?: boolean
}

const paddings = {
  none: '',
  sm: 'p-1',
  md: 'p-2 sm:p-3',
  lg: 'p-3 sm:p-4',
} as const

export const Card = memo(
  forwardRef<HTMLDivElement, CardProps>(
    ({ padding = 'md', hover = false, border = true, className, children, ...props }, ref) => {
      return (
        <div
          ref={ref}
          className={cn(
            'bg-white rounded-lg dark:bg-slate-900',
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
