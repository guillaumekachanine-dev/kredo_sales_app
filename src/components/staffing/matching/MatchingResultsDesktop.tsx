"use client"

import { StatusPill } from "@/components/ui/StatusPill"
import type { MatchingResult } from "@/lib/staffing-matching/types"
import { cn } from "@/lib/utils"
import { MatchingProfileDetail } from "./MatchingProfileDetail"
import { TIER_LABELS, TIER_TONES, formatAvailability, profileSourceKey, sourceTypeLabel } from "./matching-ui-utils"

interface PresentState {
  presenting: boolean
  presented: boolean
  error: string | null
}

interface MatchingResultsDesktopProps {
  result: MatchingResult
  selectedSourceKey: string | null
  onSelect: (sourceKey: string) => void
  presentStateByKey: Map<string, PresentState>
  onPresent: (sourceKey: string) => void
}

export function MatchingResultsDesktop({
  result,
  selectedSourceKey,
  onSelect,
  presentStateByKey,
  onPresent,
}: MatchingResultsDesktopProps) {
  const selected = result.rankedProfiles.find((p) => profileSourceKey(p) === selectedSourceKey) ?? result.rankedProfiles[0]

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-4">
      {/* Liste classée */}
      <div className="max-h-[60vh] space-y-1.5 overflow-y-auto pr-1">
        {result.rankedProfiles.map((profile) => {
          const key = profileSourceKey(profile)
          const isSelected = selected && profileSourceKey(selected) === key
          const state = presentStateByKey.get(key)

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              className={cn(
                "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
                isSelected ? "border-primary bg-primary/[0.06]" : "border-border/60 bg-surface hover:bg-canvas/40",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-bold text-heading">{profile.fullName}</p>
                <span className="shrink-0 text-xs font-bold text-heading">{Math.round(profile.overallScore)}</span>
              </div>
              <p className="mt-0.5 truncate text-[10px] text-muted">
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

      {/* Détail */}
      <div className="max-h-[60vh] overflow-y-auto">
        {selected ? (
          <MatchingProfileDetail
            profile={selected}
            presenting={presentStateByKey.get(profileSourceKey(selected))?.presenting ?? false}
            presented={presentStateByKey.get(profileSourceKey(selected))?.presented ?? false}
            presentedError={presentStateByKey.get(profileSourceKey(selected))?.error ?? null}
            onPresent={() => onPresent(profileSourceKey(selected))}
          />
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted">
            Sélectionnez un profil dans la liste.
          </div>
        )}
      </div>
    </div>
  )
}
