"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { NewOpportunityButton } from "@/components/missions/NewOpportunityButton"
import { StageQuickEditorDialog } from "@/components/needs-staffing/StageQuickEditorDialog"
import { OPPORTUNITY_STAGES, getOpportunityStageColor, getOpportunityStageLabel } from "@/lib/opportunities/stages"
import { cn } from "@/lib/utils"
import { buildNeedsHref } from "./navigation/needs-url"
import type { NeedsFilterState, NeedsListItem } from "./data/opportunities-needs.types"

const PRIORITY_OPTIONS = [
  { value: "all", label: "Priorité" },
  { value: "haute", label: "Haute" },
  { value: "normale", label: "Normale" },
  { value: "basse", label: "Basse" },
]

const STAGE_OPTIONS = [
  { value: "all", label: "Étape" },
  ...OPPORTUNITY_STAGES.filter((stage) => !stage.isTerminal).map((stage) => ({
    value: stage.value,
    label: stage.label,
  })),
]

const PRIORITY_LABEL: Record<string, string> = { haute: "Haute", normale: "Normale", basse: "Basse" }

function RailFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "h-8 w-full rounded-[var(--radius-medium)] border border-border bg-surface px-2 text-xs outline-none transition-colors focus:border-primary/50 focus:ring-[var(--focus-ring-width)] focus:ring-[var(--focus-ring-color)]",
          value === "all" ? "text-muted" : "text-body",
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-3.5">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function SortIcon({ direction }: { direction: "asc" | "desc" | null }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-3.5">
      <path d="M4 6l4-4 4 4M4 10l4 4 4-4" opacity={direction ? 0.35 : 1} />
      {direction === "asc" && <path d="M4 6l4-4 4 4" opacity={1} />}
      {direction === "desc" && <path d="M4 10l4 4 4-4" opacity={1} />}
    </svg>
  )
}

interface NeedsListPanelProps {
  items: NeedsListItem[]
  selectedNeedId: string | null
  filters: NeedsFilterState
  searchParamsString: string
}

