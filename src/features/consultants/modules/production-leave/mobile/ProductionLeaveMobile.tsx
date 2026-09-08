"use client"

import { useMemo, useState } from "react"
import type {
  ProductionLeaveCollaborator,
  ProductionLeaveViewModel,
} from "../data/production-leave.types"
import { ProductionLeaveMobileCard } from "./ProductionLeaveMobileCard"
import { ProductionLeaveMobileDrawer } from "./ProductionLeaveMobileDrawer"

const MONTH_NAMES_FR: Record<string, string> = {
  "01": "Janvier",
  "02": "Février",
  "03": "Mars",
  "04": "Avril",
  "05": "Mai",
  "06": "Juin",
  "07": "Juillet",
  "08": "Août",
  "09": "Septembre",
  "10": "Octobre",
  "11": "Novembre",
  "12": "Décembre",
}

function formatMonthLabel(monthIso: string): string {
  const [y, m] = monthIso.split("-")
  const name = MONTH_NAMES_FR[m] ?? m
  return `${name} ${y}`
}

interface ProductionLeaveMobileProps {
  vm: ProductionLeaveViewModel
}

export function ProductionLeaveMobile({ vm }: ProductionLeaveMobileProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(
    () => vm.referenceMonth || vm.availableMonths[0] || new Date().toISOString().slice(0, 7),
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCollaborator, setSelectedCollaborator] =
    useState<ProductionLeaveCollaborator | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Filtrage des collaborateurs par recherche
  const filteredCollaborators = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return vm.collaborators
    return vm.collaborators.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        (c.currentTitle && c.currentTitle.toLowerCase().includes(q)) ||
        (c.practiceLabel && c.practiceLabel.toLowerCase().includes(q)),
    )
  }, [vm.collaborators, searchQuery])

  const monthLabel = formatMonthLabel(selectedMonth)

  const handleSelectCollaborator = (collab: ProductionLeaveCollaborator) => {
    setSelectedCollaborator(collab)
    setDrawerOpen(true)
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-28">
      {/* En-tête mobile */}
      <header className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-xl font-bold tracking-tight text-heading">
              Activité & Production
            </h1>
            <p className="text-xs text-muted">
              Suivi mensuel des CRA et des absences
            </p>
          </div>

          {/* Sélecteur de mois */}
          {vm.availableMonths.length > 0 ? (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-[var(--radius-small)] border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-heading shadow-xs focus:border-primary focus:outline-none"
              aria-label="Sélectionner le mois"
            >
              {vm.availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
          ) : null}
        </div>

        {/* Champ de recherche rapide */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un collaborateur…"
            className="w-full rounded-[var(--radius-small)] border border-border bg-surface px-3 py-2 text-xs text-heading placeholder:text-muted focus:border-primary focus:outline-none"
            aria-label="Rechercher par nom ou poste"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-heading"
              aria-label="Effacer la recherche"
            >
              ×
            </button>
          ) : null}
        </div>
      </header>

      {/* Liste des cartes collaborateurs */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
          <span>Effectif actif</span>
          <span>{filteredCollaborators.length}</span>
        </div>

        {filteredCollaborators.length === 0 ? (
          <div className="rounded-[var(--radius-medium)] border border-border bg-surface p-6 text-center text-xs text-muted">
            Aucun collaborateur trouvé.
          </div>
        ) : (
          filteredCollaborators.map((collab) => (
            <ProductionLeaveMobileCard
              key={collab.collaboratorId}
              collaborator={collab}
              selectedMonth={selectedMonth}
              onSelect={handleSelectCollaborator}
            />
          ))
        )}
      </div>

      {/* Drawer de détail collaborateur */}
      <ProductionLeaveMobileDrawer
        collaborator={selectedCollaborator}
        selectedMonth={selectedMonth}
        monthLabel={monthLabel}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  )
}
