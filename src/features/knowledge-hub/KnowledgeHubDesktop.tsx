"use client"

import { useState, useEffect } from "react"
import { KnowledgeLibraryModeDesktop } from "./KnowledgeLibraryMode"
import { KredoExpertiseSnapshot } from "./expertise/kredo-expertise.types"
import { KredoExpertiseDesktop } from "./expertise/KredoExpertiseDesktop"
import { TalentKnowledgeDesktop } from "./talents/TalentKnowledgeDesktop"
import { TalentKnowledgeSnapshot } from "./talents/talent-knowledge.types"
import { KnowledgeHubLocalNavigation } from "./KnowledgeHubLocalNavigation"
import { useSidebarCollapse } from "@/hooks/use-sidebar-collapse"
import { ExpertiseTab } from "./expertise/KredoExpertiseNavigation"
import { TalentTab } from "./talents/talent-knowledge.types"
import { AppDialog } from "@/components/ui/AppDialog"
import { KnowledgeWorkshopsModeDesktop } from "./KnowledgeWorkshopsMode"
import { KnowledgeAskMode } from "./KnowledgeAskMode"
import { WorkshopItem } from "./knowledge-hub.types"

export type KnowledgeView =
  | { type: "categories" }
  | { type: "domain"; domainId: string; sectionId?: string }

interface KnowledgeHubDesktopProps {
  snapshot: KredoExpertiseSnapshot
  talentSnapshot: TalentKnowledgeSnapshot
}

export function KnowledgeHubDesktop({ snapshot, talentSnapshot }: KnowledgeHubDesktopProps) {
  const [activeView, setActiveView] = useState<KnowledgeView>({ type: "categories" })
  const [activeModal, setActiveModal] = useState<"workshop" | "ask" | null>(null)
  const [selectedWorkshop, setSelectedWorkshop] = useState<WorkshopItem | null>(null)

  const { requestCollapse, requestRestore } = useSidebarCollapse()

  useEffect(() => {
    requestCollapse()
    return () => requestRestore()
  }, [requestCollapse, requestRestore])

  const handleSelectDomain = (domainId: string) => {
    if (domainId === "expertise-kredo") {
      setActiveView({ type: "domain", domainId, sectionId: "practices" })
    } else if (domainId === "talents") {
      setActiveView({ type: "domain", domainId, sectionId: "team" })
    } else {
      setActiveView({ type: "domain", domainId })
    }
  }

  const handleOpenModal = (modal: "workshop" | "ask") => {
    setActiveModal(modal)
    if (modal === "workshop") {
      setSelectedWorkshop(null)
    }
  }

  return (
    <div className="flex h-full min-h-screen bg-edito-canvas text-edito-body font-sans">
      {/* Menu secondaire contextuel */}
      <KnowledgeHubLocalNavigation 
        activeView={activeView} 
        onChangeView={setActiveView} 
        onOpenModal={handleOpenModal}
        activeModal={activeModal}
      />

      {/* Main Page Layout */}
      <main className="flex-1 min-w-0 mx-auto max-w-5xl px-4 py-6">
        <div className="space-y-6">
          {activeView.type === "categories" && (
            <KnowledgeLibraryModeDesktop
              selectedDomain={null}
              onSelectDomain={(d) => d && handleSelectDomain(d.id)}
            />
          )}

          {activeView.type === "domain" && activeView.domainId === "expertise-kredo" && (
            <KredoExpertiseDesktop
              snapshot={snapshot}
              activeSection={activeView.sectionId as ExpertiseTab | undefined}
            />
          )}

          {activeView.type === "domain" && activeView.domainId === "talents" && (
            <TalentKnowledgeDesktop
              snapshot={talentSnapshot}
              activeSection={activeView.sectionId as TalentTab | undefined}
            />
          )}

          {activeView.type === "domain" && activeView.domainId !== "expertise-kredo" && activeView.domainId !== "talents" && (
             <div className="rounded-lg border border-edito-border bg-edito-surface px-4 py-10 text-center text-xs text-edito-muted">
               Contenu de la catégorie {activeView.domainId} à venir.
             </div>
          )}
        </div>
      </main>

      {/* Modal Atelier */}
      <AppDialog
        open={activeModal === "workshop"}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title="Atelier Métiers"
        className="w-full max-w-5xl"
        bodyClassName="bg-edito-canvas p-6"
        headerClassName="px-6 py-4 border-b border-edito-border"
      >
        <KnowledgeWorkshopsModeDesktop
          selectedWorkshop={selectedWorkshop}
          onSelectWorkshop={setSelectedWorkshop}
        />
      </AppDialog>

      {/* Modal Interroger */}
      <AppDialog
        open={activeModal === "ask"}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title="Interroger le Corpus"
        className="w-full max-w-5xl"
        bodyClassName="bg-edito-canvas p-6"
        headerClassName="px-6 py-4 border-b border-edito-border"
      >
        <KnowledgeAskMode />
      </AppDialog>
    </div>
  )
}
