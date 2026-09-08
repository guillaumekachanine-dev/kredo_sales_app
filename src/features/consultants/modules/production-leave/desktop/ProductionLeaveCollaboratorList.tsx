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
    <div className="flex h-full min-h-0 flex-col bg-transparent">
      {/* Filtres de recherche */}
      <div className="flex shrink-0 flex-col gap-2 border-b border-white/5 p-3">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un collaborateur…"
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-white placeholder:text-white/40 focus:border-brand-brass focus:outline-none focus:ring-1 focus:ring-brand-brass/40"
            aria-label="Rechercher par nom ou fonction"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs"
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
            className="w-full rounded-lg border border-white/10 bg-[#0f122c] px-2.5 py-1.5 text-xs text-white focus:border-brand-brass focus:outline-none focus:ring-1 focus:ring-brand-brass/40"
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
      <div className="flex shrink-0 items-center justify-between border-b border-white/5 bg-white/[0.02] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/45">
        <span>Collaborateurs</span>
        <span className="font-mono tabular-nums">{filteredCollaborators.length}</span>
      </div>

      {/* Liste dense scrollable */}
      <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-white/5">
        {filteredCollaborators.length === 0 ? (
          <div className="p-4 text-center text-xs text-white/40">
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
                    ? "border-l-2 border-brand-brass bg-brand-brass/10 text-white font-medium"
                    : "border-l-2 border-transparent text-white/80 hover:bg-white/[0.04]",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-white">
                    {c.fullName}
                  </div>
                  <div className="truncate text-[11px] text-white/50">
                    {c.currentTitle || c.practiceLabel || "Consultant"}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  {hasData && rate !== null ? (
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-bold text-white font-mono tabular-nums">
                        {rate.toLocaleString("fr-FR", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 1,
                        })}{" "}
                        %
                      </span>
                      {gap !== null ? (
                        <span
                          className={cn(
                            "inline-flex items-center text-[10px] font-semibold font-mono tabular-nums",
                            gap >= 0 ? "text-brand-brass" : "text-amber-400",
                          )}
                        >
                          {gap > 0 ? `+${gap.toFixed(1)}` : gap.toFixed(1)} pts
                        </span>
                      ) : (
                        <span className="text-[10px] text-white/40">Sans cible</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[11px] text-white/40">—</span>
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
