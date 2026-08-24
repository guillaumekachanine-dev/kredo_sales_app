"use client"

import { useEffect, useState } from "react"
import { AppDialog } from "@/components/ui/AppDialog"
import { CockpitReturnButton } from "@/components/intelligence/CockpitReturnButton"
import type { ClientIntelligenceSignal } from "@/lib/intelligence/intelligence-data"
import { AccountSignalDetailDrawer } from "./AccountSignalDetailDrawer"
import { loadAccountSignals } from "./load-account-signals"

function formatSignalDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(new Date(value))
}

export function AccountSignalsDialog({
  open,
  onOpenChange,
  companyId,
  companyName,
  onReturnToCockpit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  companyName: string
  onReturnToCockpit: () => void
}) {
  const [signals, setSignals] = useState<ClientIntelligenceSignal[]>([])
  const [selectedSignal, setSelectedSignal] = useState<ClientIntelligenceSignal | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [error, setError] = useState<string | null>(null)

  function handleReturnToCockpit() {
    setSelectedSignal(null)
    onOpenChange(false)
    onReturnToCockpit()
  }

  useEffect(() => {
    if (!open) return
    let active = true
    void loadAccountSignals(companyId).then((result) => {
      if (!active) return
      if (result.error) {
        setError(result.error)
        setStatus("error")
        return
      }
      setSignals(result.data)
      setStatus("ready")
    })
    return () => {
      active = false
    }
  }, [companyId, open])

  return (
    <>
      <AppDialog
        open={open}
        onOpenChange={onOpenChange}
        title={`Signaux · ${companyName}`}
        className="w-[min(calc(100vw-0.75rem),40rem)] sm:max-w-xl"
        maxHeightClassName="max-h-[calc(100dvh-0.75rem)] sm:max-h-[min(calc(100dvh-3rem),48rem)]"
      >
        <CockpitReturnButton onClick={handleReturnToCockpit} className="mb-2" />
        {status === "loading" ? <p className="py-10 text-center text-sm text-muted">Chargement des signaux…</p> : null}
        {status === "error" ? <p className="rounded bg-danger/10 px-3 py-3 text-sm text-danger">{error}</p> : null}
        {status === "ready" && signals.length === 0 ? <p className="py-10 text-center text-sm text-muted">Aucun signal actif pour ce compte.</p> : null}
        {signals.length > 0 ? (
          <ul className="divide-y divide-border border-y border-border">
            {signals.map((signal) => (
              <li key={signal.id}>
                <button type="button" onClick={() => setSelectedSignal(signal)} className="flex min-h-20 w-full items-start gap-3 py-3 text-left transition-colors hover:bg-canvas">
                  <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold uppercase tracking-[0.08em] text-primary">{signal.category || "Signal"}</span>
                    <span className="mt-1 block text-sm font-bold leading-5 text-heading">{signal.title}</span>
                    <span className="mt-1 block text-xs text-muted">{formatSignalDate(signal.detectedAt)} · urgence {Math.round(signal.urgencyScore * 100)}%</span>
                  </span>
                  <span className="text-xl text-muted" aria-hidden="true">›</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </AppDialog>

      <AccountSignalDetailDrawer
        signal={selectedSignal}
        open={selectedSignal !== null}
        onOpenChange={(next) => {
          if (!next) setSelectedSignal(null)
        }}
        companyId={companyId}
        companyName={companyName}
        onDismiss={(signalId) => {
          setSignals((current) => current.filter((signal) => signal.id !== signalId))
          setSelectedSignal(null)
        }}
        onReturnToCockpit={handleReturnToCockpit}
      />
    </>
  )
}
