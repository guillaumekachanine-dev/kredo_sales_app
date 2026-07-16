"use client"

import type { MatchingResult, ProfileMatchResult } from "@/lib/staffing-matching/types"
import { MatchingProfileDetail } from "./MatchingProfileDetail"
import { TIER_LABELS, formatAvailability, profileSourceKey } from "./matching-ui-utils"

interface PresentState {
  presenting: boolean
  presented: boolean
  error: string | null
}

interface MatchingResultsDesktopProps {
  result: MatchingResult
  onSelect: (sourceKey: string) => void
  presentStateByKey: Map<string, PresentState>
  selectedProfile: ProfileMatchResult
}

export function MatchingResultsDesktop({
  result,
  onSelect,
  presentStateByKey,
  selectedProfile,
}: MatchingResultsDesktopProps) {
  const alternatives = result.rankedProfiles.filter((profile) => profileSourceKey(profile) !== profileSourceKey(selectedProfile))
  const selectedState = presentStateByKey.get(profileSourceKey(selectedProfile))

  return (
    <div className="grid min-h-[30rem] grid-cols-[12rem_minmax(0,1fr)] divide-x divide-border/80">
      <aside className="flex min-h-0 flex-col px-5 pb-5 pr-6">
        <div className="flex flex-none flex-col items-center border-b border-border/70 pb-5 pt-5 text-center">
          <div className="relative flex size-28 items-center justify-center rounded-full border-4 border-primary bg-primary/[0.02] text-heading shadow-[inset_0_0_0_4px_var(--color-surface)]">
            <span className="-mt-2 font-heading text-4xl font-bold tracking-tight tabular-nums">
              {Math.round(selectedProfile.overallScore)}
            </span>
            <span className="absolute bottom-5 text-xs font-medium text-muted">/100</span>
          </div>
          <div className="mt-4 rounded-full border border-primary/60 px-3 py-1.5 text-xs font-bold text-primary">
            {TIER_LABELS[selectedProfile.tier]}
          </div>
          <p className="mt-4 flex items-start gap-1.5 text-left text-[11px] leading-4 text-body">
            <span aria-hidden="true" className="mt-0.5 size-2 shrink-0 rounded-full bg-success" />
            {formatAvailability(selectedProfile.availableFrom)}
          </p>
        </div>

        <div className="pt-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">Autres profils pertinents</p>
          <div className="mt-2 divide-y divide-border/60">
            {alternatives.map((profile) => {
              const key = profileSourceKey(profile)
              const state = presentStateByKey.get(key)

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelect(key)}
                  className="group flex w-full items-center justify-between gap-2 py-2 text-left transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-heading group-hover:text-primary">{profile.fullName}</span>
                    {state?.presented ? <span className="mt-1 block text-[10px] font-semibold text-success">Présenté</span> : null}
                  </span>
                  <span className="shrink-0 font-heading text-sm font-bold tabular-nums text-heading">
                    {Math.round(profile.overallScore)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </aside>

      <section className="min-w-0 px-6 pb-6 pt-5">
        <MatchingProfileDetail
          profile={selectedProfile}
          presenting={selectedState?.presenting ?? false}
          presented={selectedState?.presented ?? false}
          presentedError={selectedState?.error ?? null}
          onPresent={() => undefined}
          showPresentationAction={false}
        />
      </section>
    </div>
  )
}
