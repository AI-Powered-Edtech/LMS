import { forwardRef, useId, useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/src/utils/cn';
import { useDebounce } from '@/src/hooks/useDebounce';

export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'size'> {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onChange, placeholder = 'Cari...', debounceMs = 300, className, ...props }, ref) => {
    const autoId = useId();
    const id = props.id || autoId;

    const [localValue, setLocalValue] = useState(value);
    const debouncedValue = useDebounce(localValue, debounceMs);

    // Sync from external value prop
    useEffect(() => {
      setLocalValue(value);
    }, [value]);

    // Emit onChange when debounced value changes
    useEffect(() => {
      if (debouncedValue !== value) {
        onChange(debouncedValue);
      }
    }, [debouncedValue, onChange, value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalValue(e.target.value);
    };

    const handleClear = () => {
      setLocalValue('');
      onChange('');
    };

    return (
      <div className="relative w-full">
        {/* Search Icon */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500"
        >
          <Search className="h-4 w-4" />
        </div>

        {/* Input */}
        <input
          ref={ref}
          id={id}
          type="text"
          value={localValue}
          onChange={handleChange}
          placeholder={placeholder}
          className={cn(
            'w-full border bg-white text-slate-900 placeholder:text-slate-400 transition-colors duration-200 outline-none',
            'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            'dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500',
            'border-slate-300 dark:border-slate-600',
            'text-sm px-4 py-2.5 rounded-xl',
            'pl-10',
            props.disabled && 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800',
            className
          )}
          {...props}
        />

        {/* Clear Button */}
        {localValue && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Hapus pencarian"
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
