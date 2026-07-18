"use client"

import type { CSSProperties, ReactNode } from "react"
import { cn } from "@/lib/utils"
import { formatDate, formatEuro } from "@/lib/formatters"
import type { ActivityCommercialContent } from "@/app/(app)/reports/_data/reports-types"

export function isActivityCommercialContent(value: unknown): value is ActivityCommercialContent {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const facts = (value as Partial<ActivityCommercialContent>).facts
  return Boolean(
    facts && typeof facts === "object" && "period" in facts && "activity" in facts &&
      "pipeMovements" in facts && "pipeSnapshot" in facts,
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--color-editorial-accent)]">
      <span className="h-px w-5 bg-[var(--color-editorial-accent)]" aria-hidden />
      {children}
    </div>
  )
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="border-t border-[var(--color-editorial-line)] pt-3 transition-colors duration-200 hover:border-[var(--color-editorial-accent)]">
      <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--color-editorial-muted)]">{label}</span>
      <span className={cn("mt-1 block font-mono text-[1.55rem] font-semibold tracking-[-0.06em]", accent ? "text-[var(--color-editorial-accent)]" : "text-[var(--color-editorial-ink)]")}>
        {value}
      </span>
    </div>
  )
}

function EditorialList({ children }: { children: ReactNode }) {
  return <ul className="divide-y divide-[var(--color-editorial-line)] border-y border-[var(--color-editorial-line)]">{children}</ul>
}

