"use client"

import type { PanelResourceCounts } from "@/lib/intelligence/account-panel-types"

interface PanelResourcesProps {
  resources: PanelResourceCounts
  hasStructuredSector: boolean
}

type ResourceLine = {
  label: string
  value: string
  tone: "count" | "boolean"
}

function formatCount(available: number, needsReview: number): string {
  if (available === 0) return "—"
  if (needsReview > 0) return `${available} (${needsReview} à vérifier)`
  return String(available)
}

function buildLines(resources: PanelResourceCounts, hasStructuredSector: boolean): ResourceLine[] {
  const a = resources.analyses.engine
  const c = resources.communications.engine
  const r = resources.reports.engine

  const hasRoadmap =
    resources.roadmaps.engine.available > 0 || resources.roadmaps.legacy.available

  return [
    {
      label: "Analyses",
      value: formatCount(a.available, a.needsReview),
      tone: "count",
    },
    {
      label: "Pitch / mails",
      value: formatCount(c.available, c.needsReview),
      tone: "count",
    },
    {
      label: "Rapports",
      value: formatCount(r.available, r.needsReview),
      tone: "count",
    },
    {
      label: "Étude sectorielle",
      value: hasStructuredSector ? "Oui" : "Non",
      tone: "boolean",
    },
    {
      label: "Roadmap",
      value: hasRoadmap ? "Oui" : "Non",
      tone: "boolean",
    },
  ]
}

export function PanelResources({ resources, hasStructuredSector }: PanelResourcesProps) {
  const lines = buildLines(resources, hasStructuredSector)

  return (
    <ul className="space-y-0">
      {lines.map((line) => (
        <li
          key={line.label}
          className="flex items-center justify-between border-b border-primary-fg/6 px-0.5 py-2 last:border-b-0"
        >
          <span className="text-[11px] text-primary-fg/60">{line.label}</span>
          <span
            className={
              line.tone === "boolean"
                ? line.value === "Oui"
                  ? "text-[11px] font-semibold text-emerald-400"
                  : "text-[11px] font-semibold text-primary-fg/35"
                : line.value === "—"
                  ? "text-[11px] font-semibold text-primary-fg/35"
                  : "text-[11px] font-semibold text-primary-fg/80"
            }
          >
            {line.value}
          </span>
        </li>
      ))}
    </ul>
  )
}
