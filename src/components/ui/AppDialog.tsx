"use client"

import React, { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

export interface AppDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export function AppDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className
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
    if (!dialog) return

    const handleCancel = (e: Event) => {
      e.preventDefault()
      onOpenChange(false)
    }

    dialog.addEventListener("cancel", handleCancel)
    return () => {
      dialog.removeEventListener("cancel", handleCancel)
    }
  }, [onOpenChange])

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
        "fixed inset-0 m-auto max-w-lg w-full border border-border bg-surface p-6 text-heading rounded-[var(--radius-medium)]",
        "backdrop:bg-heading/30 backdrop:backdrop-blur-sm",
        "open:animate-in open:fade-in open:zoom-in-95 duration-200 outline-none",
        className
      )}
    >
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold font-heading">{title}</h2>
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
        <div className="flex-1 text-xs text-body leading-relaxed">{children}</div>

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
