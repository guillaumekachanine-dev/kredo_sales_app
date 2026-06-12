"use client"

import React, { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

export interface AppDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle?: string    // courte ligne de type/contexte, sous le titre, plus légère
  description?: string // texte d'instruction plus long (optionnel)
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
  side?: "right" | "bottom"
}

export function AppDrawer({
  open,
  onOpenChange,
  title,
  subtitle,
  description,
  children,
  footer,
  className,
  side = "right",
}: AppDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [isClosing, setIsClosing] = useState(false)
  const [prevOpen, setPrevOpen] = useState(open)
  const isRight = side === "right"

  if (open !== prevOpen) {
    setPrevOpen(open)
    setIsClosing(!open)
  }

  // Synchronise avec la prop `open`.
  // Ouverture : showModal() immédiatement — l'animation CSS joue via [open].kredo-drawer-*
  // Fermeture : déclenche l'animation de sortie, puis close() après la durée.
  //
  // IMPORTANT : le timeout (260 ms) doit correspondre à la durée de `kredo-drawer-out-*`
  // définie dans globals.css, sinon le dialogue se ferme avant la fin de l'animation.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open) {
      if (!dialog.open) dialog.showModal()
    } else if (dialog.open) {
      const timer = setTimeout(() => {
        dialog.close()
        setIsClosing(false)
      }, 260)
      return () => clearTimeout(timer)
    }
  }, [open])

  // Touche Escape : délègue à onOpenChange pour passer par l'animation de sortie.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const handleCancel = (e: Event) => {
      e.preventDefault()
      onOpenChange(false)
    }
    dialog.addEventListener("cancel", handleCancel)
    return () => dialog.removeEventListener("cancel", handleCancel)
  }, [onOpenChange])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) onOpenChange(false)
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className={cn(
        // Base commune
        "fixed bg-surface border-border text-heading shadow-2xl flex flex-col outline-none",
        "backdrop:bg-heading/25 backdrop:backdrop-blur-sm",
        // Position + animation selon le côté
        isRight
          ? cn(
              "inset-y-0 right-0 left-auto m-0 w-full max-w-md h-full border-l",
              "kredo-drawer-right",
              isClosing && "kredo-drawer-closing"
            )
          : cn(
              "inset-x-0 bottom-0 top-auto m-0 w-full max-h-[85vh] border-t rounded-t-xl",
              "kredo-drawer-bottom",
              isClosing && "kredo-drawer-closing"
            ),
        className
      )}
    >
      <div className="flex flex-col h-full pt-2.5 px-4 pb-4 sm:p-6">
        {/* Header */}
        <div className={cn(
          "flex flex-col pb-0 sm:pb-4 border-b border-transparent sm:border-border/40 shrink-0",
          description ? "gap-1.5" : ""
        )}>
          <div className="flex items-end justify-between gap-3">
            <div className="leading-none">
              <h2 className="text-sm font-bold font-heading leading-snug sm:block hidden">{title}</h2>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-1 text-xs font-normal text-muted hover:text-heading transition-colors sm:hidden block outline-none pb-0.5"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
                <span>Retour</span>
              </button>
              {subtitle && (
                <p className="text-xs text-muted mt-0.5 font-normal leading-none sm:block hidden">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-muted hover:text-heading transition-colors -mr-1 p-1 rounded shrink-0 sm:block hidden"
              aria-label="Fermer"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {description && (
            <p className="text-xs text-body font-normal">{description}</p>
          )}
        </div>

        {/* Body scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto py-4 text-xs text-body leading-relaxed">
          {children}
        </div>

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
