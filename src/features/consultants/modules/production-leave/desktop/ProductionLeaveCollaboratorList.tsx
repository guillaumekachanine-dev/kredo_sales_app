"use client"

import { useMemo, useState } from "react"
import type { ProductionLeaveCollaborator } from "../data/production-leave.types"
import { cn } from "@/lib/utils"

interface ProductionLeaveCollaboratorListProps {
  collaborators: ProductionLeaveCollaborator[]
  selectedCollaboratorId: string | null
  selectedMonth: string
  onSelectCollaborator: (id: string) => void
}

export function ProductionLeaveCollaboratorList({
  collaborators,
  selectedCollaboratorId,
  selectedMonth,
  onSelectCollaborator,
}: ProductionLeaveCollaboratorListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPractice, setSelectedPractice] = useState<string>("all")

  // Liste des practices disponibles
  const practiceOptions = useMemo(() => {
    const map = new Map<string, string>()
    collaborators.forEach((c) => {
      if (c.practiceKey && c.practiceLabel) {
        map.set(c.practiceKey, c.practiceLabel)
      }
    })
    return Array.from(map.entries()).map(([key, label]) => ({ key, label }))
  }, [collaborators])

  // Filtrage des collaborateurs
  const filteredCollaborators = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return collaborators.filter((c) => {
      const matchesSearch =
        !q ||
        c.fullName.toLowerCase().includes(q) ||
        (c.currentTitle && c.currentTitle.toLowerCase().includes(q)) ||
        (c.practiceLabel && c.practiceLabel.toLowerCase().includes(q))

      const matchesPractice =
        selectedPractice === "all" || c.practiceKey === selectedPractice

      return matchesSearch && matchesPractice
    })
  }, [collaborators, searchQuery, selectedPractice])

  return (
    <div className="flex h-full min-h-0 flex-col border-r border-border bg-surface">
      {/* Filtres de recherche */}
      <div className="flex shrink-0 flex-col gap-2 border-b border-border p-3">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un collaborateur…"
            className="w-full rounded-[var(--radius-small)] border border-border bg-canvas px-2.5 py-1.5 text-xs text-heading placeholder:text-muted focus:border-primary focus:outline-none"
            aria-label="Rechercher par nom ou fonction"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-heading text-xs"
              aria-label="Effacer la recherche"
            >
              ×
            </button>
          ) : null}
        </div>

        {practiceOptions.length > 0 ? (
          <select
            value={selectedPractice}
            onChange={(e) => setSelectedPractice(e.target.value)}
            className="w-full rounded-[var(--radius-small)] border border-border bg-canvas px-2.5 py-1.5 text-xs text-heading focus:border-primary focus:outline-none"
            aria-label="Filtrer par Practice"
          >
            <option value="all">Toutes les practices ({collaborators.length})</option>
            {practiceOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {/* Compteur & en-tête liste */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/50 bg-canvas/40 px-3 py-1.5 text-[11px] font-medium text-muted">
        <span>Collaborateurs</span>
        <span>{filteredCollaborators.length}</span>
      </div>

      {/* Liste dense scrollable */}
      <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-border/60">
        {filteredCollaborators.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted">
            Aucun collaborateur trouvé.
          </div>
        ) : (
          filteredCollaborators.map((c) => {
            const isSelected = c.collaboratorId === selectedCollaboratorId
            // Données du mois sélectionné
            const monthProd = c.history.find((h) => h.month === selectedMonth)
            const hasData = monthProd?.hasActivityData === true
            const rate = monthProd?.productivityRate ?? null
            const gap = monthProd?.gapVsTarget ?? null

            return (
              <button
                key={c.collaboratorId}
                type="button"
                onClick={() => onSelectCollaborator(c.collaboratorId)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors",
                  isSelected
                    ? "border-l-2 border-primary bg-primary/10 text-heading font-medium"
                    : "border-l-2 border-transparent text-body hover:bg-surface-hover/80",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-heading">
                    {c.fullName}
                  </div>
                  <div className="truncate text-[11px] text-muted">
                    {c.currentTitle || c.practiceLabel || "Consultant"}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  {hasData && rate !== null ? (
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-bold text-heading">
                        {rate.toLocaleString("fr-FR", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 1,
                        })}{" "}
                        %
                      </span>
                      {gap !== null ? (
                        <span
                          className={cn(
                            "inline-flex items-center text-[10px] font-semibold",
                            gap >= 0 ? "text-success" : "text-amber-700",
                          )}
                        >
                          {gap > 0 ? `+${gap.toFixed(1)}` : gap.toFixed(1)} pts
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted">Sans cible</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[11px] text-muted">—</span>
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
