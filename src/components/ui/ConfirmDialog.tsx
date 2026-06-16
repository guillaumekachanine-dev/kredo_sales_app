"use client"

import React from "react"
import { AppDialog } from "./AppDialog"
import { AsyncActionButton } from "./AsyncActionButton"
import { Button } from "./Button"

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
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => onOpenChange(false)}
        disabled={isLoading}
      >
        {cancelLabel}
      </Button>
      <AsyncActionButton
        variant={isDanger ? "destructive" : "primary"}
        size="sm"
        onClick={async () => {
          await onConfirm()
          onOpenChange(false)
        }}
        isLoading={isLoading}
        loadingLabel={confirmLabel}
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
