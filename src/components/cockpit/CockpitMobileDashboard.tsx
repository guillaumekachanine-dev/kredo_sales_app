"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
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
import { COMMUNICATION_COMPOSER_STATE_EVENT, type CommunicationComposerStateDetail } from "@/lib/communication/communication-composer"
import "./mobile/cockpit-mobile.css"

const NewOpportunityDrawer = dynamic(() => (
  import("@/components/missions/NewOpportunityDrawer").then((module) => module.NewOpportunityDrawer)
))
const AgendaMobileEventDrawer = dynamic(() => (
  import("@/components/agenda/AgendaMobileEventDrawer").then((module) => module.AgendaMobileEventDrawer)
))
const NewContactDrawer = dynamic(() => (
  import("@/components/accounts-contacts/NewContactDrawer").then((module) => module.NewContactDrawer)
))

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
  const [isComposerOpen, setComposerOpen] = useState(false)
  const returnFocusRef = useRef<HTMLButtonElement | null>(null)

  const activeSheetModule = activeModule && COCKPIT_MODULE_IDS.includes(activeModule as CockpitModuleId)
    ? activeModule as CockpitModuleId
    : null

  useEffect(() => {
    const onComposerState = (event: Event) => setComposerOpen((event as CustomEvent<CommunicationComposerStateDetail>).detail.open)
    window.addEventListener(COMMUNICATION_COMPOSER_STATE_EVENT, onComposerState)
    return () => window.removeEventListener(COMMUNICATION_COMPOSER_STATE_EVENT, onComposerState)
  }, [])

  const openModule = useCallback((module: CockpitModuleId, origin: HTMLButtonElement) => {
    returnFocusRef.current = origin
    setQuickActionsOpen(false)
    setActiveModule(module)
  }, [])

  const toggleHeaderPanel = useCallback((panel: "agenda" | "urgencies", origin: HTMLButtonElement) => {
    returnFocusRef.current = origin
    setQuickActionsOpen(false)
    setActiveModule((current) => current === panel ? null : panel)
  }, [])

  const closeActiveModule = useCallback(() => setActiveModule(null), [])
  const openSheetModule = useCallback((module: CockpitModuleId) => setActiveModule(module), [])
  const handleComposerOpen = useCallback(() => setComposerOpen(true), [])

  return (
    <>
      <MobileActionPage
        contentClassName="gap-3"
        header={(
          <CockpitMobileHeader
            onAgendaOpen={(origin) => toggleHeaderPanel("agenda", origin)}
            onUrgenciesOpen={(origin) => toggleHeaderPanel("urgencies", origin)}
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
          onClose={closeActiveModule}
          returnFocusRef={returnFocusRef}
          suspended={isComposerOpen}
          onComposerOpen={handleComposerOpen}
          onOpenModule={openSheetModule}
        />
      ) : null}

      {isQuickActionsOpen ? (
        <CockpitQuickActionsSheet
          open
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
      ) : null}

      {isNewOpportunityOpen ? (
        <NewOpportunityDrawer open onOpenChange={setNewOpportunityOpen} />
      ) : null}
      {isNewContactOpen ? (
        <NewContactDrawer
          open
          onOpenChange={setNewContactOpen}
          onCreated={() => {
            setNewContactOpen(false)
            router.refresh()
          }}
        />
      ) : null}
      {isNewEventOpen ? (
        <AgendaMobileEventDrawer
          open
          onOpenChange={setNewEventOpen}
          event={null}
          onSaved={() => {
            setNewEventOpen(false)
            router.refresh()
          }}
        />
      ) : null}
    </>
  )
}
