"use client"

import React, { useMemo, useState } from "react"
import {
  EntityPlanningView,
  type EntityPlanningColumn,
} from "@/components/common/EntityPlanningView"
import { cn } from "@/lib/utils"
import type { OpportunityPlanningData } from "@/app/(app)/missions/_data/get-opportunities-planning"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { useStaffingDrawerStore } from "@/hooks/use-staffing-drawer-store"

// ─── TYPES ET INTERFACES ──────────────────────────────────────────────────────

export interface Milestone {
  key: string
  date: Date
  type: string
  label: string
  color: string
  iconName: string
  description: string
  status: "completed" | "planned"
}

interface OpportunitiesPlanningViewProps {
  opportunities: OpportunityPlanningData[]
  scale?: "year" | "quarter" | "month" | "week"
}

type TimelineRange = {
  start: Date
  end: Date
  totalDays: number
  columns: EntityPlanningColumn[]
}

// ─── CONSTANTES ───────────────────────────────────────────────────────────────

const PLANNING_YEAR = 2026
const DAY_MS = 24 * 60 * 60 * 1000
const LABEL_COLUMN_WIDTH = 270
const MONTH_COLUMN_WIDTH = 90

// ─── CONFIGURATION DES JALONS (LÉGENDE ET DESSIN) ──────────────────────────────

interface JalonConfig {
  label: string
  color: string
  bgClass: string
  borderClass: string
  iconName: string
}

export const JALONS_LEGEND: Record<string, JalonConfig> = {
  emission_besoin: {
    label: "Besoin émis",
    color: "text-blue-500",
    bgClass: "bg-blue-500",
    borderClass: "border-blue-600",
    iconName: "lightbulb",
  },
  qualification: {
    label: "Qualif client",
    color: "text-violet-500",
    bgClass: "bg-violet-500",
    borderClass: "border-violet-600",
    iconName: "chat",
  },
  push_cv: {
    label: "Push CV",
    color: "text-orange-500",
    bgClass: "bg-orange-500",
    borderClass: "border-orange-600",
    iconName: "document-user",
  },
  signature: {
    label: "Signature",
    color: "text-emerald-600",
    bgClass: "bg-emerald-600",
    borderClass: "border-emerald-700",
    iconName: "pencil",
  },
  demarrage: {
    label: "Démarrage",
    color: "text-teal-500",
    bgClass: "bg-teal-500",
    borderClass: "border-teal-600",
    iconName: "flag",
  },
  fin_mission: {
    label: "Fin mission",
    color: "text-rose-600",
    bgClass: "bg-rose-600",
    borderClass: "border-rose-700",
    iconName: "stop",
  },
  action_commerciale: {
    label: "Action commerciale",
    color: "text-brand-brass",
    bgClass: "bg-brand-brass",
    borderClass: "border-brand-brass/80",
    iconName: "bolt",
  },
}

// ─── RENDU DES ICÔNES SVG ─────────────────────────────────────────────────────

function MilestoneIcon({ name }: { name: string }) {
  const cl = "w-3 h-3 text-white"
  switch (name) {
    case "lightbulb":
      return (
        <svg className={cl} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
        </svg>
      )
    case "chat":
      return (
        <svg className={cl} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
      )
    case "document-user":
      return (
        <svg className={cl} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      )
    case "pencil":
      return (
        <svg className={cl} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
        </svg>
      )
    case "flag":
      return (
        <svg className={cl} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
        </svg>
      )
    case "user-check":
      return (
        <svg className={cl} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
      )
    case "stop":
      return (
        <svg className={cl} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <rect x="5.25" y="5.25" width="13.5" height="13.5" rx="1.5" />
        </svg>
      )
    case "bolt":
      return (
        <svg className={cl} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
        </svg>
      )
    default:
      return (
        <svg className={cl} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      )
  }
}

// ─── FONCTIONS UTILITAIRES DE CALCULS DE DATES ────────────────────────────────

function differenceInDays(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS)
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatMonthLabel(date: Date): string {
  return date
    .toLocaleDateString("fr-FR", { month: "short" })
    .replace(".", "")
    .toUpperCase()
}

