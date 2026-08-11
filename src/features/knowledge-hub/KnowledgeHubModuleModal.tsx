"use client"

import { useState } from "react"
import { IntelligenceSplitModalShell } from "@/components/intelligence/IntelligenceSplitModalShell"
import { scopes, suggestions, workshops } from "./knowledge-hub-shell-data"
import type { WorkshopItem } from "./knowledge-hub.types"

export type KnowledgeHubModuleKind = "workshop" | "ask"

interface KnowledgeHubModuleModalProps {
  module: KnowledgeHubModuleKind
  onClose: () => void
}

function KnowledgeWorkshopsPresentation() {
  const [selectedWorkshop, setSelectedWorkshop] = useState<WorkshopItem | null>(null)

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-edito-border bg-edito-navy p-6 text-white shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-edito-gold">
              Ateliers Métiers
            </span>
            <h2 className="mt-0.5 text-lg font-bold text-white">Processus Décisionnels</h2>
            <p className="mt-1 text-xs text-white/70">
              Actions métiers intelligentes et processus décisionnels alimentés par le Knowledge Hub.
            </p>
          </div>
          <span className="rounded bg-white/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-edito-gold">
            Mode lecture seule
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {workshops.map((workshop) => {
          const isSelected = selectedWorkshop?.id === workshop.id
          return (
            <button
              key={workshop.id}
              type="button"
              onClick={() => setSelectedWorkshop(isSelected ? null : workshop)}
              aria-pressed={isSelected}
              className={`w-full rounded-lg border bg-edito-surface p-5 text-left outline-none transition-all focus-visible:ring-2 focus-visible:ring-edito-brass/50 ${
                isSelected
                  ? "border-edito-brass ring-1 ring-edito-brass"
                  : "border-edito-border hover:border-edito-muted"
              }`}
            >
              <h3 className="text-sm font-bold text-edito-navy">{workshop.title}</h3>
              <p className="mt-3 text-xs leading-relaxed text-edito-body">
                {workshop.description}
              </p>
              <div className="mt-4 border-t border-edito-border pt-3">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-edito-muted">
                  Connaissances mobilisées :
                </span>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {workshop.mobilizedKnowledge.map((family) => (
                    <span
                      key={family}
                      className="inline-flex items-center rounded bg-edito-chip px-2 py-0.5 text-[9px] font-medium text-edito-muted"
                    >
                      {family}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function KnowledgeAskPresentation() {
  const [query, setQuery] = useState("")
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["docs", "accounts"])

  const handleToggleScope = (scopeId: string) => {
    setSelectedScopes((current) => (
      current.includes(scopeId)
        ? current.filter((id) => id !== scopeId)
        : [...current, scopeId]
    ))
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-edito-border bg-edito-navy p-6 text-white shadow-sm">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-edito-gold">
              Intelligence Hybride
            </span>
            <h2 className="mt-0.5 text-lg font-bold text-white">Interroger le Corpus</h2>
          </div>
          <span className="rounded bg-white/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-edito-gold">
            Bientôt disponible
          </span>
        </div>

        <div className="mt-5 space-y-4">
          <textarea
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            rows={3}
            placeholder="Posez votre question en langage naturel... (ex: Quelles sont nos références DORA ?)"
            className="w-full resize-none rounded-lg border border-white/20 bg-white/5 p-4 text-sm text-white placeholder:text-white/40 transition-colors focus:border-edito-gold focus:outline-none"
          />

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                Périmètre :
              </span>
              <div className="flex flex-wrap gap-2">
                {scopes.map((scope) => {
                  const isChecked = selectedScopes.includes(scope.id)
                  return (
                    <button
                      key={scope.id}
                      type="button"
                      onClick={() => handleToggleScope(scope.id)}
                      aria-pressed={isChecked}
                      className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-[10px] font-semibold transition-all ${
                        isChecked
                          ? "border-edito-gold/30 bg-edito-gold/10 text-edito-gold"
                          : "border-white/10 bg-white/5 text-white/60 hover:border-white/20"
                      }`}
                    >
                      <span className="text-[9px]" aria-hidden="true">{isChecked ? "✓" : "+"}</span>
                      {scope.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <button
              type="button"
              disabled
              className="flex min-h-10 cursor-not-allowed items-center justify-center rounded-lg border border-white/10 bg-white/10 px-5 text-xs font-bold uppercase tracking-wider text-white/50"
            >
              Envoyer
            </button>
          </div>
        </div>

        <div className="mt-5 border-t border-white/10 pt-4">
          <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-white/60">
            Exemples de questions :
          </span>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setQuery(suggestion)}
                className="w-full rounded-lg border border-white/5 bg-white/5 p-3 text-left text-xs leading-relaxed text-white/80 transition-colors hover:bg-white/10"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6 rounded-xl border border-edito-border bg-edito-surface p-6">
        <div className="flex items-center justify-between border-b border-edito-border pb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-edito-navy">
            Résultats de la requête
          </h3>
          <span className="text-[10px] font-medium text-edito-muted">En attente de soumission</span>
        </div>

        <div className="grid grid-cols-1 gap-6 opacity-60 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <div className="rounded-lg border border-dashed border-edito-border bg-edito-canvas/30 p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex size-5 items-center justify-center rounded bg-edito-navy/5 text-xs font-bold text-edito-navy">✎</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-edito-navy">Réponse Argumentée</span>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-edito-chip" />
                <div className="h-4 w-5/6 rounded bg-edito-chip" />
                <div className="h-4 w-2/3 rounded bg-edito-chip" />
              </div>
            </div>

            <div className="rounded-lg border border-dashed border-edito-border bg-edito-canvas/30 p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex size-5 items-center justify-center rounded bg-status-danger/10 text-xs font-bold text-status-danger">⚠</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-status-danger">Limites & Contradictions</span>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-5/6 rounded bg-edito-chip" />
                <div className="h-3 w-3/4 rounded bg-edito-chip" />
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-lg border border-dashed border-edito-border bg-edito-canvas/30 p-4">
              <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-edito-navy">Niveau de Confiance</span>
              <div className="flex items-end gap-2">
                <div className="h-6 w-16 rounded bg-edito-chip" />
                <div className="h-2 w-full overflow-hidden rounded-full bg-edito-chip">
                  <div className="h-full w-0 bg-edito-brass" />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-dashed border-edito-border bg-edito-canvas/30 p-4">
              <span className="mb-3 block text-[10px] font-bold uppercase tracking-wider text-edito-navy">Sources documentaires</span>
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-edito-border pb-1">
                  <div className="h-3 w-1/2 rounded bg-edito-chip" />
                  <div className="h-3 w-8 rounded bg-edito-chip" />
                </div>
                <div className="flex items-center justify-between border-b border-edito-border pb-1">
                  <div className="h-3 w-2/3 rounded bg-edito-chip" />
                  <div className="h-3 w-8 rounded bg-edito-chip" />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-dashed border-edito-border bg-edito-canvas/30 p-4">
              <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-edito-navy">Méthode de résolution</span>
              <div className="h-3 w-4/5 rounded bg-edito-chip" />
              <div className="mt-2 h-3 w-1/2 rounded bg-edito-chip" />
            </div>
          </div>
        </div>

        <div className="border-t border-edito-border py-6 text-center">
          <p className="text-xs text-edito-muted">
            Saisissez une question ou cliquez sur un exemple ci-dessus pour prévisualiser la mise en page.
          </p>
        </div>
      </div>
    </div>
  )
}

export function KnowledgeHubModuleModal({ module, onClose }: KnowledgeHubModuleModalProps) {
  const isWorkshop = module === "workshop"

  return (
    <IntelligenceSplitModalShell
      open
      onClose={onClose}
      title={isWorkshop ? "Ateliers métiers" : "Interroger le Corpus"}
      subtitle="Knowledge Hub"
      leftPane={null}
      rightPane={null}
      content={(
        <div className="min-h-0 flex-1 overflow-y-auto bg-edito-canvas p-6">
          {isWorkshop ? <KnowledgeWorkshopsPresentation /> : <KnowledgeAskPresentation />}
        </div>
      )}
    />
  )
}
