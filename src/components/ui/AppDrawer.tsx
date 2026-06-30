"use client"

import React, { useEffect, useId, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { IconButton } from "@/components/ui/IconButton"
import { AlertBlock } from "@/components/ui/AlertBlock"

export type AppDrawerSide = "right" | "bottom"
export type AppDrawerWidth = "default" | "wide"
export type AppDrawerCloseReason = "close-button" | "mobile-back" | "backdrop" | "escape"

type DrawerErrorState = {
  title?: string
  description?: React.ReactNode
  action?: React.ReactNode
}

function isDrawerErrorState(
  error: React.ReactNode | DrawerErrorState | null | undefined,
): error is DrawerErrorState {
  if (!error || React.isValidElement(error)) {
    return false
  }

  return typeof error === "object" && (
    "title" in error ||
    "description" in error ||
    "action" in error
  )
}

export interface AppDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  subtitle?: string
  description?: string
  eyebrow?: React.ReactNode
  icon?: React.ReactNode
  headerActions?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
  contentClassName?: string
  side?: AppDrawerSide
  width?: AppDrawerWidth
  loading?: boolean
  error?: React.ReactNode | DrawerErrorState | null
  dirty?: boolean
  headerStyle?: React.CSSProperties
  headerClassName?: string
  onRequestClose?: (reason: AppDrawerCloseReason) => boolean | void
  closeLabel?: string
  hideMobileBackBtn?: boolean
}

function DrawerLoadingState() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="space-y-3">
        <div className="h-4 w-32 animate-pulse rounded-[var(--radius-small)] bg-[var(--color-skeleton-base)]/70" />
        <div className="h-16 animate-pulse rounded-[var(--radius-large)] bg-[var(--color-skeleton-base)]/40" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-20 animate-pulse rounded-[var(--radius-large)] bg-[var(--color-skeleton-base)]/35" />
        <div className="h-20 animate-pulse rounded-[var(--radius-large)] bg-[var(--color-skeleton-base)]/35" />
      </div>
      <div className="h-32 animate-pulse rounded-[var(--radius-large)] bg-[var(--color-skeleton-base)]/30" />
    </div>
  )
}

function DrawerErrorContent({ error }: { error: React.ReactNode | DrawerErrorState }) {
  if (!isDrawerErrorState(error)) {
    return <>{error}</>
  }

  return (
    <AlertBlock
      variant="danger"
      title={error.title ?? "Erreur de chargement"}
      description={error.description}
      action={error.action}
    />
  )
}

