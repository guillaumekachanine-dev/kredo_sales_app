"use client"

import { StatusPill } from "@/components/ui/StatusPill"
import type { MatchingResult } from "@/lib/staffing-matching/types"
import { MatchingProfileDetail } from "./MatchingProfileDetail"
import { TIER_LABELS, TIER_TONES, formatAvailability, profileSourceKey, sourceTypeLabel } from "./matching-ui-utils"

interface PresentState {
  presenting: boolean
  presented: boolean
  error: string | null
}

interface MatchingResultsMobileProps {
  result: MatchingResult
  selectedSourceKey: string | null
  onSelect: (sourceKey: string | null) => void
  presentStateByKey: Map<string, PresentState>
  onPresent: (sourceKey: string) => void
}

export function MatchingResultsMobile({
  result,
  selectedSourceKey,
  onSelect,
  presentStateByKey,
  onPresent,
}: MatchingResultsMobileProps) {
  const selected = result.rankedProfiles.find((p) => profileSourceKey(p) === selectedSourceKey)

  if (selected) {
    const key = profileSourceKey(selected)
    const state = presentStateByKey.get(key)
    return (
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="inline-flex w-fit items-center gap-1 text-[11px] font-semibold text-muted hover:text-heading"
        >
          ← Retour à la liste
        </button>
        <MatchingProfileDetail
          profile={selected}
          presenting={state?.presenting ?? false}
          presented={state?.presented ?? false}
          presentedError={state?.error ?? null}
          onPresent={() => onPresent(key)}
          isMobile
        />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {result.rankedProfiles.map((profile) => {
        const key = profileSourceKey(profile)
        const state = presentStateByKey.get(key)

        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className="min-h-[44px] w-full rounded-lg border border-border/60 bg-surface px-3 py-3 text-left transition-colors hover:bg-canvas/40"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-bold text-heading">{profile.fullName}</p>
              <span className="shrink-0 text-sm font-bold text-heading">{Math.round(profile.overallScore)}</span>
            </div>
            <p className="mt-0.5 truncate text-xs text-muted">
              {profile.currentTitle ?? sourceTypeLabel(profile.sourceType)}
            </p>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <StatusPill label={TIER_LABELS[profile.tier]} variant={TIER_TONES[profile.tier]} />
              {state?.presented && <span className="text-[10px] font-bold text-success">Présenté ✓</span>}
            </div>
            <p className="mt-1 text-[10px] text-muted">{formatAvailability(profile.availableFrom)}</p>
          </button>
        )
      })}
    </div>
  )
}
