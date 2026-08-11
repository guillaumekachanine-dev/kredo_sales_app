"use client"

import { cn } from "@/lib/utils"
import { DomainItem } from "./knowledge-hub.types"
import { domains } from "./knowledge-hub-shell-data"
import { KnowledgeView } from "./KnowledgeHubDesktop"

interface KnowledgeHubLocalNavigationProps {
  activeView: KnowledgeView
  onChangeView: (view: KnowledgeView) => void
  onOpenModal?: (modal: "workshop" | "ask") => void
  activeModal?: "workshop" | "ask" | null
}

export function KnowledgeHubLocalNavigation({
  activeView,
  onChangeView,
  onOpenModal,
  activeModal,
}: KnowledgeHubLocalNavigationProps) {
  // Déterminer la catégorie (domaine) active si elle existe
  const activeDomain = activeView.type === "domain" ? domains.find(d => d.id === activeView.domainId) : null

  // Déterminer les onglets contextuels de la catégorie
  let tabs: { id: string; label: string }[] = []
  if (activeDomain) {
    if (activeDomain.id === "expertise-kredo") {
      tabs = [
        { id: "practices", label: "Practices" },
        { id: "jobs", label: "Métiers" },
        { id: "skills", label: "Compétences" },
        { id: "techs", label: "Technologies" },
      ]
    } else if (activeDomain.id === "talents") {
      tabs = [
        { id: "team", label: "Équipe" },
        { id: "alumni", label: "Alumni" },
        { id: "candidates", label: "Vivier candidats" },
        { id: "skills", label: "Cartographie" },
      ]
    } else {
      // Pour les autres catégories, on reprend les subItems existants
      tabs = activeDomain.subItems.map((item, index) => ({
        id: `section-${index}`,
        label: item,
      }))
    }
  }

  // L'onglet actif au sein d'une catégorie
  const activeTabId = activeView.type === "domain" ? activeView.sectionId : null

  return (
    <nav
      aria-label="Navigation Knowledge Hub"
      className="flex h-full w-[11.5rem] shrink-0 flex-col border-r border-edito-border bg-edito-canvas px-3 py-5"
    >
      {/* Bouton de retour principal */}
      <button
        type="button"
        onClick={() => onChangeView({ type: "categories" })}
        className={cn(
          "inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-edito-navy px-3 text-center text-xs font-bold transition-all shadow-sm",
          "bg-edito-navy text-white hover:bg-edito-navy/90",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/30"
        )}
      >
        <span>←</span>
        <span>Catégories</span>
      </button>

      {/* Navigation contextuelle de la catégorie active */}
      <div className="mt-5 border-t border-edito-border pt-4">
        {activeDomain ? (
          <>
            <p className="px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-edito-muted truncate">
              {activeDomain.title}
            </p>
            <div className="mt-2 space-y-1">
              {tabs.map((tab) => {
                const isActive = tab.id === activeTabId
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onChangeView({ type: "domain", domainId: activeDomain.id, sectionId: tab.id })}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex min-h-10 w-full items-center gap-2.5 rounded-r-md border-l-2 px-3 text-left text-xs font-semibold transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/30",
                      isActive
                        ? "border-l-edito-brass bg-edito-surface text-edito-navy"
                        : "border-l-transparent text-edito-muted hover:bg-edito-surface/70 hover:text-edito-body"
                    )}
                  >
                    <span className="truncate">{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <div className="flex min-h-10 w-full items-center px-3 text-xs font-bold text-edito-muted">
            Knowledge Hub
          </div>
        )}
      </div>

      {/* Section Modules en bas */}
      <div className="mt-auto border-t border-edito-border pt-4">
        <p className="px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-edito-muted">
          Modules
        </p>
        <div className="mt-2 space-y-1">
          <button
            type="button"
            onClick={() => onOpenModal && onOpenModal("workshop")}
            className={cn(
              "flex min-h-10 w-full items-center gap-2.5 rounded-r-md border-l-2 px-3 text-left text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/30",
              activeModal === "workshop"
                ? "border-l-edito-brass bg-edito-surface text-edito-navy"
                : "border-l-transparent text-edito-muted hover:bg-edito-surface/70 hover:text-edito-body"
            )}
          >
            <span>Atelier</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenModal && onOpenModal("ask")}
            className={cn(
              "flex min-h-10 w-full items-center gap-2.5 rounded-r-md border-l-2 px-3 text-left text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/30",
              activeModal === "ask"
                ? "border-l-edito-brass bg-edito-surface text-edito-navy"
                : "border-l-transparent text-edito-muted hover:bg-edito-surface/70 hover:text-edito-body"
            )}
          >
            <span>Interroger</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