export function AppDrawer({
  open,
  onOpenChange,
  title,
  subtitle,
  description,
  eyebrow,
  icon,
  headerActions,
  children,
  footer,
  className,
  contentClassName,
  side = "right",
  width = "default",
  loading = false,
  error = null,
  dirty = false,
  headerStyle,
  headerClassName,
  onRequestClose,
  closeLabel = "Fermer",
  hideMobileBackBtn = false,
}: AppDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const lastFocusedElementRef = useRef<HTMLElement | null>(null)
  const [isClosing, setIsClosing] = useState(false)
  const titleId = useId()
  const descriptionId = useId()
  const isRight = side === "right"

  const panelWidthClassName = useMemo(() => {
    if (!isRight) {
      return "w-full max-h-[85vh] rounded-t-[var(--radius-medium)] border-t"
    }

    if (width === "wide") {
      return "h-full w-full max-w-[min(calc(var(--layout-drawer-width)*1.5),92vw)] border-l"
    }

    return "h-full w-full max-w-[var(--layout-drawer-width)] border-l"
  }, [isRight, width])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open) {
      lastFocusedElementRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

      if (!dialog.open) {
        dialog.showModal()
      }

      const timeout = window.setTimeout(() => {
        const initialTarget =
          dialog.querySelector<HTMLElement>("[data-autofocus='true']") ?? closeButtonRef.current
        initialTarget?.focus()
      }, 0)

      return () => {
        window.clearTimeout(timeout)
      }
    }

    if (dialog.open) {
      setIsClosing(true)
      const timer = window.setTimeout(() => {
        dialog.close()
        setIsClosing(false)
        lastFocusedElementRef.current?.focus?.()
      }, 260)

      return () => window.clearTimeout(timer)
    }
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const handleCancel = (event: Event) => {
      event.preventDefault()
      requestClose("escape")
    }

    dialog.addEventListener("cancel", handleCancel)
    return () => dialog.removeEventListener("cancel", handleCancel)
  })

  function requestClose(reason: AppDrawerCloseReason) {
    const shouldClose = onRequestClose?.(reason)

    if (shouldClose === false) {
      return
    }

    onOpenChange(false)
  }

  const headerDescription = description ?? subtitle
  const headerDescriptionId = headerDescription ? descriptionId : undefined
  const titleContent = React.isValidElement(title) ? (
    <div id={titleId} className="min-w-0">
      {title}
    </div>
  ) : (
    <h2 id={titleId} className="font-heading text-base font-bold leading-7 tracking-tight text-heading">
      {title}
    </h2>
  )

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={headerDescriptionId}
      aria-busy={loading || undefined}
      aria-modal="true"
      role="dialog"
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          requestClose("backdrop")
        }
      }}
      className={cn(
        "fixed m-0 p-0 border-0 block overflow-hidden border-border bg-surface text-heading outline-none",
        "shadow-[var(--shadow-overlay-md)] backdrop:bg-[var(--color-backdrop)]",
        "z-[var(--z-drawer)]",
        isRight
          ? cn(
              "inset-y-0 left-auto right-0",
              "kredo-drawer-right",
              isClosing && "kredo-drawer-closing",
            )
          : cn(
              "inset-x-0 bottom-0 top-auto",
              "kredo-drawer-bottom",
              isClosing && "kredo-drawer-closing",
            ),
        panelWidthClassName,
        className,
      )}
    >
      <div className="flex flex-col h-full w-full overflow-hidden">
        <div className="grid min-h-0 h-full grid-rows-[auto_minmax(0,1fr)_auto]">
          <header
            className={cn("shrink-0 px-4 py-4 transition-colors sm:px-6", headerClassName)}
            style={headerStyle}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {eyebrow ? (
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                    {eyebrow}
                  </p>
                ) : null}

                <div className="flex items-start gap-3">
                  {icon ? (
                    <span
                      className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-small)] bg-canvas text-primary"
                      aria-hidden="true"
                    >
                      {icon}
                    </span>
                  ) : null}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {titleContent}
                      {dirty ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-warning/20 bg-warning/[0.12] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-status-warning-ink)]">
                          <span className="size-1.5 rounded-full bg-warning" aria-hidden="true" />
                          Modifié
                        </span>
                      ) : null}
                    </div>

                    {headerDescription ? (
                      <p id={descriptionId} className="mt-1 text-sm leading-6 text-body sm:block hidden">
                        {headerDescription}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-start gap-2">
                {headerActions ? <div className="hidden items-center gap-2 sm:flex">{headerActions}</div> : null}

                {hideMobileBackBtn ? null : (
                  <button
                    type="button"
                    onClick={() => requestClose("mobile-back")}
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-heading focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-[var(--focus-ring-color)] focus-visible:ring-offset-[var(--focus-ring-offset)] focus-visible:ring-offset-[var(--color-bg-surface)] sm:hidden"
                  >
                    <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                    <span>Retour</span>
                  </button>
                )}

                <IconButton
                  ref={closeButtonRef}
                  aria-label={closeLabel}
                  variant="ghost"
                  size="sm"
                  onClick={() => requestClose("close-button")}
                  className="hidden sm:inline-flex"
                >
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </IconButton>
              </div>
            </div>

          </header>

          <div className={cn("relative min-h-0 overflow-y-auto px-4 py-4 sm:px-6", contentClassName)}>
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-12"
              aria-hidden="true"
              style={{
                background:
                  "linear-gradient(to bottom, var(--drawer-header-fade-start, rgba(255,255,255,0.55)) 0%, var(--drawer-header-fade-end, rgba(253,252,250,0)) 100%)",
                zIndex: 0,
              }}
            />
            {loading ? <DrawerLoadingState /> : error ? <DrawerErrorContent error={error} /> : children}
          </div>

          {footer ? (
            <footer className="shrink-0 border-t border-border bg-surface px-4 py-4 sm:px-6">
              <div className="flex flex-wrap items-center justify-end gap-2">{footer}</div>
            </footer>
          ) : null}
        </div>
      </div>
    </dialog>

  )
}
