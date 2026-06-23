"use client"

import { AGENDA_CATEGORIES, AGENDA_EVENT_TYPES } from "@/lib/agenda/agenda-config"

interface AgendaToolbarProps {
  view: "week" | "month"
  onViewChange: (view: "week" | "month") => void
  selectedType: string
  onTypeChange: (type: string) => void
}

export function AgendaToolbar({
  view,
  onViewChange,
  selectedType,
  onTypeChange,
}: AgendaToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-border bg-surface px-4 py-2">
      {/* Segmented view selector */}
      <div className="flex rounded-md bg-canvas p-0.5 border border-border/50">
        <button
          type="button"
          onClick={() => onViewChange("week")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-small)] transition-all cursor-pointer ${
            view === "week"
              ? "bg-surface text-heading shadow-[var(--shadow-overlay-sm)]"
              : "text-body hover:text-heading"
          }`}
        >
          Semaine
        </button>
        <button
          type="button"
          onClick={() => onViewChange("month")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-small)] transition-all cursor-pointer ${
            view === "month"
              ? "bg-surface text-heading shadow-[var(--shadow-overlay-sm)]"
              : "text-body hover:text-heading"
          }`}
        >
          Mois
        </button>
      </div>

      {/* Event type filter — groupé par catégorie */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted">Filtrer :</span>
        <select
          value={selectedType}
          onChange={(e) => onTypeChange(e.target.value)}
          className="rounded-md border border-border bg-canvas px-3 py-1.5 text-xs text-heading outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 transition-colors cursor-pointer"
        >
          <option value="all">Tous les types</option>
          {AGENDA_CATEGORIES.map((cat) => (
            <optgroup key={cat.id} label={cat.label}>
              {cat.types.map((t) => (
                <option key={t.id} value={t.id}>
                  {AGENDA_EVENT_TYPES[t.id]?.label || t.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
    </div>
  )
}
