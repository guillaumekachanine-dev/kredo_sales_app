"use client"

import dynamic from "next/dynamic"
import { useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { KnowledgeLibraryModeDesktop } from "./KnowledgeLibraryMode"
import { KredoExpertiseSnapshot } from "./expertise/kredo-expertise.types"
import { KredoExpertiseDesktop } from "./expertise/KredoExpertiseDesktop"
import { TalentKnowledgeDesktop } from "./talents/TalentKnowledgeDesktop"
import { TalentKnowledgeSnapshot } from "./talents/talent-knowledge.types"
import { KnowledgeHubLocalNavigation } from "./KnowledgeHubLocalNavigation"
import {
  buildKnowledgeHubViewHref,
  getKnowledgeHubActiveLabel,
  getKnowledgeHubDefaultSection,
  parseKnowledgeHubView,
} from "./knowledge-hub-desktop-navigation"
import { ExpertiseTab } from "./expertise/KredoExpertiseNavigation"
import { TalentTab } from "./talents/talent-knowledge.types"
import type { KnowledgeView } from "./knowledge-hub.types"

export type { KnowledgeView }

const KnowledgeHubModuleModal = dynamic(
  () => import("./KnowledgeHubModuleModal").then((module) => module.KnowledgeHubModuleModal),
  { ssr: false, loading: () => null },
)

interface KnowledgeHubDesktopProps {
  snapshot: KredoExpertiseSnapshot
  talentSnapshot: TalentKnowledgeSnapshot
}

export function KnowledgeHubDesktop({ snapshot, talentSnapshot }: KnowledgeHubDesktopProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const activeView = parseKnowledgeHubView(
    searchParams.get("domain"),
    searchParams.get("section"),
  )

  const [activeModal, setActiveModal] = useState<"workshop" | "ask" | null>(null)

  // Le repli de la sidebar principale est décidé par le Shell selon le pathname
  // (`shouldAutoCollapseDesktopSidebar` — SHELL 6.5) : ce workspace ne le pilote plus.

  const navigateView = (nextView: KnowledgeView) => {
    router.push(buildKnowledgeHubViewHref(pathname, searchParams, nextView), {
      scroll: false,
    })
  }

  const handleSelectDomain = (domainId: string) => {
    const defaultSection = getKnowledgeHubDefaultSection(domainId)
    navigateView({ type: "domain", domainId, sectionId: defaultSection })
  }

  const handleOpenModal = (modal: "workshop" | "ask") => {
    setActiveModal(modal)
  }

  const activeChapterTitle = getKnowledgeHubActiveLabel(activeView)

  return (
    <div className="flex h-full min-h-screen bg-edito-canvas text-edito-body font-sans">
      {/* Menu secondaire contextuel */}
      <KnowledgeHubLocalNavigation
        activeView={activeView}
        onChangeView={navigateView}
        onOpenModal={handleOpenModal}
        activeModal={activeModal}
      />

      {/* Zone principale avec header de chapitre actif */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex min-h-16 shrink-0 items-center justify-between border-b border-edito-border bg-edito-surface px-6 py-4">
          <h1 className="text-xl font-bold tracking-tight text-edito-navy">
            {activeChapterTitle}
          </h1>
        </header>

        <main className="flex-1 min-w-0 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-5xl space-y-6">
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
      </div>

      {activeModal ? (
        <KnowledgeHubModuleModal
          module={activeModal}
          onClose={() => setActiveModal(null)}
        />
      ) : null}
    </div>
  )
}
