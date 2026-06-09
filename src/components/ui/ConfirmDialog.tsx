"use client"

import React from "react"
import { AppDialog } from "./AppDialog"
import { AsyncActionButton } from "./AsyncActionButton"

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "default" | "danger"
  onConfirm: () => void | Promise<void>
  isLoading?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  variant = "default",
  onConfirm,
  isLoading = false
}: ConfirmDialogProps) {
  const isDanger = variant === "danger"

  const footer = (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        disabled={isLoading}
        className="px-3 py-1.5 text-xs font-semibold rounded bg-surface border border-border text-heading hover:bg-surface-hover transition-colors disabled:opacity-50"
      >
        {cancelLabel}
      </button>
      <AsyncActionButton
        onClick={async () => {
          await onConfirm()
          onOpenChange(false)
        }}
        isLoading={isLoading}
        className={
          isDanger
            ? "bg-danger text-primary-fg hover:bg-danger/95 px-3 py-1.5 text-xs font-semibold rounded transition-all active:scale-95"
            : "bg-primary text-primary-fg hover:bg-primary/95 px-3 py-1.5 text-xs font-semibold rounded transition-all active:scale-95"
        }
      >
        {confirmLabel}
      </AsyncActionButton>
    </>
  )

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={footer}
    >
      <div className="py-2">
        {isDanger ? (
          <p className="text-xs text-danger font-medium">
            Attention : Cette action est irréversible et aura des conséquences immédiates.
          </p>
        ) : (
          <p className="text-xs text-body">
            Voulez-vous vraiment procéder à cette opération ?
          </p>
        )}
      </div>
    </AppDialog>
  )
}
