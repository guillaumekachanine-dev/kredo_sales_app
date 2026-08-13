"use client"

import type { ReactNode } from "react"
import { useEffect, useId, useRef } from "react"
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

export function dialogFocusTrapDestination(
  activeIndex: number,
  focusableCount: number,
  shiftKey: boolean,
): number | null {
  if (focusableCount === 0) return -1
  if (shiftKey && activeIndex <= 0) return focusableCount - 1
  if (!shiftKey && (activeIndex < 0 || activeIndex === focusableCount - 1)) return 0
  return null
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
  const dialogRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const subtitleId = useId()

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus())
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== "Tab") return

      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
      ) ?? []).filter((element) => (
        element.getAttribute("aria-hidden") !== "true"
        && !element.hasAttribute("hidden")
        && element.getClientRects().length > 0
      ))

      if (focusable.length === 0) {
        event.preventDefault()
        dialogRef.current?.focus()
        return
      }

      const activeElement = document.activeElement
      const activeIndex = dialogRef.current?.contains(activeElement) ? focusable.indexOf(activeElement as HTMLElement) : -1
      const destination = dialogFocusTrapDestination(activeIndex, focusable.length, event.shiftKey)
      if (destination !== null) {
        event.preventDefault()
        if (destination === -1) dialogRef.current?.focus()
        else focusable[destination]?.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      window.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = previousOverflow
      if (previouslyFocused?.isConnected) previouslyFocused.focus()
    }
  }, [onClose, open])

  if (!open) return null

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-md animate-in fade-in duration-200 motion-reduce:animate-none motion-reduce:duration-0",
      isMobile && "p-0",
    )}>
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        tabIndex={-1}
        className={cn(
          "flex h-[80vh] max-h-[750px] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0f122c] text-white shadow-2xl",
          isMobile && "fixed inset-0 h-dvh max-h-none w-full max-w-none rounded-none border-0",
          className,
        )}
      >
        <header className={cn(
          "flex shrink-0 items-center justify-between border-b border-white/5 px-6 py-4",
          isMobile && "px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]",
        )}>
          <div className="flex min-w-0 flex-1 items-center gap-2.5 mr-2">
            {headerActions}
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="font-heading text-base sm:text-lg font-bold leading-tight text-white truncate">{title}</h2>
              {subtitle ? <p id={subtitleId} className="mt-0.5 text-xs leading-tight text-muted truncate">{subtitle}</p> : null}
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass/60 motion-reduce:transition-none"
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
              className="min-h-0 shrink-0 overflow-y-auto border-r border-white/5 transition-all duration-300 ease-out motion-reduce:transition-none"
              style={{ width: leftPaneWidth }}
            >
              {leftPane}
            </aside>
            <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-slate-950/20 transition-all duration-300 ease-out motion-reduce:transition-none">
              {rightPane}
            </main>
          </div>
        )}
      </section>
    </div>
  )
}
