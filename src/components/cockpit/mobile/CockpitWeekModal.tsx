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
  meta: string
  tone: "info" | "warning" | "idea"
  icon: string
}

const WEEK_MODULES: Record<CockpitWeekModuleId, WeekModuleConfig> = {
  weeklyBrief: { title: "Brief hebdomadaire", meta: "Lecture de la semaine", tone: "info", icon: "reports" },
  priorities: { title: "Priorités", meta: "Points à traiter", tone: "warning", icon: "clipboard-mobile" },
  opportunities: { title: "Opportunités", meta: "Actions commerciales", tone: "idea", icon: "crm-mobile" },
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

  return (
    <AppDialog
      open
      onOpenChange={(open) => { if (!open) onClose() }}
      title={config.title}
      className="cockpit-week-modal"
      maxHeightClassName="max-h-[min(calc(100dvh-2rem),48rem)]"
      headerClassName="cockpit-week-modal__header"
      closeButtonClassName="cockpit-week-modal__close"
      bodyClassName="cockpit-week-modal__content"
      headerLeading={(
        <div className="cockpit-week-modal__heading" data-tone={config.tone}>
          <span className="cockpit-week-modal__icon" aria-hidden="true">{getNavigationIcon(config.icon, "size-4", 1.8)}</span>
          <div><p>{config.meta}</p><h2>{config.title}</h2></div>
        </div>
      )}
    >
      <WeekModalContent module={module} snapshot={snapshot} onComposerOpen={onComposerOpen} onOpenPriorities={onOpenPriorities} />
    </AppDialog>
  )
}
