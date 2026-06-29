"use client"

import { formatDate, formatDateTime } from "@/lib/formatters"
import type { SectorActivationWindow } from "@/lib/prospection/sector-activation-types"
import { EmptyState } from "@/components/dashboard/widgets/EmptyState"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { StatusPill } from "@/components/ui/StatusPill"
import { Select } from "@/components/ui/Select"
import {
  FRESHNESS_LABELS,
  getFreshnessVariant,
  getPriorityBandVariant,
  getTemporalStatusVariant,
  PRACTICE_LABELS,
  PRIORITY_BAND_LABELS,
  TEMPORAL_STATUS_LABELS,
  type CommercialWindowSortKey,
  WINDOW_SORT_OPTIONS,
} from "./sector-activation-ui"
import { SECTOR_ACTIVATION_SOURCE_LABELS } from "@/lib/prospection/sector-activation-types"
import { cn } from "@/lib/utils"

export function CommercialWindowsSection({
  windows,
  selectedWindowId,
  onSelectWindow,
  sort,
  onSortChange,
}: {
  windows: SectorActivationWindow[]
  selectedWindowId: string | null
  onSelectWindow: (windowId: string) => void
  sort: CommercialWindowSortKey
  onSortChange: (value: CommercialWindowSortKey) => void
}) {
  return (
    <SurfaceCard className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-semibold text-heading">
            Fenêtres commerciales
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-body">
            Ledger priorisé des signaux activables avant refroidissement, avec lecture sectorielle et exposition comptes.
          </p>
        </div>

        <div className="w-full sm:w-auto sm:min-w-[12rem]">
          <label htmlFor="sector-window-sort" className="sr-only">
            Trier les fenêtres commerciales
          </label>
          <Select
            id="sector-window-sort"
            size="sm"
            value={sort}
            onChange={(event) => onSortChange(event.target.value as CommercialWindowSortKey)}
            className="bg-surface"
          >
            {WINDOW_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                Tri: {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {windows.length === 0 ? (
        <EmptyState
          title="Aucune fenêtre visible"
          description="Aucun signal ne correspond aux filtres actifs. Élargissez l'horizon ou relâchez un filtre."
          className="m-5 min-h-[18rem]"
        />
      ) : (
        <div className="w-full">
          <table className="w-full table-fixed border-collapse">
            <caption className="sr-only">
              Ledger des fenêtres commerciales sélectionnables
            </caption>
            <thead>
              <tr className="border-b border-border bg-canvas text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                <th scope="col" className="w-[18%] px-5 py-3">Urgence / échéance</th>
                <th scope="col" className="w-[40%] px-5 py-3">Signal</th>
                <th scope="col" className="w-[16%] px-5 py-3">Secteur</th>
                <th scope="col" className="w-[26%] px-5 py-3">Exposition</th>
              </tr>
            </thead>
            <tbody>
              {windows.map((window) => {
                const isSelected = window.id === selectedWindowId
                const dateLabel = window.deadlineAt ? formatDate(window.deadlineAt) : formatDateTime(window.detectedAt)
                return (
                  <tr
                    key={window.id}
                    tabIndex={0}
                    aria-label={`${window.title}${isSelected ? ", fenêtre sélectionnée" : ""}`}
                    onClick={() => onSelectWindow(window.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        onSelectWindow(window.id)
                      }
                    }}
                    className={cn(
                      "border-b border-border align-top transition-colors outline-none",
                      "hover:bg-canvas focus-visible:bg-primary/[0.04] focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-[var(--focus-ring-color)] focus-visible:ring-inset",
                      isSelected && "bg-primary/[0.04]",
                    )}
                  >
                    <td className="px-5 py-4">
                      <div className="space-y-2">
                        <div className="h-2 overflow-hidden rounded-full bg-canvas">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              window.priorityBand === "critical"
                                ? "bg-danger"
                                : window.priorityBand === "high"
                                  ? "bg-warning"
                                  : window.priorityBand === "medium"
                                    ? "bg-brand-brass"
                                    : "bg-info",
                            )}
                            style={{ width: `${window.urgencyScore}%` }}
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusPill
                            label={TEMPORAL_STATUS_LABELS[window.temporalStatus]}
                            variant={getTemporalStatusVariant(window.temporalStatus)}
                          />
                          <StatusPill
                            label={PRIORITY_BAND_LABELS[window.priorityBand]}
                            variant={getPriorityBandVariant(window.priorityBand)}
                          />
                        </div>
                        <p className="text-xs leading-5 text-muted">
                          {window.deadlineAt ? "Échéance" : "Détecté"} · {dateLabel}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-heading">{window.title}</p>
                          <StatusPill
                            label={SECTOR_ACTIVATION_SOURCE_LABELS[window.sourceType]}
                            variant="neutral"
                          />
                          <StatusPill
                            label={FRESHNESS_LABELS[window.freshnessBand]}
                            variant={getFreshnessVariant(window.freshnessBand)}
                          />
                          <StatusPill
                            label={PRACTICE_LABELS[window.practiceKey]}
                            variant="info"
                          />
                        </div>
                        <p className="text-sm leading-6 text-body">
                          {window.subtitle}
                        </p>
                        <p className="text-xs leading-5 text-muted">
                          {window.sourceLabel}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="space-y-1 text-sm">
                        <p className="font-semibold text-heading">{window.sectorName}</p>
                        <p className="leading-5 text-muted">
                          Attractivité {window.sectorAttractivenessScore?.toFixed(1) ?? "—"} / 5
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="space-y-1 text-sm">
                        <p className="font-semibold text-heading">
                          {window.exposedAccountCount} compte{window.exposedAccountCount > 1 ? "s" : ""}
                        </p>
                        <p className="leading-5 text-muted">
                          Potentiel moyen {window.averagePotentialScore ?? "—"} / 100
                        </p>
                        <p className="leading-5 text-muted">
                          Reach moyen {window.averageReachScore ?? "—"} / 100
                        </p>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </SurfaceCard>
  )
}
