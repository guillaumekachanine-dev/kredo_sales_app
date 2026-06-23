"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"

import { MobileActionPage } from "@/components/templates/MobileActionPage"
import { CompanyIdentityDrawer } from "@/components/accounts-contacts/CompanyIdentityDrawer"
import { ContactIdentityDrawer } from "@/components/accounts-contacts/ContactIdentityDrawer"
import { NewOpportunityDrawer } from "@/components/missions/NewOpportunityDrawer"

import { buildCockpitMobileViewModel } from "./mobile/cockpit-mobile-view-model"
import { CockpitMobileHeader } from "./mobile/CockpitMobileHeader"
import { CockpitAgendaStrip } from "./mobile/CockpitAgendaStrip"
import { CockpitAgendaDetails } from "./mobile/CockpitAgendaDetails"
import { CockpitStaffingCard } from "./mobile/CockpitStaffingCard"
import { CockpitMeetingCard } from "./mobile/CockpitMeetingCard"
import { CockpitProspectionCard } from "./mobile/CockpitProspectionCard"
import { CockpitQuickActionsSheet } from "./mobile/CockpitQuickActionsSheet"
import { CockpitContextSheet, ContextSheetKind } from "./mobile/CockpitContextSheet"

import type { CockpitDashboardData } from "@/lib/cockpit/cockpit-data"
import type { StaffingDashboardData } from "@/lib/staffing/staffing-data"
import type { SyntheseData } from "@/lib/prospection/synthese-data"

import "./mobile/cockpit-mobile.css"

interface CockpitMobileDashboardProps {
  data: CockpitDashboardData
  staffingData: StaffingDashboardData
  syntheseData: SyntheseData
}

