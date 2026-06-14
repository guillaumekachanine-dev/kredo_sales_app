import React from 'react'

/**
 * Loading skeleton for the Sector detailed page.
 * Mirrors the desktop 2-column layout (collapses gracefully on mobile).
 */
export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="bg-surface border border-border p-6 rounded flex items-center justify-between gap-6 animate-pulse">
        <div className="space-y-3 w-full">
          <div className="h-5 w-64 bg-muted/20 rounded" />
          <div className="h-3 w-full max-w-xl bg-muted/15 rounded" />
        </div>
        <div className="h-8 w-16 bg-muted/15 rounded shrink-0" />
      </div>

      {/* Grid Layout Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border p-5 rounded animate-pulse space-y-4">
              <div className="h-3 w-48 bg-muted/20 rounded border-b border-border/40 pb-2" />
              <div className="space-y-3">
                <div className="h-2 w-full bg-muted/15 rounded" />
                <div className="h-2 w-5/6 bg-muted/15 rounded" />
                <div className="h-2 w-4/6 bg-muted/15 rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Right Column (1/3) */}
        <div className="space-y-6">
          <div className="bg-surface border border-border p-5 rounded animate-pulse space-y-4">
            <div className="h-3 w-24 bg-muted/20 rounded" />
            <div className="h-8 w-16 bg-muted/20 rounded" />
            <div className="h-1.5 w-full bg-muted/15 rounded" />
          </div>
          <div className="bg-surface border border-border p-5 rounded animate-pulse space-y-3">
            <div className="h-3 w-32 bg-muted/20 rounded" />
            <div className="space-y-2">
              <div className="h-2 w-full bg-muted/15 rounded" />
              <div className="h-2 w-5/6 bg-muted/15 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
