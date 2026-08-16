"use client"

import { useState } from "react"
import { AppDialog } from "@/components/ui/AppDialog"
import { Button } from "@/components/ui/Button"
import { ManualSourceForm } from "./ManualSourceForm"
import { SourceBaseList } from "./SourceBaseList"
import { SourceCorpusCard } from "./SourceCorpusCard"
import { SourceCorpusImportWizard } from "./SourceCorpusImportWizard"
import type { SourceCatalogEntry, SourceManagementSnapshot } from "../domain/source-management-contracts"

type PanelView = { kind: "list" } | { kind: "create" } | { kind: "edit"; source: SourceCatalogEntry } | { kind: "import" }

export interface SourceManagementDialogDesktopProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  snapshot: SourceManagementSnapshot
}

export function SourceManagementDialogDesktop({ open, onOpenChange, snapshot }: SourceManagementDialogDesktopProps) {
  const [view, setView] = useState<PanelView>({ kind: "list" })

  const handleOpenChange = (next: boolean) => {
    if (next) setView({ kind: "list" })
    onOpenChange(next)
  }

  const catalogSources = [...snapshot.systemSources, ...snapshot.manualSources]

  return (
    <AppDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={<span className="text-sm font-black text-edito-navy">Gérer les sources</span>}
      description="Socle éditorial, sources manuelles et corpus sectoriels consommés par la veille KREDO."
      className="border border-edito-border bg-edito-canvas transition-all duration-300 sm:!h-[min(74vh,660px)] sm:!w-[88vw] sm:!max-w-[1020px] rounded-xl flex flex-col overflow-hidden shadow-xl"
      dataTheme="edito"
      fillHeight
      headerClassName="-mx-4 -mt-4 shrink-0 border-b border-edito-border bg-white px-4 text-edito-navy sm:-mx-6 sm:-mt-6 sm:px-6 rounded-t-xl py-2.5"
      closeButtonClassName="size-10 rounded-md text-edito-muted hover:bg-edito-chip hover:text-edito-navy"
      bodyClassName="-mx-4 -mb-4 -mt-4 min-h-0 flex-1 overflow-y-auto bg-edito-canvas p-4 sm:-mx-6 sm:-mb-6 sm:-mt-4 sm:p-6"
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
        <SourceCorpusImportWizard variant="desktop" onClose={() => setView({ kind: "list" })} />
      ) : (
        <div className="space-y-6">
          <section className="rounded-xl border border-edito-border bg-white p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edito-chip pb-4">
              <div>
                <h3 className="font-heading text-sm font-bold text-edito-navy flex items-center gap-2">
                  <span className="size-2 rounded-full bg-edito-brass" aria-hidden="true" />
                  Sources actualités IT
                </h3>
                <p className="mt-0.5 text-[11px] font-medium text-edito-muted">
                  {snapshot.activeNewsSourceCount} source(s) active(s) dans le socle d&apos;actualités
                </p>
              </div>
              {snapshot.canManage ? (
                <Button variant="secondary" size="sm" onClick={() => setView({ kind: "create" })}>
                  + Ajouter une source
                </Button>
              ) : null}
            </div>
            <div className="mt-4">
              <SourceBaseList
                sources={catalogSources}
                variant="table"
                onEdit={(source) => setView({ kind: "edit", source })}
              />
            </div>
          </section>

          <section className="rounded-xl border border-edito-border bg-white p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edito-chip pb-4">
              <div>
                <h3 className="font-heading text-sm font-bold text-edito-navy flex items-center gap-2">
                  <span className="size-2 rounded-full bg-edito-navy" aria-hidden="true" />
                  Sources veille sectorielle
                </h3>
                <p className="mt-0.5 text-[11px] font-medium text-edito-muted">
                  Corpus versionnés issus du processus MASTER-STUDY / E3
                </p>
              </div>
              {snapshot.canManage ? (
                <Button variant="brass" size="sm" onClick={() => setView({ kind: "import" })}>
                  Importer un corpus
                </Button>
              ) : null}
            </div>
            <div className="mt-4">
              {snapshot.sectorCorpora.length === 0 ? (
                <p className="rounded-lg border border-dashed border-edito-border bg-edito-canvas p-5 text-center text-xs text-edito-muted">
                  Aucun corpus sectoriel importé pour l’instant. Utilisez « Importer un corpus » pour charger un
                  registre de sources produit par MASTER-STUDY / E3 — cette section affichera alors les corpus par
                  segment, leur qualité documentaire et leur activation.
                </p>
              ) : (
                <div className="space-y-2">
                  {snapshot.sectorCorpora.map((corpus) => (
                    <SourceCorpusCard key={corpus.id} corpus={corpus} variant="table" />
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </AppDialog>
  )
}
