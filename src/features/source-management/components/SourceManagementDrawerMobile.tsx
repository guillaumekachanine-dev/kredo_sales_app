"use client"

import { useState } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { Button } from "@/components/ui/Button"
import { ManualSourceForm } from "./ManualSourceForm"
import { SourceBaseList } from "./SourceBaseList"
import { SourceCorpusCard } from "./SourceCorpusCard"
import type { SourceCatalogEntry, SourceManagementSnapshot } from "../domain/source-management-contracts"

type PanelView = { kind: "list" } | { kind: "create" } | { kind: "edit"; source: SourceCatalogEntry }

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
  const title = view.kind === "create" ? "Ajouter une source" : view.kind === "edit" ? "Modifier la source" : "Gérer les sources"

  return (
    <AppDrawer
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      description={view.kind === "list" ? "Socle éditorial, sources manuelles et corpus sectoriels." : undefined}
      side="right"
      width="wide"
      showMobileCloseButton
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
                  + Ajouter
                </Button>
              ) : null}
            </div>
            <SourceBaseList
              sources={catalogSources}
              variant="cards"
              onEdit={(source) => setView({ kind: "edit", source })}
            />
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-heading text-sm font-bold text-heading">Sources veille sectorielle</h3>
              <Button variant="secondary" size="sm" disabled title="Import de corpus — Lot 4">
                Importer
              </Button>
            </div>
            {snapshot.sectorCorpora.length === 0 ? (
              <p className="border border-dashed border-border p-4 text-center text-xs text-muted">
                Aucun corpus sectoriel importé pour l’instant — l’import arrive au Lot 4.
              </p>
            ) : (
              <div className="space-y-2">
                {snapshot.sectorCorpora.map((corpus) => (
                  <SourceCorpusCard key={corpus.id} corpus={corpus} variant="cards" />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </AppDrawer>
  )
}
