"use client"

import { cn } from "@/lib/utils"
import { DomainItem } from "./knowledge-hub.types"
import { domains } from "./knowledge-hub-shell-data"
import { KnowledgeView } from "./KnowledgeHubDesktop"
import { KnowledgeHubCategoryIcon } from "./KnowledgeHubCategoryIcon"

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

  const selectDomain = (domain: DomainItem) => {
    const defaultSection = domain.id === "expertise-kredo"
      ? "practices"
      : domain.id === "talents"
        ? "team"
        : undefined

    onChangeView({ type: "domain", domainId: domain.id, sectionId: defaultSection })
  }

  return (
    <nav
      aria-label="Navigation Knowledge Hub"
      className="flex h-full w-[12.5rem] shrink-0 flex-col border-r border-edito-border bg-edito-canvas px-3 py-5"
    >
      {/* Bouton de retour principal */}
      <button
        type="button"
        onClick={() => onChangeView({ type: "categories" })}
        className={cn(
          "inline-flex min-h-10 w-full items-center justify-center rounded-md border border-edito-navy px-3 text-center text-xs font-bold transition-all shadow-sm",
          "bg-edito-navy text-white hover:bg-edito-navy/90",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/30"
        )}
      >
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
          <>
            <p className="px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-edito-muted">
              Catégories
            </p>
            <div className="mt-2 space-y-1">
              {domains.map((domain) => (
                <button
                  key={domain.id}
                  type="button"
                  onClick={() => selectDomain(domain)}
                  className="group flex min-h-10 w-full items-center gap-2 rounded-r-md border-l-2 border-l-transparent px-2 text-left text-[11px] font-semibold leading-tight text-edito-muted transition-colors hover:border-l-edito-brass hover:bg-edito-surface/70 hover:text-edito-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/30"
                >
                  <KnowledgeHubCategoryIcon domainId={domain.id} className="size-6 rounded [&_svg]:size-3.5" />
                  <span>{domain.title}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Lanceurs de modules — volontairement proches de la navigation principale. */}
      <div className="mt-7 border-t border-edito-border pt-4">
        <p className="px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-edito-muted">
          Modules
        </p>
        <div className="mt-2 space-y-1">
          <button
            type="button"
            onClick={() => onOpenModal && onOpenModal("workshop")}
            className={cn(
              "flex min-h-11 w-full items-center rounded-lg border px-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/30",
              activeModal === "workshop"
                ? "border-edito-brass bg-edito-surface text-edito-navy"
                : "border-edito-border bg-edito-surface/70 text-edito-body hover:border-edito-brass/60 hover:bg-edito-surface"
            )}
          >
            <span className="text-xs font-bold text-edito-navy">Ateliers</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenModal && onOpenModal("ask")}
            className={cn(
              "flex min-h-11 w-full items-center rounded-lg border px-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/30",
              activeModal === "ask"
                ? "border-edito-petrol bg-edito-surface text-edito-navy"
                : "border-edito-border bg-edito-surface/70 text-edito-body hover:border-edito-petrol/60 hover:bg-edito-surface"
            )}
          >
            <span className="text-xs font-bold text-edito-navy">Interroger</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
