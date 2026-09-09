"use client"

import { useId, useState } from "react"
import type { PipeBucket } from "../data/opportunities-synthese.types"
import { buildRevenueStrata } from "./summary-geometry"
import { formatEuros, formatNumber } from "./summary-formatters"

type PipeDimension = "clients" | "practices"

/** Pure render layer; HTML labels retain their size as the SVG band stretches. */
export function RevenueStrata({ buckets, total, dimension }: {
  buckets: readonly PipeBucket[]
  total: number
  dimension: PipeDimension
}) {
  const descriptionId = useId()
  const segments = buildRevenueStrata(buckets, total)
  if (total <= 0 || !buckets.some((bucket) => bucket.weightedValue > 0)) {
    return <p className="border-y border-dashed border-border py-12 text-center text-sm text-body">Aucune valeur de pipe à représenter.</p>
  }

  return (
    <figure aria-describedby={descriptionId}>
      <div className="relative mt-5 h-32" aria-hidden="true">
        <svg viewBox="0 0 1000 128" preserveAspectRatio="none" className="h-full w-full overflow-hidden">
          <line x1="0" x2="1000" y1="117" y2="117" stroke="var(--color-border)" vectorEffect="non-scaling-stroke" />
          {segments.map(({ bucket, x, width, rank }) => {
            const y = rank <= 3 ? (rank - 1) * 8 + 12 : 36
            return <g key={bucket.key}>
              <rect x={x * 10} y={y} width={width * 10} height="64"
                fill={dimension === "practices" ? "var(--color-muted)" : "var(--color-primary)"}
                fillOpacity={dimension === "practices" ? 1 : rank === 1 ? 1 : rank === 2 ? 0.75 : rank === 3 ? 0.5 : 0.25}
                shapeRendering="crispEdges" />
              {width > 0 && <line x1={x * 10} x2={x * 10} y1={y} y2={y + 64}
                stroke="var(--color-surface)" vectorEffect="non-scaling-stroke" />}
              {width >= 4 && <line x1={(x + width / 2) * 10} x2={(x + width / 2) * 10}
                y1={y + 64} y2="116" stroke="var(--color-body)" strokeWidth="0.75" vectorEffect="non-scaling-stroke" />}
            </g>
          })}
        </svg>
        {segments.filter((segment) => segment.width >= 4).map(({ bucket, x, width, rank }) => (
          <span key={bucket.key} className="absolute bottom-0 -translate-x-1/2 bg-surface px-1 text-xs font-semibold tabular-nums text-heading"
            style={{ left: `${x + width / 2}%` }}>{String(rank).padStart(2, "0")}</span>
        ))}
      </div>
      <figcaption id={descriptionId} className="mt-3 text-xs leading-5 text-body">
        Largeurs proportionnelles au CA pondéré · classement décroissant · les trois premiers contributeurs sont repérés ci-dessous.
      </figcaption>
      <ol className="mt-5 grid grid-cols-1 gap-x-7 gap-y-1 @min-[620px]:grid-cols-2 @min-[1000px]:grid-cols-3" aria-label={`Contributions par ${dimension}`}>
        {segments.map(({ bucket, rank, x, width }) => (
          <li key={bucket.key} className="min-w-0 border-t border-border py-3">
            <div className="flex items-baseline gap-3">
              <span className={rank <= 3 && bucket.weightedValue > 0 ? "text-sm font-bold tabular-nums text-primary" : "text-sm tabular-nums text-body"}>
                <span className="sr-only">Rang </span>{String(rank).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold text-heading">{bucket.label}</p>
                <p className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="font-heading text-lg font-bold tabular-nums text-heading">{formatEuros(bucket.weightedValue)}</span>
                  <span className="text-xs tabular-nums text-body">{width > 0 && width < 0.01 ? "< 0,01" : formatNumber(width)} %</span>
                </p>
                <p className="mt-1 text-xs text-body">{formatNumber(bucket.opportunityCount)} opportunité(s){rank <= 3 && bucket.weightedValue > 0 ? " · Top 3" : ""}</p>
                {/* Locator ties even a sub-pixel contribution to the portfolio band. */}
                <svg aria-hidden="true" viewBox="0 0 100 6" preserveAspectRatio="none" className="mt-2 h-1.5 w-full">
                  <line x1="0" x2="100" y1="3" y2="3" stroke="var(--color-border)" vectorEffect="non-scaling-stroke" />
                  <rect x={x} y="1" width={width} height="4" fill="var(--color-body)" />
                </svg>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </figure>
  )
}

export function PipeBreakdownChart({ pipeByClient, pipeByPractice, total }: {
  pipeByClient: readonly PipeBucket[]
  pipeByPractice: readonly PipeBucket[]
  total: number
}) {
  const [dimension, setDimension] = useState<PipeDimension>("clients")
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="@container border-b border-border py-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">01 / Répartition de valeur</p>
          <h2 id={headingId} className="font-heading text-2xl font-bold tracking-tight text-heading">Pipe commercial</h2>
          <p className="mt-1 text-sm text-body">Opportunités ouvertes · CA pondéré par la conviction</p>
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <p className="text-right text-xs text-body">Total du pipe<strong className="mt-1 block text-lg font-bold tabular-nums text-heading">{formatEuros(total)}</strong></p>
          <div className="inline-flex border-b border-border" role="group" aria-label="Répartition du pipe">
            {(["clients", "practices"] as const).map((key) => <button key={key} type="button"
              aria-pressed={dimension === key} onClick={() => setDimension(key)}
              className={`min-h-11 border-b-2 px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${dimension === key ? "border-primary text-primary" : "border-transparent text-body hover:bg-canvas"}`}>
              {key === "clients" ? "Clients" : "Practices"}
            </button>)}
          </div>
        </div>
      </div>
      <p className="sr-only" role="status">Répartition par {dimension}.</p>
      <RevenueStrata buckets={dimension === "clients" ? pipeByClient : pipeByPractice} total={total} dimension={dimension} />
    </section>
  )
}
