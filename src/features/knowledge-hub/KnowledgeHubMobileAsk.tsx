"use client"

import { useState } from "react"
import { mobileSuggestions, mobileScopes } from "./knowledge-hub-mobile-shell-data"

export function KnowledgeHubMobileAsk() {
  const [query, setQuery] = useState("")
  const [selectedScope, setSelectedScope] = useState("all")
  const [resultTab, setResultTab] = useState<"answer" | "sources" | "method">("answer")

  const handleSuggestionClick = (sug: string) => {
    setQuery(sug)
  }

  return (
    <div className="space-y-4">
      {/* Search NLP Area - Pronounced Navy theme */}
      <div className="rounded-xl border border-edito-border bg-edito-navy text-white p-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-edito-gold">
              Intelligence Hybride
            </span>
            <h3 className="text-xs font-bold text-white mt-0.5">Interroger le Corpus</h3>
          </div>
          <span className="rounded bg-white/10 px-2.5 py-0.5 text-[8px] font-bold text-edito-gold uppercase tracking-wider">
            Bientôt disponible
          </span>
        </div>

        {/* NLP input */}
        <div className="mt-4 space-y-3">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={3}
            placeholder="Posez votre question... (ex: Quelles sont nos références DORA ?)"
            className="w-full rounded-lg border border-white/20 bg-white/5 p-3 text-xs text-white placeholder:text-white/40 focus:border-edito-gold focus:outline-none transition-colors resize-none"
          />

          {/* Scope chips */}
          <div className="space-y-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-white/50 block">
              Périmètre :
            </span>
            <div className="flex flex-wrap gap-1.5">
              {mobileScopes.map((scope) => {
                const isSelected = selectedScope === scope.id
                return (
                  <button
                    key={scope.id}
                    type="button"
                    onClick={() => setSelectedScope(scope.id)}
                    className={`inline-flex items-center rounded px-2 py-0.5 text-[9px] font-semibold transition-all border ${
                      isSelected
                        ? "bg-edito-gold/15 text-edito-gold border-edito-gold/30"
                        : "bg-white/5 text-white/60 border-white/10"
                    }`}
                  >
                    {scope.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Action button */}
          <button
            type="button"
            disabled
            className="flex min-h-[44px] w-full items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-white/50 border border-white/10 cursor-not-allowed uppercase tracking-wider mt-2"
          >
            Interroger
          </button>
        </div>

        {/* NLP Suggestions */}
        <div className="mt-4 border-t border-white/10 pt-3">
          <span className="text-[9px] font-bold uppercase tracking-wider text-white/50 block mb-2">
            Suggestions :
          </span>
          <div className="space-y-1.5">
            {mobileSuggestions.map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => handleSuggestionClick(sug)}
                className="w-full text-left rounded-lg bg-white/5 border border-white/5 p-2.5 text-[11px] text-white/80 transition-colors leading-relaxed"
              >
                {sug}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Empty visual results block */}
      <div className="rounded-xl border border-edito-border bg-edito-surface p-4">
        {/* Results navigation */}
        <div className="flex border-b border-edito-border" aria-label="Résultats futurs">
          {(["answer", "sources", "method"] as const).map((tab) => {
            const label = tab === "answer" ? "Réponse" : tab === "sources" ? "Sources" : "Méthode"
            const isTabActive = resultTab === tab
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setResultTab(tab)}
                className={`relative flex-1 py-2 text-center text-[10px] font-bold uppercase tracking-wider transition-colors outline-none ${
                  isTabActive
                    ? "text-edito-navy after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-edito-brass"
                    : "text-edito-muted"
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* Tab contents (empty skeleton frames) */}
        <div className="mt-4 py-6 px-2 opacity-50 space-y-4">
          {resultTab === "answer" && (
            <div className="space-y-3">
              <div className="h-4 w-3/4 rounded bg-edito-chip animate-pulse" />
              <div className="h-4 w-5/6 rounded bg-edito-chip" />
              <div className="h-4 w-2/3 rounded bg-edito-chip" />
              
              <div className="mt-4 rounded-lg border border-dashed border-red-200 bg-red-50/20 p-3 space-y-2">
                <span className="text-[9px] font-bold text-red-700 uppercase tracking-wider block">
                  Limites & Contradictions
                </span>
                <div className="h-3 w-4/5 rounded bg-red-100/50" />
              </div>
            </div>
          )}

          {resultTab === "sources" && (
            <div className="space-y-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-edito-navy block">
                Sources documentaires estimées
              </span>
              <div className="divide-y divide-edito-border/50">
                <div className="py-2 flex justify-between">
                  <div className="h-3 w-1/2 rounded bg-edito-chip" />
                  <div className="h-3 w-8 rounded bg-edito-chip" />
                </div>
                <div className="py-2 flex justify-between">
                  <div className="h-3 w-2/3 rounded bg-edito-chip" />
                  <div className="h-3 w-8 rounded bg-edito-chip" />
                </div>
              </div>
            </div>
          )}

          {resultTab === "method" && (
            <div className="space-y-3">
              <span className="text-[9px] font-bold uppercase tracking-wider text-edito-navy block">
                Niveau de confiance estimé : --%
              </span>
              <div className="h-1.5 w-full rounded-full bg-edito-chip overflow-hidden">
                <div className="h-full bg-edito-brass w-0" />
              </div>
              <p className="text-[10px] text-edito-muted leading-relaxed">
                Le parcours de résolution et la vérification des sources s&apos;afficheront ici.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
