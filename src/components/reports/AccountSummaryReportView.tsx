"use client"

import { cn } from "@/lib/utils"
import { formatDate, formatEuro } from "@/lib/formatters"
import type { AccountSummaryContent } from "@/app/(app)/reports/_data/reports-types"

// Jauge à 5 points — même pattern que les dots de niveau de compétence
// (ConsultantDrawer.tsx) : 0 librairie, pur HTML/Tailwind.
function ScoreDots({ score, label }: { score: number; label: string }) {
  const rounded = Math.round(score)
  return (
    <div className="flex items-center gap-2">
      <span className="flex shrink-0 items-center gap-0.5" title={`${score.toFixed(1)} / 5`}>
        {[1, 2, 3, 4, 5].map((dot) => (
          <span
            key={dot}
            className={cn(
              "inline-block h-2 w-2 rounded-full",
              dot <= rounded ? "bg-primary" : "bg-border"
            )}
          />
        ))}
      </span>
      <span className="text-xs font-bold font-mono text-heading">{score.toFixed(1)} / 5</span>
      <span className="text-[10px] text-muted">{label}</span>
    </div>
  )
}

function BlockHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <span className="h-px w-3 bg-brand-brass/60" aria-hidden />
      <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-brass">
        {children}
      </h3>
    </div>
  )
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <span className="block text-[9px] font-bold uppercase tracking-wider text-muted">{label}</span>
      <span className="block text-sm font-bold text-heading font-mono">{value}</span>
      {hint && <span className="block text-[10px] text-muted">{hint}</span>}
    </div>
  )
}

function isActionOverdue(actionAt: string | null, actionFlag: boolean | undefined, asOfDate: string) {
  if (typeof actionFlag === "boolean") return actionFlag
  if (!actionAt) return false

  const actionDate = new Date(actionAt)
  const referenceDate = new Date(asOfDate)
  if (Number.isNaN(actionDate.getTime()) || Number.isNaN(referenceDate.getTime())) {
    return false
  }

  return actionDate.getTime() < referenceDate.getTime()
}

