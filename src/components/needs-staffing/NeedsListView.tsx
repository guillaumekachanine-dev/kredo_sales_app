"use client"

import React, { useMemo, useState } from "react"
import Link from "next/link"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { useStaffingDrawerStore } from "@/hooks/use-staffing-drawer-store"
import type { NeedsStaffingDirection } from "@/lib/needs-staffing/url-state"
import {
  getOpportunityStageColor,
  getOpportunityStageLabel,
} from "@/lib/opportunities/stages"
import { cn } from "@/lib/utils"
import type { MissionsListRow } from "@/components/missions/MissionsListView"
import type { StaffingListRow } from "@/app/(app)/staffing/_data/get-staffings-list"
import { isActivePositioningStatus } from "@/lib/needs-staffing/coverage"
import { formatEuro } from "@/lib/formatters"
import { groupActiveStaffingsByOpportunityId } from "@/lib/needs-staffing/model"

interface NeedsCoverageSnapshot {
  requiredHeadcount: number
  coveringCount: number
  cappedCoveringCount: number
}

interface NeedsListViewProps {
  rows: MissionsListRow[]
  staffingRows: StaffingListRow[]
  coverageByOpportunityId: Record<string, NeedsCoverageSnapshot>
  acvDirection: NeedsStaffingDirection
  onToggleAcvSort: () => void
  onLaunchFinancialSimulation: (staffing: StaffingListRow) => void
  onEditStage: (id: string, type: "need" | "staffing", title: string, currentStage: string) => void
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

const STATUS_LABELS: Record<string, string> = {
  identifie: "Identifié",
  propose_interne: "Proposé en interne",
  preselectionne: "Présélectionné",
  envoye_client: "CV envoyé",
  entretien_planifie: "Entretien client",
  entretien_realise: "Entretien client",
  retenu: "Retenu",
  gagne: "Gagné",
  refuse_client: "Refus client",
  refuse_candidat: "Refus candidat",
  abandonne: "Abandonné",
}

function StageLabel({ stage }: { stage: string | null | undefined }) {
  const safeStage = stage ?? ""
  const color = getOpportunityStageColor(safeStage)

  return (
    <span className="text-[11px] font-medium" style={{ color }}>
      {getOpportunityStageLabel(safeStage)}
    </span>
  )
}

function getPriorityLabel(priority: string | null | undefined) {
  if (priority === "haute") return "Haute"
  if (priority === "basse") return "Basse"
  return "Normale"
}

function CoverageCell({
  snapshot,
}: {
  snapshot: NeedsCoverageSnapshot | undefined
}) {
  if (!snapshot) {
    return <span className="text-muted">—</span>
  }

  const isCovered = snapshot.requiredHeadcount > 0 && snapshot.cappedCoveringCount >= snapshot.requiredHeadcount

  return (
    <span className={cn(
      "font-semibold tabular-nums",
      isCovered ? "text-success" : "text-heading",
    )}>
      {snapshot.cappedCoveringCount} / {snapshot.requiredHeadcount}
    </span>
  )
}

function AcvHeader({ direction }: { direction: NeedsStaffingDirection }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>Valeur (ACV)</span>
      <svg
        className={cn(
          "size-3 transition-transform",
          direction === "asc" && "rotate-180",
          direction === null && "opacity-45",
        )}
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 8l4 4 4-4" />
      </svg>
    </span>
  )
}

