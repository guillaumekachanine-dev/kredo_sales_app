"use client"

import { useMemo, useState } from "react"
import type { BusinessIntelligenceSegmentWorkspace } from "../data/business-intelligence-workspace-types"
import { buildTerrainHomeModel } from "./terrain-home-model"
import { buildTerrainStories } from "./terrain-stories-model"
import { TerrainConfidenceBadge } from "./TerrainConfidenceBadge"
import { TerrainRegulatoryCard } from "./TerrainRegulatoryCard"
import { TerrainAngleCard } from "./TerrainAngleCard"
import { TerrainStoriesMobile } from "./TerrainStoriesMobile"

type LoadedWorkspace = Extract<BusinessIntelligenceSegmentWorkspace, { state: "ready" | "empty" }>

export type TerrainSurface = "home" | "stories"

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

  if (surface === "stories" && stories.length > 0) {
    return (
      <TerrainStoriesMobile
        stories={stories}
        onBack={() => setSurface("home")}
      />
    )
  }

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

      {/* 4. Accès Mode Stories (uniquement si des stories existent) */}
      {stories.length > 0 ? (
        <section aria-label="Accès aux modes Terrain" className="pt-1">
          <button
            type="button"
            onClick={() => setSurface("stories")}
            aria-label={`Ouvrir le mode Stories (${stories.length} ${stories.length > 1 ? "stories" : "story"})`}
            className="flex min-h-12 w-full cursor-pointer items-center justify-between rounded-xl border border-edito-navy bg-edito-navy px-4 py-3 text-xs font-extrabold text-white shadow-sm transition-colors hover:bg-edito-navy/90 active:bg-edito-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 select-none"
          >
            <span className="tracking-wide">Stories</span>
            <span className="flex items-center gap-1.5 text-edito-brass">
              <span className="text-[11px] font-bold text-white/75">
                {String(stories.length).padStart(2, "0")}
              </span>
              <svg
                aria-hidden="true"
                className="h-4 w-4 stroke-[2.5]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </span>
          </button>
        </section>
      ) : null}
    </div>
  )
}

