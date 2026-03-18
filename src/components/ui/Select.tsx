import { forwardRef, useId } from 'react';
import { cn } from '@/src/utils/cn';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  options: SelectOption[];
  label?: string;
  error?: string;
  placeholder?: string;
  selectSize?: 'sm' | 'md' | 'lg';
}

const selectSizes = {
  sm: 'text-sm px-3 py-1.5 rounded-lg',
  md: 'text-sm px-4 py-2.5 rounded-xl',
  lg: 'text-base px-4 py-3 rounded-xl',
} as const;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { options, label, error, placeholder, selectSize = 'md', className, id: externalId, ...props },
    ref
  ) => {
    const autoId = useId();
    const id = externalId || autoId;

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
          <select
            ref={ref}
            id={id}
            className={cn(
              'w-full border bg-white text-slate-900 appearance-none pr-10 transition-colors duration-200 outline-none',
              'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500',
              'dark:bg-slate-900 dark:text-white',
              error
                ? 'border-red-400 focus:ring-red-500 focus:border-red-500 dark:border-red-500'
                : 'border-slate-300 dark:border-slate-600',
              selectSizes[selectSize],
              props.disabled && 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
