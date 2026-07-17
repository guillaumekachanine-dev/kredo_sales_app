"use client"

import { useState } from "react"
import { formatEuroCompact } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { ActivityWatchModule } from "./ActivityWatchModule"
import { RevenueBreakdownChart } from "./RevenueBreakdownChart"
import { RevenueOverviewChart } from "./RevenueOverviewChart"
import { UpcomingMilestonesModule } from "./UpcomingMilestonesModule"
import type { EngagementsOverviewViewModel } from "./engagements-overview-types"

interface EngagementsOverviewMobileProps {
  overview: EngagementsOverviewViewModel
}

type MobileSection = "revenue" | "activity" | "milestones"

const MOBILE_SECTIONS: ReadonlyArray<readonly [MobileSection, string]> = [
  ["revenue", "CA"],
  ["activity", "Activité"],
  ["milestones", "Échéances"],
]

export function EngagementsOverviewMobile({ overview }: EngagementsOverviewMobileProps) {
  const [section, setSection] = useState<MobileSection>("revenue")
  const assistanceShare = overview.revenue.total > 0
    ? Math.round((overview.revenue.assistanceTechnique / overview.revenue.total) * 100)
    : 0
  const projectShare = overview.revenue.total > 0 ? 100 - assistanceShare : 0

  return (
    <div className="min-h-full bg-canvas px-4 pb-4">
      <header className="pt-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-xl font-black tracking-tight text-heading">Synthèse</h1>
              {overview.status === "partial" && (
                <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[9px] font-bold text-[var(--color-status-warning-ink)]">Partiel</span>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-muted">
              {overview.portfolio.activeMissions} missions AT · {overview.portfolio.activeProjects} projets
            </p>
          </div>
          <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] font-bold text-body">{overview.year}</span>
        </div>

        <div className="mt-3 rounded-[var(--radius-medium)] border border-border bg-surface p-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted">CA réalisé</p>
              <p className="mt-1 font-heading text-2xl font-black text-heading">{formatEuroCompact(overview.revenue.total)}</p>
            </div>
            <div className="text-right text-[10px] text-body">
              <p><strong className="text-primary">{assistanceShare}%</strong> AT</p>
              <p><strong className="text-[var(--color-status-warning-ink)]">{projectShare}%</strong> Projets</p>
            </div>
          </div>
          <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-border" aria-label={`${assistanceShare}% Assistance Technique, ${projectShare}% Projets`}>
            <span className="bg-primary" style={{ width: `${assistanceShare}%` }} />
            <span className="bg-[var(--color-dataviz-2)]" style={{ width: `${projectShare}%` }} />
          </div>
        </div>
      </header>

      <nav className="sticky top-0 z-10 -mx-1 mt-3 grid grid-cols-3 rounded-[var(--radius-medium)] border border-border bg-surface p-1" aria-label="Modules de la synthèse" role="tablist">
        {MOBILE_SECTIONS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setSection(value)}
            role="tab"
            aria-selected={section === value}
            aria-controls={`engagements-${value}-panel`}
            className={cn(
              "min-h-11 rounded-[var(--radius-small)] px-2 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              section === value ? "bg-primary text-primary-fg" : "text-body",
            )}
          >
            {label}
          </button>
        ))}
      </nav>

      <main id={`engagements-${section}-panel`} role="tabpanel" className="mt-3 rounded-[var(--radius-medium)] border border-border bg-surface p-3">
        {section === "revenue" && (
          <section aria-label="Chiffre d’affaires réalisé">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-heading text-sm font-bold text-heading">CA mensuel réalisé</h2>
              <span className="text-[9px] text-muted">Sans forecast</span>
            </div>
            {overview.revenue.total > 0 ? (
              <RevenueOverviewChart monthly={overview.revenue.monthly} compact />
            ) : (
              <p className="py-10 text-center text-xs text-muted">Aucun CA réalisé.</p>
            )}
            <div className="mt-2 border-t border-border pt-3">
              <RevenueBreakdownChart byPractice={overview.revenue.byPractice} byClient={overview.revenue.byClient} embedded />
            </div>
          </section>
        )}
        {section === "activity" && <ActivityWatchModule activity={overview.activity} embedded />}
        {section === "milestones" && <UpcomingMilestonesModule milestones={overview.milestones} embedded />}
      </main>
    </div>
  )
}
