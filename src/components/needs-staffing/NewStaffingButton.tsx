"use client"

import { useState, useTransition } from "react"
import { createOpportunityStaffing, searchOpportunityStaffingProfiles, type StaffingSearchResult } from "@/app/(app)/missions/_actions/opportunity-staffing"
import { AppDialog } from "@/components/ui/AppDialog"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Textarea } from "@/components/ui/Textarea"
import { cn } from "@/lib/utils"

export interface OpenNeedOption {
  id: string
  title: string
  clientName: string
}

interface NewStaffingButtonProps {
  openNeeds: OpenNeedOption[]
  fullWidth?: boolean
}

const INITIAL_STATUS_OPTIONS = [
  { value: "identifie", label: "Identifié" },
  { value: "propose_interne", label: "Proposé en interne" },
  { value: "preselectionne", label: "Présélectionné" },
  { value: "envoye_client", label: "CV envoyé" },
]

export function NewStaffingButton({
  openNeeds,
  fullWidth = false,
}: NewStaffingButtonProps) {
  const [open, setOpen] = useState(false)
  const [selectedNeedId, setSelectedNeedId] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCandidate, setSelectedCandidate] = useState<StaffingSearchResult | null>(null)
  const [searchResults, setSearchResults] = useState<StaffingSearchResult[]>([])
  const [positioningOrigin, setPositioningOrigin] = useState("")
  const [initialStatus, setInitialStatus] = useState("identifie")
  const [nextAction, setNextAction] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isPending, startTransition] = useTransition()

  const resetForm = () => {
    setSelectedNeedId("")
    setSearchQuery("")
    setSelectedCandidate(null)
    setSearchResults([])
    setPositioningOrigin("")
    setInitialStatus("identifie")
    setNextAction("")
    setError(null)
  }

  const handleOpen = () => {
    resetForm()
    setOpen(true)
  }

  const handleSearch = async (value: string) => {
    setSearchQuery(value)
    setSelectedCandidate(null)

    const normalized = value.trim()
    if (normalized.length < 1) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const results = await searchOpportunityStaffingProfiles(normalized, "candidate")
      setSearchResults(results)
    } catch (searchError) {
      console.error("Failed to search staffing candidates:", searchError)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleCreate = () => {
    setError(null)

    if (!selectedNeedId) {
      setError("Sélectionnez un besoin ouvert.")
      return
    }

    if (!selectedCandidate) {
      setError("Sélectionnez un candidat.")
      return
    }

    startTransition(async () => {
      const result = await createOpportunityStaffing({
        opportunity_id: selectedNeedId,
        source_type: "candidate",
        source_id: selectedCandidate.id,
        positioning_origin: positioningOrigin || null,
        initial_status: initialStatus,
        next_action: nextAction || null,
      })

      if (result.error) {
        setError(result.error)
        return
      }

      setOpen(false)
      resetForm()
    })
  }

  return (
    <>
      <Button variant="primary" size="sm" fullWidth={fullWidth} onClick={handleOpen}>
        + Nouveau staffing
      </Button>

      <AppDialog
        open={open}
        onOpenChange={setOpen}
        title="Nouveau staffing"
        description="Créer un positionnement sur un besoin ouvert."
        footer={(
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" size="sm" loading={isPending} onClick={handleCreate}>
              Créer le positionnement
            </Button>
          </div>
        )}
      >
        <div className="flex flex-col gap-4">
          {error ? (
            <div className="rounded-[var(--radius-medium)] border border-danger/20 bg-danger/5 px-3 py-2 text-xs font-medium text-danger">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-staffing-need" className="text-xs font-semibold text-heading">
              Besoin ouvert
            </label>
            <Select
              id="new-staffing-need"
              value={selectedNeedId}
              onChange={(event) => setSelectedNeedId(event.target.value)}
              fullWidth
            >
              <option value="" disabled>
                Sélectionner un besoin…
              </option>
              {openNeeds.map((need) => (
                <option key={need.id} value={need.id}>
                  {need.clientName} — {need.title}
                </option>
              ))}
            </Select>
          </div>

          <div className="relative flex flex-col gap-1.5">
            <label htmlFor="new-staffing-candidate" className="text-xs font-semibold text-heading">
              Candidat
            </label>
            <Input
              id="new-staffing-candidate"
              type="text"
              value={searchQuery}
              onChange={(event) => handleSearch(event.target.value)}
              placeholder="Rechercher un profil candidat…"
              fullWidth
            />

            {searchQuery.trim().length > 0 ? (
              <div className="max-h-48 overflow-y-auto rounded-[var(--radius-medium)] border border-border bg-surface shadow-sm">
                {isSearching ? (
                  <div className="px-3 py-2 text-[11px] text-muted">Recherche en cours…</div>
                ) : searchResults.length === 0 ? (
                  <div className="px-3 py-2 text-[11px] text-muted">Aucun profil trouvé.</div>
                ) : (
                  searchResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => {
                        setSelectedCandidate(result)
                        setSearchQuery(result.full_name)
                      }}
                      className={cn(
                        "flex w-full flex-col gap-0.5 border-b border-border/40 px-3 py-2 text-left last:border-b-0 hover:bg-canvas/50",
                        selectedCandidate?.id === result.id && "bg-primary/5",
                      )}
                    >
                      <span className="text-xs font-semibold text-heading">{result.full_name}</span>
                      <span className="text-[10px] text-muted">{result.subtitle ?? "Candidat"}</span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-staffing-origin" className="text-xs font-semibold text-heading">
              Origine du positionnement
            </label>
            <Input
              id="new-staffing-origin"
              type="text"
              value={positioningOrigin}
              onChange={(event) => setPositioningOrigin(event.target.value)}
              placeholder="Ex. sourcing direct, cooptation, vivier…"
              fullWidth
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-staffing-status" className="text-xs font-semibold text-heading">
              Statut initial
            </label>
            <Select
              id="new-staffing-status"
              value={initialStatus}
              onChange={(event) => setInitialStatus(event.target.value)}
              fullWidth
            >
              {INITIAL_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-staffing-next-action" className="text-xs font-semibold text-heading">
              Prochaine action
            </label>
            <Textarea
              id="new-staffing-next-action"
              value={nextAction}
              onChange={(event) => setNextAction(event.target.value)}
              placeholder="Ex. organiser l’envoi du CV, préparer la préqualification…"
              rows={3}
              fullWidth
            />
          </div>
        </div>
      </AppDialog>
    </>
  )
}