export function AccountSummaryReportView({
  content,
  isMobile = false,
}: {
  content: AccountSummaryContent
  isMobile?: boolean
}) {
  const { facts, narrative, qaFlags } = content
  const failedFlags = qaFlags.filter((f) => !f.passed)
  const allPassed = failedFlags.length === 0
  const narrativeWarnings = Array.isArray(narrative.warnings)
    ? narrative.warnings.filter((warning): warning is string => typeof warning === "string" && warning.trim().length > 0)
    : []

  return (
    <div className="space-y-5">
      {/* Statut qualité */}
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider w-fit",
          allPassed
            ? "border-success/20 bg-success/10 text-success"
            : "border-warning/25 bg-warning/10 text-[var(--color-status-warning-ink)]"
        )}
      >
        <span className={cn("size-1.5 rounded-full", allPassed ? "bg-success" : "bg-warning")} />
        {allPassed ? "Qualité OK" : "À vérifier"}
      </div>
      {!allPassed && (
        <ul className="space-y-1 text-[11px] text-[var(--color-status-warning-ink)]">
          {failedFlags.map((flag, i) => (
            <li key={i}>• {flag.detail || flag.check}</li>
          ))}
        </ul>
      )}

      {/* Bloc 1 — Identité */}
      <section>
        <BlockHeading>Identité</BlockHeading>
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Statut" value={facts.identity.lifecycleStatus.replace(/_/g, " ")} />
          <Metric
            label="Score IA"
            value={facts.identity.aiScore !== null ? `${facts.identity.aiScore}/10` : "—"}
          />
          <Metric label="Secteur" value={facts.identity.sector ?? "Non renseigné"} />
          <Metric label="Segment" value={facts.identity.segment ?? "—"} />
        </div>
      </section>

      {/* Bloc 2 — Potentiel commercial */}
      <section>
        <BlockHeading>Potentiel commercial</BlockHeading>
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Pipe pondéré ouvert" value={formatEuro(facts.potential.openPipeWeighted)} />
          <Metric label="Opportunités ouvertes" value={String(facts.potential.openOpportunitiesCount)} />
          <Metric label="Opportunités gagnées" value={String(facts.potential.wonOpportunitiesCount)} />
          <Metric label="Total historique" value={String(facts.potential.totalOpportunitiesCount)} />
        </div>
      </section>

      {/* Bloc 3 — Relation Kredo */}
      <section>
        <BlockHeading>Relation Kredo</BlockHeading>
        <div className="grid grid-cols-2 gap-3">
          <Metric label="CA produit (total)" value={formatEuro(facts.relation.totalRevenueProduced)} />
          <Metric label="CA produit (YTD)" value={formatEuro(facts.relation.ytdRevenueProduced)} />
          <Metric label="Missions actives" value={String(facts.relation.activeMissionsCount)} />
          <Metric
            label="Marge théorique moy."
            value={facts.relation.avgTheoreticalMarginPct !== null ? `${facts.relation.avgTheoreticalMarginPct}%` : "—"}
          />
          <Metric label="Contacts identifiés" value={String(facts.relation.contactsCount)} />
        </div>
      </section>

      {/* Bloc 4 — Activité commerciale */}
      <section>
        <BlockHeading>Activité commerciale</BlockHeading>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Metric label="Besoins traités" value={String(facts.activity.needsTreatedCount)} />
          <Metric label="RDV réalisés (12 mois)" value={String(facts.activity.meetingsRealizedLast12m)} />
        </div>
        {facts.activity.nextActions.length > 0 && (
          <ul className="space-y-1 text-xs text-body">
            {facts.activity.nextActions.map((action) => {
              const overdue = isActionOverdue(action.at, action.isOverdue, facts.dataCutoffAt)

              return (
                <li key={action.opportunityId} className={overdue ? "text-danger" : undefined}>
                  ▸ {action.label ?? "Action à définir"}
                  {action.at && <span className="text-muted"> — {formatDate(action.at)}</span>}
                  {overdue ? <span className="font-semibold"> · En retard</span> : null}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Bloc 5 — Signaux */}
      <section>
        <BlockHeading>Signaux</BlockHeading>
        <div className="space-y-2">
          {facts.signals.news ? (
            <div className="rounded border border-border bg-canvas/40 px-3 py-2">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-muted">
                Actualité sectorielle
              </span>
              <p className="text-xs text-body mt-0.5">{facts.signals.news.title}</p>
              <span className="text-[10px] text-muted">{formatDate(facts.signals.news.publishedAt)}</span>
            </div>
          ) : (
            <p className="text-[11px] italic text-muted">Aucune actualité sectorielle disponible.</p>
          )}
          {facts.signals.regulatoryDeadline ? (
            <div className="rounded border border-border bg-canvas/40 px-3 py-2">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-muted">
                Échéance réglementaire
              </span>
              <p className="text-xs text-body mt-0.5">{facts.signals.regulatoryDeadline.name}</p>
              {facts.signals.regulatoryDeadline.deadlineDate && (
                <span className="text-[10px] text-muted">
                  {formatDate(facts.signals.regulatoryDeadline.deadlineDate)}
                </span>
              )}
            </div>
          ) : (
            <p className="text-[11px] italic text-muted">Aucune échéance réglementaire identifiée.</p>
          )}
        </div>
      </section>

      {/* Bloc 6 — Approche privilégiée */}
      <section>
        <BlockHeading>Approche privilégiée</BlockHeading>
        <div className="rounded border border-border bg-canvas/40 px-3 py-2.5 space-y-1.5">
          <p className="text-xs text-body">
            <span className="font-bold text-heading">{narrative.recommendedApproach.practice ?? "Practice non déterminée"}</span>
            {narrative.recommendedApproach.offer && (
              <span className="text-muted"> · {narrative.recommendedApproach.offer}</span>
            )}
          </p>
          <p className="text-xs text-body leading-relaxed">{narrative.recommendedApproach.argument}</p>
        </div>
      </section>

      {/* Bloc 7 — Analyse & conviction */}
      <section>
        <BlockHeading>Analyse &amp; conviction</BlockHeading>
        <p className="text-xs text-body leading-relaxed mb-3">{narrative.analysis}</p>
        <div className="space-y-2 mb-3">
          <ScoreDots score={facts.scores.conviction} label="Conviction" />
          <ScoreDots score={facts.scores.investment} label="Investissement" />
        </div>
        <div className="rounded border border-primary/20 bg-primary/5 px-3 py-2">
          <span className="block text-[9px] font-bold uppercase tracking-wider text-primary">
            Prochaine meilleure action
          </span>
          <p className="text-xs text-body mt-0.5">{narrative.nextBestAction}</p>
        </div>
      </section>

      {facts.caveats.length > 0 && (
        <div className="rounded border border-warning/25 bg-warning/5 px-3 py-2.5 text-[11px] text-[var(--color-status-warning-ink)] space-y-1">
          {facts.caveats.map((caveat, i) => (
            <p key={i}>⚠ {caveat}</p>
          ))}
        </div>
      )}

      {narrativeWarnings.length > 0 && (
        <div className="rounded border border-warning/25 bg-warning/5 px-3 py-2.5 text-[11px] text-[var(--color-status-warning-ink)] space-y-1">
          {narrativeWarnings.map((warning, i) => (
            <p key={i}>⚠ {warning}</p>
          ))}
        </div>
      )}

      <p className={cn("text-[10px] text-muted", isMobile ? "pb-2" : "")}>
        Données à jour au {formatDate(facts.dataCutoffAt)}
      </p>
    </div>
  )
}
