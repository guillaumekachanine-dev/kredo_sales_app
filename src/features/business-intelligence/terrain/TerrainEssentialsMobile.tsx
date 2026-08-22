"use client"

import { useState } from "react"
import type { ResolvedSource } from "../shared/SourceChip"
import type { TerrainEssentialsModel } from "./terrain-essentials-model"
import { TerrainSourceSheet } from "./TerrainSourceSheet"
import { TerrainSourceTriggerList } from "./TerrainSourceTrigger"

function BackIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2.4"
      className="h-4 w-4"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H6m5-5-5 5 5 5" />
    </svg>
  )
}

export function TerrainEssentialsMobile({
  model,
  sourceResolution,
  onBack,
}: {
  model: TerrainEssentialsModel
  sourceResolution?: Record<number, ResolvedSource> | null
  onBack: () => void
}) {
  const { valueChainEndpoints, criticalDependencies } = model
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null)

  return (
    <div
      className="flex min-h-full flex-col bg-edito-canvas"
      data-terrain-surface="essentials"
    >
      {/* Surface Header */}
      <header className="relative flex min-h-[76px] items-center justify-between bg-edito-navy px-5 pt-[max(16px,env(safe-area-inset-top))] pb-3.5 text-white shadow-sm">
        <button
          type="button"
          onClick={onBack}
          aria-label="Retour au Mode Terrain"
          className="inline-flex min-h-11 min-w-[116px] cursor-pointer items-center gap-1.5 text-xs font-extrabold text-white transition-opacity hover:opacity-90 active:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 select-none"
        >
          <BackIcon />
          <span>Terrain</span>
        </button>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/80">
          Essentiel
        </p>
      </header>

      {/* Main Content */}
      <main className="flex-1 space-y-5 px-5 pt-5 pb-[calc(76px+env(safe-area-inset-bottom))]">
        <section aria-label="L’essentiel du terrain" className="space-y-1">
          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-edito-heading">
            L’essentiel du terrain
          </h1>
          <p className="text-xs text-edito-muted">
            Chaîne de valeur & dépendances critiques à surveiller
          </p>
        </section>

        {/* 1. Value Chain Endpoints */}
        {valueChainEndpoints.length > 0 ? (
          <section
            aria-label="Repères de la chaîne de valeur"
            className="rounded-xl border border-edito-border bg-edito-surface p-4 space-y-3.5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-edito-brass">
                {valueChainEndpoints.length === 1
                  ? "Un repère de la chaîne"
                  : "Deux repères de la chaîne"}
              </p>
            </div>

            <div className="space-y-3">
              {valueChainEndpoints.map((step, index) => {
                const isLast = index === 1
                const endpointRole = index === 0 ? "Premier maillon" : "Dernier maillon"

                return (
                  <div key={step.id} className="space-y-2">
                    {/* Discrete visual connector arrow before last endpoint */}
                    {isLast ? (
                      <div
                        aria-hidden="true"
                        className="flex items-center justify-center py-1 text-edito-brass"
                      >
                        <div className="flex h-6 w-6 items-center justify-center rounded-full border border-edito-brass/30 bg-edito-amber-soft text-edito-navy">
                          <svg
                            className="h-3.5 w-3.5 stroke-[2.5]"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 14l-7 7m0 0l-7-7m7 7V3"
                            />
                          </svg>
                        </div>
                      </div>
                    ) : null}

                    <div className="rounded-lg border border-edito-border/60 bg-edito-canvas/60 p-3 space-y-1">
                      <span className="inline-block text-[10px] font-extrabold uppercase tracking-wide text-edito-brass-hover">
                        {endpointRole}
                      </span>
                      <h2 className="font-heading text-sm font-extrabold text-edito-heading">
                        {step.activityLabel}
                      </h2>
                      {step.stageLabel && step.stageLabel !== step.activityLabel ? (
                        <p className="text-[11px] font-semibold text-edito-body">
                          {step.stageLabel}
                        </p>
                      ) : null}
                      {step.description ? (
                        <p className="text-xs leading-relaxed text-edito-muted">
                          {step.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}

        {/* 2. Critical Dependencies */}
        {criticalDependencies.length > 0 ? (
          <section
            aria-label="Dépendances critiques à surveiller"
            className="rounded-xl border border-edito-brass/40 bg-edito-amber-soft p-4 space-y-3.5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-edito-navy">
                À surveiller — dépendances critiques
              </p>
            </div>

            <div className="space-y-3">
              {criticalDependencies.map((dep) => {
                const criticalityLabel = dep.criticite
                  ? dep.criticite.toUpperCase()
                  : "NON PRÉCISÉE"

                return (
                  <article
                    key={dep.nom}
                    className="rounded-lg border border-edito-border/80 bg-edito-surface p-3.5 space-y-2 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-heading text-sm font-bold leading-snug text-edito-heading">
                        {dep.nom}
                      </h2>
                      <span className="inline-block flex-shrink-0 rounded border border-edito-brass/40 bg-edito-amber-soft px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-edito-navy">
                        {criticalityLabel}
                      </span>
                    </div>

                    {dep.risque ? (
                      <div className="text-xs text-edito-body space-y-0.5">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-edito-muted">
                          Risque
                        </span>
                        <p className="leading-snug">{dep.risque}</p>
                      </div>
                    ) : null}

                    {dep.prestationOuverte ? (
                      <div className="text-xs text-edito-muted space-y-0.5 pt-0.5">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-edito-brass">
                          Prestation ouverte
                        </span>
                        <p className="leading-snug font-medium text-edito-heading">
                          {dep.prestationOuverte}
                        </p>
                      </div>
                    ) : null}

                    {/* Interactive source triggers (M6) */}
                    {dep.srcIds && dep.srcIds.length > 0 ? (
                      <div className="pt-2">
                        <TerrainSourceTriggerList
                          sourceIds={dep.srcIds}
                          sourceResolution={sourceResolution}
                          onSelectSource={setSelectedSourceId}
                        />
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>
          </section>
        ) : null}

        {/* Desktop renvoi note */}
        <p className="pt-2 text-center text-xs text-edito-muted underline underline-offset-4">
          Analyse complète disponible sur desktop
        </p>
      </main>

      {/* Bottom Sheet de consultation interactive des sources */}
      <TerrainSourceSheet
        sourceId={selectedSourceId}
        sourceResolution={sourceResolution}
        open={selectedSourceId !== null}
        onClose={() => setSelectedSourceId(null)}
      />
    </div>
  )
}
