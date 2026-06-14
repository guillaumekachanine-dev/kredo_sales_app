import React from 'react'

/**
 * Loading skeleton for the Sector index page.
 * Displays page title block and grid of cards as loading state.
 */
export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="bg-surface border border-border p-6 rounded animate-pulse space-y-3">
        <div className="h-5 w-48 bg-muted/20 rounded" />
        <div className="h-3 w-full max-w-2xl bg-muted/15 rounded" />
      </div>

      {/* Grid of Card Skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border p-5 rounded animate-pulse space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-4 w-32 bg-muted/20 rounded" />
              <div className="h-4 w-12 bg-muted/15 rounded" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-16 bg-muted/15 rounded" />
              <div className="h-2 w-full bg-muted/10 rounded" />
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-3">
              <div className="space-y-1">
                <div className="h-2.5 w-16 bg-muted/15 rounded" />
                <div className="h-3 w-12 bg-muted/20 rounded" />
              </div>
              <div className="space-y-1">
                <div className="h-2.5 w-16 bg-muted/15 rounded" />
                <div className="h-3 w-12 bg-muted/20 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