export function NeedsListView({
  rows,
  staffingRows,
  coverageByOpportunityId,
  acvDirection,
  onToggleAcvSort,
  onLaunchFinancialSimulation,
  onEditStage,
}: NeedsListViewProps) {
  const { openOpportunityDrawer, openStaffingDrawer } = useStaffingDrawerStore()
  const [expandedNeedIds, setExpandedNeedIds] = useState<Set<string>>(new Set())

  const toggleExpand = (needId: string) => {
    setExpandedNeedIds((prev) => {
      const next = new Set(prev)
      if (next.has(needId)) {
        next.delete(needId)
      } else {
        next.add(needId)
      }
      return next
    })
  }

  const needStaffings = useMemo(() => {
    return groupActiveStaffingsByOpportunityId(staffingRows, isActivePositioningStatus)
  }, [staffingRows])

  if (rows.length === 0) {
    return (
      <div className="flex min-h-40 items-center justify-center py-16 text-sm text-muted">
        Aucun besoin ne correspond aux filtres.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-medium)] border border-border bg-surface shadow-sm">
      <style>{`
        tr.need-row {
          border-left: 3px solid var(--color-case-need-border);
        }
        tr.need-row:hover {
          background-color: color-mix(in srgb, var(--color-case-need) 4%, var(--color-surface)) !important;
        }
        tr.staffing-row {
          background-color: color-mix(in srgb, var(--color-case-candidate) 4%, var(--color-surface)) !important;
          border-left: 3px solid var(--color-case-candidate-border);
          border-bottom: 1px solid color-mix(in srgb, var(--color-case-candidate) 22%, var(--color-border));
        }
        tr.staffing-row:hover {
          background-color: color-mix(in srgb, var(--color-case-candidate) 10%, var(--color-surface)) !important;
        }
      `}</style>

      <div className="overflow-x-auto" aria-label="Liste des besoins ouverts nécessitant du staffing">
        <table className="w-full border-collapse text-left text-xs" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "13rem" }} />
            <col style={{ width: "19rem" }} />
            <col style={{ width: "8rem" }} />
            <col style={{ width: "5.5rem" }} />
            <col style={{ width: "10rem" }} />
            <col style={{ width: "6.5rem" }} />
            <col style={{ width: "7.5rem" }} />
            <col style={{ width: "7.5rem" }} />
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-canvas/30">
              <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted text-left">Compte</th>
              <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted text-left">Intitulé du besoin</th>
              <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted text-left">Practice</th>
              <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted text-center">Priorité</th>
              <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted text-left">Étape</th>
              <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted text-center">Couverture</th>
              <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted text-right">
                <button
                  type="button"
                  onClick={onToggleAcvSort}
                  aria-label="Trier par valeur ACV"
                  className="inline-flex items-center gap-1 outline-none transition-colors focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-[var(--focus-ring-color)] ml-auto"
                >
                  <AcvHeader direction={acvDirection} />
                </button>
              </th>
              <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted text-right">Accéder à</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const activeStaffings = needStaffings.get(row.entityId) || []
              const hasStaffings = activeStaffings.length > 0
              const isExpanded = expandedNeedIds.has(row.entityId)

              return (
                <React.Fragment key={row.entityId}>
                  {/* Ligne Besoin */}
                  <tr
                    onClick={() => openOpportunityDrawer(row.entityId, "besoin")}
                    className="need-row border-b border-border/40 cursor-pointer kredo-hover-reference group text-xs transition-colors duration-150"
                  >
                    {/* Compte */}
                    <td className="px-4 py-[0.625rem] text-left">
                      <div className="flex min-w-0 items-center gap-2">
                        {hasStaffings ? (
                          <button
                            type="button"
                            aria-expanded={isExpanded}
                            aria-controls={`staffing-rows-${row.entityId}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleExpand(row.entityId)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault()
                                e.stopPropagation()
                                toggleExpand(row.entityId)
                              }
                            }}
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                          >
                            <svg
                              className={cn(
                                "h-3.5 w-3.5 text-muted transition-transform duration-200",
                                isExpanded ? "rotate-90" : "rotate-0"
                              )}
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M9 18l6-6-6-6" />
                            </svg>
                          </button>
                        ) : (
                          <div className="h-5 w-5 shrink-0" />
                        )}
                        <CompanyLogo
                          name={row.client || "Client"}
                          logoPath={row.clientLogoPath}
                          website={row.clientWebsite}
                          size="sm"
                        />
                        <span className="truncate font-bold text-heading">{row.client ?? "—"}</span>
                      </div>
                    </td>
                    {/* Intitulé du besoin */}
                    <td className="px-4 py-[0.625rem] text-left">
                      <span title={row.title} className="block truncate whitespace-nowrap font-semibold text-body transition-colors duration-150 group-hover:text-primary">
                        {row.title}
                      </span>
                    </td>
                    {/* Practice */}
                    <td className="px-4 py-[0.625rem] text-left">
                      <span className="block truncate whitespace-nowrap text-body">{row.practice ?? "—"}</span>
                    </td>
                    {/* Priorité */}
                    <td className="px-4 py-[0.625rem] text-center">
                      <span className={cn("text-[11px] font-semibold", row.priority === "haute" ? "text-warning" : "text-body")}>
                        {getPriorityLabel(row.priority)}
                      </span>
                    </td>
                    {/* Étape */}
                    <td className="px-4 py-[0.625rem] text-left">
                      <div className="flex items-center gap-1.5 group/cell">
                        <StageLabel stage={row.stage} />
                        <button
                          type="button"
                          title="Modifier l’étape du besoin"
                          onClick={(e) => {
                            e.stopPropagation()
                            onEditStage(row.entityId, "need", row.title, row.stage || "qualification")
                          }}
                          className="flex size-7 shrink-0 items-center justify-center rounded-md border border-transparent text-muted transition-all duration-150 hover:bg-[#FFC107]/10 hover:text-[#D8A400] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC107]/35 md:opacity-0 md:group-hover/cell:opacity-100"
                        >
                          <PencilIcon className="size-[13px]" />
                        </button>
                      </div>
                    </td>
                    {/* Couverture */}
                    <td className="px-4 py-[0.625rem] text-center">
                      <CoverageCell snapshot={coverageByOpportunityId[row.entityId]} />
                    </td>
                    {/* Valeur (ACV) */}
                    <td className="px-4 py-[0.625rem] text-right">
                      <span className="font-semibold tabular-nums text-heading">{row.amount ?? "—"}</span>
                    </td>
                    {/* Accéder à */}
                    <td className="px-4 py-[0.625rem] text-right">
                      <Link
                        href={`/missions/opps/${row.entityId}`}
                        aria-label={`Fiche détails : ${row.title}`}
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex h-8 items-center justify-center rounded-[var(--radius-small)] border border-primary bg-primary px-3 text-[11px] font-semibold text-primary-fg shadow-[0_5px_12px_-9px_rgba(19,75,200,0.9)] transition-[background-color,border-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:border-primary-deep hover:bg-primary-deep hover:shadow-[0_8px_16px_-10px_rgba(19,75,200,0.95)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                      >
                        Fiche détails
                      </Link>
                    </td>
                  </tr>

                  {/* Lignes Staffing rattachées */}
                  {isExpanded && activeStaffings.map((staffing) => (
                    <tr
                      key={staffing.id}
                      id={`staffing-rows-${row.entityId}`}
                      onClick={() => openStaffingDrawer(staffing.id)}
                      className="staffing-row border-b border-border/40 cursor-pointer text-xs transition-colors duration-150"
                    >
                      {/* Consultant / Candidat avec indentation */}
                      <td className="px-4 py-[0.625rem] text-left pl-11">
                        <span className="block text-[9px] font-semibold uppercase tracking-[0.08em] text-muted/70 mb-0.5">
                          Consultant
                        </span>
                        <span className="truncate font-bold text-heading">{staffing.fullName}</span>
                      </td>
                      {/* Profil Title */}
                      <td className="px-4 py-[0.625rem] text-left">
                        <span className="block text-[9px] font-semibold uppercase tracking-[0.08em] text-muted/70 mb-0.5">
                          Profil
                        </span>
                        <span title={staffing.profileTitle ?? ""} className="block truncate whitespace-nowrap font-medium text-body">
                          {staffing.profileTitle ?? "—"}
                        </span>
                      </td>
                      {/* Practice du profil */}
                      <td className="px-4 py-[0.625rem] text-left">
                        <span className="block text-[9px] font-semibold uppercase tracking-[0.08em] text-muted/70 mb-0.5">
                          Practice
                        </span>
                        <span className="block truncate whitespace-nowrap text-body">{staffing.profilePractice ?? "—"}</span>
                      </td>
                      {/* Priorité parent */}
                      <td className="px-4 py-[0.625rem] text-center text-muted">
                        <span className="block text-[9px] font-semibold uppercase tracking-[0.08em] text-muted/70 mb-0.5">
                          Priorité
                        </span>
                        <span className={cn("text-[11px] font-semibold", row.priority === "haute" ? "text-warning/80" : "text-body/70")}>
                          {getPriorityLabel(row.priority)}
                        </span>
                      </td>
                      {/* Statut du positionnement */}
                      <td className="px-4 py-[0.625rem] text-left">
                        <span className="block text-[9px] font-semibold uppercase tracking-[0.08em] text-muted/70 mb-0.5">
                          Étape
                        </span>
                        <div className="flex items-center gap-1.5 group/cell">
                          <span className="text-[11px] font-semibold text-heading">
                            {STATUS_LABELS[staffing.status] ?? staffing.status}
                          </span>
                          <button
                            type="button"
                            title="Modifier l’étape du staffing"
                            onClick={(e) => {
                              e.stopPropagation()
                              onEditStage(staffing.id, "staffing", staffing.fullName, staffing.status)
                            }}
                            className="flex size-7 shrink-0 items-center justify-center rounded-md border border-transparent text-muted transition-all duration-150 hover:bg-[#9C27B0]/10 hover:text-[#9C27B0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9C27B0]/35 md:opacity-0 md:group-hover/cell:opacity-100"
                          >
                            <PencilIcon className="size-[13px]" />
                          </button>
                        </div>
                      </td>
                      {/* Disponibilité */}
                      <td className="px-4 py-[0.625rem] text-center">
                        <span className="block text-[9px] font-semibold uppercase tracking-[0.08em] text-muted/70 mb-0.5">
                          Disponibilité
                        </span>
                        <span className="text-body font-medium">{staffing.availableFrom ?? "—"}</span>
                      </td>
                      {/* Salaire */}
                      <td className="px-4 py-[0.625rem] text-right">
                        <span className="block text-[9px] font-semibold uppercase tracking-[0.08em] text-muted/70 mb-0.5">
                          Salaire
                        </span>
                        <span className="font-semibold tabular-nums text-heading">{formatEuro(staffing.salary)}</span>
                      </td>
                      {/* Simulation financière */}
                      <td className="px-4 py-[0.625rem] text-right">
                        <span className="block text-[9px] font-semibold uppercase tracking-[0.08em] text-transparent select-none mb-0.5" aria-hidden="true">
                          Action
                        </span>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            onLaunchFinancialSimulation(staffing)
                          }}
                          className="inline-flex h-8 items-center justify-center rounded-[var(--radius-small)] border border-primary/20 bg-primary/5 px-3 text-[11px] font-semibold text-primary shadow-sm transition-[background-color,border-color,transform] duration-200 hover:-translate-y-px hover:border-primary hover:bg-primary hover:text-primary-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                        >
                          Simulation
                        </button>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

