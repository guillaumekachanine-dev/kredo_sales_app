"use client"

import React, { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { NewOpportunityDrawer } from "@/components/missions/NewOpportunityDrawer"
import { AgendaMobileEventDrawer } from "@/components/agenda/AgendaMobileEventDrawer"
import { NewContactDrawer } from "@/components/accounts-contacts/NewContactDrawer"
import { MobileActionPage } from "@/components/templates/MobileActionPage"
import type { CockpitMobileSnapshot } from "@/lib/cockpit/mobile/cockpit-mobile-snapshot-types"
import { CockpitAgendaTodayContent } from "./mobile/CockpitAgendaTodayContent"
import { CockpitMobileHeader } from "./mobile/CockpitMobileHeader"
import {
  COCKPIT_MODULE_IDS,
  CockpitMobileModuleGrid,
  type CockpitModuleId,
} from "./mobile/CockpitMobileModuleGrid"
import { CockpitQuickActionsSheet } from "./mobile/CockpitQuickActionsSheet"
import { CockpitUrgenciesContent } from "./mobile/CockpitUrgenciesContent"
import { MobileCockpitModuleSheet } from "./mobile/MobileCockpitModuleSheet"
import "./mobile/cockpit-mobile.css"

type CockpitMobileSurface = CockpitModuleId | "agenda" | "urgencies"

interface CockpitMobileDashboardProps {
  snapshot: CockpitMobileSnapshot | null
}

export function CockpitMobileDashboard({ snapshot }: CockpitMobileDashboardProps) {
  const router = useRouter()
  const [activeModule, setActiveModule] = useState<CockpitMobileSurface | null>(null)
  const [isQuickActionsOpen, setQuickActionsOpen] = useState(false)
  const [isNewOpportunityOpen, setNewOpportunityOpen] = useState(false)
  const [isNewContactOpen, setNewContactOpen] = useState(false)
  const [isNewEventOpen, setNewEventOpen] = useState(false)
  const returnFocusRef = useRef<HTMLButtonElement | null>(null)

  const activeSheetModule = activeModule && COCKPIT_MODULE_IDS.includes(activeModule as CockpitModuleId)
    ? activeModule as CockpitModuleId
    : null

  const openModule = (module: CockpitModuleId, origin: HTMLButtonElement) => {
    returnFocusRef.current = origin
    setQuickActionsOpen(false)
    setActiveModule(module)
  }

  const toggleHeaderPanel = (panel: "agenda" | "urgencies") => {
    setQuickActionsOpen(false)
    setActiveModule((current) => current === panel ? null : panel)
  }

  return (
    <>
      <MobileActionPage
        contentClassName="gap-3"
        header={(
          <CockpitMobileHeader
            onAgendaOpen={() => toggleHeaderPanel("agenda")}
            onUrgenciesOpen={() => toggleHeaderPanel("urgencies")}
            onQuickActionsOpen={() => {
              setActiveModule(null)
              setQuickActionsOpen(true)
            }}
            urgencyCount={snapshot?.header.urgencyCount ?? 0}
          />
        )}
      >
        {activeModule === "agenda" ? (
          <section className="cockpit-header-panel" aria-label="Agenda du jour">
            <CockpitAgendaTodayContent events={snapshot?.header.todayEvents ?? []} />
          </section>
        ) : null}
        {activeModule === "urgencies" ? (
          <section className="cockpit-header-panel" aria-label="Urgences">
            <CockpitUrgenciesContent
              items={snapshot?.header.urgencies ?? []}
              onShowAll={() => setActiveModule("priorities")}
            />
          </section>
        ) : null}
        <CockpitMobileModuleGrid snapshot={snapshot} onOpen={openModule} />
      </MobileActionPage>

      {activeSheetModule ? (
        <MobileCockpitModuleSheet
          module={activeSheetModule}
          snapshot={snapshot}
          onClose={() => setActiveModule(null)}
          returnFocusRef={returnFocusRef}
        />
      ) : null}

      <CockpitQuickActionsSheet
        open={isQuickActionsOpen}
        onOpenChange={setQuickActionsOpen}
        onActionSelect={(action) => {
          setQuickActionsOpen(false)
          window.requestAnimationFrame(() => {
            if (action === "contact") setNewContactOpen(true)
            if (action === "event") setNewEventOpen(true)
            if (action === "need") setNewOpportunityOpen(true)
            if (action === "staffing") router.push("/staffing")
          })
        }}
      />

      <NewOpportunityDrawer open={isNewOpportunityOpen} onOpenChange={setNewOpportunityOpen} />
      <NewContactDrawer
        open={isNewContactOpen}
        onOpenChange={setNewContactOpen}
        onCreated={() => {
          setNewContactOpen(false)
          router.refresh()
        }}
      />
      <AgendaMobileEventDrawer
        open={isNewEventOpen}
        onOpenChange={setNewEventOpen}
        event={null}
        onSaved={() => {
          setNewEventOpen(false)
          router.refresh()
        }}
      />
    </>
  )
}
