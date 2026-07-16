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
  showPresentationAction?: boolean
}

function initialsFor(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

export function MatchingProfileDetail({
  profile,
  presenting,
  presented,
  presentedError,
  onPresent,
  isMobile = false,
  showPresentationAction = true,
}: MatchingProfileDetailProps) {
  const canPresent = profile.sourceType === "candidate" || profile.hasCandidateProfile

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#0f7071] text-base font-semibold text-white">
          {initialsFor(profile.fullName)}
        </span>
        <div className="min-w-0">
          <p className="truncate font-heading text-xl font-bold leading-tight tracking-tight text-heading">{profile.fullName}</p>
          <p className="mt-0.5 truncate text-xs leading-5 text-body">
            {profile.currentTitle ?? sourceTypeLabel(profile.sourceType)}
          </p>
          <p className="mt-1 text-[11px] text-muted">Provenance : {sourceTypeLabel(profile.sourceType)}</p>
        </div>
      </div>

      {isMobile ? (
        <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-3">
          <div>
            <StatusPill label={TIER_LABELS[profile.tier]} variant={TIER_TONES[profile.tier]} />
            <p className="mt-2 text-[11px] text-muted">{formatAvailability(profile.availableFrom)}</p>
          </div>
          <span className="font-heading text-2xl font-bold tabular-nums text-heading">
            {Math.round(profile.overallScore)}<span className="ml-1 text-xs font-semibold text-muted">/100</span>
          </span>
        </div>
      ) : null}

      {profile.pros.length > 0 && (
        <section>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">Ce qui aligne</h3>
          <ul className="mt-2.5 max-w-[48rem] space-y-2">
            {profile.pros.slice(0, 3).map((pro) => (
              <li key={pro} className="flex gap-2 text-xs leading-5 text-body">
                <svg aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" />
                </svg>
                {pro}
              </li>
            ))}
          </ul>
        </section>
      )}

      {(profile.cons.length > 0 || profile.missingData.length > 0) && (
        <section className="border-t border-border/70 pt-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">À valider en entretien</h3>
          <ul className="mt-2.5 max-w-[48rem] space-y-2">
            {profile.cons.slice(0, 2).map((con) => (
              <li key={con} className="flex gap-2 text-xs leading-5 text-body">
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-muted" />
                {con}
              </li>
            ))}
            {profile.missingData.length > 0 ? (
              <li className="flex gap-2 text-xs leading-5 text-muted">
                <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-border-strong" />
                Non évalué : {profile.missingData.join(" · ")}
              </li>
            ) : null}
          </ul>
        </section>
      )}

      <section className="border-t border-border/70 pt-4">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">Critères évalués</h3>
        <div className="mt-3 space-y-2">
          {profile.components.map((component) => {
            const score = Math.max(0, Math.min(100, component.normalizedScore))
            return (
              <div key={component.componentKey} className="grid min-w-0 grid-cols-[minmax(7rem,10rem)_minmax(4rem,1fr)_3.25rem] items-center gap-2">
                <span className="truncate text-[11px] font-medium text-body">{component.componentLabel}</span>
                <div className="h-[3px] overflow-hidden rounded-full bg-border/80">
                  <div
                    className={cn("h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none", component.applicable ? "bg-primary" : "bg-border-strong")}
                    style={{ width: component.applicable ? `${score}%` : "100%" }}
                  />
                </div>
                <span className="shrink-0 text-right text-[11px] font-medium tabular-nums text-body">
                  {component.applicable ? `${Math.round(score)}/100` : "—"}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      {!showPresentationAction && presentedError ? (
        <p className="border-t border-danger/20 pt-4 text-[11px] text-danger">{presentedError}</p>
      ) : null}

      {!showPresentationAction && !canPresent ? (
        <p className="border-t border-border/70 pt-4 text-[11px] leading-relaxed text-muted">
          Non présentable : ce collaborateur n&apos;a pas encore de profil candidat rattaché.
        </p>
      ) : null}

      {showPresentationAction ? <div className={cn("flex flex-col gap-2 border-t border-border pt-3", isMobile && "sticky bottom-0 -mx-4 -mb-4 bg-surface px-4 pb-4")}>
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
      </div> : null}
    </div>
  )
}
