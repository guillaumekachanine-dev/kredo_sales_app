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
      title="Gérer les sources"
      description="Socle éditorial, sources manuelles et corpus sectoriels consommés par la veille KREDO."
      className="sm:max-w-[54rem]"
      bodyClassName="pr-1"
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
        <div className="space-y-8">
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-heading text-sm font-bold text-heading">Sources actualités IT</h3>
                <p className="text-[11px] text-muted">{snapshot.activeNewsSourceCount} source(s) active(s)</p>
              </div>
              {snapshot.canManage ? (
                <Button variant="secondary" size="sm" onClick={() => setView({ kind: "create" })}>
                  + Ajouter une source
                </Button>
              ) : null}
            </div>
            <SourceBaseList
              sources={catalogSources}
              variant="table"
              onEdit={(source) => setView({ kind: "edit", source })}
            />
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-heading text-sm font-bold text-heading">Sources veille sectorielle</h3>
                <p className="text-[11px] text-muted">Corpus versionnés issus du processus MASTER-STUDY / E3</p>
              </div>
              {snapshot.canManage ? (
                <Button variant="secondary" size="sm" onClick={() => setView({ kind: "import" })}>
                  Importer un corpus
                </Button>
              ) : null}
            </div>
            {snapshot.sectorCorpora.length === 0 ? (
              <p className="border border-dashed border-border p-4 text-center text-xs text-muted">
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
          </section>
        </div>
      )}
    </AppDialog>
  )
}
