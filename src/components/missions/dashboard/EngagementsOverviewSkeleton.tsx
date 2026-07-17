export function EngagementsOverviewSkeleton() {
  return (
    <div className="h-full animate-pulse p-4 motion-reduce:animate-none" role="status" aria-label="Chargement de la synthèse des engagements">
      <div className="mb-3 h-10 w-72 max-w-full rounded-[var(--radius-medium)] bg-border/60" />
      <div className="grid h-[calc(100%-3.25rem)] grid-cols-12 grid-rows-2 gap-3 max-md:block max-md:h-auto">
        <div className="col-span-7 rounded-[var(--radius-medium)] border border-border bg-surface max-md:mb-3 max-md:h-52" />
        <div className="col-span-5 rounded-[var(--radius-medium)] border border-border bg-surface max-md:mb-3 max-md:h-52" />
        <div className="col-span-7 rounded-[var(--radius-medium)] border border-border bg-surface max-md:mb-3 max-md:h-52" />
        <div className="col-span-5 rounded-[var(--radius-medium)] border border-border bg-surface max-md:mb-3 max-md:h-52" />
      </div>
      <span className="sr-only">Chargement…</span>
    </div>
  )
}
