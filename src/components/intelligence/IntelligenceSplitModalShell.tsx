"use client"

import type { ReactNode } from "react"
import { useEffect } from "react"
import { cn } from "@/lib/utils"

export type IntelligenceSplitModalShellProps = {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  leftPane: ReactNode
  rightPane: ReactNode
  headerActions?: ReactNode
  leftPaneWidth?: string
  /** Preserves the full-width category screen used by the Documents modal. */
  content?: ReactNode
  isMobile?: boolean
  className?: string
}

/**
 * The shared presentational frame for the Intelligence split modals.
 * It owns only the backdrop, header, dimensions and independently scrolling panes.
 */
export function IntelligenceSplitModalShell({
  open,
  title,
  subtitle,
  onClose,
  leftPane,
  rightPane,
  headerActions,
  leftPaneWidth = "38%",
  content,
  isMobile = false,
  className,
}: IntelligenceSplitModalShellProps) {
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose, open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "flex h-[80vh] max-h-[750px] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0f122c] text-white shadow-2xl",
          isMobile && "fixed inset-0 h-full max-h-none w-full max-w-none rounded-none",
          className,
        )}
      >
        <header className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div className="flex min-w-0 items-center gap-2">
            {headerActions}
            <div className="min-w-0">
              <h2 className="font-heading text-lg font-bold leading-tight">{title}</h2>
              {subtitle ? <p className="mt-0.5 text-xs leading-tight text-muted">{subtitle}</p> : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Fermer la modale"
          >
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        {content ? (
          content
        ) : (
          <div className="flex min-h-0 flex-1 items-stretch">
            <aside
              className="min-h-0 shrink-0 overflow-y-auto border-r border-white/5 transition-all duration-300 ease-out"
              style={{ width: leftPaneWidth }}
            >
              {leftPane}
            </aside>
            <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-slate-950/20 transition-all duration-300 ease-out">
              {rightPane}
            </main>
          </div>
        )}
      </section>
    </div>
  )
}