export function NeedsListPanel({ items, selectedNeedId, filters, searchParamsString }: NeedsListPanelProps) {
  const router = useRouter()
  const [editStage, setEditStage] = useState<{ id: string; title: string; currentStage: string } | null>(null)

  const practiceOptions = useMemo(() => {
    const practices = [...new Set(items.map((item) => item.practice).filter((value): value is string => Boolean(value)))]
    return [{ value: "all", label: "Practice" }, ...practices.map((practice) => ({ value: practice, label: practice }))]
  }, [items])

  const setFilter = (key: keyof NeedsFilterState, value: string | null) => {
    router.replace(buildNeedsHref(searchParamsString, { filters: { [key]: value } }), { scroll: false })
  }

  const nextAcvDirection = filters.sort === "acv" && filters.direction === "desc" ? "asc" : filters.sort === "acv" && filters.direction === "asc" ? null : "desc"
  const toggleAcvSort = () => {
    router.replace(
      buildNeedsHref(searchParamsString, {
        filters: { sort: nextAcvDirection ? "acv" : null, direction: nextAcvDirection },
      }),
      { scroll: false },
    )
  }

  const activeFilterCount =
    (filters.stage ? 1 : 0) + (filters.priority ? 1 : 0) + (filters.practice ? 1 : 0) + (filters.direction ? 1 : 0)

  return (
    <section className="flex min-h-0 flex-col" aria-labelledby="needs-list-title">
      <div className="shrink-0 space-y-3 border-b border-border px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <h2 id="needs-list-title" className="text-xs font-bold text-heading">
            Besoins ouverts <span className="font-normal text-muted">({items.length})</span>
          </h2>
          <NewOpportunityButton />
        </div>
        <div className="space-y-2">
          <RailFilter label="Étape" value={filters.stage ?? "all"} options={STAGE_OPTIONS} onChange={(value) => setFilter("stage", value === "all" ? null : value)} />
          <RailFilter label="Priorité" value={filters.priority ?? "all"} options={PRIORITY_OPTIONS} onChange={(value) => setFilter("priority", value === "all" ? null : value)} />
          <RailFilter label="Practice" value={filters.practice ?? "all"} options={practiceOptions} onChange={(value) => setFilter("practice", value === "all" ? null : value)} />
          <div className="flex items-center gap-2">
            <button type="button" onClick={toggleAcvSort} aria-pressed={filters.sort === "acv"} className={cn("inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-medium)] border px-2 text-xs font-semibold transition-colors", filters.sort === "acv" ? "border-primary/40 bg-primary/[0.07] text-primary" : "border-border text-body hover:bg-canvas")}>
              <SortIcon direction={filters.sort === "acv" ? filters.direction : null} />
              Tri ACV{filters.sort === "acv" && filters.direction ? ` · ${filters.direction === "desc" ? "↓" : "↑"}` : ""}
            </button>
            {activeFilterCount > 0 && (
              <Link href={buildNeedsHref(searchParamsString, { filters: { stage: null, priority: null, practice: null, sort: null, direction: null } })} replace scroll={false} className="inline-flex h-8 items-center rounded-[var(--radius-medium)] border border-border px-2.5 text-xs font-semibold text-body hover:bg-canvas">
                Réinitialiser
              </Link>
            )}
          </div>
        </div>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <li className="px-4 py-10 text-center text-xs text-muted">Aucun besoin ne correspond aux filtres.</li>
        ) : (
          items.map((item) => {
            const isActive = item.id === selectedNeedId
            return (
              <li key={item.id} className={cn("group border-b border-border transition-colors", isActive ? "border-l-2 border-l-edito-brass bg-primary/[0.07]" : "border-l-2 border-l-transparent hover:bg-canvas")}>
                <Link href={buildNeedsHref(searchParamsString, { opp: item.id })} replace scroll={false} aria-current={isActive ? "page" : undefined} className="block px-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/30">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("min-w-0 flex-1 text-sm font-semibold leading-snug", isActive ? "text-edito-navy" : "text-heading")}>{item.title}</p>
                    <span className="shrink-0 rounded-full border border-border px-1.5 py-0.5 text-[10px] font-semibold text-body">{PRIORITY_LABEL[item.priority] ?? "Normale"}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-body">
                    <CompanyLogo name={item.clientName} logoPath={item.clientLogoPath} size="sm" />
                    <span className="truncate">{item.clientName}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block size-1.5 rounded-full" style={{ backgroundColor: getOpportunityStageColor(item.stage) }} aria-hidden="true" />
                      {getOpportunityStageLabel(item.stage)}
                    </span>
                    {item.practice && <span className="truncate">{item.practice}</span>}
                    <span className="tabular-nums">{item.amount}</span>
                  </div>
                  {item.coverage && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10px] text-muted">
                        <span>Couverture</span>
                        <span className="tabular-nums">{item.coverage.cappedCoveringCount}/{item.coverage.requiredHeadcount}</span>
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-border">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((item.coverageRatio ?? 0) * 100)}%` }} />
                      </div>
                    </div>
                  )}
                </Link>
                <div className="flex justify-end px-3 pb-2">
                  <button type="button" onClick={() => setEditStage({ id: item.id, title: item.title, currentStage: item.stage })} className="inline-flex items-center gap-1 rounded-[var(--radius-medium)] px-2 py-1 text-[11px] font-medium text-muted opacity-0 transition-opacity hover:text-primary focus-visible:opacity-100 group-hover:opacity-100">
                    <EditIcon /> Étape
                  </button>
                </div>
              </li>
            )
          })
        )}
      </ul>

      {editStage && (
        <StageQuickEditorDialog
          open
          onOpenChange={(open) => !open && setEditStage(null)}
          entityType="need"
          entityId={editStage.id}
          entityTitle={editStage.title}
          currentStage={editStage.currentStage}
        />
      )}
    </section>
  )
}
