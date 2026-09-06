"use client"

import { useState } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { Button } from "@/components/ui/Button"
import { ManualSourceForm } from "./ManualSourceForm"
import { SourceBaseList } from "./SourceBaseList"
import { SourceCorpusCard } from "./SourceCorpusCard"
import { SourceCorpusImportWizard } from "./SourceCorpusImportWizard"
import type { SourceCatalogEntry, SourceManagementSnapshot } from "../domain/source-management-contracts"

type PanelView = { kind: "list" } | { kind: "create" } | { kind: "edit"; source: SourceCatalogEntry } | { kind: "import" }

export interface SourceManagementDrawerMobileProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  snapshot: SourceManagementSnapshot
}

export function SourceManagementDrawerMobile({ open, onOpenChange, snapshot }: SourceManagementDrawerMobileProps) {
  const [view, setView] = useState<PanelView>({ kind: "list" })

  const handleOpenChange = (next: boolean) => {
    if (next) setView({ kind: "list" })
    onOpenChange(next)
  }

  const catalogSources = [...snapshot.systemSources, ...snapshot.manualSources]
  const title =
    view.kind === "create" ? "Ajouter une source" :
    view.kind === "edit" ? "Modifier la source" :
    view.kind === "import" ? "Importer un corpus" :
    "Gérer les sources"

  return (
    <AppDrawer
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      description={view.kind === "list" ? "Socle éditorial, corpus thématiques et corpus sectoriels." : undefined}
      side="right"
      width="wide"
      showMobileCloseButton
      headerClassName="border-b border-edito-brass/70 bg-edito-navy pb-2.5 pt-[max(0.75rem,env(safe-area-inset-top))] text-white"
      contentClassName="bg-edito-canvas p-4"
      onRequestClose={() => {
        if (view.kind !== "list") {
          setView({ kind: "list" })
          return false
        }
        return true
      }}
    >
      {view.kind === "create" ? (
        <ManualSourceForm mode="create" onCancel={() => setView({ kind: "list" })} onSuccess={() => setView({ kind: "list" })} />
      ) : view.kind === "edit" ? (
        <ManualSourceForm
          mode="edit"
          initial={view.source}
          onCancel={() => setView({ kind: "list" })}
          onSuccess={() => setView({ kind: "list" })}
        />
      ) : view.kind === "import" ? (
        <SourceCorpusImportWizard variant="mobile" onClose={() => setView({ kind: "list" })} />
      ) : (
        <div className="space-y-6">
          <section className="rounded-xl border border-edito-border bg-white p-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edito-chip pb-3">
              <div>
                <h3 className="font-heading text-sm font-bold text-edito-navy flex items-center gap-2">
                  <span className="size-2 rounded-full bg-edito-brass" aria-hidden="true" />
                  Sources actualités IT
                </h3>
                <p className="mt-0.5 text-[11px] font-medium text-edito-muted">{snapshot.activeNewsSourceCount} source(s) active(s)</p>
              </div>
              {snapshot.canManage ? (
                <Button variant="secondary" size="sm" onClick={() => setView({ kind: "create" })}>
                  + Ajouter
                </Button>
              ) : null}
            </div>
            <div className="mt-3">
              <SourceBaseList
                sources={catalogSources}
                variant="cards"
                onEdit={(source) => setView({ kind: "edit", source })}
              />
            </div>
          </section>

          <section className="rounded-xl border border-edito-border bg-white p-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edito-chip pb-3">
              <h3 className="font-heading text-sm font-bold text-edito-navy flex items-center gap-2">
                <span className="size-2 rounded-full bg-edito-brass" aria-hidden="true" />
                Corpus thématiques
              </h3>
              {snapshot.canManage ? (
                <Button variant="brass" size="sm" onClick={() => setView({ kind: "import" })}>
                  Importer
                </Button>
              ) : null}
            </div>
            <div className="mt-3">
              {snapshot.thematicCorpora.length === 0 ? (
                <p className="rounded-lg border border-dashed border-edito-border bg-edito-canvas p-4 text-center text-xs text-edito-muted">
                  Aucun corpus thématique importé pour l’instant.
                </p>
              ) : (
                <div className="space-y-2">
                  {snapshot.thematicCorpora.map((corpus) => (
                    <SourceCorpusCard key={corpus.id} corpus={corpus} variant="cards" />
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-edito-border bg-white p-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edito-chip pb-3">
              <h3 className="font-heading text-sm font-bold text-edito-navy flex items-center gap-2">
                <span className="size-2 rounded-full bg-edito-navy" aria-hidden="true" />
                Sources veille sectorielle
              </h3>
              {snapshot.canManage ? (
                <Button variant="brass" size="sm" onClick={() => setView({ kind: "import" })}>
                  Importer
                </Button>
              ) : null}
            </div>
            <div className="mt-3">
              {snapshot.sectorCorpora.length === 0 ? (
                <p className="rounded-lg border border-dashed border-edito-border bg-edito-canvas p-4 text-center text-xs text-edito-muted">
                  Aucun corpus sectoriel importé pour l’instant. Utilisez « Importer » pour charger un registre E3.
                </p>
              ) : (
                <div className="space-y-2">
                  {snapshot.sectorCorpora.map((corpus) => (
                    <SourceCorpusCard key={corpus.id} corpus={corpus} variant="cards" />
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </AppDrawer>
  )
}
