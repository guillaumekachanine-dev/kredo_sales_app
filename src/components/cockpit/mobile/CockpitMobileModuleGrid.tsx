"use client"

import React from "react"
import { CockpitModuleCard, type CockpitModuleIconName } from "./CockpitModuleCard"
import type { CockpitMobileSnapshot } from "@/lib/cockpit/mobile/cockpit-mobile-snapshot-types"

export const COCKPIT_MODULE_IDS = [
  "priorities",
  "meetings",
  "opportunities",
  "weeklyBrief",
  "diagnostic",
  "signals",
] as const

export type CockpitModuleId = (typeof COCKPIT_MODULE_IDS)[number]

interface CockpitMobileModuleGridProps {
  snapshot: CockpitMobileSnapshot | null
  onOpen: (module: CockpitModuleId, origin: HTMLButtonElement) => void
}

function plural(count: number, singular: string, pluralLabel = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralLabel}`
}

export function CockpitMobileModuleGrid({ snapshot, onOpen }: CockpitMobileModuleGridProps) {
  const diagnostic = snapshot?.diagnostic?.diagnostic
  const modules: Array<{
    id: CockpitModuleId
    title: string
    icon: CockpitModuleIconName
    indicator: string
    detail: string
    badge?: string
  }> = [
    {
      id: "priorities",
      title: "Priorités",
      icon: "priorities",
      indicator: snapshot ? plural(snapshot.priorities.totalCount, "action") : "Indisponible",
      detail: snapshot
        ? snapshot.priorities.criticalCount > 0
          ? plural(snapshot.priorities.criticalCount, "critique")
          : "Aucune critique"
        : "Données non chargées",
      badge: snapshot && snapshot.priorities.criticalCount > 0 ? "Critique" : undefined,
    },
    {
      id: "meetings",
      title: "Mes RDV",
      icon: "meetings",
      indicator: snapshot ? `${plural(snapshot.meetings.weekCount, "cette semaine", "cette semaine")}` : "Indisponible",
      detail: snapshot?.meetings.nextMeetingLabel ?? (snapshot ? "Aucun RDV à venir" : "Données non chargées"),
    },
    {
      id: "opportunities",
      title: "Opportunités",
      icon: "opportunities",
      indicator: snapshot ? plural(snapshot.opportunities.items.length, "opportunité") : "Indisponible",
      detail: snapshot
        ? snapshot.opportunities.overdueNextStepCount > 0
          ? `${plural(snapshot.opportunities.overdueNextStepCount, "next step")} en retard`
          : snapshot.opportunities.dueThisWeekCount > 0
            ? `${plural(snapshot.opportunities.dueThisWeekCount, "action")} cette semaine`
            : "Portefeuille à jour"
        : "Données non chargées",
      badge: snapshot && snapshot.opportunities.overdueNextStepCount > 0 ? "À traiter" : undefined,
    },
    {
      id: "weeklyBrief",
      title: "Brief hebdo",
      icon: "brief",
      indicator: snapshot?.weeklyBrief ? `Semaine ${snapshot.weeklyBrief.facts.period.weekIso}` : "Aucun brief",
      detail: snapshot?.weeklyBrief
        ? `Données au ${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(snapshot.weeklyBrief.facts.dataCutoffAt))}`
        : "Aucun contenu disponible",
    },
    {
      id: "diagnostic",
      title: "Diagnostic IA",
      icon: "diagnostic",
      indicator: diagnostic ? plural(diagnostic.priorities.length, "arbitrage") : "Aucun diagnostic",
      detail: diagnostic?.correlations[0]?.title ?? (diagnostic ? "Aucune corrélation détectée" : "Aucun contenu disponible"),
      badge: diagnostic?.correlations.some((item) => item.severity === "critical") ? "Alerte" : undefined,
    },
    {
      id: "signals",
      title: "Signaux",
      icon: "signals",
      indicator: snapshot ? plural(snapshot.signals.items.length, "signal") : "Indisponible",
      detail: snapshot
        ? snapshot.signals.strongCount > 0
          ? plural(snapshot.signals.strongCount, "fort")
          : "Aucun signal fort"
        : "Données non chargées",
      badge: snapshot && snapshot.signals.strongCount > 0 ? "Fort" : undefined,
    },
  ]

  return (
    <section className="cockpit-module-grid" aria-label="Modules du cockpit">
      {modules.map((module) => (
        <CockpitModuleCard
          key={module.id}
          {...module}
          onOpen={(event) => onOpen(module.id, event.currentTarget)}
        />
      ))}
    </section>
  )
}