function buildTimelineRange(
  scale: "year" | "quarter" | "month" | "week",
  today: Date
): TimelineRange {
  const year = today.getFullYear()

  if (scale === "quarter") {
    // Trimestre civil contenant today (par ex. Juin est dans Q2: Avril, Mai, Juin)
    const quarterIndex = Math.floor(today.getMonth() / 3)
    const start = new Date(year, quarterIndex * 3, 1)
    const end = new Date(year, quarterIndex * 3 + 3, 0)
    
    const columns = Array.from({ length: 3 }, (_, i) => {
      const mIdx = quarterIndex * 3 + i
      const date = new Date(year, mIdx, 1)
      return {
        key: `${year}-${String(mIdx + 1).padStart(2, "0")}`,
        label: date.toLocaleDateString("fr-FR", { month: "long" }).toUpperCase(),
        isCurrent: today.getMonth() === mIdx,
      }
    })
    return { start, end, totalDays: differenceInDays(start, end) + 1, columns }
  }

  if (scale === "month") {
    // Mois contenant today (par ex. Juin)
    const start = new Date(year, today.getMonth(), 1)
    const end = new Date(year, today.getMonth() + 1, 0)
    
    // Divisé en 4 semaines pour l'affichage des colonnes
    const columns = Array.from({ length: 4 }, (_, i) => {
      const sDay = i * 7 + 1
      const eDay = Math.min((i + 1) * 7, end.getDate())
      return {
        key: `w${i + 1}`,
        label: `SEM ${i + 1} (${sDay}-${eDay})`,
        isCurrent: Math.floor((today.getDate() - 1) / 7) === i,
      }
    })
    return { start, end, totalDays: differenceInDays(start, end) + 1, columns }
  }

  if (scale === "week") {
    // Semaine contenant today (Lundi à Dimanche)
    const day = today.getDay()
    const diffToMonday = day === 0 ? -6 : 1 - day
    const start = new Date(today)
    start.setDate(today.getDate() + diffToMonday)
    start.setHours(0, 0, 0, 0)

    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)

    const columns = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      const dayLabel = date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }).toUpperCase()
      return {
        key: `d${i}`,
        label: dayLabel,
        isCurrent: today.getDate() === date.getDate() && today.getMonth() === date.getMonth(),
      }
    })
    return { start, end, totalDays: 7, columns }
  }

  // Par défaut : "year" (12 mois complets)
  const start = new Date(year, 0, 1)
  const end = new Date(year, 11, 31)
  const columns = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(year, i, 1)
    return {
      key: `${year}-${String(i + 1).padStart(2, "0")}`,
      label: formatMonthLabel(date),
      isCurrent: today.getMonth() === i,
    }
  })
  return { start, end, totalDays: differenceInDays(start, end) + 1, columns }
}

function getPercentOffset(date: Date, rangeStart: Date, totalDays: number): number {
  return (differenceInDays(rangeStart, date) / totalDays) * 100
}

function clampPercent(val: number): number {
  return Math.max(0, Math.min(100, val))
}

