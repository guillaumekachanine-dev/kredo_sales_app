"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import type { BusinessIntelligenceSegmentWorkspace } from "../data/business-intelligence-workspace-types"
import { buildTerrainHomeModel } from "./terrain-home-model"
import { buildTerrainStories } from "./terrain-stories-model"
import { buildTerrainRevisionCards } from "./terrain-revision-model"
import { buildTerrainTopAccounts } from "./terrain-top-accounts-model"
import { TerrainConfidenceBadge } from "./TerrainConfidenceBadge"
import { TerrainRegulatoryCard } from "./TerrainRegulatoryCard"
import { TerrainAngleCard } from "./TerrainAngleCard"
import { TerrainStoriesMobile } from "./TerrainStoriesMobile"
import { TerrainRevisionMobile } from "./TerrainRevisionMobile"
import { TerrainTopAccountsMobile } from "./TerrainTopAccountsMobile"

type LoadedWorkspace = Extract<BusinessIntelligenceSegmentWorkspace, { state: "ready" | "empty" }>

export type TerrainSurface = "home" | "stories" | "revision" | "top-accounts"

export function TerrainHomeDashboardMobile({
  workspace,
  initialSurface = "home",
}: {
  workspace: LoadedWorkspace
  initialSurface?: TerrainSurface
}) {
  const [surface, setSurface] = useState<TerrainSurface>(initialSurface)
  const model = useMemo(() => buildTerrainHomeModel(workspace), [workspace])
  const stories = useMemo(
    () => buildTerrainStories(workspace.knowledge.playbook),
    [workspace.knowledge.playbook],
  )
  const revisionCards = useMemo(
    () => buildTerrainRevisionCards(workspace.knowledge.playbook),
    [workspace.knowledge.playbook],
  )
  const topAccounts = useMemo(
    () => buildTerrainTopAccounts(workspace.competitiveMap?.actors ?? []),
    [workspace.competitiveMap?.actors],
  )

  if (surface === "stories" && stories.length > 0) {
    return (
      <TerrainStoriesMobile
        stories={stories}
        onBack={() => setSurface("home")}
      />
    )
  }

  if (surface === "revision" && revisionCards.length > 0) {
    return (
      <TerrainRevisionMobile
        cards={revisionCards}
        onBack={() => setSurface("home")}
      />
    )
  }

  if (surface === "top-accounts" && topAccounts.ranked.length > 0) {
    return (
      <TerrainTopAccountsMobile
        model={topAccounts}
        onBack={() => setSurface("home")}
      />
    )
  }

  const hasStories = stories.length > 0
  const hasRevision = revisionCards.length > 0
  const hasTopAccounts = topAccounts.ranked.length > 0
  const modeCount = (hasStories ? 1 : 0) + (hasRevision ? 1 : 0) + (hasTopAccounts ? 1 : 0)

  return (
    <div
      className="space-y-4 px-4 py-4"
      data-terrain-surface="home"
    >
      {/* 1. Badge de confiance du corpus */}
      <TerrainConfidenceBadge confidence={model.confidence} />

      {/* 2. Prochaine échéance réglementaire */}
      <TerrainRegulatoryCard item={model.regulatory} />

      {/* 3. Angle du jour & action de copie de l'accroche */}
      <TerrainAngleCard angle={model.dailyAngle} />

      {/* 4. Accès aux modes Terrain (Stories, Révision, Top 3 selon disponibilité) */}
      {modeCount > 0 ? (
        <section aria-label="Accès aux modes Terrain" className="pt-1">
          <div
            className={cn(
              "grid gap-2.5",
              modeCount === 3
                ? "grid-cols-3"
                : modeCount === 2
                  ? "grid-cols-2"
                  : "grid-cols-1",
            )}
          >
            {hasStories ? (
              <button
                type="button"
                onClick={() => setSurface("stories")}
                aria-label={`Ouvrir le mode Stories (${stories.length} ${stories.length > 1 ? "stories" : "story"})`}
                className="flex min-h-12 cursor-pointer items-center justify-between rounded-xl border border-edito-navy bg-edito-navy px-3.5 py-3 text-xs font-extrabold text-white shadow-sm transition-colors hover:bg-edito-navy/90 active:bg-edito-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 select-none"
              >
                <span className="tracking-wide">Stories</span>
                <span className="flex items-center gap-1 text-edito-brass">
                  <span className="text-[11px] font-bold text-white/75">
                    {String(stories.length).padStart(2, "0")}
                  </span>
                  <svg
                    aria-hidden="true"
                    className="h-3.5 w-3.5 stroke-[2.5]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
              </button>
            ) : null}

            {hasRevision ? (
              <button
                type="button"
                onClick={() => setSurface("revision")}
                aria-label={`Ouvrir le mode Révision (${revisionCards.length} ${revisionCards.length > 1 ? "objections" : "objection"})`}
                className="flex min-h-12 cursor-pointer items-center justify-between rounded-xl border border-edito-border bg-edito-surface px-3.5 py-3 text-xs font-extrabold text-edito-navy shadow-sm transition-colors hover:bg-edito-canvas active:bg-edito-chip focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 select-none"
              >
                <span className="tracking-wide">Révision</span>
                <span className="flex items-center gap-1 text-edito-brass">
                  <span className="text-[11px] font-bold text-edito-muted">
                    {String(revisionCards.length).padStart(2, "0")}
                  </span>
                  <svg
                    aria-hidden="true"
                    className="h-3.5 w-3.5 stroke-[2.5]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
              </button>
            ) : null}

            {hasTopAccounts ? (
              <button
                type="button"
                onClick={() => setSurface("top-accounts")}
                aria-label={`Ouvrir le Top 3 (${topAccounts.ranked.length} ${topAccounts.ranked.length > 1 ? "comptes" : "compte"})`}
                className="flex min-h-12 cursor-pointer items-center justify-between rounded-xl border border-edito-border bg-edito-surface px-3.5 py-3 text-xs font-extrabold text-edito-navy shadow-sm transition-colors hover:bg-edito-canvas active:bg-edito-chip focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 select-none"
              >
                <span className="tracking-wide">Top 3</span>
                <span className="flex items-center gap-1 text-edito-brass">
                  <span className="text-[11px] font-bold text-edito-muted">
                    {String(topAccounts.ranked.length).padStart(2, "0")}
                  </span>
                  <svg
                    aria-hidden="true"
                    className="h-3.5 w-3.5 stroke-[2.5]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
              </button>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  )
}

