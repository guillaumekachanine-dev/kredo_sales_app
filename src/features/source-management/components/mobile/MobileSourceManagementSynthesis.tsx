"use client"

import { cn } from "@/lib/utils"
import {
  buildSourceManagementOverview,
} from "../../domain/source-management-overview"
import type { SourceManagementSnapshot } from "../../domain/source-management-contracts"

export interface MobileSourceManagementSynthesisProps {
  snapshot: SourceManagementSnapshot
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    notation: "compact",
    maximumFractionDigits: 0,
  }).format(value)
}

export function MobileSourceManagementSynthesis({ snapshot }: MobileSourceManagementSynthesisProps) {
  const overview = buildSourceManagementOverview(snapshot)

  const activePercent = overview.uniqueSourceCount > 0
    ? Math.round((overview.activeSourceCount / overview.uniqueSourceCount) * 100)
    : 0

  return (
    <div className="space-y-6 pb-6">
      {/* ── 3 KPIS CANONIQUES ────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <div className="border-b border-white/10 pb-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
            Sources disponibles
          </p>
          <p className="mt-1 font-heading text-2xl font-bold tabular-nums text-white">
            {formatCompact(overview.uniqueSourceCount)}
          </p>
          <p className="mt-0.5 text-[11px] font-medium tabular-nums text-white/55">
            {overview.activeSourceCount} actives dans le socle
          </p>
        </div>

        <div className="border-b border-white/10 pb-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
            Sources actives
          </p>
          <p className="mt-1 font-heading text-2xl font-bold tabular-nums text-white">
            {formatCompact(overview.activeSourceCount)}
          </p>
          <p className="mt-0.5 text-[11px] font-medium tabular-nums text-brand-brass">
            {activePercent}% de couverture active
          </p>
        </div>

        <div className="border-b border-white/10 pb-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
            Corpus gérés
          </p>
          <p className="mt-1 font-heading text-2xl font-bold tabular-nums text-white">
            {formatCompact(overview.corpusCount)}
          </p>
          <p className="mt-0.5 text-[11px] font-medium tabular-nums text-white/55">
            {overview.activeCorpusCount} corpus actif(s)
          </p>
        </div>
      </div>

      {/* ── RÉPARTITION PAR CATÉGORIE KREDO ────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-white/70">
            Répartition par catégorie
          </h4>
          <span className="text-[10px] text-white/40">
            {overview.uniqueSourceCount} sources
          </span>
        </div>

        <div className="space-y-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
          {overview.categoryDistribution.map((category) => {
            const hasSources = category.count > 0
            return (
              <div key={category.categoryKey} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: category.colorVar }}
                      aria-hidden="true"
                    />
                    <span className="truncate font-medium text-white">
                      {category.label}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-white/70 font-mono">
                    {category.count} <span className="text-[10px] text-white/40">({category.percentage}%)</span>
                  </span>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full transition-all duration-300 motion-reduce:transition-none"
                    style={{
                      width: `${Math.max(category.percentage, hasSources ? 4 : 0)}%`,
                      backgroundColor: category.colorVar,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── ACTIVITÉ DES CORPUS ───────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-white/70">
            Activité des corpus ({overview.corpusActivity.length})
          </h4>
          <span className="text-[10px] text-white/40">
            {overview.activeCorpusCount} actif(s)
          </span>
        </div>

        {overview.corpusActivity.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-center text-xs text-white/45">
            Aucun corpus importé pour le moment.
          </div>
        ) : (
          <div className="space-y-2">
            {overview.corpusActivity.map((corpus) => {
              const ratio = corpus.totalSources > 0
                ? Math.round((corpus.activeSources / corpus.totalSources) * 100)
                : 0
              const isActive = corpus.activationState === "active"

              return (
                <div
                  key={corpus.id}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-white">
                        {corpus.name}
                      </p>
                      <p className="mt-0.5 text-[10px] text-white/50">
                        {corpus.slug}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider border",
                        isActive
                          ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                          : "border-white/15 bg-white/5 text-white/50",
                      )}
                    >
                      {isActive ? "Actif" : "Brouillon"}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-white/60 tabular-nums">
                      <span>{corpus.activeSources} / {corpus.totalSources} sources actives</span>
                      <span className="font-mono text-brand-brass">{ratio}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-brand-brass transition-all duration-300 motion-reduce:transition-none"
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