function getOpportunityMilestones(opp: OpportunityPlanningData, today: Date): Milestone[] {
  const milestones: Milestone[] = []
  const parseDate = (dStr: string | null) => (dStr ? new Date(dStr) : null)

  const createdDate = new Date(opp.createdAt)
  const openedDate = parseDate(opp.openedAt) || createdDate
  const startDate = parseDate(opp.startDate)
  const closeDate = parseDate(opp.targetCloseDate)

  const addMilestone = (key: string, date: Date, type: string, label: string, color: string, iconName: string, desc: string) => {
    const dateStr = date.toDateString()
    if (milestones.some(m => m.type === type && m.date.toDateString() === dateStr)) return

    milestones.push({
      key,
      date,
      type,
      label,
      color,
      iconName,
      description: desc,
      status: date.getTime() < today.getTime() ? "completed" : "planned",
    })
  }

  // 1. Émission du besoin
  addMilestone(
    `${opp.id}-emission_besoin`,
    openedDate,
    "emission_besoin",
    "Émission du besoin",
    "bg-blue-500 border-blue-600 text-white",
    "lightbulb",
    "Publication ou détection de l'opportunité dans le pipeline."
  )

  // 2. Échange de qualification client
  let qualDate = new Date(openedDate.getTime() + 2 * 24 * 60 * 60 * 1000)
  const qualInt = opp.interactions.find(
    i => i.type === "qualification" || i.type === "rdv_client" || i.type === "rdv" || i.summary?.toLowerCase().includes("qualification")
  )
  if (qualInt) {
    qualDate = new Date(qualInt.occurredAt)
  }
  addMilestone(
    `${opp.id}-qualification`,
    qualDate,
    "qualification",
    "Échange qualification",
    "bg-violet-500 border-violet-600 text-white",
    "chat",
    qualInt?.summary || "Échange téléphonique ou réunion de qualification avec le client."
  )

  // 3. Push CV
  let pushDate = new Date(openedDate.getTime() + 6 * 24 * 60 * 60 * 1000)
  const firstCandWithSent = opp.candidates.find(c => c.sentToClientAt)
  const cvInt = opp.interactions.find(
    i => i.type === "envoi_cv" || i.type === "cv_envoyes" || i.summary?.toLowerCase().includes("cv")
  )
  if (firstCandWithSent && firstCandWithSent.sentToClientAt) {
    pushDate = new Date(firstCandWithSent.sentToClientAt)
  } else if (cvInt) {
    pushDate = new Date(cvInt.occurredAt)
  }
  
  const hasPush = opp.candidates.length > 0 || !["qualification"].includes(opp.stage)
  if (hasPush) {
    const candNames = opp.candidates.map(c => c.fullName).join(", ")
    addMilestone(
      `${opp.id}-push_cv`,
      pushDate,
      "push_cv",
      "Push CV",
      "bg-orange-500 border-orange-600 text-white",
      "document-user",
      candNames ? `CV envoyés au client : ${candNames}` : "Envoi de profils qualifiés au client."
    )
  }

  const isProject = opp.opportunityType === "forfait" || opp.opportunityType === "centre_de_service" || opp.title.toLowerCase().includes("projet")

  // 4. Signature pour candidat externe (non-salarie)
  const externalCand = opp.candidates.find(c => c.source !== "collaborateur")

  if (externalCand) {
    const refDate = startDate || closeDate || today

    const sigDate = new Date(refDate.getTime() - 4 * 24 * 60 * 60 * 1000)
    addMilestone(
      `${opp.id}-signature`,
      sigDate,
      "signature",
      "Signature contrat candidat",
      "bg-emerald-600 border-emerald-700 text-white",
      "pencil",
      `Signature du contrat de travail et de la mission par ${externalCand.fullName}.`
    )
  } else {
    const sigDate = closeDate || (startDate ? new Date(startDate.getTime() - 3 * 24 * 60 * 60 * 1000) : null)
    if (sigDate) {
      addMilestone(
        `${opp.id}-signature_commerciale`,
        sigDate,
        "signature",
        "Signature commerciale",
        "bg-emerald-500 border-emerald-600 text-white",
        "pencil",
        "Signature commerciale du bon de commande ou du contrat d'affaire."
      )
    }
  }

  // 5. Démarrage
  if (startDate) {
    addMilestone(
      `${opp.id}-demarrage`,
      startDate,
      "demarrage",
      isProject ? "Démarrage projet" : "Démarrage mission",
      "bg-teal-500 border-teal-600 text-white",
      "flag",
      `Démarrage effectif des livrables ${externalCand ? `avec ${externalCand.fullName}` : ""}.`
    )
  }

  if (startDate && opp.durationDays) {
    const endDate = new Date(startDate.getTime() + opp.durationDays * 24 * 60 * 60 * 1000)
    if (endDate.getFullYear() === PLANNING_YEAR) {
      addMilestone(
        `${opp.id}-fin_mission`,
        endDate,
        "fin_mission",
        "Fin de mission fixée",
        "bg-rose-600 border-rose-700 text-white",
        "stop",
        `Fin prévue de la mission après ${opp.durationDays} jours.`
      )
    }
  }

  // 7. Actions commerciales créées depuis la page (interactions de l'opportunité)
  if (opp.interactions) {
    opp.interactions.forEach((int) => {
      const date = new Date(int.occurredAt)
      const typeLabels: Record<string, string> = {
        appel: "Appel",
        email: "Email",
        rdv_client: "RDV client",
        relance: "Relance",
        envoi_cv: "Envoi CV",
        entretien_client: "Entretien client",
        contractualisation: "Contractualisation",
        proposition: "Proposition",
        signature: "Signature",
        note: "Note / Autre",
      }
      const label = typeLabels[int.type] || int.type
      
      milestones.push({
        key: `${opp.id}-event-${int.id}`,
        date,
        type: `action_commerciale_${int.type}`,
        label: `Action commerciale : ${label}`,
        color: "bg-brand-brass border-brand-brass/80 text-white",
        iconName: "bolt",
        description: int.summary || "Aucune description.",
        status: date.getTime() < today.getTime() ? "completed" : "planned",
      })
    })
  }

  milestones.sort((a, b) => a.date.getTime() - b.date.getTime())
  return milestones
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────────────────────

export function OpportunitiesPlanningView({
  opportunities,
  scale = "year",
}: OpportunitiesPlanningViewProps) {
  const { openOpportunityDrawer } = useStaffingDrawerStore()

  const today = useMemo(() => startOfDay(new Date()), [])
  const range = useMemo(() => buildTimelineRange(scale, today), [scale, today])
  const [hoveredMilestone, setHoveredMilestone] = useState<{
    milestone: Milestone
    opportunityTitle: string
    client: string
    x: number
    y: number
  } | null>(null)

  const mappedRows = useMemo(() => {
    return opportunities
      .map((opp) => {
        const allMilestones = getOpportunityMilestones(opp, today)
        // Filtrer les jalons pour ne conserver que ceux présents dans l'échelle de temps sélectionnée
        const milestones = allMilestones.filter(
          (m) => m.date >= range.start && m.date <= range.end
        )

        let firstOffset = 0
        let lastOffset = 100
        if (milestones.length > 0) {
          firstOffset = clampPercent(getPercentOffset(milestones[0].date, range.start, range.totalDays))
          lastOffset = clampPercent(getPercentOffset(milestones[milestones.length - 1].date, range.start, range.totalDays))
        }

        return {
          opp,
          milestones,
          firstOffset,
          lastOffset,
        }
      })
      // Ne conserver que les opportunités ayant au moins un jalon visible dans l'échelle courante
      .filter((row) => row.milestones.length > 0)
  }, [opportunities, range, today])

  const todayOffset = getPercentOffset(today, range.start, range.totalDays)
  const showToday = todayOffset >= 0 && todayOffset <= 100
  const todayLeft = `${clampPercent(todayOffset)}%`

  const handleMilestoneMouseEnter = (
    milestone: Milestone,
    oppTitle: string,
    client: string,
    e: React.MouseEvent
  ) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setHoveredMilestone({
      milestone,
      opportunityTitle: oppTitle,
      client,
      x: rect.left + rect.width / 2,
      y: rect.top,
    })
  }

  const handleMilestoneMouseLeave = () => {
    setHoveredMilestone(null)
  }

  return (
    <div className="relative flex flex-col gap-5 select-none">
      <EntityPlanningView
        rows={mappedRows}
        columns={range.columns}
        getRowId={(row) => row.opp.id}
        labelColumnHeader="Opportunité / Compte"
        labelColumnWidth={LABEL_COLUMN_WIDTH}
        timelineColumnMinWidth={MONTH_COLUMN_WIDTH}
        currentMarkerLeft={showToday ? todayLeft : null}
        emptyState={
          <div>
            <p className="text-sm font-semibold text-heading">Aucun planning disponible</p>
            <p className="mt-1 text-xs text-muted">Aucune opportunité ne possède de jalon sur cette période.</p>
          </div>
        }
        renderRowLabel={({ opp }) => (
          <div className="flex min-w-0 items-center gap-2.5">
            <CompanyLogo
              name={opp.client || "Client"}
              logoPath={opp.clientLogoPath}
              website={opp.clientWebsite}
              size="sm"
            />
            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <button
                type="button"
                onClick={() => openOpportunityDrawer(opp.id, "besoin")}
                className="block max-w-full truncate text-left text-[11px] font-bold text-heading transition-colors hover:text-primary"
              >
                {opp.title}
              </button>
              <div className="mt-0.5 flex items-center gap-1.5 truncate text-[10px] text-muted">
                <span className="truncate font-semibold text-heading/70">{opp.client}</span>
                <span>•</span>
                <span className="shrink-0 font-bold text-primary">
                  {opp.candidates.length} staffing{opp.candidates.length > 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
        )}
        renderTimelineRow={({ opp, milestones, firstOffset, lastOffset }) => (
          <>
            {showToday ? (
              <div
                className="pointer-events-none absolute inset-y-0 z-10 w-px bg-danger/10 group-hover:bg-danger/25"
                style={{ left: todayLeft }}
                aria-hidden="true"
              />
            ) : null}

            <div
              className="pointer-events-none absolute inset-0 grid"
              style={{ gridTemplateColumns: `repeat(${range.columns.length}, minmax(${MONTH_COLUMN_WIDTH}px, 1fr))` }}
            >
              {range.columns.map((col) => (
                <div key={col.key} className="h-full border-r border-border/40 last:border-r-0" />
              ))}
            </div>

            <div className="pointer-events-none absolute left-6 right-6 h-0.5 bg-border/60" />

            {milestones.length > 1 ? (
              <div
                className="pointer-events-none absolute h-0.8 bg-primary/20"
                style={{
                  left: `calc(${firstOffset}% + 6px)`,
                  width: `calc(${lastOffset - firstOffset}% - 12px)`,
                }}
              />
            ) : null}

            <div className="absolute inset-x-6 flex h-full items-center">
              <div className="relative h-6 w-full">
                {milestones.map((milestone) => {
                  const offset = clampPercent(getPercentOffset(milestone.date, range.start, range.totalDays))
                  return (
                    <div
                      key={milestone.key}
                      onMouseEnter={(event) =>
                        handleMilestoneMouseEnter(milestone, opp.title, opp.client, event)
                      }
                      onMouseLeave={handleMilestoneMouseLeave}
                      className={cn(
                        "absolute top-1/2 z-20 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-help items-center justify-center rounded-full border shadow-sm transition-transform duration-150 hover:scale-125",
                        milestone.color,
                      )}
                      style={{ left: `${offset}%` }}
                    >
                      <MilestoneIcon name={milestone.iconName} />
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      />

      {/* Légende en bas de page */}
      <div className="rounded-[var(--radius-medium)] border border-border bg-surface px-5 py-4 shadow-sm">
        <h4 className="text-xs font-bold text-heading mb-3 uppercase tracking-wider">Légende des jalons</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          {Object.entries(JALONS_LEGEND).map(([key, config]) => (
            <div key={key} className="flex items-center gap-2.5 text-xs text-body font-medium">
              <span className={cn("w-5 h-5 flex items-center justify-center rounded-full border border-border text-white shrink-0 shadow-sm", config.bgClass, config.borderClass)}>
                <MilestoneIcon name={config.iconName} />
              </span>
              <span>{config.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Tooltip */}
      {hoveredMilestone && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-50 w-[280px] rounded-xl bg-heading p-3.5 text-primary-fg shadow-2xl border border-border/20 transition-all duration-150"
          style={{
            left: Math.max(12, Math.min(hoveredMilestone.x - 140, typeof window !== "undefined" ? window.innerWidth - 292 : 300)),
            top: hoveredMilestone.y - 128,
          }}
        >
          <div className="flex items-start justify-between gap-2.5">
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-primary-fg leading-tight">
                {hoveredMilestone.milestone.label}
              </p>
              <p className="mt-0.5 truncate text-[10px] text-primary-fg/75">
                {hoveredMilestone.opportunityTitle}
              </p>
              <p className="text-[9px] font-bold text-primary-fg/60">
                {hoveredMilestone.client}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em]",
                hoveredMilestone.milestone.status === "completed"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-amber-500/20 text-amber-300"
              )}
            >
              {hoveredMilestone.milestone.status === "completed" ? "Fait" : "À venir"}
            </span>
          </div>

          <div className="mt-2.5 pt-2 border-t border-primary-fg/10 space-y-1.5 text-[10px] text-primary-fg/85 leading-normal">
            <div className="flex items-center justify-between">
              <span className="text-primary-fg/60">Date prévue :</span>
              <span className="font-semibold">
                {hoveredMilestone.milestone.date.toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <p className="text-[9px] text-primary-fg/75 leading-normal italic">
              {hoveredMilestone.milestone.description}
            </p>
          </div>

          {/* Flèche du Tooltip */}
          <div className="absolute left-1/2 top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-heading" aria-hidden="true" />
        </div>
      )}

    </div>
  )
}
