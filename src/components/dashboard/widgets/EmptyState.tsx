import { cn } from "@/lib/utils"

interface EmptyStateProps {
  title: string
  description?: string
  className?: string
}

export function EmptyState({ title, description, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center p-8 rounded-lg border border-dashed border-border bg-surface/50", className)}>
      {/* Inbox/Stack Icon */}
      <div className="w-10 h-10 rounded-full bg-canvas flex items-center justify-center border border-border/80 mb-3 text-muted">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      </div>
      <h3 className="text-xs font-semibold text-heading uppercase tracking-wider">
        {title}
      </h3>
      {description && (
        <p className="mt-1 text-xs text-body max-w-sm">
          {description}
        </p>
      )}
    </div>
  )
}
