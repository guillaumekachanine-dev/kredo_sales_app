"use client"

import React, { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

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
}: AppDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open) {
      if (!dialog.open) {
        dialog.showModal()
      }
    } else {
      if (dialog.open) {
        dialog.close()
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

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className={cn(
        "fixed inset-0 m-auto flex flex-col h-fit max-h-[min(100dvh-2rem,42rem)] w-[min(calc(100vw-1.5rem),32rem)] max-w-full overflow-hidden overscroll-contain rounded-[var(--radius-medium)] border border-border bg-surface p-4 text-heading sm:max-h-[calc(100dvh-4rem)] sm:w-full sm:max-w-lg sm:p-6",
        "backdrop:bg-heading/30 backdrop:backdrop-blur-sm",
        "open:animate-in open:fade-in open:zoom-in-95 duration-200 outline-none",
        "z-[var(--z-modal)]",
        className
      )}
    >
      <div className="flex flex-col flex-1 min-h-0 gap-4">
        {/* Header */}
        <div className={cn("flex flex-col gap-1.5", headerClassName)}>
          <div className="flex items-center justify-between">
            {typeof title === "string" ? (
              <h2 className={cn("font-heading text-sm font-bold", titleClassName)}>{title}</h2>
            ) : (
              title
            )}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-muted hover:text-heading transition-colors"
              aria-label="Fermer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {description && (
            <p className="text-xs text-body font-normal">{description}</p>
          )}
        </div>

        {/* Body */}
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 text-xs leading-relaxed text-body",
            bodyClassName,
          )}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="mt-4 flex items-center justify-end gap-2 border-t border-border/40 pt-4">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  )
}
