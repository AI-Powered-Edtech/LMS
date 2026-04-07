export function CourseSettingsSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-4">
      {/* Header Area */}
      <div className="flex items-center justify-between border-b pb-4 dark:border-slate-700">
        <div className="space-y-2">
          <div className="h-6 w-48 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-72 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="h-10 w-24 rounded bg-slate-200 dark:bg-slate-700" />
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-10 w-full rounded bg-slate-200 dark:bg-slate-700" />
        </div>

        <div className="space-y-2">
          <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-24 w-full rounded bg-slate-200 dark:bg-slate-700" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-10 w-full rounded bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-10 w-full rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4">
        <div className="h-10 w-24 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-10 w-24 rounded bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  )
}
