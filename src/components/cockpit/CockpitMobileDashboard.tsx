"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"

import { MobileActionPage } from "@/components/templates/MobileActionPage"
import { NewOpportunityDrawer } from "@/components/missions/NewOpportunityDrawer"
import { AgendaMobileEventDrawer } from "@/components/agenda/AgendaMobileEventDrawer"
import { FinancialModelingMobileFlow } from "@/features/financial-modeling"
import { NewContactDrawer } from "@/components/accounts-contacts/NewContactDrawer"

import { buildCockpitMobileAgendaViewModel } from "./mobile/cockpit-mobile-view-model"
import { CockpitMobileHeader } from "./mobile/CockpitMobileHeader"
import { CockpitAgendaStrip } from "./mobile/CockpitAgendaStrip"
import { CockpitAgendaDetails } from "./mobile/CockpitAgendaDetails"
import { CockpitQuickActionsSheet } from "./mobile/CockpitQuickActionsSheet"

import type { AgendaEvent } from "@/lib/agenda/agenda-types"
import { DiagnosticMobileSection } from "@/components/intelligence/diagnostic/DiagnosticMobileSection"
import type { WorkspaceDiagnosticSnapshot } from "@/lib/intelligence/diagnostic/workspace-diagnostic-types"

import "./mobile/cockpit-mobile.css"

interface CockpitMobileDashboardProps {
  calendarEvents: AgendaEvent[]
  diagnostic: WorkspaceDiagnosticSnapshot | null
}

export function CockpitMobileDashboard({
  calendarEvents,
  diagnostic,
}: CockpitMobileDashboardProps) {
  const router = useRouter()

  // 1. Build View Model
  const vm = useMemo(
    () => buildCockpitMobileAgendaViewModel(calendarEvents),
    [calendarEvents]
  )

  // 2. States
  const [selectedDayKey, setSelectedDayKey] = useState(vm.agenda.selectedDayKey)
  const [isAgendaOpen, setAgendaOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Modals / Drawers States
  const [isQuickActionsOpen, setQuickActionsOpen] = useState(false)
  const [isNewOpportunityOpen, setNewOpportunityOpen] = useState(false)
  const [isNewContactOpen, setNewContactOpen] = useState(false)
  const [isNewEventOpen, setNewEventOpen] = useState(false)
  const [isFinancialSimulationOpen, setIsFinancialSimulationOpen] = useState(false)

  // Clear toast after timeout
  useEffect(() => {
    if (!toastMessage) return
    const timer = setTimeout(() => setToastMessage(null), 2200)
    return () => clearTimeout(timer)
  }, [toastMessage])

  // Retrieve details of currently selected agenda day
  const selectedDay = useMemo(
    () => vm.agenda.days.find((d) => d.key === selectedDayKey) || vm.agenda.days[0],
    [vm.agenda.days, selectedDayKey]
  )

  // Handle Day Tap
  const handleDaySelect = (dayKey: string) => {
    if (dayKey === selectedDayKey) {
      setAgendaOpen((prev) => !prev)
    } else {
      setSelectedDayKey(dayKey)
      setAgendaOpen(true)
    }
  }

  // Handle Toast Trigger
  const triggerToast = (msg: string) => {
    setToastMessage(msg)
  }

  // Handle general agenda item clicks
  const handleAgendaItemClick = (route: string, title: string) => {
    triggerToast(`Navigation vers ${title}`)
    router.push(route)
  }

  // Action Select Handlers
  const handleQuickActionSelect = (actionLabel: string) => {
    if (actionLabel === "Créer un besoin" || actionLabel === "Créer ou mettre à jour un besoin") {
      setNewOpportunityOpen(true)
    } else if (actionLabel === "Créer un contact") {
      setNewContactOpen(true)
    } else if (actionLabel === "Créer un événement") {
      setNewEventOpen(true)
    } else {
      triggerToast(`Commande: ${actionLabel}`)
    }
  }

  return (
    <>
      <MobileActionPage
        header={
          <CockpitMobileHeader
            onQuickActionsOpen={() => setQuickActionsOpen(true)}
            onFinancialSimulationOpen={() => setIsFinancialSimulationOpen(true)}
          />
        }
      >
        <div className="screen-scroll-container">
          {/* Section 1: Agenda */}
          <div className="-mx-4 mb-3">
            <CockpitAgendaStrip
              days={vm.agenda.days}
              selectedDayKey={selectedDayKey}
              onDaySelect={handleDaySelect}
              isExpanded={isAgendaOpen}
            />
          </div>

          <DiagnosticMobileSection initialSnapshot={diagnostic} />

          <CockpitAgendaDetails
            day={selectedDay}
            isOpen={isAgendaOpen}
            onItemClick={handleAgendaItemClick}
          />
        </div>
      </MobileActionPage>

      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className="toast-banner animate-fade-in" role="status">
          {toastMessage}
        </div>
      )}

      {/* Sheets / Drawers */}
      <CockpitQuickActionsSheet
        open={isQuickActionsOpen}
        onOpenChange={setQuickActionsOpen}
        onActionSelect={handleQuickActionSelect}
      />

      {/* Create New Opportunity Drawer */}
      <NewOpportunityDrawer
        open={isNewOpportunityOpen}
        onOpenChange={setNewOpportunityOpen}
      />

      {/* Create New Contact Drawer */}
      <NewContactDrawer
        open={isNewContactOpen}
        onOpenChange={setNewContactOpen}
        onCreated={() => {
          triggerToast("Contact créé avec succès")
          router.refresh()
        }}
      />

      {/* Create New Agenda Event Drawer */}
      <AgendaMobileEventDrawer
        open={isNewEventOpen}
        onOpenChange={setNewEventOpen}
        event={null}
        onSaved={() => {
          setNewEventOpen(false)
          router.refresh()
        }}
      />

      {/* Financial simulation modal */}
      <FinancialModelingMobileFlow
        open={isFinancialSimulationOpen}
        onOpenChange={setIsFinancialSimulationOpen}
      />
    </>
  )
}
