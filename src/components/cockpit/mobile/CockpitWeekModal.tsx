"use client"

import { getNavigationIcon } from "@/components/layout/navigation-icons"
import { AppDialog } from "@/components/ui/AppDialog"
import dynamic from "next/dynamic"
import type { CockpitMobileSnapshot } from "@/lib/cockpit/mobile/cockpit-mobile-snapshot-types"
import type { CockpitWeekModuleId } from "./cockpit-mobile-module-types"

function ModuleLoading() {
  return <p className="cockpit-week-modal__empty" role="status">Chargement du module…</p>
}

const CockpitOpportunitiesModule = dynamic(() => (
  import("./CockpitOpportunitiesModule").then((module) => module.CockpitOpportunitiesModule)
), { loading: ModuleLoading })
const CockpitPrioritiesModule = dynamic(() => (
  import("./CockpitPrioritiesModule").then((module) => module.CockpitPrioritiesModule)
), { loading: ModuleLoading })
const CockpitWeeklyBriefModule = dynamic(() => (
  import("./CockpitWeeklyBriefModule").then((module) => module.CockpitWeeklyBriefModule)
), { loading: ModuleLoading })

type WeekModuleConfig = {
  title: string
  meta?: string
  tone: "info" | "warning" | "idea"
  icon: string
}

const WEEK_MODULES: Record<CockpitWeekModuleId, WeekModuleConfig> = {
  weeklyBrief: { title: "Brief hebdomadaire", tone: "info", icon: "reports" },
  priorities: { title: "Priorités", meta: "Points à traiter", tone: "warning", icon: "clipboard-mobile" },
  opportunities: { title: "Opportunités", meta: "Actions commerciales", tone: "idea", icon: "crm-mobile" },
}

function formatBriefDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "long",
  }).formatToParts(new Date(value)).map((part) => (
    part.type === "month"
      ? `${part.value.charAt(0).toUpperCase()}${part.value.slice(1)}`
      : part.value
  )).join("")
}

function WeekModalContent({ module, snapshot, onComposerOpen, onOpenPriorities }: {
  module: CockpitWeekModuleId
  snapshot: CockpitMobileSnapshot | null
  onComposerOpen: () => void
  onOpenPriorities: () => void
}) {
  if (!snapshot) return <p className="cockpit-week-modal__empty">Les données Cockpit ne sont pas disponibles pour le moment.</p>
  if (module === "weeklyBrief") return <CockpitWeeklyBriefModule snapshot={snapshot} onOpenPriorities={onOpenPriorities} />
  if (module === "priorities") return <CockpitPrioritiesModule snapshot={snapshot} />
  return <CockpitOpportunitiesModule snapshot={snapshot} onComposerOpen={onComposerOpen} />
}

export function CockpitWeekModal({ module, snapshot, onClose, onComposerOpen, onOpenPriorities }: {
  module: CockpitWeekModuleId
  snapshot: CockpitMobileSnapshot | null
  onClose: () => void
  onComposerOpen: () => void
  onOpenPriorities: () => void
}) {
  const config = WEEK_MODULES[module]
  const briefPeriod = module === "weeklyBrief" && snapshot?.weeklyBrief
    ? `${formatBriefDate(snapshot.weeklyBrief.facts.period.startDate)} — ${formatBriefDate(snapshot.weeklyBrief.facts.period.endDate)}`
    : null

  return (
    <AppDialog
      open
      onOpenChange={(open) => { if (!open) onClose() }}
      title={config.title}
      className="cockpit-week-modal"
      maxHeightClassName="max-h-[calc(100dvh-8.75rem)]"
      headerClassName="cockpit-week-modal__header"
      closeButtonClassName="cockpit-week-modal__close"
      bodyClassName="cockpit-week-modal__content"
      headerLeading={(
        <div className="cockpit-week-modal__heading" data-tone={config.tone} data-module={module}>
          <span className="cockpit-week-modal__icon" aria-hidden="true">{getNavigationIcon(config.icon, "size-4", 1.8)}</span>
          <div>
            {config.meta ? <p className="cockpit-week-modal__heading-meta">{config.meta}</p> : null}
            <h2>{config.title}</h2>
            {briefPeriod ? <p className="cockpit-week-modal__brief-period">{briefPeriod}</p> : null}
          </div>
        </div>
      )}
    >
      <WeekModalContent module={module} snapshot={snapshot} onComposerOpen={onComposerOpen} onOpenPriorities={onOpenPriorities} />
    </AppDialog>
  )
}