export function CockpitMobileDashboard({
  data,
  staffingData,
  syntheseData,
}: CockpitMobileDashboardProps) {
  const router = useRouter()

  // 1. Build View Model
  const vm = useMemo(
    () => buildCockpitMobileViewModel(data, staffingData, syntheseData),
    [data, staffingData, syntheseData]
  )

  // 2. States
  const [selectedDayKey, setSelectedDayKey] = useState(vm.agenda.selectedDayKey)
  const [isAgendaOpen, setAgendaOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Modals / Drawers States
  const [isQuickActionsOpen, setQuickActionsOpen] = useState(false)
  const [isNewOpportunityOpen, setNewOpportunityOpen] = useState(false)
  
  // Contextual sheets
  const [contextSheet, setContextSheet] = useState<{
    kind: ContextSheetKind | null
    label: string
  }>({ kind: null, label: "" })

  // Native drawers
  const [activeDrawer, setActiveDrawer] = useState<{
    kind: "company" | "contact"
    id: string | null
    label: string
  } | null>(null)

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

  // Handle Staffing Primary Action click
  const handleStaffingPrimaryClick = (actionLabel: string, needId: string) => {
    if (actionLabel === "Envoyer au client" || actionLabel === "Relancer le suivi" || actionLabel === "Accélérer la qualification") {
      triggerToast(`Redirection vers l'opportunité`)
      router.push(`/missions/opps/${needId}/edit`)
    } else if (actionLabel === "Positionner des profils") {
      triggerToast(`Recherche de profils pour le besoin`)
      router.push(`/missions/opps/${needId}/edit`)
    } else {
      triggerToast(`Action: ${actionLabel}`)
    }
  }

  // Action Select Handlers
  const handleQuickActionSelect = (actionLabel: string) => {
    if (actionLabel === "Créer ou mettre à jour un besoin") {
      setNewOpportunityOpen(true)
    } else if (actionLabel === "Créer ou mettre à jour un contact") {
      triggerToast("Redirection vers la création de contact")
      router.push("/prospection/accounts")
    } else if (actionLabel === "Enregistrer une note vocale") {
      triggerToast("Note vocale : À RÉSOUDRE (seam d'enregistrement vocale)")
    } else if (actionLabel === "Accéder au simulateur financier") {
      triggerToast("Simulateur financier : À RÉSOUDRE (seam simulateur)")
    } else {
      triggerToast(`Commande: ${actionLabel}`)
    }
  }

  const handleContextActionSelect = (actionLabel: string) => {
    const cleanLabel = actionLabel.toLowerCase().trim()

    // 1. Staffing context
    if (contextSheet.kind === "staffing") {
      const need = vm.staffing.items.find((item) => `${item.title} · ${item.client}` === contextSheet.label)
      
      if (cleanLabel.includes("étape")) {
        if (need) {
          router.push(`/missions/opps/${need.id}/edit`)
        } else {
          router.push("/missions/opps")
        }
      } else if (cleanLabel.includes("cv")) {
        triggerToast("Consultation CV: À RÉSOUDRE (seam CV)")
      } else if (cleanLabel.includes("tâche")) {
        triggerToast("Création tâche: À RÉSOUDRE (seam tâches)")
      } else if (cleanLabel.includes("contacter le client")) {
        if (need && need.companyId) {
          setActiveDrawer({ kind: "company", id: need.companyId, label: need.client })
        } else {
          triggerToast("Redirection vers comptes de prospection")
          router.push("/prospection/accounts")
        }
      } else if (cleanLabel.includes("financière")) {
        triggerToast("Simulation financière: À RÉSOUDRE (seam finance)")
      }
    }

    // 2. Meeting context
    if (contextSheet.kind === "meeting") {
      const meeting = vm.meetings.items.find((item) => {
        const fullLabel = `${item.client} · ${item.dateLabel} · ${item.timeLabel}`
        return fullLabel === contextSheet.label
      })

      if (cleanLabel.includes("pitch")) {
        if (meeting && meeting.companyId) {
          router.push(`/prospection/accounts/${meeting.companyId}`)
        } else {
          triggerToast("Élaborer un pitch: À RÉSOUDRE")
        }
      } else if (cleanLabel.includes("actualité")) {
        if (meeting && meeting.companyId) {
          router.push(`/prospection/accounts/${meeting.companyId}`)
        } else {
          triggerToast("Actualités client non disponibles")
        }
      } else if (cleanLabel.includes("synthèse") || cleanLabel.includes("next steps")) {
        triggerToast("Synthèse d'échanges IA: À RÉSOUDRE")
      } else if (cleanLabel.includes("tâche")) {
        triggerToast("Création tâche: À RÉSOUDRE (seam tâches)")
      }
    }

    // 3. Prospect context
    if (contextSheet.kind === "prospect") {
      const priority = vm.prospection.priorities.find((item) => item.company === contextSheet.label)

      if (cleanLabel.includes("pitch") || cleanLabel.includes("email")) {
        if (priority && priority.companyId) {
          router.push(`/prospection/accounts/${priority.companyId}`)
        } else {
          triggerToast("Pitch IA: À RÉSOUDRE")
        }
      } else if (cleanLabel.includes("appeler")) {
        triggerToast("Appel prospect: À RÉSOUDRE (seam appel direct)")
      } else if (cleanLabel.includes("analyses")) {
        router.push("/prospection")
      } else if (cleanLabel.includes("tâche")) {
        triggerToast("Création tâche: À RÉSOUDRE (seam tâches)")
      }
    }
  }

  // Drawers trigger helpers
  const handleCompanyDrawerOpen = (companyId: string | null, label: string) => {
    if (companyId) {
      setActiveDrawer({ kind: "company", id: companyId, label })
    } else {
      triggerToast("Fiche entreprise: Aucun ID réel associé")
    }
  }

  const handleContactDrawerOpen = (contactId: string | null, label: string) => {
    if (contactId) {
      setActiveDrawer({ kind: "contact", id: contactId, label })
    } else {
      triggerToast("Fiche contact : Aucun ID réel associé (seam contact)")
    }
  }

  return (
    <>
      <MobileActionPage
        header={
          <CockpitMobileHeader
            alertCount={vm.header.alertCount}
            onQuickActionsOpen={() => setQuickActionsOpen(true)}
            onNotificationsOpen={() => triggerToast("Notifications: SEAM temporaire de cloche")}
          />
        }
      >
        <div className="screen-scroll-container">
          {/* Section 1: Agenda */}
          <section className="module-panel">
            <div className="module-head">
              <h2>Agenda</h2>
            </div>
            
            <CockpitAgendaStrip
              days={vm.agenda.days}
              selectedDayKey={selectedDayKey}
              onDaySelect={handleDaySelect}
            />

            <CockpitAgendaDetails
              day={selectedDay}
              isOpen={isAgendaOpen}
              onItemClick={handleAgendaItemClick}
            />
          </section>

          {/* Section 2: Staffings & besoins */}
          <CockpitStaffingCard
            items={vm.staffing.items}
            onPrimaryClick={handleStaffingPrimaryClick}
            onActionClick={(title, client) =>
              setContextSheet({ kind: "staffing", label: `${title} · ${client}` })
            }
          />

          {/* Section 3: Rendez-vous clients */}
          <CockpitMeetingCard
            items={vm.meetings.items}
            onPrepareClick={(client) => triggerToast(`Préparation du rendez-vous: ${client}`)}
            onActionClick={(client, dateLabel, timeLabel) =>
              setContextSheet({ kind: "meeting", label: `${client} · ${dateLabel} · ${timeLabel}` })
            }
            onCompanyClick={handleCompanyDrawerOpen}
            onContactClick={handleContactDrawerOpen}
          />

          {/* Section 4: Prospection */}
          <CockpitProspectionCard
            metrics={vm.prospection.metrics}
            priorities={vm.prospection.priorities}
            onPitchClick={(company, companyId) => {
              if (companyId) {
                router.push(`/prospection/accounts/${companyId}`)
              } else {
                triggerToast(`Génération pitch IA pour ${company}`)
              }
            }}
            onActionClick={(company) =>
              setContextSheet({ kind: "prospect", label: company })
            }
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

      <CockpitContextSheet
        open={contextSheet.kind !== null}
        onOpenChange={(open) => {
          if (!open) setContextSheet({ kind: null, label: "" })
        }}
        kind={contextSheet.kind}
        label={contextSheet.label}
        onActionSelect={handleContextActionSelect}
      />

      <CompanyIdentityDrawer
        companyId={activeDrawer?.kind === "company" ? activeDrawer.id : null}
        open={activeDrawer?.kind === "company"}
        onOpenChange={(open) => {
          if (!open) setActiveDrawer(null)
        }}
        onOpenContactIdentity={(contactId) =>
          setActiveDrawer({ kind: "contact", id: contactId, label: "Fiche contact" })
        }
      />

      <ContactIdentityDrawer
        contactId={activeDrawer?.kind === "contact" ? activeDrawer.id : null}
        open={activeDrawer?.kind === "contact"}
        onOpenChange={(open) => {
          if (!open) setActiveDrawer(null)
        }}
        onOpenCompanyIdentity={(companyId) =>
          setActiveDrawer({ kind: "company", id: companyId, label: "Fiche entreprise" })
        }
        device="mobile"
      />

      {/* Create New Opportunity Drawer */}
      <NewOpportunityDrawer
        open={isNewOpportunityOpen}
        onOpenChange={setNewOpportunityOpen}
      />
    </>
  )
}
