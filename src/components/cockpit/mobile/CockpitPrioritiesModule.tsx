"use client"

import { useState } from "react"
import { StatusPill } from "@/components/ui/StatusPill"
import { WeeklyManagerItemActions } from "@/components/reports/weekly-manager/WeeklyManagerItemActions"
import { getCockpitPriorityKey, selectCockpitModulePriorities } from "@/lib/cockpit/mobile/cockpit-mobile-selectors"
import type { CockpitMobileSnapshot } from "@/lib/cockpit/mobile/cockpit-mobile-snapshot-types"

const TIER_LABEL = { critical: "Critique", high: "Élevé", normal: "Normal" } as const
const TIER_VARIANT = { critical: "danger", high: "warning", normal: "neutral" } as const
const TASK_PRIORITY = { critical: "urgent", high: "high", normal: "normal" } as const

function entityLabel(entityType?: string) {
  if (entityType === "opportunity") return "Opportunité"
  if (entityType === "company") return "Compte"
  if (entityType === "mission") return "Mission"
  if (entityType === "candidate") return "Candidat"
  return null
}

export function CockpitPrioritiesModule({ snapshot }: { snapshot: CockpitMobileSnapshot }) {
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(() => new Set())
  const narrativeByTitle = new Map(snapshot.weeklyBrief?.narrative.topPriorities.map((item) => [item.title, item]) ?? [])
  const items = selectCockpitModulePriorities(snapshot.priorities.items).filter((item) => !dismissedKeys.has(getCockpitPriorityKey(item)))

  if (items.length === 0) return <p className="cockpit-sheet-empty">Aucune priorité active pour cette semaine.</p>

  return <ul className="cockpit-sheet-list">{items.map((item) => {
    const narrative = narrativeByTitle.get(item.title)
    const key = getCockpitPriorityKey(item)
    return <li key={key} className="cockpit-action-card">
      <div className="flex items-start justify-between gap-3"><h3 className="text-sm font-bold text-heading">{item.title}</h3><StatusPill label={TIER_LABEL[item.tier]} variant={TIER_VARIANT[item.tier]} /></div>
      <p className="text-xs leading-relaxed text-body">{narrative?.whyNow ?? item.reason}</p>
      <p className="text-xs font-semibold text-primary">Action : {narrative?.recommendedAction ?? item.recommendedAction}</p>
      {narrative?.expectedImpact ? <p className="text-xs text-muted">Impact attendu : {narrative.expectedImpact}</p> : null}
      {entityLabel(item.entityType) ? <p className="text-[11px] text-muted">Entité : {entityLabel(item.entityType)}</p> : null}
      <WeeklyManagerItemActions title={item.title} description={narrative?.expectedImpact} dueDate={null} taskPriority={TASK_PRIORITY[item.tier]} entityType={item.entityType} entityId={item.entityId} sourceType={item.sourceType} sourceId={item.sourceId} weekIso={snapshot.weeklyBrief?.facts.period.weekIso ?? ""} isMobile onDismissed={() => setDismissedKeys((current) => new Set(current).add(key))} />
    </li>
  })}</ul>
}
