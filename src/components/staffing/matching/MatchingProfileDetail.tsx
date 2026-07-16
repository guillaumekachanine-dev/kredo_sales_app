"use client"

import { StatusPill } from "@/components/ui/StatusPill"
import type { ProfileMatchResult } from "@/lib/staffing-matching/types"
import { cn } from "@/lib/utils"
import { TIER_LABELS, TIER_TONES, formatAvailability, sourceTypeLabel } from "./matching-ui-utils"

interface MatchingProfileDetailProps {
  profile: ProfileMatchResult
  presenting: boolean
  presented: boolean
  presentedError: string | null
  onPresent: () => void
  isMobile?: boolean
}

export function MatchingProfileDetail({
  profile,
  presenting,
  presented,
  presentedError,
  onPresent,
  isMobile = false,
}: MatchingProfileDetailProps) {
  const canPresent = profile.sourceType === "candidate" || profile.hasCandidateProfile

  return (
    <div className="flex flex-col gap-4">
      {/* Header identité + score global */}
      <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface p-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-heading">{profile.fullName}</p>
          <p className="mt-0.5 truncate text-xs text-muted">
            {profile.currentTitle ?? sourceTypeLabel(profile.sourceType)} · {sourceTypeLabel(profile.sourceType)}
          </p>
          <p className="mt-1 text-[11px] text-muted">{formatAvailability(profile.availableFrom)}</p>
          <div className="mt-2">
            <StatusPill label={TIER_LABELS[profile.tier]} variant={TIER_TONES[profile.tier]} />
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span className="font-heading text-2xl font-bold leading-none text-heading">
            {Math.round(profile.overallScore)}
            <span className="ml-1 text-xs font-semibold text-muted">/100</span>
          </span>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted">
            Confiance {Math.round(profile.confidence)}%
          </p>
        </div>
      </div>

      {/* Pour / Contre */}
      {(profile.pros.length > 0 || profile.cons.length > 0) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {profile.pros.length > 0 && (
            <div className="rounded border border-success/20 bg-success/[0.05] p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-success">Pour</span>
              <ul className="mt-1.5 space-y-1">
                {profile.pros.map((p, i) => (
                  <li key={i} className="text-[11px] leading-relaxed text-body">{p}</li>
                ))}
              </ul>
            </div>
          )}
          {profile.cons.length > 0 && (
            <div className="rounded border border-warning/20 bg-warning/[0.05] p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-status-warning-ink)]">Contre</span>
              <ul className="mt-1.5 space-y-1">
                {profile.cons.map((c, i) => (
                  <li key={i} className="text-[11px] leading-relaxed text-body">{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Données manquantes */}
      {profile.missingData.length > 0 && (
        <div className="rounded border border-border/60 bg-canvas/40 p-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Critères non évalués</span>
          <p className="mt-1 text-[11px] leading-relaxed text-body">
            {profile.missingData.join(" · ")} — donnée absente, ni comptée en positif ni en négatif.
          </p>
        </div>
      )}

      {/* Détail des composantes */}
      <div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Détail des critères</span>
        <div className="mt-2 space-y-2">
          {profile.components.map((c) => (
            <div key={c.componentKey} className="rounded border border-border/60 bg-canvas/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-heading">{c.componentLabel}</span>
                <span className="text-xs font-semibold text-muted">
                  {c.applicable ? `${Math.round(c.normalizedScore)}/100` : "Non évalué"}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border/50">
                <div
                  className={cn("h-full rounded-full", c.applicable ? "bg-primary" : "bg-border")}
                  style={{ width: c.applicable ? `${Math.max(0, Math.min(100, c.normalizedScore))}%` : "100%" }}
                />
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-body">{c.explanation}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Action présenter */}
      <div className={cn("flex flex-col gap-2 border-t border-border pt-3", isMobile && "sticky bottom-0 -mx-4 -mb-4 bg-surface px-4 pb-4")}>
        {presentedError && (
          <p className="rounded border border-danger/20 bg-danger/[0.06] px-3 py-2 text-[11px] text-danger">{presentedError}</p>
        )}
        {!canPresent && (
          <p className="rounded border border-border/60 bg-canvas/40 px-3 py-2 text-[11px] text-muted">
            Non présentable : ce collaborateur n&apos;a pas encore de profil candidat rattaché.
          </p>
        )}
        <button
          type="button"
          onClick={onPresent}
          disabled={!canPresent || presenting || presented}
          className={cn(
            "inline-flex items-center justify-center rounded-md px-4 py-2.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
            presented
              ? "border border-success/25 bg-success/10 text-success"
              : "bg-primary text-primary-fg hover:bg-primary-deep",
          )}
        >
          {presented ? "Présenté ✓" : presenting ? "Présentation…" : "Présenter ce profil"}
        </button>
      </div>
    </div>
  )
}
