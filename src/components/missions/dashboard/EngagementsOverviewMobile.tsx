"use client"

import { useState } from "react"
import { formatEuroCompact } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { ActivityWatchModule } from "./ActivityWatchModule"
import { RevenueBreakdownChart } from "./RevenueBreakdownChart"
import { RevenueOverviewChart } from "./RevenueOverviewChart"
import { EngagementRunway } from "./EngagementRunway"
import { PortfolioAtlasLauncher } from "./PortfolioAtlasLauncher"
import type { EngagementsPortfolioViewModel } from "./engagements-portfolio-types"

interface EngagementsOverviewMobileProps {
  overview: EngagementsPortfolioViewModel
}

type MobileSection = "revenue" | "activity" | "milestones"

const MOBILE_SECTIONS: ReadonlyArray<readonly [MobileSection, string]> = [
  ["revenue", "CA"],
  ["activity", "Activité"],
  ["milestones", "Échéances"],
]

// Synthèse Engagements — Mobile (ADR-0006). Langage visuel repris de
// ReportsMobileView : header compact, nav pleine largeur (grid-cols-3, onglet
// actif souligné brand-brass), surfaces ouvertes, séparateurs fins, aucun gros
// container arrondi. Les données et modules métier sont inchangés.
export function EngagementsOverviewMobile({ overview }: EngagementsOverviewMobileProps) {
  const [section, setSection] = useState<MobileSection>("revenue")

  const assistanceShare = overview.revenue.total > 0
    ? Math.round((overview.revenue.assistanceTechnique / overview.revenue.total) * 100)
    : 0
  const projectShare = overview.revenue.total > 0 ? 100 - assistanceShare : 0

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-surface">
      {/* Header */}
      <div className="shrink-0 px-4 pb-3 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-xl font-bold leading-7 text-heading">Synthèse</h1>
              {overview.status === "partial" && (
                <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[9px] font-bold text-[var(--color-status-warning-ink)]">
                  Partiel
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-muted">
              {overview.portfolio.activeMissions} missions AT · {overview.portfolio.activeProjects} projets · {overview.year}
            </p>
          </div>
          <PortfolioAtlasLauncher overview={overview} compact />
        </div>

        {/* CA réalisé — bloc plat */}
        <div className="mt-3 flex items-end justify-between gap-4 border-t border-border pt-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted">CA réalisé</p>
            <p className="mt-0.5 font-heading text-2xl font-black text-heading">
              {formatEuroCompact(overview.revenue.total)}
            </p>
          </div>
          <div className="text-right text-[10px] text-body">
            <p><strong className="text-primary">{assistanceShare}%</strong> AT</p>
            <p><strong className="text-[var(--color-status-warning-ink)]">{projectShare}%</strong> Projets</p>
          </div>
        </div>
        <div
          className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-border"
          aria-label={`${assistanceShare}% Assistance Technique, ${projectShare}% Projets`}
        >
          <span className="bg-primary" style={{ width: `${assistanceShare}%` }} />
          <span className="bg-[var(--color-dataviz-2)]" style={{ width: `${projectShare}%` }} />
        </div>
      </div>

      {/* Navigation */}
      <nav
        className="grid shrink-0 grid-cols-3 border-y border-border bg-surface"
        aria-label="Modules de la synthèse"
        role="tablist"
      >
        {MOBILE_SECTIONS.map(([value, label]) => {
          const active = section === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => setSection(value)}
              role="tab"
              aria-selected={active}
              aria-controls={`engagements-${value}-panel`}
              className={cn(
                "relative min-h-12 px-2 text-sm font-semibold text-heading outline-none transition-colors focus-visible:ring-2 focus-visible:ring-heading focus-visible:ring-inset",
                active
                  ? "bg-primary/[0.04] after:absolute after:inset-x-4 after:bottom-0 after:h-0.5 after:bg-brand-brass"
                  : "hover:bg-surface-hover/60",
              )}
            >
              {label}
            </button>
          )
        })}
      </nav>

      {/* Contenu */}
      <div
        id={`engagements-${section}-panel`}
        role="tabpanel"
        className="engagements-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4"
      >
        {section === "revenue" && (
          <section aria-label="Chiffre d’affaires réalisé">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-bold text-heading">CA mensuel réalisé</h2>
              <span className="text-[9px] text-muted">Sans forecast</span>
            </div>
            {overview.revenue.total > 0 ? (
              <RevenueOverviewChart monthly={overview.revenue.monthly} compact />
            ) : (
              <p className="py-10 text-center text-xs text-muted">Aucun CA réalisé.</p>
            )}
            <div className="mt-4 border-t border-border pt-4">
              <RevenueBreakdownChart
                byPractice={overview.revenue.byPractice}
                byClient={overview.revenue.byClient}
                embedded
              />
            </div>
          </section>
        )}

        {section === "activity" && <ActivityWatchModule activity={overview.activity} embedded />}

        {section === "milestones" && (
          <EngagementRunway
            rows={overview.milestones.runway}
            endingWithin60Days={overview.milestones.endingWithin60Days}
            compact
          />
        )}
      </div>
    </div>
  )
}
