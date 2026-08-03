"use client"

import { useState } from "react"
import { suggestions, scopes } from "./knowledge-hub-shell-data"

export function KnowledgeAskMode() {
  const [query, setQuery] = useState("")
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["docs", "accounts"])

  const handleToggleScope = (scopeId: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scopeId)
        ? prev.filter((id) => id !== scopeId)
        : [...prev, scopeId]
    )
  }

  const handleSelectSuggestion = (sug: string) => {
    setQuery(sug)
  }

  return (
    <div className="space-y-6">
      {/* Search NLP Area - Pronounced Navy styling */}
      <div className="rounded-xl border border-edito-border bg-edito-navy text-white p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-edito-gold">
              Intelligence Hybride
            </span>
            <h2 className="text-lg font-bold text-white mt-0.5">Interroger le Corpus</h2>
          </div>
          <span className="rounded bg-white/10 px-2.5 py-0.5 text-[9px] font-bold text-edito-gold uppercase tracking-wider">
            Bientôt disponible
          </span>
        </div>

        {/* NLP Input Area */}
        <div className="mt-5 space-y-4">
          <div className="relative">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={3}
              placeholder="Posez votre question en langage naturel... (ex: Quelles sont nos références DORA ?)"
              className="w-full rounded-lg border border-white/20 bg-white/5 p-4 text-sm text-white placeholder:text-white/40 focus:border-edito-gold focus:outline-none transition-colors resize-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Scope selectors */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                Périmètre :
              </span>
              <div className="flex flex-wrap gap-2">
                {scopes.map((sc) => {
                  const isChecked = selectedScopes.includes(sc.id)
                  return (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => handleToggleScope(sc.id)}
                      className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[10px] font-semibold transition-all border ${
                        isChecked
                          ? "bg-edito-gold/10 text-edito-gold border-edito-gold/30"
                          : "bg-white/5 text-white/60 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <span className="text-[9px]">{isChecked ? "✓" : "+"}</span>
                      {sc.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Inactive send button */}
            <button
              type="button"
              disabled
              className="flex min-h-[40px] items-center justify-center rounded-lg bg-white/10 px-5 text-xs font-bold text-white/50 border border-white/10 cursor-not-allowed uppercase tracking-wider"
            >
              Envoyer
            </button>
          </div>
        </div>

        {/* Suggestions list */}
        <div className="mt-5 border-t border-white/10 pt-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/60 block mb-2">
            Exemples de questions :
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {suggestions.map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => handleSelectSuggestion(sug)}
                className="w-full text-left rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 p-3 text-xs text-white/80 transition-colors leading-relaxed"
              >
                {sug}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Empty Results Placeholder Structure (Visual layout of the future response structure) */}
      <div className="rounded-xl border border-edito-border bg-edito-surface p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-edito-border pb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-edito-navy">
            Résultats de la requête
          </h3>
          <span className="text-[10px] text-edito-muted font-medium">
            En attente de soumission
          </span>
        </div>

        {/* Empty State visual blocks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 opacity-60">
          {/* Main Answer Area (2/3 width on large screen) */}
          <div className="lg:col-span-2 space-y-5">
            {/* Answer Block Outline */}
            <div className="rounded-lg border border-dashed border-edito-border p-4 bg-edito-canvas/30">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex size-5 items-center justify-center rounded bg-edito-navy/5 text-xs text-edito-navy font-bold">
                  ✎
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-edito-navy">
                  Réponse Argumentée
                </span>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-3/4 rounded bg-edito-chip animate-pulse" />
                <div className="h-4 w-5/6 rounded bg-edito-chip" />
                <div className="h-4 w-2/3 rounded bg-edito-chip" />
              </div>
            </div>

            {/* Limitations & Contradictions Outline */}
            <div className="rounded-lg border border-dashed border-edito-border p-4 bg-edito-canvas/30">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex size-5 items-center justify-center rounded bg-red-50 text-xs text-red-600 font-bold">
                  ⚠
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-700">
                  Limites & Contradictions
                </span>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-5/6 rounded bg-edito-chip" />
                <div className="h-3 w-3/4 rounded bg-edito-chip" />
              </div>
            </div>
          </div>

          {/* Sidebar Area: Sources, Methodology & Trust Score */}
          <div className="space-y-5">
            {/* Level of Confidence */}
            <div className="rounded-lg border border-dashed border-edito-border p-4 bg-edito-canvas/30">
              <span className="text-[10px] font-bold uppercase tracking-wider text-edito-navy block mb-2">
                Niveau de Confiance
              </span>
              <div className="flex items-end gap-2">
                <div className="h-6 w-16 rounded bg-edito-chip" />
                <div className="h-2 w-full rounded-full bg-edito-chip overflow-hidden">
                  <div className="h-full bg-edito-brass w-0" />
                </div>
              </div>
            </div>

            {/* Sources Outline */}
            <div className="rounded-lg border border-dashed border-edito-border p-4 bg-edito-canvas/30">
              <span className="text-[10px] font-bold uppercase tracking-wider text-edito-navy block mb-3">
                Sources documentaires
              </span>
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

            {/* Methodology Outline */}
            <div className="rounded-lg border border-dashed border-edito-border p-4 bg-edito-canvas/30">
              <span className="text-[10px] font-bold uppercase tracking-wider text-edito-navy block mb-2">
                Méthode de résolution
              </span>
              <div className="h-3 w-4/5 rounded bg-edito-chip" />
              <div className="h-3 w-1/2 rounded bg-edito-chip mt-2" />
            </div>
          </div>
        </div>

        {/* Real Static placeholder info */}
        <div className="text-center py-6 border-t border-edito-border">
          <p className="text-xs text-edito-muted">
            Saisissez une question ou cliquez sur un exemple ci-dessus pour prévisualiser la mise en page.
          </p>
        </div>
      </div>
    </div>
  )
}
