import { cloneElement, ReactElement, useId } from 'react'
import { Control, FieldPath, FieldValues, useController } from 'react-hook-form'

import { cn } from '@/utils/cn'

export interface FormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  name: TName
  control: Control<TFieldValues>
  label?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: ReactElement<any, any>
  className?: string
  labelClassName?: string
  errorClassName?: string
}

export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  control,
  label,
  children,
  className,
  labelClassName,
  errorClassName,
}: FormFieldProps<TFieldValues, TName>) {
  const id = useId()
  const {
    field,
    fieldState: { error },
  } = useController({ name, control })

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label
          htmlFor={id}
          className={cn(
            'block text-sm font-medium mb-1.5',
            labelClassName || 'text-slate-700 dark:text-slate-200'
          )}
        >
          {label}
        </label>
      )}
      {cloneElement(children, {
        ...field,
        id,
        'aria-invalid': !!error,
        'aria-describedby': error ? `${id}-error` : undefined,
      })}
      {error && (
        <p id={`${id}-error`} className={cn('mt-1.5 text-sm', errorClassName || 'text-red-500')}>
          {error.message}
        </p>
      )}
    </div>
  )
}
