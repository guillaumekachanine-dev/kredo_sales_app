export function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-[var(--radius-medium)] bg-surface border border-border" />
        ))}
      </div>
      <div className="h-64 rounded-[var(--radius-medium)] bg-surface border border-border" />
      <div className="h-48 rounded-[var(--radius-medium)] bg-surface border border-border" />
    </div>
  )
}
