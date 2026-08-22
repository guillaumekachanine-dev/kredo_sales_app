"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  CORPUS_QUALITY_VERDICT_LABELS,
  type CorpusQualityVerdict,
} from "@/features/source-management/domain/source-management-contracts"

export type CorpusConfidenceGap = {
  motif: string
  famille: string | null
}

export type CorpusConfidenceBannerProps = {
  qualityVerdict: CorpusQualityVerdict
  activationState: "draft" | "active"
  snapshotDate: string | null
  gaps?: CorpusConfidenceGap[]
  className?: string
}

function formatSnapshotDate(value: string | null): string {
  if (!value) return "date de snapshot inconnue"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
}

const VERDICT_BADGE_CLASSES: Record<CorpusQualityVerdict, string> = {
  production_ready: "border-edito-brass/40 bg-edito-brass/15 text-edito-gold",
  usable_with_caveats: "border-edito-brass/40 bg-edito-brass/15 text-edito-gold",
  rejected: "border-danger/40 bg-danger/15 text-danger",
}

export function CorpusConfidenceBanner({
  qualityVerdict,
  activationState,
  snapshotDate,
  gaps = [],
  className,
}: CorpusConfidenceBannerProps) {
  const [gapsOpen, setGapsOpen] = useState(false)
  const verdictLabel = CORPUS_QUALITY_VERDICT_LABELS[qualityVerdict]

  return (
    <div className={cn("rounded-lg border border-edito-navy/60 bg-edito-navy p-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              VERDICT_BADGE_CLASSES[qualityVerdict],
            )}
          >
            {verdictLabel}
          </span>
          {activationState === "draft" ? (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
              Corpus en brouillon
            </span>
          ) : null}
        </div>
        <span className="font-heading text-sm font-bold text-edito-gold">
          Snapshot du {formatSnapshotDate(snapshotDate)}
        </span>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-white/70">
        Cette page reflète le corpus de sources tel que qualifié à cette date. Toute affirmation
        chiffrée renvoie à une source de l&rsquo;étude ; les zones non couvertes sont déclarées, pas
        déduites.
      </p>

      {gaps.length > 0 ? (
        <div className="mt-3 border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={() => setGapsOpen((value) => !value)}
            aria-expanded={gapsOpen}
            className="text-[10px] font-bold uppercase tracking-wider text-white/60 hover:text-white"
          >
            {gapsOpen ? "Masquer" : "Voir"} les {gaps.length} zone{gaps.length > 1 ? "s" : ""} non couverte{gaps.length > 1 ? "s" : ""} ↓
          </button>
          {gapsOpen ? (
            <ul className="mt-2 space-y-1.5">
              {gaps.map((gap, index) => (
                <li key={index} className="text-[11px] leading-relaxed text-white/65">
                  {gap.famille ? <span className="font-semibold text-white/80">{gap.famille} — </span> : null}
                  {gap.motif}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
