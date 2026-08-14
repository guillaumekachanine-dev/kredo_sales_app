"use client"

import { useEffect, useMemo, useState } from "react"

import { AppDialog } from "@/components/ui/AppDialog"
import { Button } from "@/components/ui/Button"
import { Select } from "@/components/ui/Select"
import {
  loadAccountSignalPromotionOptions,
  type AccountSignalPromotionDestination,
  type AccountSignalPromotionOption,
} from "./account-signal-promotion-actions"

export function AccountSignalPromotionDialog({
  open,
  onOpenChange,
  companyId,
  isPromoting,
  onPromote,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  isPromoting: boolean
  onPromote: (destination: AccountSignalPromotionDestination, sectorId: string) => Promise<boolean>
}) {
  const [destination, setDestination] = useState<AccountSignalPromotionDestination | null>(null)
  const [options, setOptions] = useState<AccountSignalPromotionOption[]>([])
  const [companySectorId, setCompanySectorId] = useState<string | null>(null)
  const [selectedPlaybookId, setSelectedPlaybookId] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "error">("loading")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let active = true

    void loadAccountSignalPromotionOptions(companyId).then((result) => {
      if (!active) return
      if (result.error) {
        setStatus("error")
        setError(result.error)
        return
      }
      setOptions(result.options)
      setCompanySectorId(result.companySectorId)
      const initialPlaybook = result.options.find((option) => option.isCompanySector && option.hasPlaybook)
        ?? result.options.find((option) => option.hasPlaybook)
      setSelectedPlaybookId(initialPlaybook?.id ?? "")
      setStatus("idle")
    })

    return () => {
      active = false
    }
  }, [companyId, open])

  const companySector = useMemo(
    () => options.find((option) => option.id === companySectorId) ?? null,
    [companySectorId, options],
  )
  const playbooks = useMemo(() => options.filter((option) => option.hasPlaybook), [options])

  const targetSectorId = destination === "sector_signal" ? companySectorId : selectedPlaybookId
  const canConfirm = status === "idle" && Boolean(destination && targetSectorId)

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setDestination(null)
      setStatus("loading")
      setError(null)
    }
    onOpenChange(nextOpen)
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Promouvoir le signal"
      description="Choisissez le niveau de connaissance alimenté par ce signal compte."
      className="sm:max-w-lg"
      footer={(
        <>
          <Button variant="secondary" onClick={() => handleOpenChange(false)}>Annuler</Button>
          <Button
            variant="primary"
            disabled={!canConfirm}
            loading={isPromoting}
            loadingLabel="Promotion…"
            onClick={() => {
              if (destination && targetSectorId) void onPromote(destination, targetSectorId)
            }}
          >
            Promouvoir
          </Button>
        </>
      )}
    >
      {status === "loading" ? <p className="py-8 text-center text-sm text-muted">Chargement des destinations…</p> : null}
      {error ? <p role="alert" className="border border-danger/20 bg-danger/[0.04] p-3 text-sm text-danger">{error}</p> : null}

      {status === "idle" ? (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setDestination("sector_signal")}
              disabled={!companySectorId}
              className={`min-h-20 border p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-heading ${destination === "sector_signal" ? "border-primary bg-primary/[0.06]" : "border-border bg-surface hover:bg-surface-hover"}`}
            >
              <span className="block text-sm font-bold text-heading">Signaux sectoriels</span>
              <span className="mt-1 block text-xs text-muted">{companySector ? companySector.name : "Aucun segment rattaché au compte"}</span>
            </button>
            <button
              type="button"
              onClick={() => setDestination("playbook")}
              disabled={playbooks.length === 0}
              className={`min-h-20 border p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-heading ${destination === "playbook" ? "border-primary bg-primary/[0.06]" : "border-border bg-surface hover:bg-surface-hover"}`}
            >
              <span className="block text-sm font-bold text-heading">Playbook</span>
              <span className="mt-1 block text-xs text-muted">{playbooks.length > 0 ? `${playbooks.length} playbook${playbooks.length > 1 ? "s" : ""} disponible${playbooks.length > 1 ? "s" : ""}` : "Aucun playbook disponible"}</span>
            </button>
          </div>

          {destination === "playbook" ? (
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Playbook cible</span>
              <Select value={selectedPlaybookId} onChange={(event) => setSelectedPlaybookId(event.target.value)} fullWidth>
                {playbooks.map((option) => (
                  <option key={option.id} value={option.id}>{option.name}{option.isCompanySector ? " · segment du compte" : ""}</option>
                ))}
              </Select>
            </label>
          ) : null}
        </div>
      ) : null}
    </AppDialog>
  )
}
