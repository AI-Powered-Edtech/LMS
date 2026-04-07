export function CourseBuilderSkeleton() {
  return (
    <div className="flex h-screen animate-pulse bg-slate-50 dark:bg-slate-900">
      {/* Sidebar Skeleton */}
      <div className="w-64 border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-800">
        <div className="mb-6 h-6 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />

        <div className="space-y-4">
          {/* Module Item */}
          <div className="space-y-2">
            <div className="h-10 w-full rounded bg-slate-200 dark:bg-slate-700" />
            <div className="ml-4 space-y-2">
              <div className="h-8 w-[90%] rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-8 w-[90%] rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>

          {/* Module Item 2 */}
          <div className="space-y-2">
            <div className="h-10 w-full rounded bg-slate-200 dark:bg-slate-700" />
            <div className="ml-4 space-y-2">
              <div className="h-8 w-[90%] rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area Skeleton */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <div className="h-16 border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-800 flex items-center justify-between">
          <div className="h-6 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="flex gap-2">
            <div className="h-8 w-20 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-8 w-20 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 p-8">
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="h-12 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-40 w-full rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-20 w-full rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      </div>
    </div>
  )
}
