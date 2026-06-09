"use client"

import React, { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

export interface AppDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
  side?: "right" | "bottom"
}

export function AppDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  side = "right"
}: AppDrawerProps) {
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

  const isRight = side === "right"

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className={cn(
        "fixed bg-surface border-border text-heading shadow-xl flex flex-col h-full outline-none",
        "backdrop:bg-heading/30 backdrop:backdrop-blur-sm",
        isRight
          ? "inset-y-0 right-0 m-0 w-full max-w-md border-l animate-in slide-in-from-right duration-300"
          : "inset-x-0 bottom-0 m-0 w-full max-h-[85vh] border-t rounded-t-xl animate-in slide-in-from-bottom duration-300",
        className
      )}
    >
      <div className="flex flex-col h-full p-6">
        {/* Header */}
        <div className="flex flex-col gap-1.5 pb-4 border-b border-border/40 shrink-0">
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
        <div className="flex-1 overflow-y-auto py-4 text-xs text-body leading-relaxed">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="pt-4 border-t border-border/40 flex items-center justify-end gap-2 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  )
}