export function ActivityCommercialReportView({
  content,
  isMobile = false,
}: {
  content: ActivityCommercialContent
  isMobile?: boolean
}) {
  const { facts, narrative, qaFlags } = content
  const failedFlags = qaFlags.filter((flag) => !flag.passed)
  const narrativeWarnings = (narrative.warnings ?? []).filter((warning) => warning.trim().length > 0)
  const allPassed = failedFlags.length === 0

  return (
    <article
      className={cn("editorial-report relative overflow-hidden bg-[var(--color-editorial-paper)] text-[var(--color-editorial-ink)]", isMobile ? "px-1 py-1" : "px-2 py-1")}
      style={{
        "--color-editorial-paper": "#fbfaf6",
        "--color-editorial-ink": "#17211d",
        "--color-editorial-muted": "#718078",
        "--color-editorial-line": "#dfe4dc",
        "--color-editorial-accent": "#e05d45",
      } as CSSProperties}
    >
      <header className="border-b-2 border-[var(--color-editorial-ink)] pb-6">
        <div className="flex items-start justify-between gap-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[var(--color-editorial-accent)]">KREDO / INTELLIGENCE</p>
          <p className="text-right text-[9px] font-mono text-[var(--color-editorial-muted)]">{formatDate(facts.period.asOfDate)}</p>
        </div>
        <h1 className="mt-8 max-w-[15ch] font-heading text-[clamp(2rem,5vw,3.7rem)] font-semibold leading-[0.95] tracking-[-0.065em]">Activité commerciale</h1>
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[var(--color-editorial-muted)]">
          <span>{formatDate(facts.period.startDate)} → {formatDate(facts.period.endDate)}</span>
          <span className="text-[var(--color-editorial-accent)]" aria-hidden>●</span>
          <span>Point au {formatDate(facts.period.asOfDate)}</span>
          <span className={cn("font-semibold uppercase tracking-[0.12em]", allPassed ? "text-emerald-700" : "text-amber-700")}>{allPassed ? "Qualité validée" : "À vérifier"}</span>
        </div>
      </header>

      <section className="grid gap-7 border-b border-[var(--color-editorial-line)] py-7 md:grid-cols-[1.1fr_0.9fr]">
        <div>
          <SectionLabel>Lecture de la période</SectionLabel>
          <p className="max-w-[38rem] font-heading text-[clamp(1.15rem,2.3vw,1.65rem)] leading-[1.12] tracking-[-0.035em]">{narrative.summary}</p>
        </div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-5 self-end">
          <Metric label="RDV réalisés" value={String(facts.activity.realizedMeetingsCount)} />
          <Metric label="RDV planifiés" value={String(facts.activity.plannedMeetingsCount)} />
          <Metric label="Opportunités créées" value={String(facts.pipeMovements.opportunitiesCreatedCount)} />
          <Metric label="Gagnées" value={String(facts.pipeMovements.opportunitiesWonCount)} accent />
        </div>
      </section>

      <section className="border-b border-[var(--color-editorial-line)] py-7">
        <SectionLabel>Vue du pipe</SectionLabel>
        <div className="grid gap-8 md:grid-cols-[0.8fr_1.2fr]">
          <div className="grid grid-cols-2 gap-x-5 gap-y-5">
            <Metric label="Pipe ouvert" value={formatEuro(facts.pipeSnapshot.openPipeWeighted)} accent />
            <Metric label="Opportunités ouvertes" value={String(facts.pipeSnapshot.openOpportunitiesCount)} />
            <Metric label="Valeur gagnée · ACV" value={formatEuro(facts.pipeMovements.wonWeightedValue)} />
            <Metric label="Perdues" value={String(facts.pipeMovements.opportunitiesLostCount)} />
          </div>
          {(facts.byOwner.length > 0 || facts.bySector.length > 0) && (
            <div className="grid gap-7 sm:grid-cols-2">
              {facts.byOwner.length > 0 && <div><h2 className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em]">Par commercial</h2><EditorialList>{facts.byOwner.map((owner) => <li key={owner.ownerId} className="flex items-center justify-between gap-3 py-2 text-[11px]"><span className="truncate">{owner.ownerName ?? "Sans nom"}</span><span className="shrink-0 font-mono text-[10px] text-[var(--color-editorial-muted)]">{formatEuro(owner.openPipeWeighted)}</span></li>)}</EditorialList></div>}
              {facts.bySector.length > 0 && <div><h2 className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em]">Par secteur</h2><EditorialList>{facts.bySector.map((sector) => <li key={sector.sectorId} className="flex items-center justify-between gap-3 py-2 text-[11px]"><span className="truncate">{sector.sectorName ?? "Non structuré"}</span><span className="shrink-0 font-mono text-[10px] text-[var(--color-editorial-muted)]">{formatEuro(sector.openPipeWeighted)}</span></li>)}</EditorialList></div>}
            </div>
          )}
        </div>
      </section>

      {(facts.staleOpportunities.length > 0 || facts.upcomingNextActions.length > 0) && <section className="grid gap-8 border-b border-[var(--color-editorial-line)] py-7 md:grid-cols-2">
        {facts.staleOpportunities.length > 0 && <div><SectionLabel>À réactiver</SectionLabel><EditorialList>{facts.staleOpportunities.map((opportunity) => <li key={opportunity.opportunityId} className="flex items-start justify-between gap-3 py-3 text-[11px] transition-colors hover:bg-[#f2f4ef]"><span><strong>{opportunity.title}</strong>{opportunity.companyName ? <span className="text-[var(--color-editorial-muted)]"> · {opportunity.companyName}</span> : null}</span><span className="shrink-0 font-mono font-semibold text-[var(--color-editorial-accent)]">{opportunity.daysSinceLastAction}j</span></li>)}</EditorialList></div>}
        {facts.upcomingNextActions.length > 0 && <div><SectionLabel>Prochaines actions</SectionLabel><EditorialList>{facts.upcomingNextActions.map((action) => <li key={action.opportunityId} className="py-3 text-[11px] transition-colors hover:bg-[#f2f4ef]"><strong>{action.label ?? "Action à définir"}</strong>{action.companyName ? <span className="text-[var(--color-editorial-muted)]"> · {action.companyName}</span> : null}{action.at ? <span className="ml-1 font-mono text-[10px] text-[var(--color-editorial-muted)]">{formatDate(action.at)}</span> : null}</li>)}</EditorialList></div>}
      </section>}

      <section className="py-7"><SectionLabel>Priorités de pilotage</SectionLabel><div className="grid gap-8 md:grid-cols-[1fr_0.8fr]"><ol className="space-y-3 text-[12px] leading-[1.35]">{narrative.priorities.length > 0 ? narrative.priorities.map((priority, index) => <li key={index} className="flex gap-3 border-b border-[var(--color-editorial-line)] pb-3"><span className="font-mono text-[10px] text-[var(--color-editorial-accent)]">0{index + 1}</span><span>{priority}</span></li>) : <li className="text-[var(--color-editorial-muted)]">Aucune priorité renseignée.</li>}</ol>{narrative.risks.length > 0 && <div className="border-l-2 border-[var(--color-editorial-accent)] pl-4"><h2 className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-editorial-accent)]">Points de vigilance</h2><ul className="mt-3 space-y-2 text-[11px] leading-[1.35]">{narrative.risks.map((risk, index) => <li key={index}>— {risk}</li>)}</ul></div>}</div></section>

      {(failedFlags.length > 0 || facts.caveats.length > 0 || narrativeWarnings.length > 0) && <aside className="border-t border-[var(--color-editorial-line)] pt-4 text-[10px] leading-[1.4] text-amber-800">{[...failedFlags.map((flag) => flag.detail || flag.check), ...facts.caveats, ...narrativeWarnings].map((item, index) => <p key={index}>⚠ {item}</p>)}</aside>}
      <footer className="mt-3 flex justify-between border-t-2 border-[var(--color-editorial-ink)] pt-3 text-[9px] uppercase tracking-[0.12em] text-[var(--color-editorial-muted)]"><span>Rapport d&apos;activité commerciale</span><span>Données au {formatDate(facts.dataCutoffAt)}</span></footer>
    </article>
  )
}
