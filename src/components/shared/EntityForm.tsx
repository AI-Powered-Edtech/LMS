import { valibotResolver } from '@hookform/resolvers/valibot'
import { useForm } from 'react-hook-form'
import * as v from 'valibot'

import { FormField } from '@/src/components/ui/FormField'
import { cn } from '@/src/utils/cn'

const schema = v.object({
  name: v.pipe(v.string(), v.minLength(1, 'Nama wajib diisi')),
  description: v.string(),
})

type EntityFormData = v.InferOutput<typeof schema>

interface EntityFormProps {
  onSubmit: (data: Record<string, string>) => void
  isLoading?: boolean
  className?: string
  /** Label entity untuk JSDoc/accessibility (contoh: "Tugas", "Kursus") */
  entityLabel?: string
}

/**
 * Generic form untuk membuat/mengedit entitas.
 * Menggantikan 14 form identik di seluruh feature module.
 */
function EntityForm({
  onSubmit,
  isLoading,
  className,
  entityLabel: _entityLabel,
}: EntityFormProps) {
  const { control, handleSubmit } = useForm<EntityFormData>({
    resolver: valibotResolver(schema),
    defaultValues: { name: '', description: '' },
  })

  return (
    <form
      onSubmit={handleSubmit((data) => onSubmit(data as Record<string, string>))}
      className={cn('space-y-4', className)}
    >
      <div>
        <FormField control={control} name="name" label="Nama">
          <input
            type="text"
            className={cn(
              'w-full px-4 py-2.5 rounded-xl border text-sm',
              'border-slate-200 dark:border-slate-700',
              'bg-white dark:bg-slate-900',
              'text-slate-900 dark:text-white',
              'focus:outline-none focus:ring-2 focus:ring-blue-500'
            )}
          />
        </FormField>
      </div>
      <div>
        <FormField control={control} name="description" label="Deskripsi">
          <textarea
            rows={3}
            className={cn(
              'w-full px-4 py-2.5 rounded-xl border text-sm resize-none',
              'border-slate-200 dark:border-slate-700',
              'bg-white dark:bg-slate-900',
              'text-slate-900 dark:text-white',
              'focus:outline-none focus:ring-2 focus:ring-blue-500'
            )}
          />
        </FormField>
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className={cn(
          'w-full py-2.5 rounded-xl text-sm font-medium text-white',
          'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors'
        )}
      >
        {isLoading ? 'Menyimpan...' : 'Simpan'}
      </button>
    </form>
  )
}
