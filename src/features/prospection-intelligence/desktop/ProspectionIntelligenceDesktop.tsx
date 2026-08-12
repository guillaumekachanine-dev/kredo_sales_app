"use client"

import { useState, useEffect } from "react"
import { useSidebarCollapse } from "@/hooks/use-sidebar-collapse"
import { ProspectionIntelligenceHeader } from "./ProspectionIntelligenceHeader"
import { ProspectionIntelligenceLocalNavigation, PiTabKey } from "./ProspectionIntelligenceLocalNavigation"

export function ProspectionIntelligenceDesktop() {
  const [activeTab, setActiveTab] = useState<PiTabKey>("strategy")

  // Repli automatique de la sidebar principale
  useEffect(() => {
    useSidebarCollapse.getState().requestCollapse()
    return () => useSidebarCollapse.getState().requestRestore()
  }, [])

  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-canvas">
      <ProspectionIntelligenceLocalNavigation active={activeTab} onChange={setActiveTab} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <ProspectionIntelligenceHeader />

        <div className="flex-1 overflow-y-auto">
          <main className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 lg:px-8 lg:py-8">
            
            {activeTab === "strategy" && (
              <div className="max-w-4xl space-y-6">
                <div className="rounded-xl border border-border/40 bg-surface/30 p-6">
                  <h3 className="text-lg font-bold text-heading">Brief</h3>
                  <p className="mt-2 text-sm text-muted">Cette page est actuellement vide. Elle accueillera prochainement le contenu du brief de prospection.</p>
                </div>
              </div>
            )}

            {activeTab === "chapter_1" && (
              <div className="max-w-4xl space-y-6">
                <div className="rounded-xl border border-border/40 bg-surface/30 p-6">
                  <h3 className="text-lg font-bold text-heading">Fenêtres d&apos;opportunités</h3>
                  <p className="mt-2 text-sm text-muted">Cette page est actuellement vide. Elle accueillera prochainement les fenêtres d&apos;opportunités.</p>
                </div>
              </div>
            )}

            {activeTab === "chapter_2" && (
              <div className="max-w-4xl space-y-6">
                <div className="rounded-xl border border-border/40 bg-surface/30 p-6">
                  <h3 className="text-lg font-bold text-heading">Approches commerciales</h3>
                  <p className="mt-2 text-sm text-muted">Cette page est actuellement vide. Elle accueillera prochainement les approches commerciales.</p>
                </div>
              </div>
            )}

            {activeTab === "chapter_3" && (
              <div className="max-w-4xl space-y-6">
                <div className="rounded-xl border border-border/40 bg-surface/30 p-6">
                  <h3 className="text-lg font-bold text-heading">Playbooks</h3>
                  <p className="mt-2 text-sm text-muted">Cette page est actuellement vide. Elle accueillera prochainement les playbooks commerciaux.</p>
                </div>
              </div>
            )}

          </main>
        </div>
      </div>
    </div>
  )
}
