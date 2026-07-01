function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-[var(--radius-large)] bg-[var(--color-skeleton-base)]/40 ${className}`} />
}

export function AgendaDesktopSkeleton() {
  return (
    <section className="w-full bg-canvas">
      <div className="mx-auto flex w-full max-w-[1760px] flex-col gap-5 px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <SkeletonBlock className="h-8 w-40" />
            <SkeletonBlock className="h-4 w-56" />
          </div>
          <div className="flex items-center gap-3">
            <SkeletonBlock className="h-10 w-44" />
            <SkeletonBlock className="h-10 w-40" />
          </div>
        </div>

        <SkeletonBlock className="h-28 w-full" />

        <div
          className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_clamp(296px,22vw,360px)]"
        >
          <div className="space-y-4">
            <SkeletonBlock className="h-24 w-full" />
            <SkeletonBlock className="h-[760px] w-full" />
          </div>
          <div className="space-y-4">
            <SkeletonBlock className="h-44 w-full" />
            <SkeletonBlock className="h-44 w-full" />
            <SkeletonBlock className="h-44 w-full" />
          </div>
        </div>
      </div>
    </section>
  )
}
