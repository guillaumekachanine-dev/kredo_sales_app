"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import type { CockpitMobileSnapshot } from "@/lib/cockpit/mobile/cockpit-mobile-snapshot-types"
import { CockpitMobileHome } from "./mobile/CockpitMobileHome"
import { COCKPIT_MODULE_IDS, COCKPIT_WEEK_MODULE_IDS, type CockpitModuleId, type CockpitWeekModuleId } from "./mobile/cockpit-mobile-module-types"
import { CockpitQuickActionsSheet } from "./mobile/CockpitQuickActionsSheet"
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
const CockpitWeekModal = dynamic(() => (
  import("./mobile/CockpitWeekModal").then((module) => module.CockpitWeekModal)
))

interface CockpitMobileDashboardProps {
  snapshot: CockpitMobileSnapshot | null
}

export function CockpitMobileDashboard({ snapshot }: CockpitMobileDashboardProps) {
  const router = useRouter()
  const [activeModule, setActiveModule] = useState<CockpitModuleId | null>(null)
  const [activeWeekModule, setActiveWeekModule] = useState<CockpitWeekModuleId | null>(null)
  const [isQuickActionsOpen, setQuickActionsOpen] = useState(false)
  const [isNewOpportunityOpen, setNewOpportunityOpen] = useState(false)
  const [isNewContactOpen, setNewContactOpen] = useState(false)
  const [isNewEventOpen, setNewEventOpen] = useState(false)
  const [isComposerOpen, setComposerOpen] = useState(false)
  const returnFocusRef = useRef<HTMLButtonElement | null>(null)

  const activeSheetModule = activeModule && COCKPIT_MODULE_IDS.includes(activeModule)
    ? activeModule
    : null

  useEffect(() => {
    const onComposerState = (event: Event) => setComposerOpen((event as CustomEvent<CommunicationComposerStateDetail>).detail.open)
    window.addEventListener(COMMUNICATION_COMPOSER_STATE_EVENT, onComposerState)
    return () => window.removeEventListener(COMMUNICATION_COMPOSER_STATE_EVENT, onComposerState)
  }, [])

  const openModule = useCallback((module: CockpitModuleId, origin: HTMLButtonElement) => {
    returnFocusRef.current = origin
    setQuickActionsOpen(false)
    if (COCKPIT_WEEK_MODULE_IDS.includes(module as CockpitWeekModuleId)) {
      setActiveWeekModule(module as CockpitWeekModuleId)
      return
    }
    setActiveModule(module)
  }, [])

  const closeActiveModule = useCallback(() => setActiveModule(null), [])
  const openSheetModule = useCallback((module: CockpitModuleId) => setActiveModule(module), [])
  const closeWeekModule = useCallback(() => setActiveWeekModule(null), [])
  const handleComposerOpen = useCallback(() => setComposerOpen(true), [])

  return (
    <>
      <CockpitMobileHome
        snapshot={snapshot}
        onOpenModule={openModule}
        onQuickActionsOpen={() => {
          setActiveModule(null)
          setActiveWeekModule(null)
          setQuickActionsOpen(true)
        }}
      />

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

      {activeWeekModule ? (
        <CockpitWeekModal
          module={activeWeekModule}
          snapshot={snapshot}
          onClose={closeWeekModule}
          onComposerOpen={handleComposerOpen}
          onOpenPriorities={() => setActiveWeekModule("priorities")}
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
