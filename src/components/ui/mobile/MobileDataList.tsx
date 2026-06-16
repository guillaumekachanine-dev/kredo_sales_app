import React from "react"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"

export interface MobileDataListProps<T> {
  items: T[]
  getItemId: (item: T) => string
  renderItem: (item: T) => React.ReactNode
  loading?: boolean
  loadingItemCount?: number
  emptyState?: React.ReactNode
  errorState?: React.ReactNode
  header?: React.ReactNode
  footer?: React.ReactNode
  ariaLabel: string
  className?: string
}

function MobileDataListSkeleton({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <SurfaceCard key={index} padding="default" radius="xl" aria-hidden="true">
          <div className="animate-pulse space-y-3">
            <div className="flex items-start gap-3">
              <div className="size-11 rounded-[var(--radius-round)] bg-[var(--color-skeleton-base)]/70" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-2/5 rounded-[var(--radius-small)] bg-[var(--color-skeleton-base)]/70" />
                <div className="h-3 w-4/5 rounded-[var(--radius-small)] bg-[var(--color-skeleton-base)]/55" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="h-3 rounded-[var(--radius-small)] bg-[var(--color-skeleton-base)]/55" />
              <div className="h-3 rounded-[var(--radius-small)] bg-[var(--color-skeleton-base)]/55" />
            </div>
          </div>
        </SurfaceCard>
      ))}
    </>
  )
}

export function MobileDataList<T>({
  items,
  getItemId,
  renderItem,
  loading = false,
  loadingItemCount = 3,
  emptyState,
  errorState,
  header,
  footer,
  ariaLabel,
  className,
}: MobileDataListProps<T>) {
  const hasItems = items.length > 0

  return (
    <section
      className={cn("flex flex-col gap-3", className)}
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
    >
      {header}

      {errorState ? (
        <div>{errorState}</div>
      ) : loading ? (
        <div className="flex flex-col gap-3">
          <MobileDataListSkeleton count={loadingItemCount} />
        </div>
      ) : hasItems ? (
        <div className="flex flex-col gap-3" role="list">
          {items.map((item) => (
            <div key={getItemId(item)} role="listitem">
              {renderItem(item)}
            </div>
          ))}
        </div>
      ) : (
        <div>
          {emptyState ?? (
            <SurfaceCard padding="default" radius="xl">
              <div className="flex min-h-28 flex-col items-center justify-center text-center">
                <h3 className="text-sm font-semibold text-heading">Aucune donnée prioritaire</h3>
                <p className="mt-2 text-[length:var(--font-size-body-md)] leading-[var(--line-height-body-md)] text-body">
                  Aucun élément n’est disponible pour cette vue mobile.
                </p>
              </div>
            </SurfaceCard>
          )}
        </div>
      )}

      {footer}
    </section>
  )
}
