"use client"

import React, { useEffect, useId, useRef, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

function subscribePortalRoot(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {}
  }

  const frame = window.requestAnimationFrame(onStoreChange)
  return () => window.cancelAnimationFrame(frame)
}

function getPortalRootSnapshot() {
  return typeof document === "undefined" ? null : document.body
}

function getServerPortalRootSnapshot() {
  return null
}

export interface AppDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
  titleClassName?: string
  bodyClassName?: string
  headerClassName?: string
  closeButtonClassName?: string
  footerClassName?: string
  maxHeightClassName?: string
  aside?: React.ReactNode
  asideOpen?: boolean
  asideClassName?: string
  asideWidthClassName?: string
  dataTheme?: string
  fillHeight?: boolean
}

export function AppDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  titleClassName,
  bodyClassName,
  headerClassName,
  closeButtonClassName,
  footerClassName,
  maxHeightClassName,
  aside,
  asideOpen = false,
  asideClassName,
  asideWidthClassName,
  dataTheme,
  fillHeight = false,
}: AppDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const lastFocusedElementRef = useRef<HTMLElement | null>(null)
  const portalRoot = useSyncExternalStore(
    subscribePortalRoot,
    getPortalRootSnapshot,
    getServerPortalRootSnapshot,
  )
  const titleId = useId()
  const descriptionId = useId()
  const resolvedMaxHeightClassName = maxHeightClassName ?? "max-h-[min(calc(100dvh-2rem),42rem)] sm:max-h-[min(calc(100dvh-4rem),42rem)]"
  const resolvedAsideWidthClassName = asideWidthClassName ?? "w-[min(32rem,42vw)]"
  const hasAside = Boolean(aside)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open) {
      if (!dialog.open) {
        lastFocusedElementRef.current = document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null
        dialog.showModal()
        window.requestAnimationFrame(() => closeButtonRef.current?.focus())
      }
    } else {
      if (dialog.open) {
        dialog.close()
        lastFocusedElementRef.current?.focus()
      }
    }
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || !open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      e.preventDefault()
      e.stopPropagation()
      onOpenChange(false)
    }

    const handleCancel = (e: Event) => {
      e.preventDefault()
      onOpenChange(false)
    }

    dialog.addEventListener("keydown", handleKeyDown)
    dialog.addEventListener("cancel", handleCancel)
    return () => {
      dialog.removeEventListener("keydown", handleKeyDown)
      dialog.removeEventListener("cancel", handleCancel)
    }
  }, [open, onOpenChange])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onOpenChange(false)
    }
  }

  const titleContent = typeof title === "string" ? (
    <h2 id={titleId} className={cn("font-heading text-sm font-bold", titleClassName)}>
      {title}
    </h2>
  ) : (
    <div id={titleId} className={cn("min-w-0", titleClassName)}>
      {title}
    </div>
  )

  const dialog = (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      aria-modal="true"
      onClick={handleBackdropClick}
      data-theme={dataTheme}
      className={cn(
        "fixed inset-0 m-auto h-fit w-[min(calc(100vw-1.5rem),32rem)] max-w-full overflow-hidden overscroll-contain rounded-[var(--radius-medium)] border border-border bg-surface p-0 text-heading sm:w-full sm:max-w-lg",
        hasAside && "relative !overflow-visible",
        hasAside && asideOpen && "rounded-r-none",
        resolvedMaxHeightClassName,
        "backdrop:bg-heading/30 backdrop:backdrop-blur-sm",
        "open:animate-in open:fade-in open:zoom-in-95 duration-200 outline-none",
        "z-[var(--z-modal)]",
        className
      )}
    >
      <div className={cn("flex", hasAside ? "h-full min-h-0 p-0" : "p-4 sm:p-6", fillHeight && "h-full min-h-0 overflow-hidden", resolvedMaxHeightClassName)}>
        <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col gap-4", (hasAside || fillHeight) && "h-full", hasAside && "p-4 sm:p-6")}>
          {/* Header */}
          <div className={cn("min-w-0 shrink-0 flex flex-col gap-1.5", headerClassName)}>
            <div className="flex items-center justify-between">
              {titleContent}
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => onOpenChange(false)}
                className={cn(
                  "inline-flex shrink-0 items-center justify-center text-muted transition-colors hover:text-heading",
                  closeButtonClassName,
                )}
                aria-label="Fermer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {description && (
              <p id={descriptionId} className="text-xs text-body font-normal">{description}</p>
            )}
          </div>

          {/* Body */}
          <div
            className={cn(
              "min-h-0 shrink overflow-y-auto overscroll-contain pr-1 text-xs leading-relaxed text-body",
              bodyClassName,
            )}
          >
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className={cn("shrink-0 flex items-center justify-end gap-2 border-t border-border/40 pt-4", footerClassName)}>
              {footer}
            </div>
          )}
        </div>

        {hasAside && (
          <aside
            aria-hidden={!asideOpen}
            inert={!asideOpen}
            className={cn(
              "absolute inset-y-0 left-full overflow-hidden bg-canvas/40 will-change-[width,opacity,transform] transition-[width,opacity,transform] ease-out motion-reduce:transition-none",
              asideOpen
                ? cn(resolvedAsideWidthClassName, "translate-x-0 rounded-r-[var(--radius-medium)] border border-l border-border/70 opacity-100 duration-500")
                : "pointer-events-none w-0 translate-x-5 border-transparent opacity-0 duration-300",
              asideClassName,
            )}
          >
            <div className={cn("h-full", resolvedAsideWidthClassName)}>{aside}</div>
          </aside>
        )}
      </div>
    </dialog>
  )

  return portalRoot ? createPortal(dialog, portalRoot) : null
}
