"use client"

import { useId, useState } from "react"
import type { ConsultantsPracticeBucket } from "@/features/consultants/data/consultants-synthese.types"

type Metric = "collaborators" | "candidates"

const METRIC_LABEL: Record<Metric, string> = {
  collaborators: "Collaborateurs",
  candidates: "Candidats",
}

const VIEW_W = 720
const ROW_H = 34
const LABEL_W = 196
const VALUE_W = 34
const BAR_X = LABEL_W + 8
const BAR_MAX_W = VIEW_W - BAR_X - VALUE_W

interface PracticeBreakdownChartProps {
  buckets: readonly ConsultantsPracticeBucket[]
}

export function PracticeBreakdownChart({ buckets }: PracticeBreakdownChartProps) {
  const [metric, setMetric] = useState<Metric>("collaborators")
  const titleId = useId()

  const rows = buckets.filter((b) => b[metric] > 0)
  const max = Math.max(1, ...rows.map((b) => b[metric]))
  const height = Math.max(ROW_H, rows.length * ROW_H)

  return (
    <section className="rounded-[var(--radius-medium)] border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-heading">Répartition par practice</h2>
        <div
          className="inline-flex rounded-[var(--radius-medium)] border border-border p-0.5"
          role="group"
          aria-label="Population affichée"
        >
          {(Object.keys(METRIC_LABEL) as Metric[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setMetric(key)}
              aria-pressed={metric === key}
              className={
                metric === key
                  ? "rounded-[var(--radius-small)] bg-primary/[0.1] px-3 py-1 text-xs font-semibold text-primary"
                  : "rounded-[var(--radius-small)] px-3 py-1 text-xs font-semibold text-muted hover:text-body"
              }
            >
              {METRIC_LABEL[key]}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          Aucun {METRIC_LABEL[metric].toLowerCase()} rattaché à une practice.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${VIEW_W} ${height}`}
            className="w-full min-w-[440px]"
            role="img"
            aria-labelledby={titleId}
          >
            <title id={titleId}>
              Répartition des {METRIC_LABEL[metric].toLowerCase()} par practice
            </title>
            {rows.map((bucket, i) => {
              const y = i * ROW_H
              const value = bucket[metric]
              const barW = Math.max(2, (value / max) * BAR_MAX_W)
              const fill = bucket.colorHex ?? "var(--color-muted)"
              return (
                <g key={bucket.key ?? "__other__"}>
                  <text
                    x={LABEL_W}
                    y={y + ROW_H / 2}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fill="var(--color-body)"
                    fontSize={11}
                    fontWeight={600}
                    fontFamily="inherit"
                  >
                    {bucket.label}
                  </text>
                  <rect
                    x={BAR_X}
                    y={y + 7}
                    width={BAR_MAX_W}
                    height={ROW_H - 14}
                    rx={3}
                    fill="var(--color-canvas)"
                  />
                  <rect
                    x={BAR_X}
                    y={y + 7}
                    width={barW}
                    height={ROW_H - 14}
                    rx={3}
                    fill={fill}
                    opacity={0.85}
                  />
                  <text
                    x={VIEW_W}
                    y={y + ROW_H / 2}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fill="var(--color-heading)"
                    fontSize={11}
                    fontWeight={700}
                    fontFamily="inherit"
                  >
                    {value}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      )}
    </section>
  )
}
