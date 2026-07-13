"use client"

import { Button } from "@/components/ui/Button"

interface DiagnosticRefreshButtonProps {
  isRefreshing: boolean
  onRefresh: () => void
  fullWidth?: boolean
}

export function DiagnosticRefreshButton({
  isRefreshing,
  onRefresh,
  fullWidth = false,
}: DiagnosticRefreshButtonProps) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      loading={isRefreshing}
      loadingLabel="Analyse en cours"
      onClick={onRefresh}
      fullWidth={fullWidth}
      className="kredo-diagnostic-refresh-button"
    >
      Actualiser le diagnostic
    </Button>
  )
}
