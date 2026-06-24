import React, { ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface EntityWorkspacePageProps {
  /**
   * The child components of the workspace page. Typically includes:
   * - <EntityWorkspaceHeader />
   * - <EntityWorkspaceContent />
   */
  children: ReactNode
  className?: string
}

/**
 * EntityWorkspacePage is the main layout shell for workspace listings or feature boards.
 *
 * Responsibilities:
 * - Establishes responsive container paddings (px-6 py-8) and max-width limitations (max-w-7xl).
 * - Maintains standard gap spacing between header, filtering, and main content blocks.
 *
 * Feature Responsibilities:
 * - Setup Route handlers, page metadata, dynamic render constraints, and server-side data fetching.
 */
export function EntityWorkspacePage({ children, className }: EntityWorkspacePageProps) {
  return (
    <div className={cn("mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 py-8", className)}>
      {children}
    </div>
  )
}
