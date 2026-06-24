import React, { ReactNode } from "react"

export interface EntityWorkspaceContentProps {
  /**
   * Component view rendered on desktop resolutions (>= 768px).
   */
  desktopView: ReactNode
  /**
   * Component view rendered on mobile resolutions (< 768px).
   */
  mobileView: ReactNode
  className?: string
}

/**
 * EntityWorkspaceContent splits content presentation between Desktop and Mobile.
 *
 * Responsibilities:
 * - Render desktop and mobile viewport versions selectively based on responsive Tailwind markers (md).
 * - Avoid custom hooks where media query styling is sufficient for standard CSS hydration sync.
 *
 * Feature Responsibilities:
 * - Provide the feature components (e.g. lists, grids, planning timelines) for both screen formats.
 */
export function EntityWorkspaceContent({
  desktopView,
  mobileView,
  className,
}: EntityWorkspaceContentProps) {
  return (
    <div className={className}>
      <div className="hidden md:block">{desktopView}</div>
      <div className="md:hidden">{mobileView}</div>
    </div>
  )
}
