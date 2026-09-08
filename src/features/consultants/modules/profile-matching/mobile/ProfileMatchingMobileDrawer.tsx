"use client"

import Link from "next/link"
import { AppDrawer } from "@/components/ui/AppDrawer"
import type { ProfileOpportunityMatch } from "../data/profile-matching.types"
import { TIER_LABELS, TIER_TONES } from "@/components/staffing/matching/matching-ui-utils"
import { cn } from "@/lib/utils"

interface ProfileMatchingMobileDrawerProps {
  match: ProfileOpportunityMatch | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatDate(iso: string | null): string {
  if (!iso) return "Non précisé"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
}

export function ProfileMatchingMobileDrawer({
  match,
  open,
  onOpenChange,
}: ProfileMatchingMobileDrawerProps) {
  if (!match) return null

  const tierLabel = TIER_LABELS[match.tier]
  const tone = TIER_TONES[match.tier]

  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      side="bottom"
      title={match.opportunityTitle}
      subtitle={match.clientName ?? "Client confidentiel"}
      footer={
        <div className="flex w-full items-center gap-2">
          <Link
            href={`/missions/opps/${match.opportunityId}`}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-brand-brass px-4 text-xs font-bold text-slate-950 transition-colors hover:bg-brand-brass/90"
          >
            <span>Ouvrir le besoin</span>
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      }
    >
      <div className="space-y-4 pb-4">
        {/* Métriques clés */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5">
          <div>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                tone === "success" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30",
                tone === "info" && "bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30",
                tone === "warning" && "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30",
                tone === "neutral" && "bg-muted/15 text-muted border border-border",
              )}
            >
              {tierLabel}
            </span>
            <p className="mt-1 text-xs text-muted">
              {match.stageLabel}
              {match.startDate ? ` · Démarrage ${formatDate(match.startDate)}` : ""}
            </p>
          </div>

          <div className="text-right">
            <span className="font-heading text-2xl font-bold tabular-nums text-heading">
              {Math.round(match.overallScore)}
              <span className="text-xs font-normal text-muted">/100</span>
            </span>
            {match.targetDailyRate ? (
              <p className="text-[11px] text-muted tabular-nums">
                TJM cible {match.targetDailyRate} €/j
              </p>
            ) : null}
          </div>
        </div>

        {/* Points forts */}
        {match.pros.length > 0 ? (
          <div className="space-y-2 rounded-xl border border-border bg-surface p-3.5">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-success">
              Points forts & alignements
            </h4>
            <ul className="space-y-1.5">
              {match.pros.map((pro) => (
                <li key={pro} className="flex items-start gap-2 text-xs leading-relaxed text-body">
                  <svg className="mt-0.5 size-3.5 shrink-0 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  <span>{pro}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Points à valider */}
        {match.cons.length > 0 ? (
          <div className="space-y-2 rounded-xl border border-border bg-surface p-3.5">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-status-warning-ink)]">
              Points d’attention / à valider
            </h4>
            <ul className="space-y-1.5">
              {match.cons.map((con) => (
                <li key={con} className="flex items-start gap-2 text-xs leading-relaxed text-body">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning" />
                  <span>{con}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Données manquantes */}
        {match.missingData.length > 0 ? (
          <div className="rounded-xl border border-border bg-surface p-3.5 text-xs text-muted">
            <span className="font-semibold text-body">Critères non évalués :</span>{" "}
            {match.missingData.join(" · ")}
          </div>
        ) : null}

        {/* Traçabilité */}
        <p className="text-center text-[10px] text-muted">
          {match.computedAt ? `Calculé le ${formatDate(match.computedAt)}` : ""}
          {match.modelVersion ? ` · Modèle ${match.modelVersion}` : ""}
        </p>
      </div>
    </AppDrawer>
  )
}
