"use client"

import { useEffect, useState } from "react"
import { AppDialog } from "@/components/ui/AppDialog"
import { Button } from "@/components/ui/Button"
import { AsyncActionButton } from "@/components/ui/AsyncActionButton"
import { formatWorkflowCost, getWorkflowEstimatedCost } from "@/lib/automations/get-workflow-estimated-cost"

export type WorkflowExecutionConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  actionLabel: string
  runType: string
  estimatedCost?: number | null
  onConfirm: () => void | Promise<void>
  pending?: boolean
}

export function WorkflowExecutionConfirmDialog({
  open,
  onOpenChange,
  actionLabel,
  runType,
  estimatedCost: propEstimatedCost,
  onConfirm,
  pending = false,
}: WorkflowExecutionConfirmDialogProps) {
  const [fetchedCost, setFetchedCost] = useState<number | null | undefined>(undefined)
  const [internalPending, setInternalPending] = useState(false)

  const isPending = pending || internalPending

  useEffect(() => {
    if (!open) {
      setInternalPending(false)
      return
    }

    if (propEstimatedCost !== undefined) {
      setFetchedCost(propEstimatedCost)
      return
    }

    let isMounted = true
    setFetchedCost(undefined)
    void getWorkflowEstimatedCost(runType).then((cost) => {
      if (isMounted) {
        setFetchedCost(cost)
      }
    })

    return () => {
      isMounted = false
    }
  }, [open, runType, propEstimatedCost])

  const resolvedCost = propEstimatedCost !== undefined ? propEstimatedCost : fetchedCost

  const handleConfirm = async () => {
    if (isPending) return
    setInternalPending(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } finally {
      setInternalPending(false)
    }
  }

  const handleCancel = () => {
    if (isPending) return
    onOpenChange(false)
  }

  const footer = (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={handleCancel}
        disabled={isPending}
        className="min-h-[44px] sm:min-h-9"
      >
        Annuler
      </Button>
      <AsyncActionButton
        type="button"
        variant="primary"
        size="sm"
        onClick={handleConfirm}
        isLoading={isPending}
        loadingLabel="Lancement…"
        disabled={isPending}
        className="min-h-[44px] sm:min-h-9"
      >
        Confirmer
      </AsyncActionButton>
    </>
  )

  return (
    <AppDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isPending) return
        onOpenChange(nextOpen)
      }}
      title="Confirmation d’exécution"
      footer={footer}
      className="w-[min(calc(100vw-1.5rem),28rem)] sm:max-w-md"
    >
      <div className="space-y-2.5 py-1">
        <p className="text-xs font-semibold text-heading leading-snug">
          Exécuter « {actionLabel} » ({runType}) ?
        </p>
        <p className="text-[11px] text-muted font-medium">
          Coût estimé : {resolvedCost === undefined ? "chargement…" : formatWorkflowCost(resolvedCost)}
        </p>
      </div>
    </AppDialog>
  )
}
